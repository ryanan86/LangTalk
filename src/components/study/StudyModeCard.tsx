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

  if (!loaded) return null;

  const enrolled = Boolean(plan);
  const pos = plan ? positionFromState(plan, stats) : null;
  const todayDone = isTodayCompleted(stats);
  const streak = stats?.currentStreak ?? 0;

  return (
    <div className="max-w-2xl mx-auto mb-6 px-4">
      <Link
        href="/study"
        className="block w-full text-left rounded-3xl p-5 bg-gradient-to-br from-primary-600 to-primary-800 text-white shadow-lg shadow-primary-500/20 hover:shadow-xl hover:-translate-y-0.5 transition-all"
      >
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <svg className="w-4 h-4 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.247m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.247" />
              </svg>
              <span className="text-xs font-medium text-white/80 uppercase tracking-wider">3개월 스터디 프로그램</span>
            </div>

            {enrolled && pos ? (
              <>
                <p className="text-lg font-bold truncate">
                  {todayDone ? '오늘 학습 완료!' : `${pos.week}주차 ${pos.day}일차 학습`}
                </p>
                <p className="text-sm text-white/70 mt-0.5">
                  {todayDone
                    ? `연속 ${streak}일 · 내일 다시 만나요`
                    : streak > 0
                      ? `연속 ${streak}일째 · 오늘 세션이 기다려요`
                      : '오늘 세션을 시작해보세요'}
                </p>
              </>
            ) : (
              <>
                <p className="text-lg font-bold">진지한 학습을 위한 12주 코스</p>
                <p className="text-sm text-white/70 mt-0.5">목표 설정하고 나만의 플랜 시작하기</p>
              </>
            )}
          </div>

          <div className="flex-shrink-0 flex items-center gap-2">
            {enrolled && !todayDone && (
              <span className="px-3 py-1.5 rounded-full bg-white text-primary-700 text-sm font-bold whitespace-nowrap">
                시작하기
              </span>
            )}
            {!enrolled && (
              <span className="px-3 py-1.5 rounded-full bg-white text-primary-700 text-sm font-bold whitespace-nowrap">
                시작하기
              </span>
            )}
            <svg className="w-5 h-5 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="m9 5 7 7-7 7" />
            </svg>
          </div>
        </div>
      </Link>
    </div>
  );
}
