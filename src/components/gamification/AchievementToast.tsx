'use client';

import { useEffect } from 'react';
import type { Achievement } from '@/lib/gamification';

interface AchievementToastProps {
  achievement: Achievement;
  onDismiss: () => void;
  language?: 'ko' | 'en';
}

export default function AchievementToast({
  achievement,
  onDismiss,
  language = 'en',
}: AchievementToastProps) {
  // Auto-dismiss after 4 seconds
  useEffect(() => {
    const timer = setTimeout(onDismiss, 4000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div className="fixed top-4 right-4 z-50 animate-achievement-unlock">
      <div className="flex items-center gap-3 px-5 py-4 rounded-2xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-white/10 shadow-premium-lg max-w-sm">
        {/* Icon */}
        <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 dark:from-purple-500/20 dark:to-pink-500/20 flex items-center justify-center">
          <svg className="w-7 h-7 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d={achievement.icon} />
          </svg>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-purple-600 dark:text-purple-400 uppercase tracking-wide mb-0.5">
            Achievement Unlocked!
          </p>
          <p className="text-sm font-semibold text-neutral-900 dark:text-white truncate">
            {achievement.name[language]}
          </p>
          <p className="text-xs text-neutral-500 dark:text-white/50 truncate">
            {achievement.description[language]}
          </p>
        </div>

        {/* Close Button */}
        <button
          onClick={onDismiss}
          className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-neutral-400 dark:text-white/40 hover:text-neutral-600 dark:hover:text-white/60 hover:bg-neutral-100 dark:hover:bg-white/10 transition-colors"
          aria-label="Dismiss"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Slide-in animation */}
      <style jsx>{`
        @keyframes achievement-slide-in {
          0% {
            transform: translateX(120%);
            opacity: 0;
          }
          100% {
            transform: translateX(0);
            opacity: 1;
          }
        }
        :global(.animate-achievement-unlock) {
          animation: achievement-slide-in 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
    </div>
  );
}
