'use client';

import { useMemo } from 'react';
import { calculateLevel, currentLevelProgress } from '@/lib/gamification';

interface XPBarProps {
  totalXP: number;
  className?: string;
}

export default function XPBar({ totalXP, className = '' }: XPBarProps) {
  const level = useMemo(() => calculateLevel(totalXP), [totalXP]);
  const { currentLevelXP, xpNeeded, progress } = useMemo(
    () => currentLevelProgress(totalXP),
    [totalXP]
  );

  const isMaxLevel = level >= 50;
  const progressPercent = Math.round(progress * 100);

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Level Badge */}
      <div className="relative flex-shrink-0">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-violet-500/25">
          <span className="text-sm font-bold text-white">{level}</span>
        </div>
        {/* Glow ring */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-violet-600 to-indigo-500 opacity-25 blur-md -z-10" />
      </div>

      {/* Progress Bar */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-medium text-theme-muted">
            Lv.{level}
          </span>
          <span className="text-xs font-medium text-theme-muted">
            {isMaxLevel ? 'MAX' : `${currentLevelXP} / ${xpNeeded} XP`}
          </span>
        </div>

        {/* Bar Container */}
        <div className="relative h-2.5 rounded-full bg-neutral-200 dark:bg-white/10 overflow-hidden">
          {/* Fill */}
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-violet-600 to-indigo-500 transition-all duration-700 ease-out"
            style={{ width: `${isMaxLevel ? 100 : progressPercent}%` }}
          >
            {/* Shimmer Effect */}
            <div
              className="absolute inset-0 animate-shimmer"
              style={{
                backgroundImage:
                  'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%)',
                backgroundSize: '200% 100%',
              }}
            />
          </div>

          {/* Subtle inner shadow for depth */}
          <div className="absolute inset-0 rounded-full shadow-inner pointer-events-none" />
        </div>
      </div>
    </div>
  );
}
