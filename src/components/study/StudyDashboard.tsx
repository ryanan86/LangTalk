'use client';

import { useMemo } from 'react';
import type { StudyPlan, StudyStats, GrammarPattern } from '@/lib/studyTypes';
import { STUDY_PATTERNS } from '@/data/studyPatterns';
import {
  positionFromState,
  isTodayCompleted,
  goalTitle,
  selectDailyPatterns,
} from '@/lib/studyClient';
import { buildBlockSequence } from '@/lib/studyTypes';
import { StatCard, ProgressBar } from '@/components/ui';

interface StudyDashboardProps {
  plan: StudyPlan;
  stats: StudyStats | null;
  onStartSession: () => void;
}

export default function StudyDashboard({ plan, stats, onStartSession }: StudyDashboardProps) {
  const totalDays = stats?.totalDaysCompleted ?? 0;
  const pos = positionFromState(plan, stats);
  const todayDone = isTodayCompleted(stats);

  const week = plan.weeks.find((w) => w.week === pos.week) ?? plan.weeks[0];

  // Today's patterns preview (deterministic, matches session player logic).
  const todayPatterns: GrammarPattern[] = useMemo(() => {
    if (!week) return [];
    return selectDailyPatterns(STUDY_PATTERNS, week.patternIds, pos.day, plan.profile.studyDaysPerWeek);
  }, [week, pos.day, plan.profile.studyDaysPerWeek]);

  const estimatedMinutes = plan.profile.dailyMinutes;
  const blocks = useMemo(() => buildBlockSequence(plan.profile.dailyMinutes), [plan.profile.dailyMinutes]);
  const isWeeklyTestDay = pos.day === plan.profile.studyDaysPerWeek;

  const shadowingHistory = stats?.shadowingHistory ?? [];
  const recentShadowing = shadowingHistory.slice(-10);
  const maxAcc = 100;

  const weeklyTests = stats?.weeklyTestScores ?? [];
  const monthlyAssessments = stats?.monthlyAssessments ?? [];

  return (
    <div className="flex-1 overflow-y-auto pb-8">
      <div className="max-w-lg mx-auto px-4 sm:px-6 py-4 space-y-5">
        {/* ===== Today's session hero ===== */}
        <section
          className={`rounded-card-lg p-5 relative overflow-hidden motion-safe:animate-fade-up ${
            todayDone
              ? 'bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/30'
              : 'bg-brand-gradient text-white shadow-float dark:shadow-float-dark'
          }`}
        >
          {!todayDone && (
            <>
              <div aria-hidden="true" className="absolute -top-16 -right-10 w-48 h-48 rounded-full bg-white/10 blur-3xl" />
              <div aria-hidden="true" className="absolute -bottom-20 -left-8 w-44 h-44 rounded-full bg-indigo-400/20 blur-3xl" />
            </>
          )}
          {todayDone ? (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-9 h-9 rounded-full bg-green-100 dark:bg-green-500/20 flex items-center justify-center">
                  <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                </span>
                <h2 className="text-lg font-bold text-green-700 dark:text-green-300">오늘 학습 완료!</h2>
              </div>
              <p className="text-sm text-green-700/80 dark:text-green-300/80 mb-4">
                내일은 {pos.week}주차 {Math.min(pos.day + 1, plan.profile.studyDaysPerWeek)}일차 · {week?.theme} 를 이어가요.
              </p>
              <div className="p-3 rounded-xl bg-white/60 dark:bg-black/20">
                <p className="text-xs font-medium text-green-700 dark:text-green-300 uppercase tracking-wider mb-1">내일 예고</p>
                <p className="text-sm text-green-800 dark:text-green-200">{week?.themeEn}</p>
              </div>
            </div>
          ) : (
            <div className="relative z-10">
              <p className="text-xs font-medium text-white/70 uppercase tracking-wider mb-1">
                {pos.week}주차 · {pos.day}일차
                {isWeeklyTestDay && ' · 주간 테스트'}
              </p>
              <h2 className="text-2xl font-bold mb-1">{week?.theme}</h2>
              <p className="text-sm text-white/80 mb-4">{week?.themeEn}</p>

              {todayPatterns.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs text-white/60 mb-1.5">오늘 배울 패턴</p>
                  <div className="flex flex-wrap gap-2">
                    {todayPatterns.map((p) => (
                      <span key={p.id} className="px-3 py-1 rounded-full bg-white/15 text-sm font-medium">
                        {p.pattern}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-4 mb-5 text-sm text-white/80">
                <span className="flex items-center gap-1.5">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="9" strokeWidth={2} />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 7v5l3 2" />
                  </svg>
                  약 {estimatedMinutes}분
                </span>
                <span className="flex items-center gap-1.5">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h10" />
                  </svg>
                  {blocks.length}개 블록
                </span>
              </div>

              <button
                onClick={onStartSession}
                className="pressable w-full py-3.5 rounded-2xl bg-white text-primary-700 font-bold hover:bg-white/95 transition-all shadow-lg
                           flex items-center justify-center gap-2"
              >
                {isWeeklyTestDay ? '주간 테스트 시작하기' : '오늘 세션 시작하기'}
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="m9 5 7 7-7 7" />
                </svg>
              </button>
            </div>
          )}
        </section>

        {/* ===== Stats grid ===== */}
        <section className="grid grid-cols-2 gap-3">
          <StatCard label="연속 학습일" value={stats?.currentStreak ?? 0} suffix="일" accent />
          <StatCard label="총 발화 문장" value={stats?.totalSpokenSentences ?? 0} />
          <StatCard label="습득 단어" value={stats?.totalWordsLearned ?? 0} />
          <StatCard label="마스터 패턴" value={stats?.patternsMastered?.length ?? 0} />
        </section>

        {/* ===== 12-week progress ===== */}
        <section className="p-4 rounded-card-lg bg-white/80 dark:bg-white/[0.04] backdrop-blur-xl border border-black/[0.05] dark:border-white/[0.06] shadow-card dark:shadow-card-dark">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-neutral-900 dark:text-white tracking-tight">12주 진행</h3>
            <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400 tabular-nums">
              {Math.min(pos.week, 12)} / 12주
            </span>
          </div>
          <ProgressBar
            value={(Math.min(pos.week, 12) / 12) * 100}
            variant="brand"
            size="md"
            label="12주 프로그램 진행률"
            className="mb-4"
          />
          <div className="grid grid-cols-12 gap-1">
            {plan.weeks.map((w) => {
              const completed = w.week < pos.week;
              const current = w.week === pos.week;
              return (
                <div
                  key={w.week}
                  title={`${w.week}주차: ${w.theme}`}
                  className={`h-8 rounded-md flex items-center justify-center text-[10px] font-semibold transition-colors ${
                    completed
                      ? 'bg-primary-500 text-white'
                      : current
                        ? 'bg-primary-200 dark:bg-primary-500/30 text-primary-700 dark:text-primary-300 ring-2 ring-primary-500'
                        : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-500'
                  }`}
                >
                  {w.week}
                </div>
              );
            })}
          </div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-3">
            총 {totalDays}일 완료 · 목표 {goalTitle(plan.profile.goal)}
          </p>
        </section>

        {/* ===== Weekly immersion mission ===== */}
        {week?.immersionMission && (
          <section className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30">
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-5 h-5 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-200">이번 주 몰입 미션</h3>
            </div>
            <p className="text-sm text-amber-700 dark:text-amber-300 leading-relaxed">{week.immersionMission}</p>
          </section>
        )}

        {/* ===== Shadowing accuracy trend ===== */}
        {recentShadowing.length > 0 && (
          <section className="p-4 rounded-2xl bg-white dark:bg-dark-surface border border-neutral-100 dark:border-neutral-800">
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-white mb-3">쉐도잉 정확도 추이</h3>
            <div className="flex items-end gap-1.5 h-24">
              {recentShadowing.map((entry, i) => {
                const heightPct = Math.max(6, (entry.accuracy / maxAcc) * 100);
                const good = entry.accuracy >= 70;
                return (
                  <div key={`${entry.date}-${i}`} className="flex-1 flex flex-col items-center justify-end gap-1">
                    <div
                      className={`w-full rounded-t-md transition-all ${good ? 'bg-primary-500' : 'bg-amber-400'}`}
                      style={{ height: `${heightPct}%` }}
                      title={`${entry.date}: ${entry.accuracy}%`}
                    />
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between mt-2 text-xs text-neutral-400 dark:text-neutral-500">
              <span>{recentShadowing[0]?.date.slice(5)}</span>
              <span>{recentShadowing[recentShadowing.length - 1]?.date.slice(5)}</span>
            </div>
          </section>
        )}

        {/* ===== Monthly CEFR assessment history ===== */}
        {monthlyAssessments.length > 0 && (
          <section className="p-4 rounded-2xl bg-white dark:bg-dark-surface border border-neutral-100 dark:border-neutral-800">
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-white mb-3">월간 레벨 평가</h3>
            <div className="flex flex-wrap gap-2">
              {monthlyAssessments.map((m) => (
                <div
                  key={`${m.month}-${m.date}`}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl bg-primary-50 dark:bg-primary-500/10 border border-primary-200 dark:border-primary-500/30"
                  title={m.summary}
                >
                  <span className="text-[10px] font-medium text-primary-500/70 dark:text-primary-400/70">{m.month}개월</span>
                  <span className="text-sm font-bold text-primary-700 dark:text-primary-300">{m.cefr}</span>
                  <span className="text-[10px] text-neutral-400 dark:text-neutral-500">{m.date.slice(5)}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ===== Weekly test history ===== */}
        {weeklyTests.length > 0 && (
          <section className="p-4 rounded-2xl bg-white dark:bg-dark-surface border border-neutral-100 dark:border-neutral-800">
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-white mb-3">주간 테스트 결과</h3>
            <ul className="space-y-2">
              {weeklyTests.slice().reverse().map((t) => (
                <li key={`${t.week}-${t.date}`} className="flex items-center justify-between">
                  <span className="text-sm text-neutral-600 dark:text-neutral-300 w-12">{t.week}주차</span>
                  <div className="flex-1 mx-3">
                    <ProgressBar
                      value={t.score}
                      variant={t.score >= 70 ? 'brand' : 'amber'}
                      size="sm"
                      label={`${t.week}주차 테스트 점수`}
                    />
                  </div>
                  <span className="text-sm font-semibold text-neutral-900 dark:text-white w-10 text-right tabular-nums">{t.score}점</span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
