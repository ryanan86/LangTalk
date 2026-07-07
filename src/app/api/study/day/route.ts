import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { checkRateLimit, getRateLimitId, RATE_LIMITS } from '@/lib/rateLimit';
import { getUserData, updateUserFields } from '@/lib/dataHelper';
import { makeRid, nowMs, since } from '@/lib/perf';
import type { SaveDayResultRequest, StudyStats, StudyDayResult } from '@/lib/studyTypes';
import { MAX_SHADOWING_HISTORY, MAX_RECENT_DAYS } from '@/lib/studyTypes';

export const preferredRegion = 'icn1';

const STUDY_DAY_XP = 60;
const WEEKLY_TEST_XP = 100;

function emptyStudyStats(): StudyStats {
  return {
    totalDaysCompleted: 0,
    currentStreak: 0,
    longestStreak: 0,
    totalSpokenSentences: 0,
    totalWordsLearned: 0,
    patternsMastered: [],
    weeklyTestScores: [],
    monthlyAssessments: [],
    shadowingHistory: [],
    recentDays: [],
    lastStudyDate: undefined,
  };
}

/**
 * Compute streak: if lastStudyDate was yesterday => streak+1, today => no change, else reset to 1.
 */
function computeStreak(current: number, lastStudyDate: string | undefined, today: string): number {
  if (!lastStudyDate) return 1;
  const last = new Date(lastStudyDate);
  const todayD = new Date(today);
  const diffDays = Math.round((todayD.getTime() - last.getTime()) / 86_400_000);
  if (diffDays === 0) return current; // same day, no change
  if (diffDays === 1) return current + 1; // consecutive
  return 1; // gap — reset
}

export async function POST(request: NextRequest) {
  const rid = makeRid('study-day');
  const t0 = nowMs();
  const timings: Record<string, number> = {};

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    const rateLimitResult = checkRateLimit(
      getRateLimitId(session.user.email, request),
      RATE_LIMITS.ai
    );
    if (rateLimitResult) return rateLimitResult;

    const rawBody = await request.json() as SaveDayResultRequest;
    const { result } = rawBody;

    if (!result || !result.date || typeof result.week !== 'number' || typeof result.day !== 'number') {
      return NextResponse.json({ error: '필수 학습 결과 데이터가 누락되었습니다.' }, { status: 400 });
    }

    const userData = await getUserData(session.user.email);
    timings['getUserData.ms'] = since(t0);

    const prev = (userData?.stats?.study as StudyStats | undefined) ?? emptyStudyStats();
    const today = result.date; // YYYY-MM-DD from client

    // Dedup: don't double-count a date already in recentDays
    const alreadyCounted = prev.recentDays.some((d: StudyDayResult) => d.date === today);

    const newStreak = alreadyCounted
      ? prev.currentStreak
      : computeStreak(prev.currentStreak, prev.lastStudyDate, today);

    const updated: StudyStats = {
      totalDaysCompleted: alreadyCounted ? prev.totalDaysCompleted : prev.totalDaysCompleted + 1,
      currentStreak: newStreak,
      longestStreak: Math.max(prev.longestStreak, newStreak),
      totalSpokenSentences: prev.totalSpokenSentences + (result.spokenSentences ?? 0),
      totalWordsLearned: prev.totalWordsLearned + (result.newWordsLearned ?? 0),
      patternsMastered: prev.patternsMastered,
      weeklyTestScores: result.isWeeklyTest && typeof result.weeklyTestScore === 'number'
        ? [
            ...prev.weeklyTestScores,
            { week: result.week, score: result.weeklyTestScore, date: today },
          ]
        : prev.weeklyTestScores,
      monthlyAssessments: prev.monthlyAssessments,
      shadowingHistory: result.shadowingAccuracy != null
        ? [
            ...prev.shadowingHistory,
            { date: today, accuracy: result.shadowingAccuracy },
          ].slice(-MAX_SHADOWING_HISTORY)
        : prev.shadowingHistory,
      recentDays: alreadyCounted
        ? prev.recentDays.map((d: StudyDayResult) => d.date === today ? result : d)
        : [...prev.recentDays, result].slice(-MAX_RECENT_DAYS),
      lastStudyDate: alreadyCounted ? prev.lastStudyDate : today,
    };

    // XP award — consistent with existing stats.xp pattern
    const xpGain = result.isWeeklyTest ? WEEKLY_TEST_XP : STUDY_DAY_XP;
    const prevXp = typeof userData?.stats?.xp === 'number' ? userData.stats.xp : 0;
    const newXp = alreadyCounted ? prevXp : prevXp + xpGain;

    await updateUserFields(session.user.email, {
      stats: {
        study: updated,
        xp: newXp,
      },
    });

    timings['total.ms'] = since(t0);

    return NextResponse.json({ studyStats: updated, xpGained: alreadyCounted ? 0 : xpGain, meta: { rid, timings } });
  } catch (error) {
    console.error('[study/day] error:', error);
    return NextResponse.json(
      { error: '학습 결과 저장 중 오류가 발생했습니다.', meta: { rid, timings: { 'total.ms': since(t0) } } },
      { status: 500 }
    );
  }
}
