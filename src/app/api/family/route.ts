import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getUserData } from '@/lib/dataHelper';
import { checkRateLimit, getRateLimitId, RATE_LIMITS } from '@/lib/rateLimit';
import { isFamilyPlan, MAX_FAMILY_MEMBERS } from '@/lib/plans';

export const dynamic = 'force-dynamic';
export const preferredRegion = 'icn1';

// GET /api/family — 가족 플랜 정보 조회
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }

    const rateLimitResult = await checkRateLimit(
      getRateLimitId(session.user.email, request),
      RATE_LIMITS.light
    );
    if (rateLimitResult) return rateLimitResult;

    const email = session.user.email;
    const userData = await getUserData(email);

    if (!userData) {
      return NextResponse.json({ role: null, maxMembers: MAX_FAMILY_MEMBERS });
    }

    const sub = userData.subscription;
    const today = new Date();

    // Check if this user is an owner of a family plan
    if (
      isFamilyPlan(sub.plan) &&
      sub.status === 'active' &&
      sub.expiryDate &&
      new Date(sub.expiryDate) >= today
    ) {
      const memberEmails: string[] = sub.familyMembers || [];

      // Fetch each member's data (max 3 reads, parallel)
      const memberDataList = await Promise.all(
        memberEmails.slice(0, MAX_FAMILY_MEMBERS).map((memberEmail) =>
          getUserData(memberEmail).catch(() => null)
        )
      );

      const members = memberEmails.slice(0, MAX_FAMILY_MEMBERS).map((memberEmail, i) => {
        const md = memberDataList[i];
        const stats = md?.stats;
        return {
          email: memberEmail,
          name: md?.subscription?.name || '',
          joinedAt: md?.subscription?.signupDate,
          stats: {
            currentStreak: stats?.currentStreak ?? 0,
            studyStreak: stats?.study?.currentStreak ?? 0,
            totalSpokenSentences: stats?.study?.totalSpokenSentences ?? 0,
            wordsLearned: stats?.study?.totalWordsLearned ?? 0,
            cefr: stats?.currentLevel ?? null,
            lastActiveDate: stats?.lastActiveDate ?? null,
          },
        };
      });

      return NextResponse.json({
        role: 'owner',
        plan: sub.plan,
        expiryDate: sub.expiryDate,
        maxMembers: MAX_FAMILY_MEMBERS,
        members,
      });
    }

    // Check if this user is a family member
    if (sub.familyOwnerEmail) {
      const ownerData = await getUserData(sub.familyOwnerEmail);
      const ownerSub = ownerData?.subscription;
      const ownerExpiry = ownerSub?.expiryDate ? new Date(ownerSub.expiryDate) : null;
      const isLinked =
        ownerSub?.status === 'active' &&
        isFamilyPlan(ownerSub.plan) &&
        Array.isArray(ownerSub.familyMembers) &&
        ownerSub.familyMembers.includes(email) &&
        ownerExpiry !== null &&
        ownerExpiry >= today;

      if (isLinked) {
        return NextResponse.json({
          role: 'member',
          plan: ownerSub!.plan,
          expiryDate: ownerSub!.expiryDate,
          ownerEmail: sub.familyOwnerEmail,
          maxMembers: MAX_FAMILY_MEMBERS,
        });
      }
    }

    return NextResponse.json({ role: null, maxMembers: MAX_FAMILY_MEMBERS });
  } catch (error) {
    console.error('[family] GET error:', error);
    return NextResponse.json(
      { error: '가족 플랜 정보를 불러오는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
