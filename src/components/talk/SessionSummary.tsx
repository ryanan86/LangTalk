'use client';

import { useState, useEffect } from 'react';

interface SessionSummaryProps {
  strengths: string[];
  areasToFocus: string[];
  corrections: number;
  sessionDuration: number;
  xpEarned?: number;
  level?: number;
  onBackHome: () => void;
  onPracticeAgain: () => void;
  language: 'ko' | 'en';
}

function AnimatedCounter({ target, duration = 1200 }: { target: number; duration?: number }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (target <= 0) return;
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out curve
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * target));
      if (progress >= 1) clearInterval(interval);
    }, 16);
    return () => clearInterval(interval);
  }, [target, duration]);

  return <span>{count}</span>;
}

function formatDuration(seconds: number, lang: 'ko' | 'en'): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (lang === 'ko') {
    return mins > 0 ? `${mins}분 ${secs}초` : `${secs}초`;
  }
  return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
}

export default function SessionSummary({
  strengths,
  areasToFocus,
  corrections,
  sessionDuration,
  xpEarned,
  level,
  onBackHome,
  onPracticeAgain,
  language,
}: SessionSummaryProps) {
  const isKo = language === 'ko';

  return (
    <div className="w-full max-w-lg mx-auto space-y-4 animate-fade-in-up px-4">
      {/* Title */}
      <div className="text-center mb-2">
        <h2
          className="text-xl sm:text-2xl font-bold font-display"
          style={{ color: 'var(--text-primary)' }}
        >
          {isKo ? '세션 완료!' : 'Session Complete!'}
        </h2>
        <p
          className="text-sm mt-1"
          style={{ color: 'var(--text-secondary)' }}
        >
          {isKo ? '오늘의 연습 결과입니다' : "Here's how you did today"}
        </p>
      </div>

      {/* XP and Level display */}
      {(xpEarned !== undefined || level !== undefined) && (
        <div
          className="card-premium p-4 text-center"
        >
          {xpEarned !== undefined && xpEarned > 0 && (
            <div className="mb-2">
              <span
                className="inline-block text-2xl sm:text-3xl font-bold gradient-text animate-xp-gain"
                style={{ animationFillMode: 'forwards' }}
              >
                +<AnimatedCounter target={xpEarned} /> XP
              </span>
            </div>
          )}
          {level !== undefined && (
            <p
              className="text-sm font-medium"
              style={{ color: 'var(--text-secondary)' }}
            >
              {isKo ? `레벨 ${level}` : `Level ${level}`}
            </p>
          )}
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3">
        {/* Duration */}
        <div className="card-premium p-4 text-center">
          <div className="flex justify-center mb-2">
            <svg
              className="w-6 h-6"
              style={{ color: 'var(--primary)' }}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <p
            className="text-lg sm:text-xl font-bold animate-count"
            style={{ color: 'var(--text-primary)' }}
          >
            {formatDuration(sessionDuration, language)}
          </p>
          <p
            className="text-xs mt-0.5"
            style={{ color: 'var(--text-muted)' }}
          >
            {isKo ? '연습 시간' : 'Practice Time'}
          </p>
        </div>

        {/* Corrections */}
        <div className="card-premium p-4 text-center">
          <div className="flex justify-center mb-2">
            <svg
              className="w-6 h-6"
              style={{ color: 'var(--primary)' }}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </div>
          <p
            className="text-lg sm:text-xl font-bold"
            style={{ color: 'var(--text-primary)' }}
          >
            <AnimatedCounter target={corrections} />
          </p>
          <p
            className="text-xs mt-0.5"
            style={{ color: 'var(--text-muted)' }}
          >
            {isKo ? '교정 항목' : 'Corrections'}
          </p>
        </div>
      </div>

      {/* Strengths */}
      {strengths.length > 0 && (
        <div className="card-premium p-4">
          <h3
            className="text-sm font-semibold mb-3 flex items-center gap-2"
            style={{ color: 'var(--text-primary)' }}
          >
            <svg
              className="w-4 h-4 text-green-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {isKo ? '잘한 점' : 'Strengths'}
          </h3>
          <ul className="space-y-2">
            {strengths.map((strength, i) => (
              <li
                key={i}
                className="flex items-start gap-2 text-sm animate-slide-up"
                style={{
                  animationDelay: `${i * 100}ms`,
                  color: 'var(--text-secondary)',
                }}
              >
                <svg
                  className="w-4 h-4 mt-0.5 flex-shrink-0 text-green-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span>{strength}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Areas to focus */}
      {areasToFocus.length > 0 && (
        <div className="card-premium p-4">
          <h3
            className="text-sm font-semibold mb-3 flex items-center gap-2"
            style={{ color: 'var(--text-primary)' }}
          >
            <svg
              className="w-4 h-4 text-amber-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            {isKo ? '개선할 점' : 'Areas to Focus'}
          </h3>
          <ul className="space-y-2">
            {areasToFocus.map((area, i) => (
              <li
                key={i}
                className="flex items-start gap-2 text-sm animate-slide-up"
                style={{
                  animationDelay: `${(strengths.length + i) * 100}ms`,
                  color: 'var(--text-secondary)',
                }}
              >
                <svg
                  className="w-4 h-4 mt-0.5 flex-shrink-0 text-amber-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01" />
                </svg>
                <span>{area}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* CTA Buttons */}
      <div className="flex gap-3 pt-2 pb-4">
        <button
          onClick={onBackHome}
          className="btn-secondary flex-1 text-sm sm:text-base"
        >
          {isKo ? '홈으로' : 'Back to Home'}
        </button>
        <button
          onClick={onPracticeAgain}
          className="btn-primary flex-1 text-sm sm:text-base"
        >
          {isKo ? '다시 연습하기' : 'Practice Again'}
        </button>
      </div>
    </div>
  );
}
