import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { checkRateLimit, getRateLimitId, RATE_LIMITS } from '@/lib/rateLimit';
import { getLearningData } from '@/lib/sheetHelper';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ items: [], total: 0, dueToday: 0 });
    }

    const rateLimitResult = checkRateLimit(getRateLimitId(session.user.email, request), RATE_LIMITS.light);
    if (rateLimitResult) return rateLimitResult;

    const scope = request.nextUrl.searchParams.get('scope') || 'today';
    const limit = Math.min(100, Math.max(1, Number(request.nextUrl.searchParams.get('limit') || 20)));

    const learningData = await getLearningData(session.user.email);
    const all = learningData?.vocabBook || [];
    const today = new Date().toISOString().slice(0, 10);

    const dueToday = all.filter(i => i.status === 'active' && i.nextReviewAt <= today);
    const todayItems = all.filter(i => i.sourceDate === today);

    const items = (scope === 'all' ? all : scope === 'due' ? dueToday : todayItems).slice(0, limit);

    return NextResponse.json({
      items,
      total: all.length,
      todayCount: todayItems.length,
      dueToday: dueToday.length,
      masteredCount: all.filter(i => i.status === 'mastered').length,
    });
  } catch (error) {
    console.error('Vocab book error:', error);
    return NextResponse.json({ items: [], total: 0, error: 'Failed to load vocab book' }, { status: 500 });
  }
}
