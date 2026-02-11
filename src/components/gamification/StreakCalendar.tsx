'use client';

import type { Language } from '@/lib/i18n';

interface StreakCalendarProps {
  activeDays: boolean[];  // Length 7: [6 days ago, 5 days ago, ..., yesterday, today]
  currentStreak: number;
  language?: Language;
  className?: string;
}

const DAY_LABELS_EN = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DAY_LABELS_KO = ['월', '화', '수', '목', '금', '토', '일'];

function getDayLabels(language: Language): string[] {
  const labels = language === 'ko' ? DAY_LABELS_KO : DAY_LABELS_EN;
  const today = new Date().getDay(); // 0 = Sunday
  // Build last 7 days' labels, ending with today
  const result: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const dayIndex = (today - i + 7) % 7;
    // Convert Sunday=0 to Monday-first index
    const labelIndex = dayIndex === 0 ? 6 : dayIndex - 1;
    result.push(labels[labelIndex]);
  }
  return result;
}

export default function StreakCalendar({
  activeDays,
  currentStreak,
  language = 'en',
  className = '',
}: StreakCalendarProps) {
  const dayLabels = getDayLabels(language);
  // Ensure we always have exactly 7 entries
  const days = activeDays.length >= 7
    ? activeDays.slice(-7)
    : [...Array(7 - activeDays.length).fill(false), ...activeDays];

  return (
    <div className={`${className}`}>
      {/* Streak Count Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-neutral-600 dark:text-white/60">
          {language === 'ko' ? '최근 7일' : 'Last 7 Days'}
        </span>
        <div className="flex items-center gap-1.5">
          <svg className="w-5 h-5 text-orange-500" fill="currentColor" viewBox="0 0 24 24">
            <path d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z"/>
          </svg>
          <span className="text-sm font-bold text-neutral-900 dark:text-white">
            {currentStreak}{' '}
            <span className="font-medium text-neutral-500 dark:text-white/50">
              {language === 'ko' ? '일 연속' : currentStreak === 1 ? 'day streak' : 'day streak'}
            </span>
          </span>
        </div>
      </div>

      {/* Calendar Circles */}
      <div className="flex items-center justify-between gap-1">
        {days.map((isActive, index) => {
          const isToday = index === 6;
          return (
            <div key={index} className="flex flex-col items-center gap-1.5">
              {/* Day Label */}
              <span className={`text-2xs font-medium ${
                isToday
                  ? 'text-purple-600 dark:text-purple-400'
                  : 'text-neutral-400 dark:text-white/30'
              }`}>
                {dayLabels[index]}
              </span>

              {/* Circle */}
              <div
                className={`
                  w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center
                  transition-all duration-300
                  ${
                    isActive
                      ? 'bg-gradient-to-br from-purple-500 to-pink-500 shadow-glow-sm'
                      : 'bg-neutral-100 dark:bg-white/5'
                  }
                  ${isToday ? 'ring-2 ring-purple-400/50 dark:ring-purple-400/30 ring-offset-2 ring-offset-white dark:ring-offset-neutral-900' : ''}
                `}
              >
                {isActive ? (
                  <svg
                    className="w-4 h-4 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={3}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <div className="w-1.5 h-1.5 rounded-full bg-neutral-300 dark:bg-white/20" />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
