'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/lib/i18n';
import BottomNav from '@/components/BottomNav';
import { track } from '@/lib/analytics';
import { Card, Button, Badge, Skeleton } from '@/components/ui';
import AiBadge from '@/components/ai/AiBadge';

interface Correction {
  correctionId: string;
  original: string;
  corrected: string;
  explanation: string;
  category: string;
  difficulty: number;
  interval: number;
  repetitions: number;
  isRepeated?: boolean;
  categoryRepeatCount?: number;
}

// SRS grade semantics: 0-1 = Again, 2 = Hard, 3 = Good, 4 = Easy, 5 = Perfect
const gradeConfig = {
  en: [
    { value: 0, label: 'Again', sublabel: 'Blackout', accent: 'bg-red-500 hover:bg-red-600 shadow-red-500/30' },
    { value: 1, label: 'Again', sublabel: 'Wrong', accent: 'bg-red-400 hover:bg-red-500 shadow-red-400/30' },
    { value: 2, label: 'Hard', sublabel: 'Difficult', accent: 'bg-orange-400 hover:bg-orange-500 shadow-orange-400/30' },
    { value: 3, label: 'Good', sublabel: 'Okay', accent: 'bg-yellow-400 hover:bg-yellow-500 shadow-yellow-400/30 text-yellow-900' },
    { value: 4, label: 'Easy', sublabel: 'Good', accent: 'bg-emerald-400 hover:bg-emerald-500 shadow-emerald-400/30' },
    { value: 5, label: 'Perfect', sublabel: 'Instant', accent: 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/30' },
  ],
  ko: [
    { value: 0, label: '다시', sublabel: '전혀 모름', accent: 'bg-red-500 hover:bg-red-600 shadow-red-500/30' },
    { value: 1, label: '다시', sublabel: '틀림', accent: 'bg-red-400 hover:bg-red-500 shadow-red-400/30' },
    { value: 2, label: '어려움', sublabel: '힘들었어요', accent: 'bg-orange-400 hover:bg-orange-500 shadow-orange-400/30' },
    { value: 3, label: '보통', sublabel: '적당해요', accent: 'bg-yellow-400 hover:bg-yellow-500 shadow-yellow-400/30 text-yellow-900' },
    { value: 4, label: '쉬움', sublabel: '잘 알아요', accent: 'bg-emerald-400 hover:bg-emerald-500 shadow-emerald-400/30' },
    { value: 5, label: '완벽', sublabel: '즉시 기억', accent: 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/30' },
  ],
};

export default function ReviewPage() {
  const router = useRouter();
  const { language } = useLanguage();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [corrections, setCorrections] = useState<Correction[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [completedCount, setCompletedCount] = useState(0);
  const [isFlipping, setIsFlipping] = useState(false);

  // Practice speaking states
  const [isRecordingPractice, setIsRecordingPractice] = useState(false);
  const [isProcessingPractice, setIsProcessingPractice] = useState(false);
  const [practiceResult, setPracticeResult] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    const loadCorrections = async () => {
      try {
        const response = await fetch('/api/corrections?due=true&limit=20');
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        setCorrections(data.corrections || []);
      } catch (error) {
        console.error('Failed to load corrections:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadCorrections();
  }, []);

  const currentCorrection = corrections[currentIndex];

  const playTTS = async (text: string, speed?: number) => {
    setIsPlaying(true);
    try {
      const response = await fetch('/api/text-to-speech', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voice: 'shimmer', ...(speed && { speed }) }),
      });
      if (!response.ok) return;
      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      if (audioRef.current) {
        audioRef.current.src = audioUrl;
        await audioRef.current.play();
      }
    } catch (error) {
      console.error('TTS error:', error);
    } finally {
      setIsPlaying(false);
    }
  };

  const togglePracticeRecording = async () => {
    if (isRecordingPractice) {
      const recorder = mediaRecorderRef.current;
      if (recorder && (recorder.state === 'recording' || recorder.state === 'paused')) {
        recorder.stop();
      }
      setIsRecordingPractice(false);
      return;
    }

    setPracticeResult(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : 'audio/mp4';

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        if (audioBlob.size < 100) return;
        setIsProcessingPractice(true);
        try {
          const file = new File([audioBlob], 'practice.webm', { type: 'audio/webm' });
          const formData = new FormData();
          formData.append('audio', file);
          const sttResponse = await fetch('/api/speech-to-text', { method: 'POST', body: formData });
          if (!sttResponse.ok) throw new Error(`HTTP ${sttResponse.status}`);
          const sttData = await sttResponse.json();
          setPracticeResult(sttData.text?.trim() || '');
        } catch (error) {
          console.error('Practice STT error:', error);
          setPracticeResult('');
        } finally {
          setIsProcessingPractice(false);
        }
      };

      mediaRecorder.start(1000);
      setIsRecordingPractice(true);
    } catch (error) {
      console.error('Microphone error:', error);
    }
  };

  const resetPractice = () => {
    setPracticeResult(null);
    setIsRecordingPractice(false);
  };

  const handleShowAnswer = () => {
    setIsFlipping(true);
    setTimeout(() => {
      setShowAnswer(true);
      setIsFlipping(false);
    }, 200);
  };

  const handleQualitySelect = async (quality: number) => {
    if (!currentCorrection || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const reviewRes = await fetch('/api/corrections/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ correctionId: currentCorrection.correctionId, quality }),
      });
      if (!reviewRes.ok) {
        console.error('SRS review submission failed:', reviewRes.status);
        return;
      }
      setCompletedCount(prev => prev + 1);
      resetPractice();
      if (currentIndex < corrections.length - 1) {
        setShowAnswer(false);
        setCurrentIndex(prev => prev + 1);
      } else {
        track('review_complete', { count: completedCount + 1 });
        setCorrections([]);
      }
    } catch (error) {
      console.error('Failed to submit review:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── Loading state ───────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-dark-bg flex flex-col">
        <header
          style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}
          className="px-4 pb-4 bg-white/90 dark:bg-dark-surface/90 backdrop-blur-xl border-b border-neutral-200 dark:border-neutral-800"
        >
          <div className="max-w-2xl mx-auto flex items-center gap-3">
            <Skeleton shape="circle" width={36} height={36} />
            <Skeleton shape="line" width={80} height={20} />
          </div>
        </header>
        <main className="flex-1 max-w-2xl mx-auto w-full p-4 space-y-4 motion-safe:animate-fade-up">
          <Skeleton shape="rect" height={8} className="rounded-full" />
          <Skeleton shape="rect" height={300} />
        </main>
      </div>
    );
  }

  // ─── Complete / empty state ──────────────────────────────────────────────────
  if (corrections.length === 0) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-dark-bg flex flex-col">
        <audio ref={audioRef} onEnded={() => setIsPlaying(false)} />
        <header
          style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}
          className="px-4 pb-4 bg-white/90 dark:bg-dark-surface/90 backdrop-blur-xl border-b border-neutral-200 dark:border-neutral-800"
        >
          <div className="max-w-2xl mx-auto flex items-center justify-between">
            <button
              onClick={() => router.push('/')}
              aria-label="뒤로 가기"
              className="pressable w-9 h-9 rounded-xl flex items-center justify-center text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-white/[0.06] transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-base font-bold text-neutral-900 dark:text-white">
              {language === 'ko' ? '복습' : 'Review'}
            </h1>
            <div className="w-9" />
          </div>
        </header>

        <main className="flex-1 flex flex-col items-center justify-center p-6 text-center motion-safe:animate-fade-up">
          {/* Celebration icon */}
          <div className={`relative w-24 h-24 rounded-full flex items-center justify-center mb-6 ${
            completedCount > 0
              ? 'bg-brand-gradient shadow-float dark:shadow-float-dark motion-safe:animate-gentle-bounce'
              : 'bg-neutral-100 dark:bg-neutral-800'
          }`}>
            {completedCount > 0 && (
              <div aria-hidden="true" className="absolute inset-0 rounded-full ring-4 ring-white/30 dark:ring-white/10" />
            )}
            <svg
              className={`w-11 h-11 ${completedCount > 0 ? 'text-white' : 'text-neutral-400 dark:text-neutral-500'}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              {completedCount > 0
                ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              }
            </svg>
          </div>

          {/* Ambient glow */}
          {completedCount > 0 && (
            <div aria-hidden="true" className="absolute top-1/4 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full bg-primary-500/10 blur-3xl motion-safe:animate-glow pointer-events-none" />
          )}

          <h2 className="text-display-2 text-neutral-900 dark:text-white mb-2">
            {completedCount > 0
              ? (language === 'ko' ? '복습 완료!' : 'Review Complete!')
              : (language === 'ko' ? '복습할 항목이 없어요' : 'Nothing to review')}
          </h2>

          {completedCount > 0 && (
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-2">
              {language === 'ko' ? `${completedCount}개 항목을 복습했어요.` : `You reviewed ${completedCount} items.`}
            </p>
          )}

          {completedCount > 0 && (
            <div className="w-full max-w-xs motion-safe:animate-count-pop mb-8">
              <Card variant="elevated" padding="md" className="text-center mt-4">
                <p className="text-4xl font-extrabold tracking-tight text-primary-600 dark:text-primary-400 tabular-nums">
                  +{completedCount * 10} <span className="text-2xl">XP</span>
                </p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">오늘의 보상</p>
              </Card>
            </div>
          )}

          <Button variant="primary" size="lg" onClick={() => router.push('/')}>
            {language === 'ko' ? '홈으로' : 'Back to Home'}
          </Button>
        </main>
        <div className="h-20" style={{ marginBottom: 'env(safe-area-inset-bottom, 0px)' }} />
        <BottomNav />
      </div>
    );
  }

  const grades = language === 'ko' ? gradeConfig.ko : gradeConfig.en;

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-dark-bg flex flex-col">
      <audio ref={audioRef} onEnded={() => setIsPlaying(false)} />

      {/* ─── Header ──────────────────────────────────────────────────────────── */}
      <header
        style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}
        className="px-4 pb-3 bg-white/90 dark:bg-dark-surface/90 backdrop-blur-xl border-b border-neutral-200 dark:border-neutral-800 sticky top-0 z-40"
      >
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => router.push('/')}
              aria-label="뒤로 가기"
              className="pressable w-9 h-9 rounded-xl flex items-center justify-center text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-white/[0.06] transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="text-center">
              <h1 className="text-base font-bold text-neutral-900 dark:text-white">
                {language === 'ko' ? '복습' : 'Review'}
              </h1>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 tabular-nums">
                {currentIndex + 1} / {corrections.length}
              </p>
            </div>
            <div className="w-9" />
          </div>

          {/* Segmented deck progress rail */}
          <div className="flex gap-1" role="progressbar" aria-valuenow={currentIndex + 1} aria-valuemax={corrections.length} aria-label="복습 진행">
            {corrections.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 flex-1 rounded-full overflow-hidden transition-all duration-300 ${
                  i < currentIndex
                    ? 'bg-primary-500'
                    : i === currentIndex
                      ? 'bg-neutral-200 dark:bg-white/[0.08]'
                      : 'bg-neutral-200 dark:bg-white/[0.08]'
                }`}
              >
                {i === currentIndex && (
                  <div
                    className="h-full bg-brand-gradient origin-left motion-safe:animate-progress-fill"
                    style={{ width: showAnswer ? '100%' : '0%', transition: 'width 0.3s ease' }}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* ─── Main ────────────────────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col max-w-2xl mx-auto w-full px-4 pb-4">
        <div className="flex-1 flex flex-col justify-center py-4">

          {/* ── Flashcard ──────────────────────────────────────────────────── */}
          <div
            className={`transition-all duration-200 ${isFlipping ? 'opacity-0 scale-[0.98]' : 'opacity-100 scale-100'} motion-safe:animate-fade-up`}
          >
            <Card
              variant={currentCorrection.isRepeated ? 'outlined' : 'elevated'}
              padding="lg"
              className={`mb-5 ${
                currentCorrection.isRepeated
                  ? 'border-amber-300 dark:border-amber-500/40 bg-amber-50/80 dark:bg-amber-900/10'
                  : ''
              }`}
            >
              {/* Repeated pattern warning */}
              {currentCorrection.isRepeated && (
                <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-xl bg-amber-100 dark:bg-amber-500/20">
                  <svg className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span className="text-xs font-medium text-amber-700 dark:text-amber-300">
                    {language === 'ko'
                      ? `반복 실수 — ${currentCorrection.category} 관련 교정 ${currentCorrection.categoryRepeatCount}개`
                      : `Repeated — ${currentCorrection.categoryRepeatCount} in "${currentCorrection.category}"`}
                  </span>
                </div>
              )}

              {/* Question: what the user said */}
              <div className="mb-5">
                <p className="text-2xs font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest mb-2">
                  {language === 'ko' ? '당신이 말한 것' : 'What you said'}
                </p>
                <p className={`text-xl font-medium leading-snug ${
                  currentCorrection.isRepeated
                    ? 'text-amber-800 dark:text-amber-200'
                    : 'text-neutral-800 dark:text-white'
                }`}>
                  {currentCorrection.original}
                </p>
              </div>

              {/* Category + habit badge */}
              <div className="flex items-center gap-2 mb-5">
                <Badge variant="default" size="md">
                  {currentCorrection.category}
                </Badge>
                {currentCorrection.isRepeated && (
                  <Badge variant="warning" size="sm" dot>
                    {language === 'ko' ? '습관 주의' : 'Habit Alert'}
                  </Badge>
                )}
              </div>

              {/* Flip reveal / answer section */}
              {!showAnswer ? (
                <button
                  onClick={handleShowAnswer}
                  className="pressable w-full py-4 border-2 border-dashed border-neutral-200 dark:border-white/[0.08] rounded-2xl text-sm font-medium text-neutral-400 dark:text-neutral-500 hover:border-primary-300 dark:hover:border-primary-500/50 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                >
                  {language === 'ko' ? '정답 보기' : 'Reveal Answer'}
                </button>
              ) : (
                <div className="space-y-4 motion-safe:animate-fade-up">
                  {/* Correct expression */}
                  <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/25">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-2xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">
                        {language === 'ko' ? '올바른 표현' : 'Correct'}
                      </p>
                      <button
                        onClick={() => playTTS(currentCorrection.corrected, 0.85)}
                        disabled={isPlaying}
                        aria-label={language === 'ko' ? '발음 듣기' : 'Listen'}
                        className="pressable w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 hover:bg-emerald-200 dark:hover:bg-emerald-500/30 transition-colors disabled:opacity-50"
                      >
                        {isPlaying
                          ? <div className="w-3 h-3 border-2 border-emerald-600 dark:border-emerald-400 border-t-transparent rounded-full animate-spin" />
                          : <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>
                        }
                      </button>
                    </div>
                    <p className="text-lg font-semibold text-emerald-900 dark:text-emerald-200 leading-snug">
                      {currentCorrection.corrected}
                    </p>
                  </div>

                  {/* Explanation */}
                  <div className="p-4 rounded-2xl bg-sky-50 dark:bg-sky-500/10 border border-sky-200 dark:border-sky-500/25">
                    <div className="flex items-center gap-1.5 mb-2">
                      <p className="text-2xs font-semibold text-sky-600 dark:text-sky-400 uppercase tracking-widest">
                        {language === 'ko' ? '설명' : 'Why'}
                      </p>
                      <AiBadge variant="neutral" />
                    </div>
                    <p className="text-sm text-sky-900 dark:text-sky-200 leading-relaxed">
                      {currentCorrection.explanation}
                    </p>
                  </div>

                  {/* Practice speaking */}
                  <div className="p-4 rounded-2xl bg-violet-50 dark:bg-violet-500/10 border border-violet-200 dark:border-violet-500/25">
                    <p className="text-2xs font-semibold text-violet-600 dark:text-violet-400 uppercase tracking-widest mb-3">
                      {language === 'ko' ? '따라 말해보기' : 'Practice saying it'}
                    </p>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={togglePracticeRecording}
                        disabled={isProcessingPractice}
                        aria-label={isRecordingPractice ? '녹음 종료' : '말하기 시작'}
                        className={`pressable w-11 h-11 rounded-full flex items-center justify-center transition-all ${
                          isRecordingPractice
                            ? 'bg-red-500 text-white shadow-lg shadow-red-500/40 motion-safe:animate-pulse'
                            : isProcessingPractice
                              ? 'bg-neutral-200 dark:bg-neutral-700 text-neutral-400 cursor-not-allowed'
                              : 'bg-violet-100 dark:bg-violet-500/20 text-violet-600 dark:text-violet-400 hover:bg-violet-200 dark:hover:bg-violet-500/30'
                        }`}
                      >
                        {isProcessingPractice
                          ? <div className="w-4 h-4 border-2 border-violet-600 dark:border-violet-400 border-t-transparent rounded-full animate-spin" />
                          : isRecordingPractice
                            ? <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="2" /></svg>
                            : <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
                                <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
                              </svg>
                        }
                      </button>
                      <p className="text-sm text-violet-700 dark:text-violet-300">
                        {isRecordingPractice
                          ? (language === 'ko' ? '말하는 중... 탭해서 완료' : 'Listening... tap to finish')
                          : isProcessingPractice
                            ? (language === 'ko' ? '인식 중...' : 'Processing...')
                            : practiceResult === null
                              ? (language === 'ko' ? '마이크를 눌러 따라 말해보세요' : 'Tap the mic and try saying it')
                              : ''}
                      </p>
                    </div>

                    {practiceResult !== null && !isRecordingPractice && !isProcessingPractice && (
                      <div className="mt-3 space-y-2 motion-safe:animate-fade-up">
                        <div className="p-3 rounded-xl bg-white dark:bg-neutral-800">
                          <p className="text-2xs text-neutral-400 dark:text-neutral-500 mb-1">
                            {language === 'ko' ? '내가 말한 것' : 'You said'}
                          </p>
                          <p className="text-sm text-neutral-800 dark:text-neutral-200">
                            {practiceResult || (language === 'ko' ? '(인식되지 않았어요)' : '(No speech detected)')}
                          </p>
                        </div>
                        <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/10">
                          <p className="text-2xs text-emerald-600 dark:text-emerald-400 mb-1">
                            {language === 'ko' ? '목표' : 'Target'}
                          </p>
                          <p className="text-sm text-emerald-900 dark:text-emerald-200">{currentCorrection.corrected}</p>
                        </div>
                        <button
                          onClick={resetPractice}
                          className="pressable w-full py-1.5 text-sm text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 transition-colors"
                        >
                          {language === 'ko' ? '다시 시도' : 'Try again'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </Card>
          </div>
        </div>

        {/* ── Grade buttons ───────────────────────────────────────────────────── */}
        {showAnswer && (
          <div
            className="motion-safe:animate-fade-up"
            style={{ paddingBottom: 'max(1.5rem, calc(0.5rem + env(safe-area-inset-bottom)))' }}
          >
            <p className="text-center text-xs font-medium text-neutral-400 dark:text-neutral-500 uppercase tracking-widest mb-3">
              {language === 'ko' ? '얼마나 잘 알고 있었나요?' : 'How well did you know this?'}
            </p>
            {/* 2-row grade grid: Again / Hard on top, Good / Easy / Perfect on bottom */}
            <div className="grid grid-cols-3 gap-2 mb-2">
              {grades.slice(0, 3).map(({ value, label, sublabel, accent }) => (
                <button
                  key={value}
                  onClick={() => handleQualitySelect(value)}
                  disabled={isSubmitting}
                  className={`pressable py-3 rounded-2xl text-white text-xs font-bold flex flex-col items-center gap-0.5 shadow-md transition-all ${accent} disabled:opacity-50`}
                >
                  <span>{label}</span>
                  <span className="text-[10px] font-normal opacity-80">{sublabel}</span>
                </button>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-2">
              {grades.slice(3).map(({ value, label, sublabel, accent }) => (
                <button
                  key={value}
                  onClick={() => handleQualitySelect(value)}
                  disabled={isSubmitting}
                  className={`pressable py-3 rounded-2xl text-white text-xs font-bold flex flex-col items-center gap-0.5 shadow-md transition-all ${accent} disabled:opacity-50`}
                >
                  <span>{label}</span>
                  <span className="text-[10px] font-normal opacity-80">{sublabel}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </main>

      <div className="h-20" style={{ marginBottom: 'env(safe-area-inset-bottom, 0px)' }} />
      <BottomNav />
    </div>
  );
}
