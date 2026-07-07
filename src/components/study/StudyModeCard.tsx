'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import type { StudyPlan, StudyStats } from '@/lib/studyTypes';
import { fetchStudyState, positionFromState, isTodayCompleted } from '@/lib/studyClient';

/**
 * Home-page entry point for Study Mode. Self-contained: fetches the persisted
 * plan + stats, then renders an enrolled state (streak / today's session) or a
 * "시작하기" call-to-action. Renders nothing until loaded to avoid layout shift.
 */
export default function StudyModeCard() {
  const [plan, setPlan] = useState<StudyPlan | null>(null);
  const [stats, setStats] = useState<StudyStats | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    fetchStudyState(controller.signal)
      .then((state) => {
        setPlan(state.plan);
        setStats(state.stats);
      })
      .catch(() => { /* endpoint may not be ready — fall back to CTA */ })
      .finally(() => setLoaded(true));
    return () => controller.abort();
  }, []);

  // Skeleton sized to the real card so there is no layout shift on load.
  if (!loaded) {
    return (
      <div className="max-w-2xl mx-auto mb-6 px-4">
        <div className="skeleton rounded-card-lg h-[104px] w-full" />
      </div>
    );
  }

  const enrolled = Boolean(plan);
  const pos = plan ? positionFromState(plan, stats) : null;
  const todayDone = isTodayCompleted(stats);
  const streak = stats?.currentStreak ?? 0;

  return (
    <div className="max-w-2xl mx-auto mb-6 px-4 motion-safe:animate-fade-up">
      <Link
        href="/study"
        className="pressable group relative block w-full text-left overflow-hidden rounded-card-lg p-5
                   bg-brand-gradient text-white
                   shadow-float dark:shadow-float-dark
                   transition-all duration-300 ease-out hover:-translate-y-0.5"
      >
        {/* Ambient glow orbs for layered depth */}
        <div aria-hidden="true" className="absolute -top-16 -right-10 w-48 h-48 rounded-full bg-white/15 blur-3xl" />
        <div aria-hidden="true" className="absolute -bottom-20 -left-8 w-44 h-44 rounded-full bg-indigo-400/25 blur-3xl" />
        {/* Sheen sweep on hover */}
        <div
          aria-hidden="true"
          className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-[900ms] ease-out
                     bg-gradient-to-r from-transparent via-white/15 to-transparent"
        />

        <div className="relative flex items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-white/20 backdrop-blur-sm">
                <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.247m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.247" />
                </svg>
              </span>
              <span className="text-[11px] font-semibold text-white/85 uppercase tracking-[0.12em]">3개월 스터디 프로그램</span>
              {enrolled && streak > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-sm text-[11px] font-bold text-white">
                  <svg className="w-3 h-3 motion-safe:animate-fire" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2c.5 3-1.5 4.5-2.5 6C8 10 8.5 12 10 13c.3-1.2 1-2 1.5-2.5.8 1.2 2.5 2.3 2.5 4.5a4.5 4.5 0 11-9 0c0-2.3 1.3-3.8 2-5C8.5 8 9 5 12 2z" />
                  </svg>
                  {streak}일
                </span>
              )}
            </div>

            {enrolled && pos ? (
              <>
                <p className="text-display-2 text-white truncate">
                  {todayDone ? '오늘 학습 완료' : `${pos.week}주차 ${pos.day}일차 학습`}
                </p>
                <p className="text-sm text-white/75 mt-1">
                  {todayDone
                    ? '내일 다시 만나요'
                    : streak > 0
                      ? '오늘 세션이 기다리고 있어요'
                      : '오늘 세션을 시작해보세요'}
                </p>
              </>
            ) : (
              <>
                <p className="text-display-2 text-white">진지한 학습을 위한 12주 코스</p>
                <p className="text-sm text-white/75 mt-1">목표 설정하고 나만의 플랜 시작하기</p>
              </>
            )}
          </div>

          <div className="flex-shrink-0 flex items-center gap-2">
            {!todayDone && (
              <span className="px-3.5 py-2 rounded-full bg-white text-primary-700 text-sm font-bold whitespace-nowrap shadow-sm
                               transition-transform duration-200 group-hover:scale-105">
                시작하기
              </span>
            )}
            <svg
              className="w-5 h-5 text-white/80 transition-transform duration-200 group-hover:translate-x-0.5"
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="m9 5 7 7-7 7" />
            </svg>
          </div>
        </div>
      </Link>
    </div>
  );
}
