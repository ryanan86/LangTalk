'use client';

import { useState } from 'react';
import type { Achievement } from '@/lib/gamification';

interface AchievementBadgeProps {
  achievement: Achievement;
  isUnlocked: boolean;
  size?: 'sm' | 'md' | 'lg';
  language?: 'ko' | 'en';
}

const sizeMap = {
  sm: { container: 'w-12 h-12', icon: 'text-lg', tooltip: 'text-xs' },
  md: { container: 'w-16 h-16', icon: 'text-2xl', tooltip: 'text-sm' },
  lg: { container: 'w-20 h-20', icon: 'text-3xl', tooltip: 'text-sm' },
};

export default function AchievementBadge({
  achievement,
  isUnlocked,
  size = 'md',
  language = 'en',
}: AchievementBadgeProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const dimensions = sizeMap[size];

  return (
    <div
      className="relative inline-flex flex-col items-center"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      onTouchStart={() => setShowTooltip(true)}
      onTouchEnd={() => setShowTooltip(false)}
    >
      {/* Badge */}
      <div
        className={`
          ${dimensions.container} rounded-2xl flex items-center justify-center
          transition-all duration-300 cursor-pointer relative
          ${
            isUnlocked
              ? 'bg-gradient-to-br from-purple-500/10 to-pink-500/10 dark:from-purple-500/20 dark:to-pink-500/20 border-2 border-purple-400/50 dark:border-purple-400/30 shadow-glow-sm'
              : 'bg-neutral-100 dark:bg-white/5 border-2 border-neutral-200 dark:border-white/10 grayscale'
          }
        `}
      >
        {/* Icon */}
        <svg
          className={`${size === 'sm' ? 'w-5 h-5' : size === 'md' ? 'w-7 h-7' : 'w-9 h-9'} ${
            isUnlocked ? 'text-purple-500' : 'text-neutral-400 opacity-30 dark:opacity-20'
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d={achievement.icon} />
        </svg>

        {/* Lock Overlay (locked state) */}
        {!isUnlocked && (
          <div className="absolute inset-0 rounded-2xl flex items-center justify-center">
            <div className="w-5 h-5 rounded-full bg-neutral-300 dark:bg-white/10 flex items-center justify-center">
              <svg
                className="w-3 h-3 text-neutral-500 dark:text-white/40"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
                />
              </svg>
            </div>
          </div>
        )}

        {/* Unlocked glow ring */}
        {isUnlocked && (
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-purple-400 to-pink-400 opacity-20 blur-md -z-10 animate-glow" />
        )}
      </div>

      {/* Tooltip */}
      {showTooltip && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 pointer-events-none">
          <div className="px-3 py-2 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-white/10 shadow-premium text-center whitespace-nowrap">
            <p className={`font-semibold text-neutral-900 dark:text-white ${dimensions.tooltip}`}>
              {achievement.name[language]}
            </p>
            <p className={`text-neutral-500 dark:text-white/50 mt-0.5 ${size === 'sm' ? 'text-2xs' : 'text-xs'}`}>
              {achievement.description[language]}
            </p>
            {!isUnlocked && (
              <p className="text-purple-500 dark:text-purple-400 text-2xs mt-1 font-medium">
                Locked
              </p>
            )}
          </div>
          {/* Arrow */}
          <div className="flex justify-center">
            <div className="w-2 h-2 bg-white dark:bg-neutral-800 border-b border-r border-neutral-200 dark:border-white/10 rotate-45 -mt-1" />
          </div>
        </div>
      )}
    </div>
  );
}
