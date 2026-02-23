import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { checkRateLimit, getRateLimitId, RATE_LIMITS } from '@/lib/rateLimit';
import { getLearningData, saveLearningData } from '@/lib/sheetHelper';
import { makeRid, nowMs, since } from '@/lib/perf';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const rid = makeRid('voc');
  const t0 = nowMs();

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

    console.log(`[${rid}] OK ${since(t0)}ms`);
    return NextResponse.json({
      items,
      total: all.length,
      todayCount: todayItems.length,
      dueToday: dueToday.length,
      masteredCount: all.filter(i => i.status === 'mastered').length,
    });
  } catch (error) {
    console.error(`[${rid}] ERR ${since(t0)}ms`, error);
    console.error('Vocab book error:', error);
    return NextResponse.json({ items: [], total: 0, error: 'Failed to load vocab book' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const rid = makeRid('voc');
  const t0 = nowMs();

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const rateLimitResult = checkRateLimit(getRateLimitId(session.user.email, request), RATE_LIMITS.light);
    if (rateLimitResult) return rateLimitResult;

    const { items } = await request.json();
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'No items provided' }, { status: 400 });
    }

    const learningData = await getLearningData(session.user.email);
    const existing = learningData?.vocabBook || [];

    // Merge: update existing terms or add new ones
    const termMap = new Map(existing.map(i => [i.term, i]));
    for (const item of items) {
      const prev = termMap.get(item.term);
      if (prev) {
        // Update: increase review count, adjust proficiency
        prev.reviewCount = (prev.reviewCount || 0) + 1;
        prev.proficiency = Math.min(100, (prev.proficiency || 0) + 5);
        prev.nextReviewAt = item.nextReviewAt;
      } else {
        termMap.set(item.term, item);
      }
    }

    const merged = Array.from(termMap.values());

    // Save updated vocab book
    if (learningData) {
      learningData.vocabBook = merged;
      await saveLearningData(learningData);
    }

    console.log(`[${rid}] OK ${since(t0)}ms`);
    return NextResponse.json({ success: true, total: merged.length, newItems: items.length });
  } catch (error) {
    console.error(`[${rid}] ERR ${since(t0)}ms`, error);
    console.error('Vocab book save error:', error);
    return NextResponse.json({ error: 'Failed to save vocab book' }, { status: 500 });
  }
}
