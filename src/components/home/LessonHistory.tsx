'use client';

import type { Language } from '@/lib/i18n';
import { useState } from 'react';

interface Lesson {
  dateTime: string;
  tutor: string;
  duration: number;
  topicSummary: string;
  feedbackSummary: string;
  keyCorrections: string;
  level: string;
  language?: string;
}

interface LessonHistoryProps {
  lessonHistory: Lesson[];
  language: Language;
}

/** Format date string based on display language. Handles both ISO and legacy ko-KR formats. */
function formatLessonDate(dateStr: string, displayLang: Language): string {
  if (!dateStr) return '';
  try {
    // Try parsing as ISO first (new format)
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      const locale = displayLang === 'ko' ? 'ko-KR' : 'en-US';
      return new Intl.DateTimeFormat(locale, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: displayLang !== 'ko',
      }).format(d);
    }
  } catch {
    // Fall through to return raw string
  }
  return dateStr;
}

const tutorGradients: Record<string, string> = {
  emma: 'from-rose-400 to-pink-500',
  james: 'from-blue-400 to-indigo-500',
  charlotte: 'from-violet-400 to-purple-500',
  oliver: 'from-emerald-400 to-teal-500',
  alina: 'from-amber-400 to-orange-500',
  henry: 'from-lime-400 to-green-500',
};

export default function LessonHistory({ lessonHistory, language }: LessonHistoryProps) {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  if (lessonHistory.length === 0) return null;

  return (
    <div className="max-w-2xl mx-auto mt-8">
      <h3 className="text-sm font-medium dark:text-white/40 text-zinc-400 uppercase tracking-wider mb-4 text-center">
        {language === 'ko' ? '최근 학습 기록' : 'Recent Lessons'}
      </h3>
      <div className="space-y-3">
        {lessonHistory.map((lesson, idx) => {
          const isExpanded = expandedIdx === idx;
          const gradient = tutorGradients[lesson.tutor] || 'from-neutral-400 to-neutral-500';

          return (
            <div
              key={idx}
              className="rounded-xl dark:bg-white/[0.04] bg-black/[0.03] border dark:border-white/10 border-black/[0.08] dark:hover:bg-white/[0.06] hover:bg-black/[0.05] transition-all overflow-hidden"
            >
              {/* Main row - always visible */}
              <button
                onClick={() => setExpandedIdx(isExpanded ? null : idx)}
                className="w-full p-4 text-left"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white font-bold text-sm shrink-0`}
                    >
                      {lesson.tutor ? lesson.tutor[0].toUpperCase() : '?'}
                    </div>
                    <div>
                      <p className="dark:text-white text-zinc-900 font-medium capitalize">
                        {lesson.tutor || 'Unknown'}
                      </p>
                      <p className="dark:text-white/40 text-zinc-400 text-xs">{formatLessonDate(lesson.dateTime, language)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      {lesson.level && (
                        <span className="inline-block px-2 py-1 rounded-full bg-blue-500/20 text-blue-400 text-xs font-medium">
                          {lesson.level}
                        </span>
                      )}
                      {lesson.duration > 0 && (
                        <p className="dark:text-white/40 text-zinc-400 text-xs mt-1">
                          {lesson.duration}
                          {language === 'ko' ? '분' : 'min'}
                        </p>
                      )}
                    </div>
                    <svg
                      className={`w-4 h-4 dark:text-white/40 text-zinc-400 transition-transform duration-200 ${
                        isExpanded ? 'rotate-180' : ''
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>

                {lesson.topicSummary && (
                  <p className="dark:text-white/60 text-zinc-600 text-sm line-clamp-1">
                    {lesson.topicSummary}
                  </p>
                )}
              </button>

              {/* Expanded details */}
              {isExpanded && (
                <div className="px-4 pb-4 border-t dark:border-white/5 border-black/[0.05] pt-3 animate-fade-in">
                  {lesson.feedbackSummary && (
                    <div className="mb-3">
                      <p className="text-xs font-medium dark:text-white/50 text-zinc-400 mb-1">
                        {language === 'ko' ? '피드백 요약' : 'Feedback Summary'}
                      </p>
                      <p className="text-sm dark:text-white/70 text-zinc-600">{lesson.feedbackSummary}</p>
                    </div>
                  )}
                  {lesson.keyCorrections && (
                    <div>
                      <p className="text-xs font-medium dark:text-white/50 text-zinc-400 mb-1">
                        {language === 'ko' ? '주요 교정' : 'Key Corrections'}
                      </p>
                      <p className="text-sm text-amber-400/70">{lesson.keyCorrections}</p>
                    </div>
                  )}
                  {!lesson.feedbackSummary && !lesson.keyCorrections && (
                    <p className="text-sm dark:text-white/40 text-zinc-400 italic">
                      {language === 'ko' ? '상세 정보가 없습니다.' : 'No additional details available.'}
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
