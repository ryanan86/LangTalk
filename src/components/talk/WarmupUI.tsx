'use client';

import { useState } from 'react';
import { useLanguage } from '@/lib/i18n';
import type { WarmupPhrase } from '@/lib/warmupPhrases';

interface WarmupUIProps {
  phrases: WarmupPhrase[];
  onComplete: () => void;
  onBack: () => void;
  onPlayPhrase: (text: string) => void;
  isPlaying: boolean;
}

const DIFFICULTY_LABELS = {
  easy: { ko: '쉬움', en: 'Easy', color: 'text-green-500', bg: 'bg-green-100 dark:bg-green-500/20' },
  medium: { ko: '보통', en: 'Medium', color: 'text-amber-500', bg: 'bg-amber-100 dark:bg-amber-500/20' },
  stretch: { ko: '도전', en: 'Challenge', color: 'text-red-500', bg: 'bg-red-100 dark:bg-red-500/20' },
};

export default function WarmupUI({
  phrases,
  onComplete,
  onBack,
  onPlayPhrase,
  isPlaying,
}: WarmupUIProps) {
  const { language } = useLanguage();
  const isKo = language === 'ko';
  const [currentIndex, setCurrentIndex] = useState(0);
  const [completed, setCompleted] = useState<Set<number>>(new Set());

  const currentPhrase = phrases[currentIndex];
  if (!currentPhrase) return null;

  const diffLabel = DIFFICULTY_LABELS[currentPhrase.difficulty];

  const markDone = () => {
    const next = new Set(completed);
    next.add(currentIndex);
    setCompleted(next);

    if (currentIndex < phrases.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const allDone = completed.size >= phrases.length;

  return (
    <div className="flex-1 flex flex-col p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={onBack}
          className="p-2 rounded-xl text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-white/5 transition-colors"
          aria-label="Go back"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h2 className="text-lg font-bold text-neutral-900 dark:text-white">
            {isKo ? '워밍업' : 'Warm Up'}
          </h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            {isKo ? '따라 말해보세요. 평가에 포함되지 않아요.' : 'Repeat after the tutor. This won\'t be graded.'}
          </p>
        </div>
      </div>

      {/* Progress */}
      <div className="flex gap-2 mb-6">
        {phrases.map((_, idx) => (
          <div
            key={idx}
            className={`h-1.5 flex-1 rounded-full transition-all ${
              completed.has(idx) ? 'bg-green-500' : idx === currentIndex ? 'bg-primary-500' : 'bg-neutral-200 dark:bg-neutral-700'
            }`}
          />
        ))}
      </div>

      {!allDone ? (
        /* Phrase Card */
        <div className="flex-1 flex flex-col items-center justify-center">
          <span className={`px-3 py-1 rounded-full text-xs font-medium mb-4 ${diffLabel.bg} ${diffLabel.color}`}>
            {isKo ? diffLabel.ko : diffLabel.en} ({currentIndex + 1}/{phrases.length})
          </span>

          <div className="bg-white dark:bg-neutral-800 rounded-2xl p-6 sm:p-8 shadow-lg border border-neutral-200 dark:border-neutral-700 w-full max-w-md text-center mb-6">
            <p className="text-xl sm:text-2xl font-medium text-neutral-900 dark:text-white mb-3 leading-relaxed">
              {currentPhrase.english}
            </p>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              {currentPhrase.korean}
            </p>
          </div>

          {/* Play Button */}
          <button
            onClick={() => onPlayPhrase(currentPhrase.english)}
            disabled={isPlaying}
            className="w-16 h-16 mx-auto bg-primary-100 dark:bg-primary-500/20 rounded-full flex items-center justify-center hover:bg-primary-200 dark:hover:bg-primary-500/30 transition-colors mb-6"
            aria-label="Listen"
          >
            {isPlaying ? (
              <div className="flex items-center gap-1 h-6">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="w-0.5 bg-primary-500 rounded-full animate-pulse" style={{ height: `${8 + i * 3}px`, animationDelay: `${i * 0.1}s` }} />
                ))}
              </div>
            ) : (
              <svg className="w-8 h-8 text-primary-600 dark:text-primary-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>

          {/* Actions */}
          <div className="flex gap-3 w-full max-w-md">
            <button
              onClick={() => onPlayPhrase(currentPhrase.english)}
              disabled={isPlaying}
              className="flex-1 py-3 rounded-xl text-sm font-medium border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
            >
              {isKo ? '다시 듣기' : 'Listen Again'}
            </button>
            <button
              onClick={markDone}
              className="flex-1 py-3 rounded-xl text-sm font-semibold bg-primary-600 text-white hover:bg-primary-500 shadow-lg shadow-primary-500/20 transition-all"
            >
              {currentIndex < phrases.length - 1
                ? (isKo ? '다음 문장' : 'Next Phrase')
                : (isKo ? '완료' : 'Done')}
            </button>
          </div>
        </div>
      ) : (
        /* Completion */
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-500/20 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-neutral-900 dark:text-white mb-2">
            {isKo ? '워밍업 완료!' : 'Warm-up Complete!'}
          </h3>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-6 max-w-sm">
            {isKo
              ? '잘했어요! 이제 진짜 대화를 시작해볼까요?'
              : 'Great job! Ready to start the real conversation?'}
          </p>
          <button
            onClick={onComplete}
            className="px-8 py-4 rounded-2xl font-semibold bg-primary-600 text-white hover:bg-primary-500 shadow-lg shadow-primary-500/20 transition-all text-base"
          >
            {isKo ? '대화 시작하기' : 'Start Conversation'}
          </button>
        </div>
      )}
    </div>
  );
}
