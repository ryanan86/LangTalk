'use client';

import { useState, useEffect } from 'react';

// Animated Counter Sub-Component
function AnimatedCounter({ target, duration = 1500 }: { target: number; duration?: number }) {
  const [count, setCount] = useState(0);
  const [hasAnimated, setHasAnimated] = useState(false);

  useEffect(() => {
    if (hasAnimated) return;
    setHasAnimated(true);

    const steps = 30;
    const increment = target / steps;
    const stepDuration = duration / steps;
    let current = 0;

    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.floor(current));
      }
    }, stepDuration);

    return () => clearInterval(timer);
  }, [target, duration, hasAnimated]);

  return <span>{count}</span>;
}

interface DashboardStatsProps {
  sessionCount: number;
  currentLevel: { grade: string; name: string; nameKo: string } | null;
  language: 'ko' | 'en';
  canAccessDebate: boolean;
}

export default function DashboardStats({
  sessionCount,
  currentLevel,
  language,
  canAccessDebate,
}: DashboardStatsProps) {
  const cardBase = "relative overflow-hidden rounded-3xl bg-white p-5 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] transition-all duration-300 hover:scale-[1.02] hover:shadow-lg dark:bg-neutral-900 dark:shadow-none border border-neutral-100 dark:border-white/[0.06]";

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 max-w-2xl mx-auto mb-8">
      {/* Sessions Completed */}
      <div className={`${cardBase} group`}>
        <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-purple-500/10 blur-2xl dark:bg-purple-500/20" />
        <div className="relative">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
              {language === 'ko' ? '완료 세션' : 'Sessions'}
            </span>
            <div className="rounded-full bg-purple-100 p-1.5 dark:bg-purple-500/20">
              <svg className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
          </div>
          <div className="flex items-end gap-1.5 mb-3">
            <span className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-white">
              <AnimatedCounter target={sessionCount} />
            </span>
            <span className="mb-1 text-sm font-medium text-neutral-400 dark:text-neutral-500">/ 10</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
            <div
              className="h-full rounded-full bg-purple-500 dark:bg-purple-400 transition-all duration-1000"
              style={{ width: `${Math.min((sessionCount / 10) * 100, 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Debate Progress */}
      <div className={`${cardBase} group`}>
        <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-amber-500/10 blur-2xl dark:bg-amber-500/20" />
        <div className="relative">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
              {canAccessDebate
                ? (language === 'ko' ? '디베이트' : 'Debate')
                : (language === 'ko' ? '디베이트' : 'Debate')}
            </span>
            <div className="rounded-full bg-amber-100 p-1.5 dark:bg-amber-500/20">
              <svg className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
              </svg>
            </div>
          </div>
          <div className="flex items-end gap-1.5 mb-3">
            <span className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-white">
              <AnimatedCounter target={Math.min(sessionCount, 5)} />
            </span>
            <span className="mb-1 text-sm font-medium text-neutral-400 dark:text-neutral-500">/ 5</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
            <div
              className="h-full rounded-full bg-amber-500 dark:bg-amber-400 transition-all duration-1000"
              style={{ width: `${Math.min((sessionCount / 5) * 100, 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Streak */}
      <div className={`${cardBase} group`}>
        <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-orange-500/10 blur-2xl dark:bg-orange-500/20" />
        <div className="relative">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
              {language === 'ko' ? '연속 학습' : 'Streak'}
            </span>
            <div className="rounded-full bg-orange-100 p-1.5 dark:bg-orange-500/20">
              <svg className="h-3.5 w-3.5 text-orange-500 dark:text-orange-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 23c-3.866 0-7-3.134-7-7 0-2.55 1.61-4.948 3.12-6.7.35-.41.94-.42 1.3-.03.31.33.3.85-.03 1.17C8.2 11.69 7 13.51 7 16c0 2.757 2.243 5 5 5s5-2.243 5-5c0-2.49-1.2-4.31-2.39-5.56-.33-.32-.34-.84-.03-1.17.36-.39.95-.38 1.3.03C17.39 11.052 19 13.45 19 16c0 3.866-3.134 7-7 7zm0-11c-1.657 0-3-1.343-3-3 0-1.4 1.5-2.9 2.58-3.83.27-.23.67-.23.94 0C13.5 6.1 15 7.6 15 9c0 1.657-1.343 3-3 3z" />
              </svg>
            </div>
          </div>
          <div className="flex items-end gap-1.5">
            <span className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-white">
              <AnimatedCounter target={sessionCount > 0 ? Math.min(sessionCount, 7) : 0} />
            </span>
            <span className="mb-1 text-sm font-medium text-neutral-400 dark:text-neutral-500">
              {language === 'ko' ? '일' : 'days'}
            </span>
          </div>
        </div>
      </div>

      {/* Level - AI Evaluated */}
      <div className={`${cardBase} group`}>
        <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-blue-500/10 blur-2xl dark:bg-blue-500/20" />
        <div className="relative">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
              {language === 'ko' ? '현재 레벨' : 'Level'}
            </span>
            <div className="rounded-full bg-blue-100 p-1.5 dark:bg-blue-500/20">
              <svg className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
          <div className="flex items-end gap-1.5">
            {currentLevel ? (
              <>
                <span className="text-3xl font-bold tracking-tight bg-gradient-to-r from-blue-500 to-cyan-500 dark:from-blue-400 dark:to-cyan-400 bg-clip-text text-transparent">
                  {currentLevel.grade}
                </span>
                <span className="mb-1 text-sm font-medium text-neutral-400 dark:text-neutral-500">AI</span>
              </>
            ) : (
              <span className="text-3xl font-bold tracking-tight text-neutral-300 dark:text-neutral-600">-</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
