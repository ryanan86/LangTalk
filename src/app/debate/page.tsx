'use client';

import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/lib/i18n';
import { track } from '@/lib/analytics';
import { moderator, debaters } from '@/lib/debatePersonas';
import {
  DebatePhase,
  DebateTeam,
  DebateParticipant,
  DebateTopic,
  DebateMessage,
  DebateAnalysis,
  DebateCategory,
  DebateTurn,
  PHASE_CONFIG,
} from '@/lib/debateTypes';
import CorrectionCard from '@/components/talk/CorrectionCard';
import { Card, Badge, ProgressBar } from '@/components/ui';
import AiBadge from '@/components/ai/AiBadge';

// Build the full structured turn order for the debate
function buildTurnOrder(
  participants: DebateParticipant[],
  userTeam: DebateTeam
): DebateTurn[] {
  const turns: DebateTurn[] = [];
  const proMembers = participants.filter(p => p.team === 'pro');
  const conMembers = participants.filter(p => p.team === 'con');
  const mod = participants.find(p => p.team === 'moderator');

  if (mod) turns.push({ speakerId: mod.id, phase: 'opening', roundIndex: 0, timeLimitSec: 15, label: 'Introduction' });
  turns.push({ speakerId: proMembers[0]?.id || '', phase: 'opening', roundIndex: 0, timeLimitSec: PHASE_CONFIG.opening.timeLimitSec, label: 'Opening Statement' });
  turns.push({ speakerId: conMembers[0]?.id || '', phase: 'opening', roundIndex: 0, timeLimitSec: PHASE_CONFIG.opening.timeLimitSec, label: 'Opening Statement' });
  turns.push({ speakerId: proMembers[1]?.id || '', phase: 'opening', roundIndex: 0, timeLimitSec: PHASE_CONFIG.opening.timeLimitSec, label: 'Opening Statement' });
  turns.push({ speakerId: conMembers[1]?.id || '', phase: 'opening', roundIndex: 0, timeLimitSec: PHASE_CONFIG.opening.timeLimitSec, label: 'Opening Statement' });

  if (mod) turns.push({ speakerId: mod.id, phase: 'rebuttal', roundIndex: 0, timeLimitSec: 10, label: 'Round 1 Transition' });
  turns.push({ speakerId: conMembers[0]?.id || '', phase: 'rebuttal', roundIndex: 0, timeLimitSec: PHASE_CONFIG.rebuttal.timeLimitSec, label: 'Rebuttal Round 1' });
  turns.push({ speakerId: proMembers[0]?.id || '', phase: 'rebuttal', roundIndex: 0, timeLimitSec: PHASE_CONFIG.rebuttal.timeLimitSec, label: 'Rebuttal Round 1' });
  turns.push({ speakerId: conMembers[1]?.id || '', phase: 'rebuttal', roundIndex: 0, timeLimitSec: PHASE_CONFIG.rebuttal.timeLimitSec, label: 'Rebuttal Round 1' });
  turns.push({ speakerId: proMembers[1]?.id || '', phase: 'rebuttal', roundIndex: 0, timeLimitSec: PHASE_CONFIG.rebuttal.timeLimitSec, label: 'Rebuttal Round 1' });

  if (mod) turns.push({ speakerId: mod.id, phase: 'rebuttal', roundIndex: 1, timeLimitSec: 10, label: 'Round 2 Transition' });
  turns.push({ speakerId: proMembers[0]?.id || '', phase: 'rebuttal', roundIndex: 1, timeLimitSec: PHASE_CONFIG.rebuttal.timeLimitSec, label: 'Rebuttal Round 2' });
  turns.push({ speakerId: conMembers[0]?.id || '', phase: 'rebuttal', roundIndex: 1, timeLimitSec: PHASE_CONFIG.rebuttal.timeLimitSec, label: 'Rebuttal Round 2' });
  turns.push({ speakerId: proMembers[1]?.id || '', phase: 'rebuttal', roundIndex: 1, timeLimitSec: PHASE_CONFIG.rebuttal.timeLimitSec, label: 'Rebuttal Round 2' });
  turns.push({ speakerId: conMembers[1]?.id || '', phase: 'rebuttal', roundIndex: 1, timeLimitSec: PHASE_CONFIG.rebuttal.timeLimitSec, label: 'Rebuttal Round 2' });

  if (mod) turns.push({ speakerId: mod.id, phase: 'closing', roundIndex: 0, timeLimitSec: 10, label: 'Closing Transition' });
  const firstClosing = userTeam === 'pro' ? conMembers : proMembers;
  const lastClosing = userTeam === 'pro' ? proMembers : conMembers;
  turns.push({ speakerId: firstClosing[0]?.id || '', phase: 'closing', roundIndex: 0, timeLimitSec: PHASE_CONFIG.closing.timeLimitSec, label: 'Closing Argument' });
  turns.push({ speakerId: firstClosing[1]?.id || '', phase: 'closing', roundIndex: 0, timeLimitSec: PHASE_CONFIG.closing.timeLimitSec, label: 'Closing Argument' });
  turns.push({ speakerId: lastClosing[0]?.id || '', phase: 'closing', roundIndex: 0, timeLimitSec: PHASE_CONFIG.closing.timeLimitSec, label: 'Closing Argument' });
  turns.push({ speakerId: lastClosing[1]?.id || '', phase: 'closing', roundIndex: 0, timeLimitSec: PHASE_CONFIG.closing.timeLimitSec, label: 'Closing Argument' });

  return turns.filter(t => t.speakerId);
}

// ─── Phase step order ─────────────────────────────────────────────────────────
const PHASE_STEPS: DebatePhase[] = ['opening', 'rebuttal', 'closing'];

function DebateContent() {
  const router = useRouter();
  const { language, t } = useLanguage();

  const [phase, setPhase] = useState<DebatePhase>('preparation');
  const [topic, setTopic] = useState<DebateTopic | null>(null);
  const [userTeam, setUserTeam] = useState<DebateTeam | null>(null);
  const [participants, setParticipants] = useState<DebateParticipant[]>([]);
  const [messages, setMessages] = useState<DebateMessage[]>([]);
  const [analysis, setAnalysis] = useState<DebateAnalysis | null>(null);

  const [turnList, setTurnList] = useState<DebateTurn[]>([]);
  const turnIndexRef = useRef(0);
  const [turnIndex, setTurnIndex] = useState(0);

  const [prepTimeLeft, setPrepTimeLeft] = useState<number>(PHASE_CONFIG.preparation.thinkTime);
  const prepTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [isProcessing, setIsProcessing] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isUserTurn, setIsUserTurn] = useState(false);
  const [activeSpeaker, setActiveSpeaker] = useState<DebateParticipant | null>(null);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const debateStartedRef = useRef(false);
  const processingRef = useRef(false);
  const isInitializingRef = useRef(false);
  const messagesRef = useRef<DebateMessage[]>([]);

  useEffect(() => { messagesRef.current = messages; }, [messages]);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);
  useEffect(() => { initializeDebate(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const isSessionActive = phase === 'opening' || phase === 'rebuttal' || phase === 'closing';

  const handleBackClick = useCallback(() => {
    if (isSessionActive) setShowExitConfirm(true);
    else router.push('/');
  }, [isSessionActive, router]);

  useEffect(() => {
    if (!isSessionActive) return;
    window.history.pushState({ debateSession: true }, '');
    const handlePopState = () => {
      setShowExitConfirm(true);
      window.history.pushState({ debateSession: true }, '');
    };
    const handleBeforeUnload = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener('popstate', handlePopState);
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isSessionActive]);

  useEffect(() => {
    if (phase === 'preparation' && topic) {
      if (prepTimerRef.current) clearInterval(prepTimerRef.current);
      prepTimerRef.current = setInterval(() => {
        setPrepTimeLeft(prev => {
          if (prev <= 1) {
            if (prepTimerRef.current) { clearInterval(prepTimerRef.current); prepTimerRef.current = null; }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => { if (prepTimerRef.current) { clearInterval(prepTimerRef.current); prepTimerRef.current = null; } };
    }
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [phase, topic]);

  const initializeDebate = async () => {
    if (isInitializingRef.current) return;
    isInitializingRef.current = true;
    try {
      let selectedTopic: DebateTopic;
      try {
        const response = await fetch('/api/debate-topics');
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        if (data.topics?.length > 0) {
          const randomIndex = Math.floor(Math.random() * data.topics.length);
          const apiTopic = data.topics[randomIndex];
          selectedTopic = {
            id: apiTopic.id,
            category: apiTopic.category as DebateCategory,
            title: apiTopic.title,
            description: apiTopic.description,
            keyVocabulary: apiTopic.keyVocabulary,
            proHints: apiTopic.proArguments?.slice(0, 3),
            conHints: apiTopic.conArguments?.slice(0, 3),
          };
        } else { selectedTopic = getDefaultTopic(); }
      } catch { selectedTopic = getDefaultTopic(); }
      setTopic(selectedTopic);

      const team: DebateTeam = Math.random() < 0.5 ? 'pro' : 'con';
      setUserTeam(team);

      const shuffled = [...debaters].sort(() => Math.random() - 0.5);
      const partner = shuffled[0];
      const opponents = [shuffled[1], shuffled[2]];

      const participantList: DebateParticipant[] = [
        { id: 'moderator', name: moderator.name, team: 'moderator', isUser: false, voice: moderator.voice, gradient: moderator.gradient, avatar: moderator.avatar },
        { id: 'user', name: language === 'ko' ? '나' : 'You', team, isUser: true, voice: '', gradient: 'from-indigo-400 to-purple-500', avatar: 'U' },
        { id: partner.id, name: partner.name, team, isUser: false, voice: partner.voice, gradient: partner.gradient, avatar: partner.avatar },
        { id: opponents[0].id, name: opponents[0].name, team: team === 'pro' ? 'con' : 'pro', isUser: false, voice: opponents[0].voice, gradient: opponents[0].gradient, avatar: opponents[0].avatar },
        { id: opponents[1].id, name: opponents[1].name, team: team === 'pro' ? 'con' : 'pro', isUser: false, voice: opponents[1].voice, gradient: opponents[1].gradient, avatar: opponents[1].avatar },
      ];
      setParticipants(participantList);
    } finally { isInitializingRef.current = false; }
  };

  const getDefaultTopic = (): DebateTopic => ({
    id: 'default-1', category: 'daily',
    title: { en: 'Technology makes life better', ko: '기술이 삶을 더 좋게 만든다' },
    description: { en: 'Discuss whether technology has improved our daily lives.', ko: '기술이 우리의 일상생활을 향상시켰는지 토론합니다.' },
  });

  const startDebate = () => {
    if (debateStartedRef.current || !participants.length || !userTeam) return;
    debateStartedRef.current = true;
    if (prepTimerRef.current) clearInterval(prepTimerRef.current);
    const turns = buildTurnOrder(participants, userTeam);
    setTurnList(turns);
    turnIndexRef.current = 0;
    setTurnIndex(0);
    setPhase('opening');
    track('debate_start', { team: userTeam });
    setTimeout(() => executeTurn(turns, 0, participants), 500);
  };

  const executeTurn = async (turns: DebateTurn[], idx: number, parts: DebateParticipant[]) => {
    if (idx >= turns.length || processingRef.current) {
      if (idx >= turns.length) startAnalysis();
      return;
    }
    const turn = turns[idx];
    const speaker = parts.find(p => p.id === turn.speakerId);
    if (!speaker) { advanceTurn(turns, idx, parts); return; }

    setPhase(turn.phase);
    setActiveSpeaker(speaker);
    turnIndexRef.current = idx;
    setTurnIndex(idx);

    if (speaker.isUser) { setIsUserTurn(true); return; }

    processingRef.current = true;
    setIsProcessing(true);
    try {
      const response = await fetch('/api/debate-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: messagesRef.current, topic, currentSpeakerId: speaker.id, speakerTeam: speaker.team, phase: turn.phase, roundIndex: turn.roundIndex, userTeam, language }),
      });
      if (!response.ok) { console.error('AI debate-chat failed:', response.status); return; }
      const data = await response.json();
      if (data.message) {
        const newMsg: DebateMessage = { role: 'assistant', content: data.message, speakerId: speaker.id, speakerName: speaker.name, team: speaker.team, phase: turn.phase, roundIndex: turn.roundIndex };
        setMessages(prev => [...prev, newMsg]);
        await playTTSAndWait(data.message, speaker.voice);
      }
    } catch (error) { console.error('AI response error:', error); }
    finally { setIsProcessing(false); processingRef.current = false; }
    advanceTurn(turns, idx, parts);
  };

  const advanceTurn = (turns: DebateTurn[], currentIdx: number, parts: DebateParticipant[]) => {
    const nextIdx = currentIdx + 1;
    if (nextIdx >= turns.length) { startAnalysis(); return; }
    setTimeout(() => executeTurn(turns, nextIdx, parts), 800);
  };

  const playTTSAndWait = (text: string, voice: string): Promise<void> => {
    if (!voice) return Promise.resolve();
    return new Promise<void>(async (resolve) => {
      setIsPlaying(true);
      const ac = new AbortController();
      const timeout = setTimeout(() => ac.abort(), 10000);
      try {
        const response = await fetch('/api/text-to-speech', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-TTS-Stream': '1' },
          body: JSON.stringify({ text, voice }),
          signal: ac.signal,
        });
        clearTimeout(timeout);
        if (!response.ok) { setIsPlaying(false); resolve(); return; }
        let audioBlob: Blob;
        if (response.body) {
          const reader = response.body.getReader();
          const chunks: Uint8Array[] = [];
          while (true) { const { done, value } = await reader.read(); if (done) break; chunks.push(value); }
          audioBlob = new Blob(chunks as BlobPart[], { type: 'audio/mpeg' });
        } else { audioBlob = await response.blob(); }
        const audioUrl = URL.createObjectURL(audioBlob);
        if (audioRef.current) {
          const playTimeout = setTimeout(() => { audioRef.current?.pause(); setIsPlaying(false); URL.revokeObjectURL(audioUrl); resolve(); }, 15000);
          audioRef.current.onended = () => { clearTimeout(playTimeout); setIsPlaying(false); URL.revokeObjectURL(audioUrl); resolve(); };
          audioRef.current.onerror = () => { clearTimeout(playTimeout); setIsPlaying(false); URL.revokeObjectURL(audioUrl); resolve(); };
          audioRef.current.src = audioUrl;
          await audioRef.current.play();
        } else { setIsPlaying(false); resolve(); }
      } catch (error) {
        clearTimeout(timeout);
        if (!(error instanceof Error && error.name === 'AbortError')) console.error('TTS error:', error);
        setIsPlaying(false); resolve();
      }
    });
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4';
      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];
      setIsRecording(true);
      recorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        setIsRecording(false);
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        stream.getTracks().forEach(t => t.stop());
        await processUserAudio(blob);
      };
      recorder.start(1000);
    } catch (error) { console.error('Recording error:', error); setIsRecording(false); }
  };

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') mediaRecorderRef.current.stop();
  }, []);

  const processUserAudio = async (audioBlob: Blob) => {
    setIsProcessing(true);
    setIsUserTurn(false);
    try {
      const ext = audioBlob.type.includes('mp4') ? 'mp4' : 'webm';
      const file = new File([audioBlob], `audio.${ext}`, { type: audioBlob.type });
      const formData = new FormData();
      formData.append('audio', file);
      const sttResponse = await fetch('/api/speech-to-text', { method: 'POST', body: formData });
      if (!sttResponse.ok) { setIsProcessing(false); setIsUserTurn(true); return; }
      const sttData = await sttResponse.json();
      if (sttData.text?.trim()) {
        const user = participants.find(p => p.isUser);
        if (user) {
          const currentTurn = turnList[turnIndexRef.current];
          setMessages(prev => [...prev, { role: 'user', content: sttData.text, speakerId: 'user', speakerName: user.name, team: user.team, phase: currentTurn?.phase || phase, roundIndex: currentTurn?.roundIndex }]);
        }
        setIsProcessing(false);
        advanceTurn(turnList, turnIndexRef.current, participants);
      } else { setIsProcessing(false); setIsUserTurn(true); }
    } catch (error) { console.error('Audio processing error:', error); setIsProcessing(false); setIsUserTurn(true); }
  };

  const skipUserTurn = () => {
    setIsUserTurn(false);
    const user = participants.find(p => p.isUser);
    if (user) {
      const currentTurn = turnList[turnIndexRef.current];
      setMessages(prev => [...prev, { role: 'user', content: t.passedThisTurn, speakerId: 'user', speakerName: user.name, team: user.team, phase: currentTurn?.phase || phase, roundIndex: currentTurn?.roundIndex }]);
    }
    advanceTurn(turnList, turnIndexRef.current, participants);
  };

  const startAnalysis = async () => {
    setPhase('analysis');
    setIsProcessing(true);
    setActiveSpeaker(null);
    try {
      const response = await fetch('/api/debate-chat', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: messagesRef.current, topic, userTeam, language }),
      });
      if (!response.ok) { setPhase('result'); return; }
      const data = await response.json();
      if (data.analysis) { setAnalysis(data.analysis); setPhase('result'); }
      else setPhase('result');
    } catch (error) { console.error('Analysis error:', error); setPhase('result'); }
    finally { setIsProcessing(false); }
  };

  const formatTime = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
  const getParticipant = (id: string) => participants.find(p => p.id === id);

  const getPhaseText = () => {
    switch (phase) {
      case 'preparation': return language === 'ko' ? '준비' : 'Preparation';
      case 'opening': return language === 'ko' ? '오프닝' : 'Opening';
      case 'rebuttal': return language === 'ko' ? '반박' : 'Rebuttal';
      case 'closing': return language === 'ko' ? '마무리' : 'Closing';
      case 'analysis': return language === 'ko' ? '심사 중...' : 'Judging...';
      case 'result': return language === 'ko' ? '결과' : 'Results';
      default: return '';
    }
  };

  const getCategoryText = (category: DebateCategory) => {
    const map: Record<string, string> = {
      daily: language === 'ko' ? '일상' : 'Daily Life', school: language === 'ko' ? '학교' : 'School',
      technology: language === 'ko' ? '기술' : 'Technology', society: language === 'ko' ? '사회' : 'Society',
      environment: language === 'ko' ? '환경' : 'Environment', culture: language === 'ko' ? '문화' : 'Culture',
      sports: language === 'ko' ? '스포츠' : 'Sports', ethics: language === 'ko' ? '윤리' : 'Ethics',
      social: language === 'ko' ? '사회' : 'Social', politics: language === 'ko' ? '정치' : 'Politics',
      international: language === 'ko' ? '국제' : 'International',
    };
    return map[category] || category;
  };

  const totalTurns = turnList.length;
  const progressPercent = totalTurns > 0 ? Math.round((turnIndex / totalTurns) * 100) : 0;
  const currentPhaseStep = PHASE_STEPS.indexOf(phase as DebatePhase);

  // Score bar component — uses ProgressBar primitive
  const ScoreBar = ({ label, score, max = 20 }: { label: string; score: number; max?: number }) => (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs text-neutral-500 dark:text-neutral-400">{label}</span>
        <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 tabular-nums">{score}/{max}</span>
      </div>
      <ProgressBar
        value={(score / max) * 100}
        variant="brand"
        size="sm"
        label={label}
      />
    </div>
  );

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-dark-bg flex flex-col">
      <audio ref={audioRef} />

      {/* ─── Header ──────────────────────────────────────────────────────────── */}
      <header
        style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}
        className="px-4 pb-3 bg-white/90 dark:bg-dark-surface/90 backdrop-blur-xl border-b border-neutral-200 dark:border-neutral-800 sticky top-0 z-50"
      >
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-2">
            <button
              onClick={handleBackClick}
              aria-label="뒤로 가기"
              className="pressable w-9 h-9 rounded-xl flex items-center justify-center text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-white/[0.06] transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="text-center">
              <span className="text-sm font-bold text-neutral-900 dark:text-white">{getPhaseText()}</span>
              {phase !== 'preparation' && phase !== 'analysis' && phase !== 'result' && (
                <p className="text-xs text-neutral-400 dark:text-neutral-500 tabular-nums">{progressPercent}%</p>
              )}
            </div>
            <div className="w-9" />
          </div>

          {/* Phase progress rail with step labels */}
          {phase !== 'preparation' && phase !== 'result' && (
            <div className="space-y-2">
              {/* Step indicator dots for debate phases */}
              {isSessionActive && (
                <div className="flex items-center gap-1.5">
                  {PHASE_STEPS.map((step, i) => (
                    <div key={step} className="flex items-center gap-1.5 flex-1">
                      <div className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${
                        i < currentPhaseStep
                          ? 'bg-primary-500'
                          : i === currentPhaseStep
                            ? 'bg-neutral-200 dark:bg-white/[0.08] overflow-hidden'
                            : 'bg-neutral-200 dark:bg-white/[0.08]'
                      }`}>
                        {i === currentPhaseStep && (
                          <div className="h-full bg-brand-gradient" style={{ width: `${progressPercent}%`, transition: 'width 0.3s ease' }} />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Analysis spinner bar */}
              {phase === 'analysis' && (
                <div className="h-1.5 rounded-full bg-neutral-200 dark:bg-white/[0.08] overflow-hidden">
                  <div className="h-full w-1/3 bg-brand-gradient rounded-full animate-shimmer" style={{ backgroundSize: '200% 100%' }} />
                </div>
              )}

              {/* Topic + team badge */}
              {topic && (
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate flex-1">
                    {language === 'ko' ? topic.title.ko : topic.title.en}
                  </p>
                  {userTeam && (
                    <span className={`flex-shrink-0 px-2 py-0.5 rounded-full text-xs font-bold ${
                      userTeam === 'pro'
                        ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                        : 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300'
                    }`}>
                      {userTeam === 'pro' ? 'PRO' : 'CON'}
                    </span>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      {/* ─── Main ────────────────────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col max-w-4xl mx-auto w-full">

        {/* ═══════════════ PREPARATION PHASE ═══════════════ */}
        {phase === 'preparation' && topic && (
          <div className="flex-1 flex flex-col p-4 sm:p-6 overflow-y-auto space-y-4 motion-safe:animate-fade-up">

            {/* Prep timer */}
            <div className="text-center">
              <div className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-full font-mono font-bold text-lg transition-colors ${
                prepTimeLeft <= 30
                  ? 'bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400'
                  : 'bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400'
              }`}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {formatTime(prepTimeLeft)}
              </div>
              <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">
                {language === 'ko' ? '논리를 구상하세요' : 'Prepare your arguments'}
              </p>
            </div>

            {/* Topic card — interactive elevated */}
            <Card variant="elevated" padding="lg" className="motion-safe:animate-ds-scale-in">
              <Badge variant="warning" size="md" className="mb-3">
                {getCategoryText(topic.category)}
              </Badge>
              <h2 className="text-display-2 text-neutral-900 dark:text-white mb-2 leading-snug">
                {language === 'ko' ? topic.title.ko : topic.title.en}
              </h2>
              <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                {language === 'ko' ? topic.description.ko : topic.description.en}
              </p>
            </Card>

            {/* Team assignment — springy selected state */}
            {userTeam && (
              <Card
                variant="outlined"
                padding="md"
                className={`transition-all duration-300 motion-safe:animate-ds-scale-in ${
                  userTeam === 'pro'
                    ? 'border-emerald-300 dark:border-emerald-500/40 bg-emerald-50/60 dark:bg-emerald-500/10'
                    : 'border-red-300 dark:border-red-500/40 bg-red-50/60 dark:bg-red-500/10'
                }`}
                style={{ animationDelay: '80ms' }}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-extrabold text-white text-lg shadow-lg ${
                    userTeam === 'pro' ? 'bg-emerald-500 shadow-emerald-500/30' : 'bg-red-500 shadow-red-500/30'
                  }`}>
                    {userTeam === 'pro' ? 'P' : 'C'}
                  </div>
                  <div>
                    <p className="font-bold text-neutral-900 dark:text-white">
                      {language === 'ko'
                        ? `당신은 ${userTeam === 'pro' ? '찬성' : '반대'}팀입니다`
                        : `You are on the ${userTeam === 'pro' ? 'PRO' : 'CON'} team`}
                    </p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                      {userTeam === 'pro'
                        ? (language === 'ko' ? '이 주장을 지지하세요' : 'Support this statement')
                        : (language === 'ko' ? '이 주장에 반대하세요' : 'Oppose this statement')}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-2">
                      {language === 'ko' ? '우리 팀' : 'Your Team'}
                    </p>
                    <div className="space-y-2">
                      {participants.filter(p => p.team === userTeam).map(p => (
                        <div key={p.id} className="flex items-center gap-2">
                          <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${p.gradient} flex items-center justify-center shadow-sm`}>
                            <span className="text-white text-xs font-bold">{p.avatar}</span>
                          </div>
                          <span className="text-sm text-neutral-700 dark:text-neutral-300">
                            {p.name}{p.isUser && <span className="text-xs text-neutral-400 dark:text-neutral-500"> ({language === 'ko' ? '나' : 'You'})</span>}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-2">
                      {language === 'ko' ? '상대 팀' : 'Opponents'}
                    </p>
                    <div className="space-y-2">
                      {participants.filter(p => p.team !== userTeam && p.team !== 'moderator').map(p => (
                        <div key={p.id} className="flex items-center gap-2">
                          <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${p.gradient} flex items-center justify-center shadow-sm`}>
                            <span className="text-white text-xs font-bold">{p.avatar}</span>
                          </div>
                          <span className="text-sm text-neutral-700 dark:text-neutral-300">{p.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {/* Vocabulary / hints */}
            {(topic.keyVocabulary?.length || topic.proHints?.length || topic.conHints?.length) && (
              <Card variant="default" padding="md" style={{ animationDelay: '120ms' }} className="motion-safe:animate-ds-scale-in">
                <h3 className="text-sm font-bold text-neutral-900 dark:text-white mb-3">
                  {language === 'ko' ? '유용한 표현' : 'Useful Expressions'}
                </h3>
                {topic.keyVocabulary && topic.keyVocabulary.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {topic.keyVocabulary.map((v, i) => (
                      <span key={i} className="px-2.5 py-1 bg-primary-50 dark:bg-primary-500/10 text-primary-700 dark:text-primary-300 rounded-xl text-xs font-medium border border-primary-100 dark:border-primary-500/20">
                        {v}
                      </span>
                    ))}
                  </div>
                )}
                {userTeam === 'pro' && topic.proHints && topic.proHints.length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold mb-1.5">
                      {language === 'ko' ? '찬성 논거 힌트' : 'PRO hints'}
                    </p>
                    <ul className="space-y-1">
                      {topic.proHints.map((h, i) => (
                        <li key={i} className="text-xs text-neutral-600 dark:text-neutral-400 flex gap-2">
                          <span className="text-emerald-500 mt-0.5 flex-shrink-0">
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
                          </span>
                          {h}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {userTeam === 'con' && topic.conHints && topic.conHints.length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs text-red-600 dark:text-red-400 font-semibold mb-1.5">
                      {language === 'ko' ? '반대 논거 힌트' : 'CON hints'}
                    </p>
                    <ul className="space-y-1">
                      {topic.conHints.map((h, i) => (
                        <li key={i} className="text-xs text-neutral-600 dark:text-neutral-400 flex gap-2">
                          <span className="text-red-500 mt-0.5 flex-shrink-0">
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
                          </span>
                          {h}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </Card>
            )}

            {/* Moderator badge */}
            <div className="flex items-center gap-2 px-1">
              <div className={`w-7 h-7 rounded-xl bg-gradient-to-br ${moderator.gradient} flex items-center justify-center shadow-sm`}>
                <span className="text-white text-xs font-bold">{moderator.avatar}</span>
              </div>
              <span className="text-xs text-neutral-500 dark:text-neutral-400">
                Moderator: {moderator.name}
              </span>
            </div>

            {/* Start CTA */}
            <button
              onClick={startDebate}
              className="pressable w-full py-4 rounded-2xl bg-brand-gradient text-white font-bold text-base shadow-float dark:shadow-float-dark hover:opacity-95 transition-opacity"
            >
              {language === 'ko' ? 'Start Debate' : 'Start Debate'}
            </button>
          </div>
        )}

        {/* ═══════════════ ACTIVE DEBATE (opening / rebuttal / closing) ═══════════════ */}
        {isSessionActive && (
          <>
            {/* Team roster bar */}
            <div className="px-4 py-2.5 bg-white/90 dark:bg-dark-surface/90 backdrop-blur-sm border-b border-neutral-100 dark:border-neutral-800">
              <div className="max-w-4xl mx-auto flex items-center justify-between">
                {/* Pro team */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 w-8">PRO</span>
                  {participants.filter(p => p.team === 'pro').map(p => (
                    <div
                      key={p.id}
                      title={p.name}
                      className={`w-8 h-8 rounded-xl bg-gradient-to-br ${p.gradient} flex items-center justify-center transition-all duration-200 ${
                        activeSpeaker?.id === p.id
                          ? 'ring-2 ring-emerald-500 ring-offset-2 dark:ring-offset-dark-surface scale-110 shadow-lg'
                          : 'opacity-50'
                      }`}
                    >
                      <span className="text-white text-xs font-bold">{p.avatar}</span>
                    </div>
                  ))}
                </div>

                <span className="text-xs font-bold text-neutral-300 dark:text-neutral-600">VS</span>

                {/* Con team */}
                <div className="flex items-center gap-2">
                  {participants.filter(p => p.team === 'con').map(p => (
                    <div
                      key={p.id}
                      title={p.name}
                      className={`w-8 h-8 rounded-xl bg-gradient-to-br ${p.gradient} flex items-center justify-center transition-all duration-200 ${
                        activeSpeaker?.id === p.id
                          ? 'ring-2 ring-red-500 ring-offset-2 dark:ring-offset-dark-surface scale-110 shadow-lg'
                          : 'opacity-50'
                      }`}
                    >
                      <span className="text-white text-xs font-bold">{p.avatar}</span>
                    </div>
                  ))}
                  <span className="text-xs font-bold text-red-600 dark:text-red-400 w-8 text-right">CON</span>
                </div>
              </div>
            </div>

            {/* Message feed */}
            <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-3">
              {messages.map((msg, i) => {
                const speaker = getParticipant(msg.speakerId);
                const isUser = msg.role === 'user';
                const isModerator = msg.team === 'moderator';
                const isPro = msg.team === 'pro';
                const isUserTeamMsg = userTeam && msg.team === userTeam && !isModerator;

                return (
                  <div key={i} className={`flex gap-2.5 motion-safe:animate-fade-up ${isUser ? 'flex-row-reverse' : ''}`}>
                    {/* Avatar */}
                    <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${speaker?.gradient || 'from-neutral-400 to-neutral-500'} flex items-center justify-center flex-shrink-0 shadow-sm`}>
                      <span className="text-white text-xs font-bold">{speaker?.avatar || '?'}</span>
                    </div>

                    {/* Bubble */}
                    <div className={`max-w-[76%] flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
                      <div className={`flex items-center gap-1.5 mb-1 ${isUser ? 'flex-row-reverse' : ''}`}>
                        <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                          {msg.speakerName}
                        </span>
                        {!isModerator && (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                            isPro
                              ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                              : 'bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400'
                          }`}>
                            {isPro ? 'PRO' : 'CON'}
                          </span>
                        )}
                      </div>
                      <div className={`rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                        isUser
                          ? 'bg-brand-gradient text-white rounded-tr-md shadow-md shadow-primary-500/20'
                          : isModerator
                            ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200 rounded-tl-md'
                            : isUserTeamMsg
                              ? 'bg-emerald-50 dark:bg-emerald-500/10 text-neutral-800 dark:text-neutral-200 border border-emerald-200 dark:border-emerald-500/20 rounded-tl-md'
                              : 'bg-red-50 dark:bg-red-500/10 text-neutral-800 dark:text-neutral-200 border border-red-200 dark:border-red-500/20 rounded-tl-md'
                      }`}>
                        {msg.content}
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* AI thinking dots */}
              {isProcessing && activeSpeaker && !isUserTurn && (
                <div className="flex gap-2.5 motion-safe:animate-fade-up">
                  <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${activeSpeaker.gradient} flex items-center justify-center flex-shrink-0 shadow-sm`}>
                    <span className="text-white text-xs font-bold">{activeSpeaker.avatar}</span>
                  </div>
                  <div className="flex flex-col justify-end pb-1">
                    <span className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">{activeSpeaker.name}</span>
                    <div className="flex gap-1.5">
                      <div className="loading-dot" />
                      <div className="loading-dot" />
                      <div className="loading-dot" />
                    </div>
                  </div>
                </div>
              )}

              {/* Voice wave for TTS playback */}
              {isPlaying && activeSpeaker && (
                <div className="flex items-center gap-1 ml-12">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="voice-bar" />
                  ))}
                </div>
              )}

              <div ref={chatEndRef} />
            </div>

            {/* User turn input */}
            {isUserTurn && (
              <div className="p-4 bg-white dark:bg-dark-surface border-t border-neutral-200 dark:border-neutral-800">
                <div className="max-w-lg mx-auto">
                  <div className="text-center mb-3">
                    <p className="text-sm font-bold text-amber-600 dark:text-amber-400">
                      {language === 'ko' ? '당신의 차례입니다' : 'Your Turn!'}
                    </p>
                    <p className="text-xs text-neutral-400 dark:text-neutral-500">
                      {turnList[turnIndexRef.current]?.label || ''}
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={isRecording ? stopRecording : startRecording}
                      disabled={isProcessing}
                      className={`pressable flex-1 py-3.5 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all ${
                        isRecording
                          ? 'bg-red-500 text-white shadow-lg shadow-red-500/40 motion-safe:animate-pulse'
                          : 'bg-brand-gradient text-white shadow-lg shadow-primary-500/30'
                      }`}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                      </svg>
                      {isRecording
                        ? (language === 'ko' ? '종료' : 'Stop')
                        : (language === 'ko' ? '말하기' : 'Speak')}
                    </button>
                    <button
                      onClick={skipUserTurn}
                      className="pressable px-4 py-3.5 rounded-2xl text-sm font-medium text-neutral-500 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                    >
                      {language === 'ko' ? '건너뛰기' : 'Pass'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* ═══════════════ ANALYSIS PHASE ═══════════════ */}
        {phase === 'analysis' && (
          <div className="flex-1 flex flex-col items-center justify-center p-6 motion-safe:animate-fade-up">
            <div className={`w-20 h-20 rounded-3xl bg-gradient-to-br ${moderator.gradient} flex items-center justify-center mb-5 shadow-float dark:shadow-float-dark motion-safe:animate-gentle-bounce`}>
              <span className="text-white text-3xl font-bold">{moderator.avatar}</span>
            </div>
            <h2 className="text-display-2 text-neutral-900 dark:text-white mb-2">
              {language === 'ko' ? '심사 중...' : 'Judging...'}
            </h2>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-6">
              {language === 'ko' ? '토론 내용을 분석하고 있어요' : 'Analyzing the debate...'}
            </p>
            <div className="flex gap-2">
              <div className="loading-dot" />
              <div className="loading-dot" />
              <div className="loading-dot" />
            </div>
          </div>
        )}

        {/* ═══════════════ RESULT PHASE ═══════════════ */}
        {phase === 'result' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 motion-safe:animate-fade-up">
            {analysis && (
              <>
                {/* Winner banner — gentle-bounce celebration */}
                <div className={`relative overflow-hidden rounded-card-lg p-5 text-center motion-safe:animate-gentle-bounce ${
                  analysis.winner === userTeam
                    ? 'bg-brand-gradient text-white shadow-float dark:shadow-float-dark'
                    : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200'
                }`}>
                  {analysis.winner === userTeam && (
                    <>
                      <div aria-hidden="true" className="absolute -top-16 -right-10 w-48 h-48 rounded-full bg-white/10 blur-3xl" />
                      <div aria-hidden="true" className="absolute -bottom-20 -left-8 w-44 h-44 rounded-full bg-indigo-400/20 blur-3xl" />
                    </>
                  )}
                  <p className="relative text-2xs font-semibold uppercase tracking-widest opacity-80 mb-1">
                    {language === 'ko' ? '결과' : 'Result'}
                  </p>
                  <p className="relative text-display-1">
                    {analysis.winner === userTeam
                      ? (language === 'ko' ? '승리!' : 'Victory!')
                      : (language === 'ko' ? '패배' : 'Defeat')}
                  </p>
                  {analysis.judgmentReason && (
                    <p className="relative text-sm mt-2 opacity-80 leading-relaxed max-w-sm mx-auto">
                      {analysis.judgmentReason}
                    </p>
                  )}
                </div>

                {/* Score comparison grid */}
                <div className="grid grid-cols-2 gap-3">
                  {/* PRO */}
                  <Card
                    variant="elevated"
                    padding="md"
                    className={analysis.winner === 'pro' ? 'ring-2 ring-emerald-400 dark:ring-emerald-500' : ''}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">PRO</span>
                      <span className="text-2xl font-extrabold text-neutral-900 dark:text-white tabular-nums motion-safe:animate-count-pop">
                        {analysis.proScore?.total || 0}
                      </span>
                    </div>
                    <div className="space-y-2">
                      <ScoreBar label={language === 'ko' ? '명확성' : 'Clarity'} score={analysis.proScore?.clarity || 0} />
                      <ScoreBar label={language === 'ko' ? '논거' : 'Evidence'} score={analysis.proScore?.evidence || 0} />
                      <ScoreBar label={language === 'ko' ? '반박력' : 'Rebuttal'} score={analysis.proScore?.rebuttal || 0} />
                      <ScoreBar label={language === 'ko' ? '응답성' : 'Response'} score={analysis.proScore?.responsiveness || 0} />
                      <ScoreBar label={language === 'ko' ? '언어력' : 'Language'} score={analysis.proScore?.language || 0} />
                    </div>
                  </Card>

                  {/* CON */}
                  <Card
                    variant="elevated"
                    padding="md"
                    className={analysis.winner === 'con' ? 'ring-2 ring-red-400 dark:ring-red-500' : ''}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-bold text-red-600 dark:text-red-400">CON</span>
                      <span className="text-2xl font-extrabold text-neutral-900 dark:text-white tabular-nums motion-safe:animate-count-pop">
                        {analysis.conScore?.total || 0}
                      </span>
                    </div>
                    <div className="space-y-2">
                      <ScoreBar label={language === 'ko' ? '명확성' : 'Clarity'} score={analysis.conScore?.clarity || 0} />
                      <ScoreBar label={language === 'ko' ? '논거' : 'Evidence'} score={analysis.conScore?.evidence || 0} />
                      <ScoreBar label={language === 'ko' ? '반박력' : 'Rebuttal'} score={analysis.conScore?.rebuttal || 0} />
                      <ScoreBar label={language === 'ko' ? '응답성' : 'Response'} score={analysis.conScore?.responsiveness || 0} />
                      <ScoreBar label={language === 'ko' ? '언어력' : 'Language'} score={analysis.conScore?.language || 0} />
                    </div>
                  </Card>
                </div>

                {/* User performance — StatCard row */}
                {(analysis.userPerformance?.strengths?.length > 0 || analysis.userPerformance?.improvements?.length > 0) && (
                  <Card variant="default" padding="md">
                    <div className="flex items-center gap-1.5 mb-4">
                      <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                        {language === 'ko' ? '개인 피드백' : 'Your Performance'}
                      </h3>
                      <AiBadge variant="neutral" />
                    </div>
                    {analysis.userPerformance?.strengths?.length > 0 && (
                      <div className="mb-3">
                        <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-2">
                          {language === 'ko' ? '잘한 점' : 'Strengths'}
                        </p>
                        <ul className="space-y-1.5">
                          {analysis.userPerformance.strengths.map((s: string, i: number) => (
                            <li key={i} className="text-sm text-neutral-700 dark:text-neutral-300 flex items-start gap-2">
                              <svg className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                              </svg>
                              {s}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {analysis.userPerformance?.improvements?.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-2">
                          {language === 'ko' ? '개선할 점' : 'To Improve'}
                        </p>
                        <ul className="space-y-1.5">
                          {analysis.userPerformance.improvements.map((s: string, i: number) => (
                            <li key={i} className="text-sm text-neutral-700 dark:text-neutral-300 flex items-start gap-2">
                              <svg className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                              </svg>
                              {s}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </Card>
                )}

                {/* Grammar corrections */}
                {analysis.userPerformance?.grammarCorrections?.length > 0 && (
                  <div>
                    <h3 className="text-sm font-bold text-neutral-900 dark:text-white mb-3 px-1">
                      {language === 'ko' ? '문법 교정' : 'Grammar Corrections'}
                    </h3>
                    <div className="space-y-3">
                      {analysis.userPerformance.grammarCorrections.map((c: { original: string; corrected: string; explanation: string; category?: string }, i: number) => (
                        <CorrectionCard
                          key={i}
                          original={c.original}
                          intended=""
                          corrected={c.corrected}
                          explanation={c.explanation}
                          category={c.category ?? 'grammar'}
                          correctionIndex={i}
                          language={language}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Key expressions */}
                {analysis.expressionsToLearn?.length > 0 && (
                  <Card variant="default" padding="md">
                    <h3 className="text-sm font-bold text-neutral-900 dark:text-white mb-3">
                      {language === 'ko' ? '핵심 표현' : 'Key Expressions'}
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {analysis.expressionsToLearn.map((exp: string, i: number) => (
                        <span key={i} className="px-3 py-1.5 bg-primary-50 dark:bg-primary-500/10 text-primary-700 dark:text-primary-300 rounded-xl text-sm border border-primary-100 dark:border-primary-500/20">
                          {exp}
                        </span>
                      ))}
                    </div>
                  </Card>
                )}

                {/* Overall feedback quote */}
                {analysis.overallFeedback && (
                  <div className="p-5 rounded-card-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/25">
                    <p className="text-neutral-800 dark:text-neutral-200 text-sm italic leading-relaxed">
                      &ldquo;{analysis.overallFeedback}&rdquo;
                    </p>
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-2 font-medium">— {moderator.name}</p>
                  </div>
                )}
              </>
            )}

            {!analysis && (
              <div className="text-center py-8">
                <p className="text-neutral-500 dark:text-neutral-400 text-sm">
                  {language === 'ko' ? '분석 결과를 불러올 수 없어요' : 'Could not load analysis results'}
                </p>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-3 pb-4">
              <button
                onClick={() => router.push('/')}
                className="pressable flex-1 py-3.5 rounded-2xl font-semibold text-sm bg-neutral-100 dark:bg-white/[0.06] text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-white/[0.08] hover:bg-neutral-200 dark:hover:bg-white/[0.10] transition-colors"
              >
                {language === 'ko' ? '홈으로' : 'Home'}
              </button>
              <button
                onClick={() => {
                  setPhase('preparation');
                  setMessages([]);
                  setAnalysis(null);
                  setTopic(null);
                  setTurnList([]);
                  turnIndexRef.current = 0;
                  setTurnIndex(0);
                  setPrepTimeLeft(PHASE_CONFIG.preparation.thinkTime);
                  debateStartedRef.current = false;
                  processingRef.current = false;
                  setIsUserTurn(false);
                  setActiveSpeaker(null);
                  initializeDebate();
                }}
                className="pressable flex-1 py-3.5 rounded-2xl font-bold text-sm bg-brand-gradient text-white shadow-lg shadow-primary-500/30 hover:opacity-95 transition-opacity"
              >
                {language === 'ko' ? '새 토론' : 'New Debate'}
              </button>
            </div>
          </div>
        )}
      </main>

      {/* ─── Exit confirm modal ───────────────────────────────────────────────── */}
      {showExitConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="exit-confirm-title">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowExitConfirm(false)}
          />
          <Card variant="elevated" padding="lg" className="relative w-full max-w-xs text-center motion-safe:animate-ds-scale-in">
            <div className="w-14 h-14 mx-auto mb-4 bg-amber-100 dark:bg-amber-500/20 rounded-full flex items-center justify-center">
              <svg className="w-7 h-7 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 id="exit-confirm-title" className="text-base font-bold text-neutral-900 dark:text-white mb-2">
              {t.exitSessionTitle}
            </h3>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-5">
              {t.exitSessionMessage}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowExitConfirm(false)}
                className="pressable flex-1 py-2.5 px-4 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 font-medium text-sm hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
              >
                {t.exitSessionCancel}
              </button>
              <button
                onClick={() => { setShowExitConfirm(false); router.push('/'); }}
                className="pressable flex-1 py-2.5 px-4 rounded-xl bg-red-500 text-white font-bold text-sm hover:bg-red-600 transition-colors"
              >
                {t.exitSessionConfirm}
              </button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

export default function DebatePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-dark-bg">
        <div className="flex gap-2">
          <div className="loading-dot" />
          <div className="loading-dot" />
          <div className="loading-dot" />
        </div>
      </div>
    }>
      <DebateContent />
    </Suspense>
  );
}
