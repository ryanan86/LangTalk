'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/lib/i18n';

interface Correction {
  correctionId: string;
  original: string;
  corrected: string;
  explanation: string;
  category: string;
  difficulty: number;
  interval: number;
  repetitions: number;
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

  const playTTS = async (text: string) => {
    setIsPlaying(true);
    try {
      const response = await fetch('/api/text-to-speech', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voice: 'shimmer' }),
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
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
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
      <div className="min-h-screen bg-neutral-50 flex flex-col">
        <header className="bg-white/80 backdrop-blur-md border-b border-neutral-200 px-4 py-4">
          <div className="max-w-2xl mx-auto flex justify-between items-center">
            <button onClick={() => router.push('/')} className="text-neutral-500 hover:text-neutral-700">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-lg font-semibold">{language === 'ko' ? '복습' : 'Review'}</h1>
            <div className="w-6" />
          </div>
        </header>

        <main className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
            <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <h2 className="text-2xl font-bold text-neutral-900 mb-2">
            {completedCount > 0
              ? (language === 'ko' ? '복습 완료!' : 'Review Complete!')
              : (language === 'ko' ? '복습할 항목이 없습니다' : 'No items to review')}
          </h2>

          {completedCount > 0 && (
            <p className="text-neutral-600 mb-8">
              {language === 'ko'
                ? `${completedCount}개 항목을 복습했습니다.`
                : `You reviewed ${completedCount} items.`}
            </p>
          )}

          <button onClick={() => router.push('/')} className="btn-primary px-8 py-3">
            {language === 'ko' ? '홈으로' : 'Back to Home'}
          </button>
        </main>
      </div>
    );
  }

  const labels = language === 'ko' ? qualityLabels.ko : qualityLabels.en;

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col">
      <audio ref={audioRef} onEnded={() => setIsPlaying(false)} />

      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-neutral-200 px-4 py-4">
        <div className="max-w-2xl mx-auto flex justify-between items-center">
          <button onClick={() => router.push('/')} className="text-neutral-500 hover:text-neutral-700">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="text-center">
            <h1 className="text-lg font-semibold">{language === 'ko' ? '복습' : 'Review'}</h1>
            <p className="text-xs text-neutral-500">
              {currentIndex + 1} / {corrections.length}
            </p>
          </div>
          <div className="w-6" />
        </div>
      </header>

      {/* Progress Bar */}
      <div className="bg-white border-b border-neutral-100 px-4 py-2">
        <div className="max-w-2xl mx-auto">
          <div className="h-1 bg-neutral-200 rounded-full overflow-hidden">
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
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
            {/* Question - What user said */}
            <div className="mb-6">
              <span className="text-xs font-medium text-neutral-500 uppercase tracking-wider">
                {language === 'ko' ? '당신이 말한 것' : 'What you said'}
              </span>
              <p className="text-xl text-neutral-800 mt-2 font-medium">
                {currentCorrection.original}
              </p>
            </div>

            {/* Category Badge */}
            <span className="inline-block px-3 py-1 bg-neutral-100 text-neutral-600 text-xs rounded-full mb-6">
              {currentCorrection.category}
            </span>

            {/* Answer Section */}
            {!showAnswer ? (
              <button
                onClick={() => setShowAnswer(true)}
                className="w-full py-4 border-2 border-dashed border-neutral-300 rounded-xl text-neutral-500 hover:border-primary-400 hover:text-primary-600 transition-colors"
              >
                {language === 'ko' ? '정답 보기' : 'Show Answer'}
              </button>
            ) : (
              <div className="space-y-4">
                {/* Correct Way */}
                <div className="p-4 bg-green-50 rounded-xl">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-medium text-green-600 uppercase tracking-wider">
                      {language === 'ko' ? '올바른 표현' : 'Correct way'}
                    </span>
                    <button
                      onClick={() => playTTS(currentCorrection.corrected)}
                      disabled={isPlaying}
                      className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center hover:bg-green-200 transition-colors"
                    >
                      {isPlaying ? (
                        <div className="w-3 h-3 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                  <p className="text-lg text-green-800 font-medium">
                    {currentCorrection.corrected}
                  </p>
                </div>

                {/* Explanation */}
                <div className="p-4 bg-blue-50 rounded-xl">
                  <span className="text-xs font-medium text-blue-600 uppercase tracking-wider">
                    {language === 'ko' ? '설명' : 'Explanation'}
                  </span>
                  <p className="text-sm text-blue-800 mt-2">
                    {currentCorrection.explanation}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Quality Rating */}
        {showAnswer && (
          <div className="pb-6">
            <p className="text-center text-sm text-neutral-500 mb-3">
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
    </div>
  );
}
