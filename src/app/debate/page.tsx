'use client';

import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/lib/i18n';
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


// Build the full structured turn order for the debate
function buildTurnOrder(
  participants: DebateParticipant[],
  userTeam: DebateTeam
): DebateTurn[] {
  const turns: DebateTurn[] = [];
  const proMembers = participants.filter(p => p.team === 'pro');
  const conMembers = participants.filter(p => p.team === 'con');
  const mod = participants.find(p => p.team === 'moderator');

  // Opening: Moderator intro → Pro1 → Con1 → Pro2 → Con2
  if (mod) turns.push({ speakerId: mod.id, phase: 'opening', roundIndex: 0, timeLimitSec: 15, label: 'Introduction' });
  turns.push({ speakerId: proMembers[0]?.id || '', phase: 'opening', roundIndex: 0, timeLimitSec: PHASE_CONFIG.opening.timeLimitSec, label: 'Opening Statement' });
  turns.push({ speakerId: conMembers[0]?.id || '', phase: 'opening', roundIndex: 0, timeLimitSec: PHASE_CONFIG.opening.timeLimitSec, label: 'Opening Statement' });
  turns.push({ speakerId: proMembers[1]?.id || '', phase: 'opening', roundIndex: 0, timeLimitSec: PHASE_CONFIG.opening.timeLimitSec, label: 'Opening Statement' });
  turns.push({ speakerId: conMembers[1]?.id || '', phase: 'opening', roundIndex: 0, timeLimitSec: PHASE_CONFIG.opening.timeLimitSec, label: 'Opening Statement' });

  // Rebuttal Round 1: Moderator → Con1 → Pro1 → Con2 → Pro2
  if (mod) turns.push({ speakerId: mod.id, phase: 'rebuttal', roundIndex: 0, timeLimitSec: 10, label: 'Round 1 Transition' });
  turns.push({ speakerId: conMembers[0]?.id || '', phase: 'rebuttal', roundIndex: 0, timeLimitSec: PHASE_CONFIG.rebuttal.timeLimitSec, label: 'Rebuttal Round 1' });
  turns.push({ speakerId: proMembers[0]?.id || '', phase: 'rebuttal', roundIndex: 0, timeLimitSec: PHASE_CONFIG.rebuttal.timeLimitSec, label: 'Rebuttal Round 1' });
  turns.push({ speakerId: conMembers[1]?.id || '', phase: 'rebuttal', roundIndex: 0, timeLimitSec: PHASE_CONFIG.rebuttal.timeLimitSec, label: 'Rebuttal Round 1' });
  turns.push({ speakerId: proMembers[1]?.id || '', phase: 'rebuttal', roundIndex: 0, timeLimitSec: PHASE_CONFIG.rebuttal.timeLimitSec, label: 'Rebuttal Round 1' });

  // Rebuttal Round 2: Moderator → Pro1 → Con1 → Pro2 → Con2
  if (mod) turns.push({ speakerId: mod.id, phase: 'rebuttal', roundIndex: 1, timeLimitSec: 10, label: 'Round 2 Transition' });
  turns.push({ speakerId: proMembers[0]?.id || '', phase: 'rebuttal', roundIndex: 1, timeLimitSec: PHASE_CONFIG.rebuttal.timeLimitSec, label: 'Rebuttal Round 2' });
  turns.push({ speakerId: conMembers[0]?.id || '', phase: 'rebuttal', roundIndex: 1, timeLimitSec: PHASE_CONFIG.rebuttal.timeLimitSec, label: 'Rebuttal Round 2' });
  turns.push({ speakerId: proMembers[1]?.id || '', phase: 'rebuttal', roundIndex: 1, timeLimitSec: PHASE_CONFIG.rebuttal.timeLimitSec, label: 'Rebuttal Round 2' });
  turns.push({ speakerId: conMembers[1]?.id || '', phase: 'rebuttal', roundIndex: 1, timeLimitSec: PHASE_CONFIG.rebuttal.timeLimitSec, label: 'Rebuttal Round 2' });

  // Closing: Moderator → Con1 → Con2 → Pro1 → Pro2 (opposing team first, user's team last)
  if (mod) turns.push({ speakerId: mod.id, phase: 'closing', roundIndex: 0, timeLimitSec: 10, label: 'Closing Transition' });
  const firstClosing = userTeam === 'pro' ? conMembers : proMembers;
  const lastClosing = userTeam === 'pro' ? proMembers : conMembers;
  turns.push({ speakerId: firstClosing[0]?.id || '', phase: 'closing', roundIndex: 0, timeLimitSec: PHASE_CONFIG.closing.timeLimitSec, label: 'Closing Argument' });
  turns.push({ speakerId: firstClosing[1]?.id || '', phase: 'closing', roundIndex: 0, timeLimitSec: PHASE_CONFIG.closing.timeLimitSec, label: 'Closing Argument' });
  turns.push({ speakerId: lastClosing[0]?.id || '', phase: 'closing', roundIndex: 0, timeLimitSec: PHASE_CONFIG.closing.timeLimitSec, label: 'Closing Argument' });
  turns.push({ speakerId: lastClosing[1]?.id || '', phase: 'closing', roundIndex: 0, timeLimitSec: PHASE_CONFIG.closing.timeLimitSec, label: 'Closing Argument' });

  return turns.filter(t => t.speakerId);
}

function DebateContent() {
  const router = useRouter();
  const { language, t } = useLanguage();

  // Core state
  const [phase, setPhase] = useState<DebatePhase>('preparation');
  const [topic, setTopic] = useState<DebateTopic | null>(null);
  const [userTeam, setUserTeam] = useState<DebateTeam | null>(null);
  const [participants, setParticipants] = useState<DebateParticipant[]>([]);
  const [messages, setMessages] = useState<DebateMessage[]>([]);
  const [analysis, setAnalysis] = useState<DebateAnalysis | null>(null);

  // Turn management (ref-based to avoid stale closures)
  const [turnList, setTurnList] = useState<DebateTurn[]>([]);
  const turnIndexRef = useRef(0);
  const [turnIndex, setTurnIndex] = useState(0);

  // Timer
  const [prepTimeLeft, setPrepTimeLeft] = useState<number>(PHASE_CONFIG.preparation.thinkTime);
  const prepTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // UI state
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isUserTurn, setIsUserTurn] = useState(false);
  const [activeSpeaker, setActiveSpeaker] = useState<DebateParticipant | null>(null);

  // Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const debateStartedRef = useRef(false);
  const processingRef = useRef(false);
  const isInitializingRef = useRef(false);
  // Keep a ref in sync with messages to avoid stale closures in async callbacks
  const messagesRef = useRef<DebateMessage[]>([]);

  // Keep messagesRef in sync with messages state to avoid stale closures
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Initialize debate on mount
  useEffect(() => {
    initializeDebate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Preparation timer countdown
  useEffect(() => {
    if (phase === 'preparation' && topic) {
      // Clear any existing interval before starting a new one
      if (prepTimerRef.current) clearInterval(prepTimerRef.current);
      prepTimerRef.current = setInterval(() => {
        setPrepTimeLeft(prev => {
          if (prev <= 1) {
            if (prepTimerRef.current) {
              clearInterval(prepTimerRef.current);
              prepTimerRef.current = null;
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => {
        if (prepTimerRef.current) {
          clearInterval(prepTimerRef.current);
          prepTimerRef.current = null;
        }
      };
    }
  // Only re-run when phase or topic changes, not on every prepTimeLeft tick
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, topic]);

  const initializeDebate = async () => {
    if (isInitializingRef.current) return;
    isInitializingRef.current = true;

    try {
      // Fetch topic
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
        } else {
          selectedTopic = getDefaultTopic();
        }
      } catch {
        selectedTopic = getDefaultTopic();
      }
      setTopic(selectedTopic);

      // Random team assignment
      const team: DebateTeam = Math.random() < 0.5 ? 'pro' : 'con';
      setUserTeam(team);

      // Assign debaters to teams
      const shuffled = [...debaters].sort(() => Math.random() - 0.5);
      const partner = shuffled[0];
      const opponents = [shuffled[1], shuffled[2]];

      const participantList: DebateParticipant[] = [
        {
          id: 'moderator',
          name: moderator.name,
          team: 'moderator',
          isUser: false,
          voice: moderator.voice,
          gradient: moderator.gradient,
          avatar: moderator.avatar,
        },
        {
          id: 'user',
          name: language === 'ko' ? '나' : 'You',
          team: team,
          isUser: true,
          voice: '',
          gradient: 'from-indigo-400 to-purple-500',
          avatar: 'U',
        },
        {
          id: partner.id,
          name: partner.name,
          team: team,
          isUser: false,
          voice: partner.voice,
          gradient: partner.gradient,
          avatar: partner.avatar,
        },
        {
          id: opponents[0].id,
          name: opponents[0].name,
          team: team === 'pro' ? 'con' : 'pro',
          isUser: false,
          voice: opponents[0].voice,
          gradient: opponents[0].gradient,
          avatar: opponents[0].avatar,
        },
        {
          id: opponents[1].id,
          name: opponents[1].name,
          team: team === 'pro' ? 'con' : 'pro',
          isUser: false,
          voice: opponents[1].voice,
          gradient: opponents[1].gradient,
          avatar: opponents[1].avatar,
        },
      ];

      setParticipants(participantList);
    } finally {
      isInitializingRef.current = false;
    }
  };

  const getDefaultTopic = (): DebateTopic => ({
    id: 'default-1',
    category: 'daily',
    title: { en: 'Technology makes life better', ko: '기술이 삶을 더 좋게 만든다' },
    description: { en: 'Discuss whether technology has improved our daily lives.', ko: '기술이 우리의 일상생활을 향상시켰는지 토론합니다.' },
  });

  // Start the actual debate (after preparation)
  const startDebate = () => {
    if (debateStartedRef.current || !participants.length || !userTeam) return;
    debateStartedRef.current = true;

    if (prepTimerRef.current) clearInterval(prepTimerRef.current);

    const turns = buildTurnOrder(participants, userTeam);
    setTurnList(turns);
    turnIndexRef.current = 0;
    setTurnIndex(0);
    setPhase('opening');

    // Start first turn
    setTimeout(() => executeTurn(turns, 0, participants), 500);
  };

  // Execute a specific turn
  const executeTurn = async (turns: DebateTurn[], idx: number, parts: DebateParticipant[]) => {
    if (idx >= turns.length || processingRef.current) {
      // All turns done → analysis
      if (idx >= turns.length) {
        startAnalysis();
      }
      return;
    }

    const turn = turns[idx];
    const speaker = parts.find(p => p.id === turn.speakerId);
    if (!speaker) {
      // Skip invalid speaker, move to next
      advanceTurn(turns, idx, parts);
      return;
    }

    // Update phase if changed
    setPhase(turn.phase);
    setActiveSpeaker(speaker);
    turnIndexRef.current = idx;
    setTurnIndex(idx);

    if (speaker.isUser) {
      // User's turn
      setIsUserTurn(true);
      return; // Wait for user input
    }

    // AI speaker's turn
    processingRef.current = true;
    setIsProcessing(true);

    try {
      const response = await fetch('/api/debate-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: messagesRef.current,
          topic,
          currentSpeakerId: speaker.id,
          speakerTeam: speaker.team,
          phase: turn.phase,
          roundIndex: turn.roundIndex,
          userTeam,
          language,
        }),
      });
      if (!response.ok) {
        console.error('AI debate-chat failed:', response.status);
        return;
      }
      const data = await response.json();

      if (data.message) {
        const newMsg: DebateMessage = {
          role: 'assistant',
          content: data.message,
          speakerId: speaker.id,
          speakerName: speaker.name,
          team: speaker.team,
          phase: turn.phase,
          roundIndex: turn.roundIndex,
        };

        setMessages(prev => [...prev, newMsg]);

        // Play TTS and wait for completion
        await playTTSAndWait(data.message, speaker.voice);
      }
    } catch (error) {
      console.error('AI response error:', error);
    } finally {
      setIsProcessing(false);
      processingRef.current = false;
    }

    // Advance to next turn
    advanceTurn(turns, idx, parts);
  };

  const advanceTurn = (turns: DebateTurn[], currentIdx: number, parts: DebateParticipant[]) => {
    const nextIdx = currentIdx + 1;
    if (nextIdx >= turns.length) {
      startAnalysis();
      return;
    }
    setTimeout(() => executeTurn(turns, nextIdx, parts), 800);
  };

  // TTS that returns a promise resolving when audio finishes playing
  const playTTSAndWait = (text: string, voice: string): Promise<void> => {
    if (!voice) return Promise.resolve();

    return new Promise<void>(async (resolve) => {
      setIsPlaying(true);
      try {
        const response = await fetch('/api/text-to-speech', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, voice }),
        });

        if (!response.ok) {
          console.error('TTS error:', response.status);
          setIsPlaying(false);
          resolve();
          return;
        }
        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);

        if (audioRef.current) {
          audioRef.current.onended = () => {
            setIsPlaying(false);
            URL.revokeObjectURL(audioUrl);
            resolve();
          };
          audioRef.current.onerror = () => {
            setIsPlaying(false);
            URL.revokeObjectURL(audioUrl);
            resolve();
          };
          audioRef.current.src = audioUrl;
          await audioRef.current.play();
        } else {
          setIsPlaying(false);
          resolve();
        }
      } catch (error) {
        console.error('TTS error:', error);
        setIsPlaying(false);
        resolve();
      }
    });
  };

  // Recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : 'audio/mp4';

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];
      setIsRecording(true);

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        setIsRecording(false);
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        stream.getTracks().forEach(track => track.stop());
        await processUserAudio(blob);
      };

      recorder.start(1000);
    } catch (error) {
      console.error('Recording error:', error);
      setIsRecording(false);
    }
  };

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  }, []);

  const processUserAudio = async (audioBlob: Blob) => {
    setIsProcessing(true);
    setIsUserTurn(false);

    try {
      const ext = audioBlob.type.includes('mp4') ? 'mp4' : 'webm';
      const file = new File([audioBlob], `audio.${ext}`, { type: audioBlob.type });
      const formData = new FormData();
      formData.append('audio', file);

      const sttResponse = await fetch('/api/speech-to-text', {
        method: 'POST',
        body: formData,
      });
      if (!sttResponse.ok) {
        console.error('STT error:', sttResponse.status);
        setIsProcessing(false);
        setIsUserTurn(true);
        return;
      }
      const sttData = await sttResponse.json();

      if (sttData.text?.trim()) {
        const user = participants.find(p => p.isUser);
        if (user) {
          const currentTurn = turnList[turnIndexRef.current];
          const newMsg: DebateMessage = {
            role: 'user',
            content: sttData.text,
            speakerId: 'user',
            speakerName: user.name,
            team: user.team,
            phase: currentTurn?.phase || phase,
            roundIndex: currentTurn?.roundIndex,
          };
          setMessages(prev => [...prev, newMsg]);
        }

        setIsProcessing(false);
        // Advance to next turn
        advanceTurn(turnList, turnIndexRef.current, participants);
      } else {
        setIsProcessing(false);
        setIsUserTurn(true); // Let user try again
      }
    } catch (error) {
      console.error('Audio processing error:', error);
      setIsProcessing(false);
      setIsUserTurn(true);
    }
  };

  // Skip user turn (type text instead or pass)
  const skipUserTurn = () => {
    setIsUserTurn(false);
    const user = participants.find(p => p.isUser);
    if (user) {
      const currentTurn = turnList[turnIndexRef.current];
      const newMsg: DebateMessage = {
        role: 'user',
        content: t.passedThisTurn,
        speakerId: 'user',
        speakerName: user.name,
        team: user.team,
        phase: currentTurn?.phase || phase,
        roundIndex: currentTurn?.roundIndex,
      };
      setMessages(prev => [...prev, newMsg]);
    }
    advanceTurn(turnList, turnIndexRef.current, participants);
  };

  // Analysis phase
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
      if (!response.ok) {
        console.error('Debate analysis failed:', response.status);
        setPhase('result');
        return;
      }
      const data = await response.json();

      if (data.analysis) {
        setAnalysis(data.analysis);
        setPhase('result');
      } else {
        setPhase('result');
      }
    } catch (error) {
      console.error('Analysis error:', error);
      setPhase('result');
    } finally {
      setIsProcessing(false);
    }
  };

  // Helper: format time
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // Helper: get participant by ID
  const getParticipant = (id: string) => participants.find(p => p.id === id);

  // Helper: get phase display text
  const getPhaseText = () => {
    switch (phase) {
      case 'preparation': return language === 'ko' ? 'Preparation' : 'Preparation';
      case 'opening': return language === 'ko' ? 'Opening Statements' : 'Opening Statements';
      case 'rebuttal': return language === 'ko' ? 'Rebuttals' : 'Rebuttals';
      case 'closing': return language === 'ko' ? 'Closing Arguments' : 'Closing Arguments';
      case 'analysis': return language === 'ko' ? 'Judging...' : 'Judging...';
      case 'result': return language === 'ko' ? 'Results' : 'Results';
      default: return '';
    }
  };

  const getCategoryText = (category: DebateCategory) => {
    const map: Record<string, string> = {
      daily: language === 'ko' ? '일상' : 'Daily Life',
      school: language === 'ko' ? '학교' : 'School',
      technology: language === 'ko' ? '기술' : 'Technology',
      society: language === 'ko' ? '사회' : 'Society',
      environment: language === 'ko' ? '환경' : 'Environment',
      culture: language === 'ko' ? '문화' : 'Culture',
      sports: language === 'ko' ? '스포츠' : 'Sports',
      ethics: language === 'ko' ? '윤리' : 'Ethics',
      social: language === 'ko' ? '사회' : 'Social',
      politics: language === 'ko' ? '정치' : 'Politics',
      international: language === 'ko' ? '국제' : 'International',
    };
    return map[category] || category;
  };

  // Calculate debate progress
  const totalTurns = turnList.length;
  const progressPercent = totalTurns > 0 ? Math.round((turnIndex / totalTurns) * 100) : 0;

  // Score bar component
  const ScoreBar = ({ label, score, max = 20 }: { label: string; score: number; max?: number }) => (
    <div className="flex items-center gap-3">
      <span className="text-xs text-neutral-500 dark:text-neutral-400 w-28 text-right">{label}</span>
      <div className="flex-1 h-2 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-primary-400 to-primary-600 rounded-full transition-all duration-500"
          style={{ width: `${(score / max) * 100}%` }}
        />
      </div>
      <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300 w-8">{score}/{max}</span>
    </div>
  );

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-dark-bg flex flex-col">
      <audio ref={audioRef} />

      {/* ===== HEADER ===== */}
      <header className="bg-white/90 dark:bg-dark-surface/90 backdrop-blur-md border-b border-neutral-200 dark:border-neutral-800 px-4 py-3 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto">
          {/* Top row: back + phase + progress */}
          <div className="flex items-center justify-between mb-2">
            <button onClick={() => router.push('/')} className="text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 p-1">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="text-center">
              <span className="text-sm font-semibold text-neutral-900 dark:text-white">{getPhaseText()}</span>
            </div>
            <div className="w-8 text-right">
              {phase !== 'preparation' && phase !== 'analysis' && phase !== 'result' && (
                <span className="text-xs text-neutral-400">{progressPercent}%</span>
              )}
            </div>
          </div>

          {/* Progress bar */}
          {phase !== 'preparation' && phase !== 'result' && (
            <div className="h-1 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-green-400 to-blue-500 rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          )}

          {/* Topic + Team position (always visible during debate) */}
          {topic && phase !== 'preparation' && phase !== 'result' && (
            <div className="flex items-center justify-between mt-2">
              <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate flex-1">
                {language === 'ko' ? topic.title.ko : topic.title.en}
              </p>
              {userTeam && (
                <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-medium ${
                  userTeam === 'pro'
                    ? 'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-300'
                    : 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300'
                }`}>
                  {userTeam === 'pro' ? 'PRO' : 'CON'}
                </span>
              )}
            </div>
          )}
        </div>
      </header>

      {/* ===== MAIN CONTENT ===== */}
      <main id="main-content" className="flex-1 flex flex-col max-w-4xl mx-auto w-full">

        {/* ========== PREPARATION PHASE ========== */}
        {phase === 'preparation' && topic && (
          <div className="flex-1 flex flex-col p-4 sm:p-6 lg:p-8 overflow-y-auto lg:max-w-4xl lg:mx-auto lg:w-full">
            {/* Timer */}
            <div className="text-center mb-6">
              <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${
                prepTimeLeft <= 30
                  ? 'bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400'
                  : 'bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400'
              }`}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="font-mono font-bold text-lg">{formatTime(prepTimeLeft)}</span>
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                {language === 'ko' ? '논리를 구상하세요' : 'Prepare your arguments'}
              </p>
            </div>

            {/* Topic Card */}
            <div className="bg-white dark:bg-dark-surface rounded-2xl p-5 sm:p-6 shadow-sm dark:shadow-none dark:border dark:border-neutral-800 mb-4">
              <span className="px-3 py-1 bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 rounded-full text-xs font-medium">
                {getCategoryText(topic.category)}
              </span>
              <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-neutral-900 dark:text-white mt-3 mb-2">
                {language === 'ko' ? topic.title.ko : topic.title.en}
              </h2>
              <p className="text-neutral-600 dark:text-neutral-400 text-sm">
                {language === 'ko' ? topic.description.ko : topic.description.en}
              </p>
            </div>

            {/* Team Assignment */}
            {userTeam && (
              <div className={`rounded-2xl p-4 mb-4 ${
                userTeam === 'pro'
                  ? 'bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/30'
                  : 'bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30'
              }`}>
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white ${
                    userTeam === 'pro' ? 'bg-green-500' : 'bg-red-500'
                  }`}>
                    {userTeam === 'pro' ? 'P' : 'C'}
                  </div>
                  <div>
                    <p className="font-semibold text-neutral-900 dark:text-white">
                      {language === 'ko'
                        ? `당신은 ${userTeam === 'pro' ? '찬성' : '반대'}팀입니다`
                        : `You are on the ${userTeam === 'pro' ? 'PRO' : 'CON'} team`
                      }
                    </p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                      {userTeam === 'pro'
                        ? (language === 'ko' ? '이 주장을 지지하세요' : 'Support this statement')
                        : (language === 'ko' ? '이 주장에 반대하세요' : 'Oppose this statement')
                      }
                    </p>
                  </div>
                </div>

                {/* Team members */}
                <div className="grid grid-cols-2 sm:grid-cols-2 gap-3 sm:gap-4">
                  {/* Your team */}
                  <div>
                    <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-2">
                      {language === 'ko' ? '우리 팀' : 'Your Team'}
                    </p>
                    <div className="space-y-2">
                      {participants.filter(p => p.team === userTeam).map(p => (
                        <div key={p.id} className="flex items-center gap-2">
                          <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${p.gradient} flex items-center justify-center`}>
                            <span className="text-white text-xs font-bold">{p.avatar}</span>
                          </div>
                          <span className="text-sm text-neutral-700 dark:text-neutral-300">
                            {p.name} {p.isUser && (language === 'ko' ? '(나)' : '(You)')}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                  {/* Opposing team */}
                  <div>
                    <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-2">
                      {language === 'ko' ? '상대 팀' : 'Opponents'}
                    </p>
                    <div className="space-y-2">
                      {participants.filter(p => p.team !== userTeam && p.team !== 'moderator').map(p => (
                        <div key={p.id} className="flex items-center gap-2">
                          <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${p.gradient} flex items-center justify-center`}>
                            <span className="text-white text-xs font-bold">{p.avatar}</span>
                          </div>
                          <span className="text-sm text-neutral-700 dark:text-neutral-300">{p.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Key vocabulary hints */}
            {(topic.keyVocabulary?.length || topic.proHints?.length || topic.conHints?.length) && (
              <div className="bg-white dark:bg-dark-surface rounded-2xl p-4 shadow-sm dark:shadow-none dark:border dark:border-neutral-800 mb-4">
                <h3 className="text-sm font-semibold text-neutral-900 dark:text-white mb-3">
                  {language === 'ko' ? '유용한 표현' : 'Useful Expressions'}
                </h3>
                {topic.keyVocabulary && topic.keyVocabulary.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {topic.keyVocabulary.map((v, i) => (
                      <span key={i} className="px-2 py-1 bg-primary-50 dark:bg-primary-500/10 text-primary-700 dark:text-primary-300 rounded-lg text-xs">
                        {v}
                      </span>
                    ))}
                  </div>
                )}
                {userTeam === 'pro' && topic.proHints && topic.proHints.length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs text-green-600 dark:text-green-400 font-medium mb-1">
                      {language === 'ko' ? '찬성 논거 힌트:' : 'PRO argument hints:'}
                    </p>
                    <ul className="space-y-1">
                      {topic.proHints.map((h, i) => (
                        <li key={i} className="text-xs text-neutral-600 dark:text-neutral-400">- {h}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {userTeam === 'con' && topic.conHints && topic.conHints.length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs text-red-600 dark:text-red-400 font-medium mb-1">
                      {language === 'ko' ? '반대 논거 힌트:' : 'CON argument hints:'}
                    </p>
                    <ul className="space-y-1">
                      {topic.conHints.map((h, i) => (
                        <li key={i} className="text-xs text-neutral-600 dark:text-neutral-400">- {h}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Moderator info */}
            <div className="flex items-center gap-2 mb-4 px-2">
              <div className={`w-6 h-6 rounded-md bg-gradient-to-br ${moderator.gradient} flex items-center justify-center`}>
                <span className="text-white text-xs font-bold">{moderator.avatar}</span>
              </div>
              <span className="text-xs text-neutral-500 dark:text-neutral-400">
                Moderator: {moderator.name}
              </span>
            </div>

            {/* Start button */}
            <button
              onClick={startDebate}
              className="btn-primary py-4 text-base font-semibold rounded-2xl"
            >
              {prepTimeLeft > 0
                ? (language === 'ko' ? 'Start Debate' : 'Start Debate')
                : (language === 'ko' ? 'Start Debate' : 'Start Debate')
              }
            </button>
          </div>
        )}

        {/* ========== DEBATE PHASES (opening, rebuttal, closing) ========== */}
        {(phase === 'opening' || phase === 'rebuttal' || phase === 'closing') && (
          <>
            {/* Team bar */}
            <div className="px-4 py-2 bg-white dark:bg-dark-surface border-b border-neutral-100 dark:border-neutral-800">
              <div className="flex items-center justify-between">
                {/* Pro Team */}
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-green-600 font-medium">PRO</span>
                  {participants.filter(p => p.team === 'pro').map(p => (
                    <div
                      key={p.id}
                      className={`w-7 h-7 rounded-lg bg-gradient-to-br ${p.gradient} flex items-center justify-center transition-all ${
                        activeSpeaker?.id === p.id ? 'ring-2 ring-green-500 ring-offset-1 scale-110' : 'opacity-60'
                      }`}
                    >
                      <span className="text-white text-xs font-bold">{p.avatar}</span>
                    </div>
                  ))}
                </div>

                <span className="text-neutral-300 dark:text-neutral-600 font-bold text-xs">VS</span>

                {/* Con Team */}
                <div className="flex items-center gap-1.5">
                  {participants.filter(p => p.team === 'con').map(p => (
                    <div
                      key={p.id}
                      className={`w-7 h-7 rounded-lg bg-gradient-to-br ${p.gradient} flex items-center justify-center transition-all ${
                        activeSpeaker?.id === p.id ? 'ring-2 ring-red-500 ring-offset-1 scale-110' : 'opacity-60'
                      }`}
                    >
                      <span className="text-white text-xs font-bold">{p.avatar}</span>
                    </div>
                  ))}
                  <span className="text-xs text-red-600 font-medium">CON</span>
                </div>
              </div>
            </div>

            {/* Chat-style message list */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">
              {messages.map((msg, i) => {
                const speaker = getParticipant(msg.speakerId);
                const isUser = msg.role === 'user';
                const isModerator = msg.team === 'moderator';
                const isPro = msg.team === 'pro';

                return (
                  <div key={i} className={`flex gap-2 ${isUser ? 'flex-row-reverse' : ''}`}>
                    {/* Avatar */}
                    <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${speaker?.gradient || 'from-gray-400 to-gray-500'} flex items-center justify-center flex-shrink-0`}>
                      <span className="text-white text-xs font-bold">{speaker?.avatar || '?'}</span>
                    </div>

                    {/* Message bubble */}
                    <div className={`max-w-[75%] ${isUser ? 'items-end' : ''}`}>
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                          {msg.speakerName}
                        </span>
                        {!isModerator && (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                            isPro
                              ? 'bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400'
                              : 'bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400'
                          }`}>
                            {isPro ? 'PRO' : 'CON'}
                          </span>
                        )}
                        <span className="text-[10px] text-neutral-400">{msg.phase}</span>
                      </div>
                      <div className={`rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                        isUser
                          ? 'bg-primary-500 text-white rounded-tr-md'
                          : isModerator
                            ? 'bg-neutral-200 dark:bg-neutral-700 text-neutral-800 dark:text-neutral-200 rounded-tl-md'
                            : isPro
                              ? 'bg-green-50 dark:bg-green-500/10 text-neutral-800 dark:text-neutral-200 border border-green-200 dark:border-green-500/20 rounded-tl-md'
                              : 'bg-red-50 dark:bg-red-500/10 text-neutral-800 dark:text-neutral-200 border border-red-200 dark:border-red-500/20 rounded-tl-md'
                      }`}>
                        {msg.content}
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Processing indicator */}
              {isProcessing && activeSpeaker && !isUserTurn && (
                <div className="flex gap-2">
                  <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${activeSpeaker.gradient} flex items-center justify-center flex-shrink-0`}>
                    <span className="text-white text-xs font-bold">{activeSpeaker.avatar}</span>
                  </div>
                  <div>
                    <span className="text-xs text-neutral-500 dark:text-neutral-400">{activeSpeaker.name}</span>
                    <div className="flex gap-1.5 mt-1">
                      <div className="w-2 h-2 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}

              {/* Playing indicator */}
              {isPlaying && activeSpeaker && (
                <div className="flex items-center gap-1 ml-10">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="w-1 bg-primary-400 rounded-full animate-pulse" style={{ height: `${8 + Math.random() * 12}px`, animationDelay: `${i * 100}ms` }} />
                  ))}
                </div>
              )}

              <div ref={chatEndRef} />
            </div>

            {/* User input area */}
            {isUserTurn && (
              <div className="p-4 bg-white dark:bg-dark-surface border-t border-neutral-200 dark:border-neutral-800">
                <div className="max-w-lg mx-auto">
                  <div className="text-center mb-3">
                    <p className="text-sm font-semibold text-amber-600 dark:text-amber-400">
                      {language === 'ko' ? 'Your Turn!' : 'Your Turn!'}
                    </p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                      {turnList[turnIndexRef.current]?.label || ''}
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={isRecording ? stopRecording : startRecording}
                      disabled={isProcessing}
                      className={`flex-1 py-3 rounded-2xl font-medium flex items-center justify-center gap-2 transition-all ${
                        isRecording
                          ? 'bg-red-500 text-white animate-pulse'
                          : 'btn-primary'
                      }`}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                      </svg>
                      {isRecording
                        ? (language === 'ko' ? 'Stop' : 'Stop')
                        : (language === 'ko' ? 'Speak' : 'Speak')
                      }
                    </button>
                    <button
                      onClick={skipUserTurn}
                      className="px-4 py-3 rounded-2xl text-sm text-neutral-500 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                    >
                      {language === 'ko' ? 'Pass' : 'Pass'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* ========== ANALYSIS PHASE ========== */}
        {phase === 'analysis' && (
          <div className="flex-1 flex flex-col items-center justify-center p-6">
            <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${moderator.gradient} flex items-center justify-center mb-4`}>
              <span className="text-white text-2xl font-bold">{moderator.avatar}</span>
            </div>
            <h2 className="text-lg font-bold text-neutral-900 dark:text-white mb-2">
              {language === 'ko' ? '심사 중...' : 'Judging...'}
            </h2>
            <p className="text-neutral-500 dark:text-neutral-400 text-sm mb-6">
              {language === 'ko' ? '토론 내용을 분석하고 있습니다' : 'Analyzing the debate performance'}
            </p>
            <div className="flex gap-2">
              <div className="w-2 h-2 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}

        {/* ========== RESULT PHASE ========== */}
        {phase === 'result' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">

            {/* Winner announcement */}
            {analysis && (
              <>
                <div className="text-center mb-6">
                  <div className={`inline-flex items-center gap-2 px-6 py-3 rounded-2xl text-lg font-bold ${
                    analysis.winner === userTeam
                      ? 'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-300'
                      : 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300'
                  }`}>
                    {analysis.winner === userTeam
                      ? (language === 'ko' ? 'Victory!' : 'Victory!')
                      : (language === 'ko' ? 'Defeat' : 'Defeat')
                    }
                  </div>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-2 max-w-md mx-auto">
                    {analysis.judgmentReason}
                  </p>
                </div>

                {/* Score comparison */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  {/* Pro Score */}
                  <div className={`bg-white dark:bg-dark-surface rounded-2xl p-4 shadow-sm dark:shadow-none dark:border dark:border-neutral-800 ${analysis.winner === 'pro' ? 'ring-2 ring-green-400' : ''}`}>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-semibold text-green-600">PRO</span>
                      <span className="text-2xl font-bold text-neutral-900 dark:text-white">{analysis.proScore?.total || 0}</span>
                    </div>
                    <div className="space-y-2">
                      <ScoreBar label={language === 'ko' ? '명확성' : 'Clarity'} score={analysis.proScore?.clarity || 0} />
                      <ScoreBar label={language === 'ko' ? '논거' : 'Evidence'} score={analysis.proScore?.evidence || 0} />
                      <ScoreBar label={language === 'ko' ? '반박력' : 'Rebuttal'} score={analysis.proScore?.rebuttal || 0} />
                      <ScoreBar label={language === 'ko' ? '응답성' : 'Response'} score={analysis.proScore?.responsiveness || 0} />
                      <ScoreBar label={language === 'ko' ? '언어력' : 'Language'} score={analysis.proScore?.language || 0} />
                    </div>
                  </div>

                  {/* Con Score */}
                  <div className={`bg-white dark:bg-dark-surface rounded-2xl p-4 shadow-sm dark:shadow-none dark:border dark:border-neutral-800 ${analysis.winner === 'con' ? 'ring-2 ring-red-400' : ''}`}>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-semibold text-red-600">CON</span>
                      <span className="text-2xl font-bold text-neutral-900 dark:text-white">{analysis.conScore?.total || 0}</span>
                    </div>
                    <div className="space-y-2">
                      <ScoreBar label={language === 'ko' ? '명확성' : 'Clarity'} score={analysis.conScore?.clarity || 0} />
                      <ScoreBar label={language === 'ko' ? '논거' : 'Evidence'} score={analysis.conScore?.evidence || 0} />
                      <ScoreBar label={language === 'ko' ? '반박력' : 'Rebuttal'} score={analysis.conScore?.rebuttal || 0} />
                      <ScoreBar label={language === 'ko' ? '응답성' : 'Response'} score={analysis.conScore?.responsiveness || 0} />
                      <ScoreBar label={language === 'ko' ? '언어력' : 'Language'} score={analysis.conScore?.language || 0} />
                    </div>
                  </div>
                </div>

                {/* User Performance */}
                <div className="bg-white dark:bg-dark-surface rounded-2xl p-4 sm:p-5 shadow-sm dark:shadow-none dark:border dark:border-neutral-800 mb-4">
                  <h3 className="font-semibold text-neutral-900 dark:text-white mb-3">
                    {language === 'ko' ? '개인 피드백' : 'Your Performance'}
                  </h3>
                  {analysis.userPerformance?.strengths?.length > 0 && (
                    <div className="mb-3">
                      <p className="text-xs text-green-600 dark:text-green-400 font-medium mb-1">
                        {language === 'ko' ? '잘한 점' : 'Strengths'}
                      </p>
                      <ul className="space-y-1">
                        {analysis.userPerformance.strengths.map((s: string, i: number) => (
                          <li key={i} className="text-sm text-neutral-700 dark:text-neutral-300 flex items-start gap-2">
                            <span className="text-green-500 mt-0.5">*</span>{s}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {analysis.userPerformance?.improvements?.length > 0 && (
                    <div>
                      <p className="text-xs text-amber-600 dark:text-amber-400 font-medium mb-1">
                        {language === 'ko' ? '개선할 점' : 'Areas to Improve'}
                      </p>
                      <ul className="space-y-1">
                        {analysis.userPerformance.improvements.map((s: string, i: number) => (
                          <li key={i} className="text-sm text-neutral-700 dark:text-neutral-300 flex items-start gap-2">
                            <span className="text-amber-500 mt-0.5">*</span>{s}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Grammar Corrections */}
                {analysis.userPerformance?.grammarCorrections?.length > 0 && (
                  <div className="mb-4">
                    <h3 className="font-semibold text-neutral-900 dark:text-white mb-3 px-1">
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

                {/* Key Expressions */}
                {analysis.expressionsToLearn?.length > 0 && (
                  <div className="bg-white dark:bg-dark-surface rounded-2xl p-4 sm:p-5 shadow-sm dark:shadow-none dark:border dark:border-neutral-800 mb-4">
                    <h3 className="font-semibold text-neutral-900 dark:text-white mb-3">
                      {language === 'ko' ? '핵심 표현' : 'Key Expressions'}
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {analysis.expressionsToLearn.map((exp: string, i: number) => (
                        <span key={i} className="px-3 py-1.5 bg-primary-50 dark:bg-primary-500/10 text-primary-700 dark:text-primary-300 rounded-lg text-sm">
                          {exp}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Overall Feedback */}
                {analysis.overallFeedback && (
                  <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-500/10 dark:to-orange-500/10 rounded-2xl p-4 sm:p-5 mb-6">
                    <p className="text-neutral-800 dark:text-neutral-200 text-sm italic leading-relaxed">&ldquo;{analysis.overallFeedback}&rdquo;</p>
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">-- {moderator.name}</p>
                  </div>
                )}
              </>
            )}

            {!analysis && (
              <div className="text-center py-8">
                <p className="text-neutral-500 dark:text-neutral-400">
                  {language === 'ko' ? '분석 결과를 불러올 수 없습니다' : 'Could not load analysis results'}
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button onClick={() => router.push('/')} className="flex-1 btn-secondary py-3 rounded-2xl">
                {language === 'ko' ? 'Home' : 'Home'}
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
                className="flex-1 btn-primary py-3 rounded-2xl"
              >
                {language === 'ko' ? 'New Debate' : 'New Debate'}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function DebatePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-dark-bg">
        <div className="flex gap-2">
          <div className="w-2 h-2 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-2 h-2 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-2 h-2 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    }>
      <DebateContent />
    </Suspense>
  );
}
