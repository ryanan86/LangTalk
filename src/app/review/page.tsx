'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/lib/i18n';
import BottomNav from '@/components/BottomNav';

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

const qualityLabels = {
  en: [
    { value: 0, label: 'No clue', color: 'bg-red-500' },
    { value: 1, label: 'Wrong', color: 'bg-red-400' },
    { value: 2, label: 'Hard', color: 'bg-orange-400' },
    { value: 3, label: 'Okay', color: 'bg-yellow-400' },
    { value: 4, label: 'Good', color: 'bg-green-400' },
    { value: 5, label: 'Easy', color: 'bg-green-500' },
  ],
  ko: [
    { value: 0, label: '모름', color: 'bg-red-500' },
    { value: 1, label: '틀림', color: 'bg-red-400' },
    { value: 2, label: '어려움', color: 'bg-orange-400' },
    { value: 3, label: '보통', color: 'bg-yellow-400' },
    { value: 4, label: '쉬움', color: 'bg-green-400' },
    { value: 5, label: '완벽', color: 'bg-green-500' },
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

  // Practice speaking states
  const [isRecordingPractice, setIsRecordingPractice] = useState(false);
  const [isProcessingPractice, setIsProcessingPractice] = useState(false);
  const [practiceResult, setPracticeResult] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Load corrections due for review
  useEffect(() => {
    const loadCorrections = async () => {
      try {
        const response = await fetch('/api/corrections?due=true&limit=20');
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
      // Stop recording
      const recorder = mediaRecorderRef.current;
      if (recorder && (recorder.state === 'recording' || recorder.state === 'paused')) {
        recorder.stop();
      }
      setIsRecordingPractice(false);
      return;
    }

    // Start recording
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
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop());
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });

        if (audioBlob.size < 100) return;

        setIsProcessingPractice(true);
        try {
          const file = new File([audioBlob], 'practice.webm', { type: 'audio/webm' });
          const formData = new FormData();
          formData.append('audio', file);

          const sttResponse = await fetch('/api/speech-to-text', {
            method: 'POST',
            body: formData,
          });
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

  const handleQualitySelect = async (quality: number) => {
    if (!currentCorrection || isSubmitting) return;

    setIsSubmitting(true);

    try {
      await fetch('/api/corrections/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          correctionId: currentCorrection.correctionId,
          quality,
        }),
      });

      setCompletedCount(prev => prev + 1);

      // Move to next or finish
      resetPractice();
      if (currentIndex < corrections.length - 1) {
        setCurrentIndex(prev => prev + 1);
        setShowAnswer(false);
      } else {
        // All done
        setCorrections([]);
      }
    } catch (error) {
      console.error('Failed to submit review:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-dark-bg">
        <div className="flex gap-2">
          <div className="loading-dot" />
          <div className="loading-dot" />
          <div className="loading-dot" />
        </div>
      </div>
    );
  }

  // All corrections reviewed
  if (corrections.length === 0) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-dark-bg flex flex-col">
        <header className="bg-white/80 dark:bg-dark-surface/80 backdrop-blur-md border-b border-neutral-200 dark:border-neutral-800 px-4 py-4">
          <div className="max-w-2xl mx-auto flex justify-between items-center">
            <button onClick={() => router.push('/')} className="text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-lg font-semibold text-neutral-900 dark:text-white">{language === 'ko' ? '복습' : 'Review'}</h1>
            <div className="w-6" />
          </div>
        </header>

        <main className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-20 h-20 bg-green-100 dark:bg-green-500/20 rounded-full flex items-center justify-center mb-6">
            <svg className="w-10 h-10 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-2">
            {completedCount > 0
              ? (language === 'ko' ? '복습 완료!' : 'Review Complete!')
              : (language === 'ko' ? '복습할 항목이 없습니다' : 'No items to review')}
          </h2>

          {completedCount > 0 && (
            <p className="text-neutral-600 dark:text-neutral-400 mb-8">
              {language === 'ko'
                ? `${completedCount}개 항목을 복습했습니다.`
                : `You reviewed ${completedCount} items.`}
            </p>
          )}

          <button onClick={() => router.push('/')} className="btn-primary px-8 py-3">
            {language === 'ko' ? '홈으로' : 'Back to Home'}
          </button>
        </main>
        <div className="h-20" />
        <BottomNav />
      </div>
    );
  }

  const labels = language === 'ko' ? qualityLabels.ko : qualityLabels.en;

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-dark-bg flex flex-col">
      <audio ref={audioRef} onEnded={() => setIsPlaying(false)} />

      {/* Header */}
      <header className="bg-white/80 dark:bg-dark-surface/80 backdrop-blur-md border-b border-neutral-200 dark:border-neutral-800 px-4 py-4">
        <div className="max-w-2xl mx-auto flex justify-between items-center">
          <button onClick={() => router.push('/')} className="text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="text-center">
            <h1 className="text-lg font-semibold text-neutral-900 dark:text-white">{language === 'ko' ? '복습' : 'Review'}</h1>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {currentIndex + 1} / {corrections.length}
            </p>
          </div>
          <div className="w-6" />
        </div>
      </header>

      {/* Progress Bar */}
      <div className="bg-white dark:bg-dark-surface border-b border-neutral-100 dark:border-neutral-800 px-4 py-2">
        <div className="max-w-2xl mx-auto">
          <div className="h-1 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary-500 transition-all duration-300"
              style={{ width: `${((currentIndex + 1) / corrections.length) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 flex flex-col max-w-2xl mx-auto w-full p-4">
        <div className="flex-1 flex flex-col justify-center">
          {/* Card */}
          <div className={`rounded-2xl shadow-lg dark:shadow-none p-6 mb-6 ${
            currentCorrection.isRepeated
              ? 'bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-400 dark:border-amber-500/50'
              : 'bg-white dark:bg-dark-surface dark:border dark:border-neutral-800'
          }`}>
            {/* Repeated Pattern Warning */}
            {currentCorrection.isRepeated && (
              <div className="flex items-center gap-2 mb-4 px-3 py-2 bg-amber-100 dark:bg-amber-500/20 rounded-lg">
                <svg className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span className="text-xs font-medium text-amber-700 dark:text-amber-300">
                  {language === 'ko'
                    ? `반복 실수 - ${currentCorrection.category} 관련 교정이 ${currentCorrection.categoryRepeatCount}개 있습니다`
                    : `Repeated pattern - ${currentCorrection.categoryRepeatCount} corrections in "${currentCorrection.category}"`}
                </span>
              </div>
            )}

            {/* Question - What user said */}
            <div className="mb-6">
              <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                {language === 'ko' ? '당신이 말한 것' : 'What you said'}
              </span>
              <p className={`text-xl mt-2 font-medium ${
                currentCorrection.isRepeated
                  ? 'text-amber-800 dark:text-amber-200'
                  : 'text-neutral-800 dark:text-white'
              }`}>
                {currentCorrection.original}
              </p>
            </div>

            {/* Category Badge */}
            <div className="flex items-center gap-2 mb-6">
              <span className={`inline-block px-3 py-1 text-xs rounded-full ${
                currentCorrection.isRepeated
                  ? 'bg-amber-200 dark:bg-amber-500/30 text-amber-700 dark:text-amber-300'
                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300'
              }`}>
                {currentCorrection.category}
              </span>
              {currentCorrection.isRepeated && (
                <span className="inline-block px-2 py-0.5 bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 text-[10px] font-bold rounded-full uppercase tracking-wider">
                  {language === 'ko' ? '습관 주의' : 'Habit Alert'}
                </span>
              )}
            </div>

            {/* Answer Section */}
            {!showAnswer ? (
              <button
                onClick={() => setShowAnswer(true)}
                className="w-full py-4 border-2 border-dashed border-neutral-300 dark:border-neutral-600 rounded-xl text-neutral-500 dark:text-neutral-400 hover:border-primary-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
              >
                {language === 'ko' ? '정답 보기' : 'Show Answer'}
              </button>
            ) : (
              <div className="space-y-4">
                {/* Correct Way */}
                <div className="p-4 bg-green-50 dark:bg-green-500/10 rounded-xl">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-medium text-green-600 dark:text-green-400 uppercase tracking-wider">
                      {language === 'ko' ? '올바른 표현' : 'Correct way'}
                    </span>
                    <button
                      onClick={() => playTTS(currentCorrection.corrected, 0.85)}
                      disabled={isPlaying}
                      className="w-8 h-8 bg-green-100 dark:bg-green-500/20 rounded-full flex items-center justify-center hover:bg-green-200 dark:hover:bg-green-500/30 transition-colors"
                    >
                      {isPlaying ? (
                        <div className="w-3 h-3 border-2 border-green-600 dark:border-green-400 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                  <p className="text-lg text-green-800 dark:text-green-300 font-medium">
                    {currentCorrection.corrected}
                  </p>
                </div>

                {/* Explanation */}
                <div className="p-4 bg-blue-50 dark:bg-blue-500/10 rounded-xl">
                  <span className="text-xs font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                    {language === 'ko' ? '설명' : 'Explanation'}
                  </span>
                  <p className="text-sm text-blue-800 dark:text-blue-300 mt-2">
                    {currentCorrection.explanation}
                  </p>
                </div>

                {/* Practice Speaking */}
                <div className="p-4 bg-purple-50 dark:bg-purple-500/10 rounded-xl">
                  <span className="text-xs font-medium text-purple-600 dark:text-purple-400 uppercase tracking-wider">
                    {language === 'ko' ? '따라 말해보기' : 'Try saying it'}
                  </span>

                  <div className="mt-3 flex items-center gap-3">
                    <button
                      onClick={togglePracticeRecording}
                      disabled={isProcessingPractice}
                      className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                        isRecordingPractice
                          ? 'bg-red-500 text-white shadow-lg shadow-red-500/30 animate-pulse'
                          : isProcessingPractice
                            ? 'bg-neutral-200 dark:bg-neutral-700 text-neutral-400 cursor-not-allowed'
                            : 'bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 hover:bg-purple-200 dark:hover:bg-purple-500/30'
                      }`}
                    >
                      {isProcessingPractice ? (
                        <div className="w-5 h-5 border-2 border-purple-600 dark:border-purple-400 border-t-transparent rounded-full animate-spin" />
                      ) : isRecordingPractice ? (
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <rect x="6" y="6" width="12" height="12" rx="2" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
                          <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
                        </svg>
                      )}
                    </button>

                    <p className="text-sm text-purple-700 dark:text-purple-300">
                      {isRecordingPractice
                        ? (language === 'ko' ? '말하고 있어요... 완료되면 탭하세요' : 'Listening... tap when done')
                        : isProcessingPractice
                          ? (language === 'ko' ? '인식 중...' : 'Processing...')
                          : practiceResult === null
                            ? (language === 'ko' ? '마이크를 눌러 따라 말해보세요' : 'Tap the mic and try saying it')
                            : ''}
                    </p>
                  </div>

                  {/* Practice Result */}
                  {practiceResult !== null && !isRecordingPractice && !isProcessingPractice && (
                    <div className="mt-3 space-y-2">
                      <div className="p-3 bg-white dark:bg-neutral-800 rounded-lg">
                        <span className="text-xs text-neutral-500 dark:text-neutral-400">
                          {language === 'ko' ? '내가 말한 것' : 'What you said'}
                        </span>
                        <p className="text-sm text-neutral-800 dark:text-neutral-200 mt-1">
                          {practiceResult || (language === 'ko' ? '(음성이 인식되지 않았습니다)' : '(No speech detected)')}
                        </p>
                      </div>
                      <div className="p-3 bg-green-50 dark:bg-green-500/10 rounded-lg">
                        <span className="text-xs text-green-600 dark:text-green-400">
                          {language === 'ko' ? '정답' : 'Target'}
                        </span>
                        <p className="text-sm text-green-800 dark:text-green-300 mt-1">
                          {currentCorrection.corrected}
                        </p>
                      </div>
                      <button
                        onClick={resetPractice}
                        className="w-full py-2 text-sm text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 transition-colors"
                      >
                        {language === 'ko' ? '다시 시도' : 'Try again'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Quality Rating */}
        {showAnswer && (
          <div style={{ paddingBottom: 'max(1.5rem, calc(0.5rem + env(safe-area-inset-bottom)))' }}>
            <p className="text-center text-sm text-neutral-500 dark:text-neutral-400 mb-3">
              {language === 'ko' ? '얼마나 잘 알고 있었나요?' : 'How well did you know this?'}
            </p>
            <div className="grid grid-cols-6 gap-2">
              {labels.map(({ value, label, color }) => (
                <button
                  key={value}
                  onClick={() => handleQualitySelect(value)}
                  disabled={isSubmitting}
                  className={`py-3 rounded-xl text-white text-xs font-medium transition-all hover:scale-105 active:scale-95 disabled:opacity-50 ${color}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}
      </main>
      {/* Bottom nav spacer */}
      <div className="h-20" />
      <BottomNav />
    </div>
  );
}
