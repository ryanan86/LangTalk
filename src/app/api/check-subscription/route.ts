import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getUserData, getLearningData, getDueCorrections } from '@/lib/sheetHelper';

export const dynamic = 'force-dynamic';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ subscribed: false, reason: 'Not logged in' }, { status: 401 });
    }

    const email = session.user.email;

    // If no Google Sheets credentials, fail closed (deny access)
    if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
      console.error('[check-subscription] Google Sheets credentials not configured');
      return NextResponse.json({ subscribed: false, status: 'error', reason: 'Service configuration error' }, { status: 503 });
    }

    if (!process.env.GOOGLE_SUBSCRIPTION_SHEET_ID) {
      console.error('[check-subscription] Spreadsheet ID not configured');
      return NextResponse.json({ subscribed: false, status: 'error', reason: 'Service configuration error' }, { status: 503 });
    }

    // Get user data using optimized helper (single API call)
    const userData = await getUserData(email);

    // User not found
    if (!userData) {
      return NextResponse.json({
        subscribed: false,
        status: 'not_found',
        reason: '베타 신청이 필요합니다.',
        sessionCount: 0,
        email
      });
    }

    const { subscription, stats, profile } = userData;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check if status is pending (waiting for approval)
    if (subscription.status === 'pending') {
      return NextResponse.json({
        subscribed: false,
        status: 'pending',
        reason: '베타 신청이 검토 중입니다.',
        sessionCount: stats.sessionCount,
        evaluatedGrade: stats.currentLevel || null,
        levelDetails: stats.levelDetails || null,
        profile,
        email
      });
    }

    // Check if status is active
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

    // Get additional data for dashboard (corrections due, recent sessions)
    const [learningData, dueCorrections] = await Promise.all([
      getLearningData(email),
      getDueCorrections(email),
    ]);

    return NextResponse.json({
      subscribed: true,
      status: 'active',
      expiryDate: subscription.expiryDate,
      plan: subscription.plan,
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
      profile,
      // Dashboard extras
      dueCorrectionsCount: dueCorrections.length,
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
