import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { getUserData, getLearningData, getDueCorrections } from '@/lib/sheetHelper';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session?.user?.email) {
      return NextResponse.json({ subscribed: false, reason: 'Not logged in' });
    }

    const email = session.user.email;

    // If no Google Sheets credentials, allow all (for development)
    if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
      console.log('No Google Sheets credentials, allowing access for development');
      return NextResponse.json({ subscribed: true, email });
    }

    if (!process.env.GOOGLE_SUBSCRIPTION_SHEET_ID) {
      console.log('No spreadsheet ID configured, allowing access');
      return NextResponse.json({ subscribed: true, email });
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
      profile,
      // Dashboard extras
      dueCorrectionsCount: dueCorrections.length,
      recentSessionsCount: learningData?.recentSessions.length || 0,
      email
    });
  } catch (error) {
    console.error('Subscription check error:', error);
    // In case of error, allow access (fail-open for better UX during development)
    return NextResponse.json({ subscribed: true, error: 'Check failed, allowing access' });
  }
}
