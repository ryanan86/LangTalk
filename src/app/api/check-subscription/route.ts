import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/miniappAuth';
import { getUserData, getLearningData } from '@/lib/dataHelper';
import { useSupabase } from '@/lib/dataBackend';
import { isFamilyPlan } from '@/lib/plans';

export const dynamic = 'force-dynamic';
export const preferredRegion = 'icn1'; // Seoul — closest to Korean users

export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);

    if (!authUser?.email) {
      return NextResponse.json({ subscribed: false, reason: 'Not logged in' }, { status: 401 });
    }

    const email = authUser.email;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // If using Google Sheets, verify credentials
    if (!useSupabase) {
      if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
        console.error('[check-subscription] Google Sheets credentials not configured');
        return NextResponse.json({ subscribed: false, status: 'error', reason: 'Service configuration error' }, { status: 503 });
      }

      if (!process.env.GOOGLE_SUBSCRIPTION_SHEET_ID) {
        console.error('[check-subscription] Spreadsheet ID not configured');
        return NextResponse.json({ subscribed: false, status: 'error', reason: 'Service configuration error' }, { status: 503 });
      }
    }

    // Fetch user data and learning data in parallel
    const [userData, learningData] = await Promise.all([
      getUserData(email),
      getLearningData(email),
    ]);

    // User not found
    if (!userData) {
      return NextResponse.json({
        subscribed: false,
        status: 'not_found',
        reason: '서비스 이용 신청이 필요합니다.',
        sessionCount: 0,
        email
      });
    }

    const { subscription, stats, profile } = userData;

    // Check if status is pending (waiting for approval)
    if (subscription.status === 'pending') {
      return NextResponse.json({
        subscribed: false,
        status: 'pending',
        reason: '서비스 이용 신청이 검토 중입니다.',
        sessionCount: stats.sessionCount,
        evaluatedGrade: stats.currentLevel || null,
        levelDetails: stats.levelDetails || null,
        profile,
        email
      });
    }

    // Check if status is active — but first check family membership inheritance
    // if the user is a family member (has familyOwnerEmail) and their own sub isn't independently active
    const isOwnSubActive =
      subscription.status === 'active' &&
      (!subscription.expiryDate || new Date(subscription.expiryDate) >= today);

    if (!isOwnSubActive && subscription.familyOwnerEmail) {
      // Attempt family inheritance: fetch owner's data
      const ownerData = await getUserData(subscription.familyOwnerEmail);
      const ownerSub = ownerData?.subscription;
      const ownerExpiryDate = ownerSub?.expiryDate;
      const ownerExpiry = ownerExpiryDate ? new Date(ownerExpiryDate) : null;
      const ownerActive =
        ownerSub?.status === 'active' &&
        isFamilyPlan(ownerSub.plan) &&
        Array.isArray(ownerSub.familyMembers) &&
        ownerSub.familyMembers.includes(email) &&
        ownerExpiry !== null &&
        ownerExpiry >= today;

      if (ownerActive) {
        // Filter due corrections inline
        const dueCorrectionsCount = (learningData?.corrections || []).filter(c => {
          if (c.status !== 'active') return false;
          const nextReview = new Date(c.nextReviewAt);
          return nextReview <= today;
        }).length;

        const todayStr = today.toISOString().slice(0, 10);
        const todayQuestProgress = (stats.dailyQuestProgress || []).filter(
          (p) => p.date === todayStr
        );

        return NextResponse.json({
          subscribed: true,
          status: 'active',
          expiryDate: ownerExpiryDate,
          plan: ownerSub!.plan,
          familyRole: 'member',
          familyOwnerEmail: subscription.familyOwnerEmail,
          sessionCount: stats.sessionCount,
          totalMinutes: stats.totalMinutes,
          debateCount: stats.debateCount,
          currentStreak: stats.currentStreak,
          longestStreak: stats.longestStreak,
          evaluatedGrade: stats.currentLevel || null,
          levelDetails: stats.levelDetails || null,
          xp: stats.xp || 0,
          level: stats.level || 1,
          achievements: stats.achievements || [],
          weeklyXp: stats.weeklyXp || [0, 0, 0, 0, 0, 0, 0],
          dailyQuestProgress: todayQuestProgress,
          profile,
          dueCorrectionsCount,
          recentSessionsCount: learningData?.recentSessions.length || 0,
          email,
        });
      }
    }

    if (subscription.status !== 'active') {
      return NextResponse.json({
        subscribed: false,
        status: subscription.status,
        reason: '구독이 활성화되지 않았습니다.',
        sessionCount: stats.sessionCount,
        evaluatedGrade: stats.currentLevel || null,
        levelDetails: stats.levelDetails || null,
        profile,
        email
      });
    }

    // Check expiry date
    if (subscription.expiryDate) {
      const expiry = new Date(subscription.expiryDate);
      if (expiry < today) {
        return NextResponse.json({
          subscribed: false,
          status: 'expired',
          reason: '구독 기간이 만료되었습니다.',
          expiryDate: subscription.expiryDate,
          sessionCount: stats.sessionCount,
          evaluatedGrade: stats.currentLevel || null,
          levelDetails: stats.levelDetails || null,
          profile,
          email
        });
      }
    }

    // Filter due corrections inline from already-fetched learningData (avoids duplicate DB call)
    const dueCorrectionsCount = (learningData?.corrections || []).filter(c => {
      if (c.status !== 'active') return false;
      const nextReview = new Date(c.nextReviewAt);
      return nextReview <= today;
    }).length;

    // Only return today's quest progress to keep payload small
    const todayStr = today.toISOString().slice(0, 10);
    const todayQuestProgress = (stats.dailyQuestProgress || []).filter(
      (p) => p.date === todayStr
    );

    return NextResponse.json({
      subscribed: true,
      status: 'active',
      expiryDate: subscription.expiryDate,
      plan: subscription.plan,
      ...(isFamilyPlan(subscription.plan) ? { familyRole: 'owner' } : {}),
      sessionCount: stats.sessionCount,
      totalMinutes: stats.totalMinutes,
      debateCount: stats.debateCount,
      currentStreak: stats.currentStreak,
      longestStreak: stats.longestStreak,
      evaluatedGrade: stats.currentLevel || null,
      levelDetails: stats.levelDetails || null,
      // Gamification data
      xp: stats.xp || 0,
      level: stats.level || 1,
      achievements: stats.achievements || [],
      weeklyXp: stats.weeklyXp || [0, 0, 0, 0, 0, 0, 0],
      dailyQuestProgress: todayQuestProgress,
      profile,
      // Dashboard extras
      dueCorrectionsCount,
      recentSessionsCount: learningData?.recentSessions.length || 0,
      email
    });
  } catch (error) {
    console.error('Subscription check error:', error);
    // Fail-closed: deny access on error to prevent unauthorized usage
    return NextResponse.json(
      { subscribed: false, error: 'Subscription check failed. Please try again.' },
      { status: 500 }
    );
  }
}
