'use client';

import type { Language } from '@/lib/i18n';

interface StreakDisplayProps {
  currentStreak: number;
  sessionCount: number;
  language: Language;
}

export default function StreakDisplay({ currentStreak, sessionCount, language }: StreakDisplayProps) {
  // Generate last 7 days labels
  const days = [];
  const dayLabelsKo = ['일', '월', '화', '수', '목', '금', '토'];
  const dayLabelsEn = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  const today = new Date();

  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dayOfWeek = date.getDay();
    const isActive = i < currentStreak;
    const isToday = i === 0;

    days.push({
      label: language === 'ko' ? dayLabelsKo[dayOfWeek] : dayLabelsEn[dayOfWeek],
      isActive,
      isToday,
    });
  }

  return (
    <div className="max-w-md mx-auto mb-8">
      <div className="card-premium p-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            {currentStreak > 0 ? (
              <svg className="w-6 h-6 text-orange-500" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z"/>
              </svg>
            ) : (
              <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707"/>
              </svg>
            )}
            <div>
              <h3 className="font-semibold text-theme-primary text-sm">
                {language === 'ko' ? '연속 학습' : 'Learning Streak'}
              </h3>
              <p className="text-xs text-theme-muted">
                {currentStreak > 0
                  ? language === 'ko'
                    ? `${currentStreak}일 연속!`
                    : `${currentStreak} day streak!`
                  : language === 'ko'
                    ? '오늘 시작해보세요'
                    : 'Start today'}
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-lg font-bold text-theme-primary">{sessionCount}</div>
            <div className="text-xs text-theme-muted">
              {language === 'ko' ? '총 세션' : 'total'}
            </div>
          </div>
        </div>

        {/* 7-Day Calendar */}
        <div className="flex items-center justify-between gap-1">
          {days.map((day, idx) => (
            <div key={idx} className="flex flex-col items-center gap-1.5">
              <span className="text-2xs text-theme-muted font-medium">
                {day.label}
              </span>
              <div
                className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                  day.isActive
                    ? day.isToday
                      ? 'bg-gradient-to-br from-violet-600 to-indigo-500 shadow-lg shadow-violet-500/25'
                      : 'bg-gradient-to-br from-violet-500 to-indigo-400'
                    : day.isToday
                      ? 'bg-neutral-100 dark:bg-white/10 border-2 border-violet-400 dark:border-violet-500'
                      : 'bg-neutral-100 dark:bg-white/5 border border-neutral-200 dark:border-white/10'
                }`}
              >
                {day.isActive ? (
                  <svg
                    className="w-4 h-4 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2.5}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                ) : (
                  <div className="w-1.5 h-1.5 rounded-full bg-neutral-300 dark:bg-white/20" />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
