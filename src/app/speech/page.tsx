'use client';

import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { personas } from '@/lib/personas';
import { useLanguage } from '@/lib/i18n';
import TutorAvatar from '@/components/TutorAvatar';
import { useDeepgramSTT } from '@/hooks/useDeepgramSTT';
import type { SpeechAnalysis } from '@/lib/speechCoachingTypes';

type Phase = 'ready' | 'recording' | 'analyzing' | 'report';

interface PreviousSession {
  id: string;
  session_number: number;
  tutor_id: string;
  analysis: SpeechAnalysis;
  focus_areas: string[];
  created_at: string;
  duration: number;
}

function SpeechContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { language } = useLanguage();
  const tutorId = searchParams.get('tutor') || 'emma';
  const persona = personas[tutorId];

  const [phase, setPhase] = useState<Phase>('ready');
  const [sessionNumber, setSessionNumber] = useState(1);
  const [previousSessions, setPreviousSessions] = useState<PreviousSession[]>([]);
  const [analysis, setAnalysis] = useState<SpeechAnalysis | null>(null);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingSessions, setLoadingSessions] = useState(true);

  // Recording state
  const [elapsedTime, setElapsedTime] = useState(0);
  const [liveTranscript, setLiveTranscript] = useState('');
  const recordingStartRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Deepgram STT
  const { connectDeepgram, closeDeepgram, sendToDeepgram, realtimeTranscriptRef } = useDeepgramSTT();

  // Transcript polling interval
  const transcriptPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch previous sessions on mount
  useEffect(() => {
    async function fetchSessions() {
      try {
        const res = await fetch('/api/speech-coaching/sessions');
        if (res.ok) {
          const data = await res.json();
          const sessions = (data.sessions || []) as PreviousSession[];
          const tutorSessions = sessions.filter(
            (s: PreviousSession) => s.tutor_id === tutorId,
          );
          setPreviousSessions(tutorSessions);
          setSessionNumber(tutorSessions.length + 1);
        }
      } catch {
        // Non-blocking, continue without history
      } finally {
        setLoadingSessions(false);
      }
    }
    fetchSessions();
  }, [tutorId]);

  const startRecording = useCallback(async () => {
    setError(null);
    try {
      const [stream] = await Promise.all([
        navigator.mediaDevices.getUserMedia({ audio: true }),
        connectDeepgram(),
      ]);

      streamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : 'audio/mp4';

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          sendToDeepgram(event.data);
        }
      };

      mediaRecorder.start(250); // send data every 250ms
      recordingStartRef.current = Date.now();
      setElapsedTime(0);
      setLiveTranscript('');
      setPhase('recording');

      // Start timer
      timerRef.current = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - recordingStartRef.current) / 1000));
      }, 1000);

      // Poll transcript updates
      transcriptPollRef.current = setInterval(() => {
        const current = realtimeTranscriptRef.current;
        if (current) {
          setLiveTranscript(current);
        }
      }, 500);
    } catch (e) {
      console.error('Failed to start recording:', e);
      setError(language === 'ko'
        ? '마이크 접근에 실패했습니다. 마이크 권한을 확인해주세요.'
        : 'Failed to access microphone. Please check permissions.');
    }
  }, [connectDeepgram, sendToDeepgram, realtimeTranscriptRef, language]);

  const stopRecording = useCallback(async () => {
    // Clear timers
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (transcriptPollRef.current) {
      clearInterval(transcriptPollRef.current);
      transcriptPollRef.current = null;
    }

    // Stop media recorder
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      recorder.stop();
    }

    // Stop microphone
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;

    // Close Deepgram and get final transcript
    closeDeepgram();

    // Wait a moment for final transcription
    await new Promise((r) => setTimeout(r, 500));

    const finalTranscript = realtimeTranscriptRef.current;
    const duration = Math.floor((Date.now() - recordingStartRef.current) / 1000);

    if (!finalTranscript || finalTranscript.trim().length < 10) {
      setError(language === 'ko'
        ? '음성이 충분히 인식되지 않았습니다. 더 길게 말해주세요.'
        : 'Not enough speech detected. Please speak for longer.');
      setPhase('ready');
      return;
    }

    if (duration < 10) {
      setError(language === 'ko'
        ? '최소 10초 이상 녹음해주세요.'
        : 'Please record for at least 10 seconds.');
      setPhase('ready');
      return;
    }

    // Analyze
    setPhase('analyzing');

    try {
      const lastSession = previousSessions[0];
      const body: Record<string, unknown> = {
        transcript: finalTranscript,
        tutorId,
        duration,
        sessionNumber,
        language,
      };
      if (lastSession) {
        body.previousAnalysis = lastSession.analysis;
        body.focusAreas = lastSession.focus_areas;
      }

      const res = await fetch('/api/speech-coaching/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        throw new Error('Analysis failed');
      }

      const data = await res.json();
      const speechAnalysis = data.analysis as SpeechAnalysis;
      setAnalysis(speechAnalysis);

      // Save session
      try {
        const saveRes = await fetch('/api/speech-coaching/sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tutorId,
            sessionNumber,
            transcript: finalTranscript,
            duration,
            analysis: speechAnalysis,
            focusAreas: [speechAnalysis.focusForNextSession],
          }),
        });
        if (saveRes.ok) {
          const saveData = await saveRes.json();
          setCurrentSessionId(saveData.id);
        }
      } catch {
        // Non-blocking
      }

      setPhase('report');
    } catch {
      setError(language === 'ko'
        ? '분석에 실패했습니다. 다시 시도해주세요.'
        : 'Analysis failed. Please try again.');
      setPhase('ready');
    }
  }, [closeDeepgram, realtimeTranscriptRef, previousSessions, tutorId, sessionNumber, language]);

  const startNextSession = useCallback(() => {
    if (analysis && currentSessionId) {
      setPreviousSessions((prev) => [
        {
          id: currentSessionId,
          session_number: sessionNumber,
          tutor_id: tutorId,
          analysis,
          focus_areas: [analysis.focusForNextSession],
          created_at: new Date().toISOString(),
          duration: elapsedTime,
        },
        ...prev,
      ]);
    }
    setSessionNumber((n) => n + 1);
    setAnalysis(null);
    setCurrentSessionId(null);
    setElapsedTime(0);
    setLiveTranscript('');
    setError(null);
    setPhase('ready');
  }, [analysis, currentSessionId, sessionNumber, tutorId, elapsedTime]);

  // Format time as MM:SS
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-yellow-500';
    if (score >= 40) return 'text-orange-500';
    return 'text-red-500';
  };

  const getScoreBg = (score: number) => {
    if (score >= 80) return 'from-green-500/20 to-emerald-500/20 border-green-500/30';
    if (score >= 60) return 'from-yellow-500/20 to-amber-500/20 border-yellow-500/30';
    if (score >= 40) return 'from-orange-500/20 to-amber-500/20 border-orange-500/30';
    return 'from-red-500/20 to-rose-500/20 border-red-500/30';
  };

  if (!persona) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-theme-secondary">Invalid tutor</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-surface/80 backdrop-blur-xl border-b border-theme">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => router.push('/')}
            className="p-2 -ml-2 rounded-xl hover:bg-surface-hover transition-colors"
          >
            <svg className="w-5 h-5 text-theme-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex items-center gap-2">
            <TutorAvatar tutorId={tutorId as 'emma' | 'james' | 'charlotte' | 'oliver' | 'alina' | 'henry'} size="sm" />
            <div>
              <h1 className="text-sm font-semibold text-theme-primary">{persona.name}</h1>
              <p className="text-xs text-theme-muted">
                {language === 'ko' ? `${sessionNumber}회차 코칭` : `Session #${sessionNumber}`}
              </p>
            </div>
          </div>
          <div className="w-9" /> {/* Spacer for centering */}
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 pb-24">
        {/* Error banner */}
        {error && (
          <div className="mt-4 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm">
            {error}
          </div>
        )}

        {/* ===== READY PHASE ===== */}
        {phase === 'ready' && (
          <div className="py-12 text-center">
            <div className="mb-8">
              <TutorAvatar
                tutorId={tutorId as 'emma' | 'james' | 'charlotte' | 'oliver' | 'alina' | 'henry'}
                size="xl"
                className="mx-auto"
              />
            </div>

            <h2 className="text-2xl font-bold text-theme-primary mb-3">
              {language === 'ko' ? '스피치 코칭' : 'Speech Coaching'}
            </h2>
            <p className="text-theme-secondary mb-2 max-w-sm mx-auto">
              {language === 'ko'
                ? '스피치나 프레젠테이션을 자유롭게 말해주세요'
                : 'Speak freely about any topic - give a speech or presentation'}
            </p>
            <p className="text-xs text-theme-muted mb-8">
              {language === 'ko'
                ? '권장 시간: 1~5분'
                : 'Recommended: 1-5 minutes'}
            </p>

            {/* Previous session focus */}
            {previousSessions.length > 0 && previousSessions[0].analysis && (
              <div className="mb-8 p-4 rounded-xl bg-surface border border-theme text-left max-w-sm mx-auto">
                <p className="text-xs font-medium text-theme-muted mb-1">
                  {language === 'ko' ? '이전 회차 집중 포인트' : 'Previous session focus'}
                </p>
                <p className="text-sm text-theme-primary">
                  {previousSessions[0].analysis.focusForNextSession}
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-xs text-theme-muted">
                    {language === 'ko' ? '이전 점수:' : 'Previous score:'}
                  </span>
                  <span className={`text-sm font-bold ${getScoreColor(previousSessions[0].analysis.overallScore)}`}>
                    {previousSessions[0].analysis.overallScore}
                  </span>
                </div>
              </div>
            )}

            {/* Session history summary */}
            {previousSessions.length > 0 && (
              <div className="mb-8">
                <p className="text-xs text-theme-muted mb-3">
                  {language === 'ko'
                    ? `${previousSessions.length}회 완료`
                    : `${previousSessions.length} session${previousSessions.length > 1 ? 's' : ''} completed`}
                </p>
                <div className="flex justify-center gap-1.5 flex-wrap max-w-xs mx-auto">
                  {previousSessions.slice(0, 10).map((s, i) => (
                    <div
                      key={s.id || i}
                      className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${getScoreColor(s.analysis?.overallScore || 0)} bg-surface border border-theme`}
                      title={`Session ${s.session_number}: ${s.analysis?.overallScore || 0}`}
                    >
                      {s.analysis?.overallScore || '-'}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={startRecording}
              disabled={loadingSessions}
              className={`inline-flex items-center gap-3 px-8 py-4 rounded-2xl font-semibold text-lg bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg shadow-cyan-500/25 hover:shadow-xl hover:shadow-cyan-500/30 hover:scale-105 transition-all disabled:opacity-50`}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
              {language === 'ko' ? '녹음 시작' : 'Start Recording'}
            </button>
          </div>
        )}

        {/* ===== RECORDING PHASE ===== */}
        {phase === 'recording' && (
          <div className="py-8 text-center">
            {/* Timer */}
            <div className="mb-6">
              <p className="text-5xl font-mono font-bold text-theme-primary mb-2">
                {formatTime(elapsedTime)}
              </p>
              <div className="flex items-center justify-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
                <span className="text-sm text-red-500 font-medium">
                  {language === 'ko' ? '녹음 중' : 'Recording'}
                </span>
              </div>
            </div>

            {/* Waveform indicator */}
            <div className="flex items-center justify-center gap-1 mb-8 h-12">
              {Array.from({ length: 20 }).map((_, i) => (
                <div
                  key={i}
                  className="w-1 rounded-full bg-gradient-to-t from-cyan-500 to-blue-500"
                  style={{
                    height: `${20 + Math.random() * 80}%`,
                    animation: `waveform ${0.3 + Math.random() * 0.5}s ease-in-out infinite alternate`,
                    animationDelay: `${i * 0.05}s`,
                  }}
                />
              ))}
            </div>

            {/* Live transcript */}
            <div className="mb-8 p-4 rounded-xl bg-surface border border-theme min-h-[120px] max-h-[240px] overflow-y-auto text-left">
              <p className="text-xs font-medium text-theme-muted mb-2">
                {language === 'ko' ? '실시간 텍스트' : 'Live Transcript'}
              </p>
              <p className="text-sm text-theme-primary leading-relaxed">
                {liveTranscript || (
                  <span className="text-theme-muted italic">
                    {language === 'ko' ? '말하기 시작하세요...' : 'Start speaking...'}
                  </span>
                )}
              </p>
            </div>

            {/* Stop button */}
            <button
              onClick={stopRecording}
              className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl font-semibold text-lg bg-red-500 text-white shadow-lg shadow-red-500/25 hover:shadow-xl hover:bg-red-600 hover:scale-105 transition-all"
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <rect x="6" y="6" width="12" height="12" rx="2" />
              </svg>
              {language === 'ko' ? '녹음 종료' : 'Stop Recording'}
            </button>

            {elapsedTime < 10 && (
              <p className="text-xs text-theme-muted mt-4">
                {language === 'ko'
                  ? `최소 10초 이상 녹음해주세요 (${10 - elapsedTime}초 남음)`
                  : `Please record at least 10 seconds (${10 - elapsedTime}s remaining)`}
              </p>
            )}
          </div>
        )}

        {/* ===== ANALYZING PHASE ===== */}
        {phase === 'analyzing' && (
          <div className="py-20 text-center">
            <div className="mb-8">
              <TutorAvatar
                tutorId={tutorId as 'emma' | 'james' | 'charlotte' | 'oliver' | 'alina' | 'henry'}
                size="lg"
                speaking
                className="mx-auto"
              />
            </div>
            <div className="flex items-center justify-center gap-2 mb-4">
              <div className="w-2 h-2 rounded-full bg-cyan-500 animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <p className="text-lg font-medium text-theme-primary">
              {language === 'ko' ? 'AI가 분석 중입니다...' : 'AI is analyzing your speech...'}
            </p>
            <p className="text-sm text-theme-muted mt-2">
              {language === 'ko' ? '잠시만 기다려주세요' : 'Please wait a moment'}
            </p>
          </div>
        )}

        {/* ===== REPORT PHASE ===== */}
        {phase === 'report' && analysis && (
          <div className="py-6 space-y-6">
            {/* Overall Score */}
            <div className={`p-6 rounded-2xl bg-gradient-to-br ${getScoreBg(analysis.overallScore)} border text-center`}>
              <p className="text-sm text-theme-muted mb-2">
                {language === 'ko' ? '종합 점수' : 'Overall Score'}
              </p>
              <p className={`text-6xl font-bold ${getScoreColor(analysis.overallScore)}`}>
                {analysis.overallScore}
              </p>
              <p className="text-xs text-theme-muted mt-1">/100</p>
            </div>

            {/* Delivery Metrics */}
            <div className="p-4 rounded-xl bg-surface border border-theme">
              <h3 className="text-sm font-semibold text-theme-primary mb-3">
                {language === 'ko' ? '전달력' : 'Delivery'}
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-background">
                  <p className="text-xs text-theme-muted">WPM</p>
                  <p className="text-xl font-bold text-theme-primary">{analysis.delivery.wordsPerMinute}</p>
                  <p className={`text-xs ${analysis.delivery.pacing === 'good' ? 'text-green-500' : 'text-orange-500'}`}>
                    {analysis.delivery.pacing === 'good'
                      ? (language === 'ko' ? '적절함' : 'Good')
                      : analysis.delivery.pacing === 'too-fast'
                        ? (language === 'ko' ? '너무 빠름' : 'Too fast')
                        : (language === 'ko' ? '너무 느림' : 'Too slow')}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-background">
                  <p className="text-xs text-theme-muted">
                    {language === 'ko' ? '필러 단어' : 'Filler Words'}
                  </p>
                  <p className="text-xl font-bold text-theme-primary">
                    {analysis.delivery.fillerWords.reduce((sum, fw) => sum + fw.count, 0)}
                  </p>
                  <p className="text-xs text-theme-muted">
                    {analysis.delivery.fillerWords.slice(0, 3).map((fw) => `${fw.word}(${fw.count})`).join(', ')}
                  </p>
                </div>
              </div>
            </div>

            {/* Grammar */}
            <div className="p-4 rounded-xl bg-surface border border-theme">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-theme-primary">
                  {language === 'ko' ? '문법' : 'Grammar'}
                </h3>
                <span className={`text-sm font-bold ${getScoreColor(analysis.grammar.accuracy)}`}>
                  {analysis.grammar.accuracy}%
                </span>
              </div>
              {analysis.grammar.corrections.length > 0 ? (
                <div className="space-y-3">
                  {analysis.grammar.corrections.map((c, i) => (
                    <div key={i} className="p-3 rounded-lg bg-background">
                      <div className="flex items-start gap-2 mb-1">
                        <span className="text-red-400 line-through text-sm">{c.original}</span>
                        <svg className="w-4 h-4 text-theme-muted shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                        <span className="text-green-400 text-sm font-medium">{c.corrected}</span>
                      </div>
                      <p className="text-xs text-theme-muted">{c.explanation}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-green-500">
                  {language === 'ko' ? '문법 오류가 없습니다!' : 'No grammar errors found!'}
                </p>
              )}
            </div>

            {/* Pronunciation */}
            {analysis.pronunciation.issues.length > 0 && (
              <div className="p-4 rounded-xl bg-surface border border-theme">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-theme-primary">
                    {language === 'ko' ? '발음' : 'Pronunciation'}
                  </h3>
                  <span className={`text-sm font-bold ${getScoreColor(analysis.pronunciation.clarity)}`}>
                    {analysis.pronunciation.clarity}%
                  </span>
                </div>
                <div className="space-y-2">
                  {analysis.pronunciation.issues.map((issue, i) => (
                    <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-background">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${issue.severity === 'major' ? 'bg-red-500' : 'bg-yellow-500'}`} />
                      <div>
                        <span className="text-sm font-medium text-theme-primary">{issue.word}</span>
                        <span className="text-xs text-theme-muted ml-2">{issue.suggestion}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Content Structure */}
            <div className="p-4 rounded-xl bg-surface border border-theme">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-theme-primary">
                  {language === 'ko' ? '내용 구성' : 'Content Structure'}
                </h3>
                <span className={`text-sm font-bold ${getScoreColor(analysis.content.coherence)}`}>
                  {analysis.content.coherence}%
                </span>
              </div>
              <p className="text-sm text-theme-secondary mb-2">{analysis.content.structure}</p>
              <div className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-background">
                <span className="text-xs text-theme-muted">
                  {language === 'ko' ? '어휘 수준:' : 'Vocabulary:'}
                </span>
                <span className="text-xs font-bold text-theme-primary">{analysis.content.vocabulary}</span>
              </div>
            </div>

            {/* Strengths */}
            <div className="p-4 rounded-xl bg-green-500/5 border border-green-500/20">
              <h3 className="text-sm font-semibold text-green-500 mb-3">
                {language === 'ko' ? '잘한 점' : 'Strengths'}
              </h3>
              <ul className="space-y-2">
                {analysis.strengths.map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-theme-secondary">
                    <svg className="w-4 h-4 text-green-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {s}
                  </li>
                ))}
              </ul>
            </div>

            {/* Improvements */}
            <div className="p-4 rounded-xl bg-orange-500/5 border border-orange-500/20">
              <h3 className="text-sm font-semibold text-orange-500 mb-3">
                {language === 'ko' ? '개선할 점' : 'Areas for Improvement'}
              </h3>
              <ul className="space-y-2">
                {analysis.improvements.map((imp, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-theme-secondary">
                    <svg className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                    {imp}
                  </li>
                ))}
              </ul>
            </div>

            {/* Focus for next session */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/20">
              <h3 className="text-sm font-semibold text-cyan-500 mb-2">
                {language === 'ko' ? '다음 회차 집중 포인트' : 'Focus for Next Session'}
              </h3>
              <p className="text-sm text-theme-primary">{analysis.focusForNextSession}</p>
            </div>

            {/* Comparison with previous */}
            {analysis.comparisonWithPrevious && (
              <div className="p-4 rounded-xl bg-surface border border-theme">
                <h3 className="text-sm font-semibold text-theme-primary mb-3">
                  {language === 'ko' ? '이전 회차 비교' : 'Comparison with Previous Session'}
                </h3>
                {analysis.comparisonWithPrevious.improved.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs font-medium text-green-500 mb-1">
                      {language === 'ko' ? '개선된 점' : 'Improved'}
                    </p>
                    <ul className="space-y-1">
                      {analysis.comparisonWithPrevious.improved.map((item, i) => (
                        <li key={i} className="text-sm text-theme-secondary flex items-center gap-1">
                          <svg className="w-3 h-3 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                          </svg>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {analysis.comparisonWithPrevious.stillNeedsWork.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs font-medium text-orange-500 mb-1">
                      {language === 'ko' ? '더 연습이 필요한 점' : 'Still Needs Work'}
                    </p>
                    <ul className="space-y-1">
                      {analysis.comparisonWithPrevious.stillNeedsWork.map((item, i) => (
                        <li key={i} className="text-sm text-theme-secondary flex items-center gap-1">
                          <svg className="w-3 h-3 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M20 12H4" />
                          </svg>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <p className="text-sm text-theme-secondary italic mt-2">
                  {analysis.comparisonWithPrevious.overallProgress}
                </p>
              </div>
            )}

            {/* Encouragement */}
            <div className="p-4 rounded-xl bg-surface border border-theme text-center">
              <p className="text-sm text-theme-primary italic">
                &ldquo;{analysis.encouragement}&rdquo;
              </p>
              <p className="text-xs text-theme-muted mt-1">- {persona.name}</p>
            </div>

            {/* Action buttons */}
            <div className="flex gap-3 pt-4">
              <button
                onClick={startNextSession}
                className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-semibold bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg shadow-cyan-500/25 hover:scale-105 transition-all"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                {language === 'ko' ? '다음 회차 시작' : 'Start Next Session'}
              </button>
              <button
                onClick={() => router.push('/')}
                className="px-6 py-3.5 rounded-xl font-medium bg-surface border border-theme text-theme-primary hover:bg-surface-hover transition-all"
              >
                {language === 'ko' ? '홈으로' : 'Home'}
              </button>
            </div>
          </div>
        )}
      </main>

      {/* CSS for waveform animation */}
      <style jsx>{`
        @keyframes waveform {
          0% { height: 15%; }
          100% { height: 85%; }
        }
      `}</style>
    </div>
  );
}

export default function SpeechPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-cyan-500 animate-bounce" />
          <div className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    }>
      <SpeechContent />
    </Suspense>
  );
}
