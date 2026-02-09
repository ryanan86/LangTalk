'use client';

import type { DailyChallenge } from '@/lib/dailyChallenges';

interface DailyChallengeCardProps {
  challenge: DailyChallenge;
  isComplete: boolean;
  streakDays?: number;
  language?: 'ko' | 'en';
  className?: string;
}

export default function DailyChallengeCard({
  challenge,
  isComplete,
  streakDays = 0,
  language = 'en',
  className = '',
}: DailyChallengeCardProps) {
  return (
    <div
      className={`
        relative overflow-hidden rounded-2xl p-4
        bg-white dark:bg-white/5
        border border-neutral-200 dark:border-white/10
        shadow-card dark:shadow-none
        transition-all duration-300
        ${isComplete ? 'ring-2 ring-green-400/50 dark:ring-green-400/30' : ''}
        ${className}
      `}
    >
      {/* Top Row: Type badge + Streak fire */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-full text-2xs font-semibold uppercase tracking-wide bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-500/20">
            {language === 'ko' ? '오늘의 도전' : "Today's Challenge"}
          </span>
          {streakDays > 0 && (
            <span className="flex items-center gap-1 text-xs font-medium text-amber-600 dark:text-amber-400">
              <svg className="w-4 h-4 text-amber-500" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z"/>
              </svg>
              {streakDays}
            </span>
          )}
        </div>

        {/* Status Badge */}
        {isComplete ? (
          <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400 text-2xs font-semibold border border-green-200 dark:border-green-500/20">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            {language === 'ko' ? '완료' : 'Complete'}
          </span>
        ) : (
          <span className="px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 text-2xs font-semibold border border-amber-200 dark:border-amber-500/20">
            {language === 'ko' ? '진행 중' : 'In Progress'}
          </span>
        )}
      </div>

      {/* Challenge Title */}
      <h3 className="text-base font-bold text-neutral-900 dark:text-white mb-1">
        {challenge.title[language]}
      </h3>

      {/* Challenge Description */}
      <p className="text-sm text-neutral-500 dark:text-white/50 mb-3">
        {challenge.description[language]}
      </p>

      {/* Bottom Row: XP Reward + Progress */}
      <div className="flex items-center justify-between">
        {/* XP Reward */}
        <div className="flex items-center gap-1.5">
          <svg className="w-4 h-4 text-purple-500" fill="currentColor" viewBox="0 0 24 24">
            <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/>
          </svg>
          <span className="text-sm font-semibold text-purple-600 dark:text-purple-400">
            +{challenge.xpReward} XP
          </span>
        </div>

        {/* Progress Indicator */}
        {!isComplete && (
          <div className="flex items-center gap-2">
            <div className="w-20 h-1.5 rounded-full bg-neutral-200 dark:bg-white/10 overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-purple-500 to-pink-500 w-0 transition-all duration-500" />
            </div>
          </div>
        )}

        {isComplete && (
          <span className="text-sm text-green-600 dark:text-green-400 font-medium">
            +{challenge.xpReward} XP {language === 'ko' ? '획득' : 'earned'}!
          </span>
        )}
      </div>

      {/* Completed overlay shimmer */}
      {isComplete && (
        <div className="absolute inset-0 pointer-events-none">
          <div
            className="absolute inset-0 animate-shimmer opacity-10"
            style={{
              backgroundImage:
                'linear-gradient(90deg, transparent 0%, rgba(16, 185, 129, 0.4) 50%, transparent 100%)',
              backgroundSize: '200% 100%',
            }}
          />
        </div>
      )}
    </div>
  );
}
