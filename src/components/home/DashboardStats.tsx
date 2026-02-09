'use client';

import { useState, useEffect } from 'react';

// Circular Progress Sub-Component
function CircularProgress({
  value,
  max,
  size = 80,
  strokeWidth = 6,
  color = 'purple',
}: {
  value: number;
  max: number;
  size?: number;
  strokeWidth?: number;
  color?: 'purple' | 'amber' | 'green' | 'blue';
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const progress = Math.min(value / max, 1);
  const strokeDashoffset = circumference - progress * circumference;

  const colors = {
    purple: 'stroke-purple-500',
    amber: 'stroke-amber-500',
    green: 'stroke-green-500',
    blue: 'stroke-blue-500',
  };

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-neutral-200 dark:text-white/10"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          className={`${colors[color]} transition-all duration-1000 ease-out`}
          style={{
            strokeDasharray: circumference,
            strokeDashoffset: strokeDashoffset,
          }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-lg font-bold text-neutral-900 dark:text-white">{value}</span>
      </div>
    </div>
  );
}

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
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 max-w-2xl mx-auto mb-8">
      {/* Sessions Completed */}
      <div className="relative group p-4 rounded-2xl bg-purple-50 dark:bg-gradient-to-br dark:from-purple-500/10 dark:to-pink-500/10 border border-purple-200 dark:border-purple-500/20 hover:border-purple-300 dark:hover:border-purple-500/40 transition-all">
        <div className="absolute inset-0 rounded-2xl bg-purple-100/50 dark:bg-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="relative flex justify-center">
          <CircularProgress value={sessionCount} max={10} color="purple" />
        </div>
        <div className="relative mt-2 text-xs text-neutral-500 dark:text-white/50 text-center">
          {language === 'ko' ? '완료 세션' : 'Sessions'}
        </div>
      </div>

      {/* Debate Progress */}
      <div className="relative group p-4 rounded-2xl bg-amber-50 dark:bg-gradient-to-br dark:from-amber-500/10 dark:to-orange-500/10 border border-amber-200 dark:border-amber-500/20 hover:border-amber-300 dark:hover:border-amber-500/40 transition-all">
        <div className="absolute inset-0 rounded-2xl bg-amber-100/50 dark:bg-amber-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="relative flex justify-center">
          <CircularProgress value={Math.min(sessionCount, 5)} max={5} color="amber" />
        </div>
        <div className="relative mt-2 text-xs text-neutral-500 dark:text-white/50 text-center">
          {canAccessDebate
            ? (language === 'ko' ? '디베이트 가능' : 'Debate Ready')
            : (language === 'ko' ? '디베이트' : 'Debate')}
        </div>
      </div>

      {/* Streak */}
      <div className="relative group p-4 rounded-2xl bg-green-50 dark:bg-gradient-to-br dark:from-green-500/10 dark:to-emerald-500/10 border border-green-200 dark:border-green-500/20 hover:border-green-300 dark:hover:border-green-500/40 transition-all">
        <div className="absolute inset-0 rounded-2xl bg-green-100/50 dark:bg-green-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="relative w-20 h-20 flex items-center justify-center mx-auto">
          <div className="text-center">
            <div className="text-2xl font-bold text-neutral-900 dark:text-white flex items-center justify-center gap-1">
              <svg className="w-6 h-6 text-orange-400 animate-fire" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 23c-3.866 0-7-3.134-7-7 0-2.55 1.61-4.948 3.12-6.7.35-.41.94-.42 1.3-.03.31.33.3.85-.03 1.17C8.2 11.69 7 13.51 7 16c0 2.757 2.243 5 5 5s5-2.243 5-5c0-2.49-1.2-4.31-2.39-5.56-.33-.32-.34-.84-.03-1.17.36-.39.95-.38 1.3.03C17.39 11.052 19 13.45 19 16c0 3.866-3.134 7-7 7zm0-11c-1.657 0-3-1.343-3-3 0-1.4 1.5-2.9 2.58-3.83.27-.23.67-.23.94 0C13.5 6.1 15 7.6 15 9c0 1.657-1.343 3-3 3z" />
              </svg>
              <AnimatedCounter target={sessionCount > 0 ? Math.min(sessionCount, 7) : 0} />
            </div>
            <div className="text-xs text-neutral-400 dark:text-white/40">
              {language === 'ko' ? '일' : 'days'}
            </div>
          </div>
        </div>
        <div className="relative mt-2 text-xs text-neutral-500 dark:text-white/50 text-center">
          {language === 'ko' ? '연속 학습' : 'Streak'}
        </div>
      </div>

      {/* Level - AI Evaluated */}
      <div className="relative group p-4 rounded-2xl bg-blue-50 dark:bg-gradient-to-br dark:from-blue-500/10 dark:to-cyan-500/10 border border-blue-200 dark:border-blue-500/20 hover:border-blue-300 dark:hover:border-blue-500/40 transition-all">
        <div className="absolute inset-0 rounded-2xl bg-blue-100/50 dark:bg-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="relative w-20 h-20 flex items-center justify-center mx-auto">
          <div className="text-center">
            {currentLevel ? (
              <>
                <div className="text-2xl font-bold bg-gradient-to-r from-blue-500 to-cyan-500 dark:from-blue-400 dark:to-cyan-400 bg-clip-text text-transparent">
                  {currentLevel.grade}
                </div>
                <div className="text-xs text-blue-500/60 dark:text-blue-400/60 mt-1 flex items-center justify-center gap-1">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z"
                      clipRule="evenodd"
                    />
                  </svg>
                  AI
                </div>
              </>
            ) : (
              <div className="text-2xl font-bold text-neutral-300 dark:text-white/30">-</div>
            )}
          </div>
        </div>
        <div className="relative mt-2 text-xs text-neutral-500 dark:text-white/50 text-center">
          {language === 'ko' ? '현재 레벨' : 'Level'}
        </div>
      </div>
    </div>
  );
}
