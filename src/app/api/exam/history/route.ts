import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getUserData } from '@/lib/dataHelper';
import type { ExamHistoryItem } from '@/lib/examTypes';

export const preferredRegion = 'icn1';

/**
 * GET /api/exam/history — return exam history for the authenticated user, newest first.
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    const userData = await getUserData(session.user.email);
    const history: ExamHistoryItem[] = userData?.stats?.examHistory ?? [];

    // Ensure newest-first order (already appended newest-first in grade route,
    // but sort defensively by date string descending)
    const sorted = [...history].sort((a, b) => (b.date > a.date ? 1 : b.date < a.date ? -1 : 0));

    return NextResponse.json({ history: sorted });
  } catch (error) {
    console.error('[exam/history] error:', error);
    return NextResponse.json({ error: '히스토리를 불러오는 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
