import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getUserData, updateUserFields, saveUserData } from '@/lib/dataHelper';
import { checkRateLimit, getRateLimitId, RATE_LIMITS } from '@/lib/rateLimit';
import { isFamilyPlan, MAX_FAMILY_MEMBERS } from '@/lib/plans';

export const dynamic = 'force-dynamic';
export const preferredRegion = 'icn1';

/** 이메일 형식 검증 */
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * familyOwnerEmail 필드를 완전히 제거한다.
 * updateUserFields의 filterUndefined는 undefined 키를 strip하므로,
 * 실제 삭제는 subscription 객체를 직접 재구성 후 saveUserData로 저장해야 한다.
 */
async function clearFamilyOwnerEmail(email: string): Promise<void> {
  const userData = await getUserData(email);
  if (!userData) return;
  const sub = { ...userData.subscription };
  delete sub.familyOwnerEmail;
  await saveUserData({ ...userData, subscription: sub });
}

/** 멤버 목록을 GET /api/family members 형식으로 변환 */
async function buildMembersResponse(memberEmails: string[]) {
  const memberDataList = await Promise.all(
    memberEmails.slice(0, MAX_FAMILY_MEMBERS).map((memberEmail) =>
      getUserData(memberEmail).catch(() => null)
    )
  );

  return memberEmails.slice(0, MAX_FAMILY_MEMBERS).map((memberEmail, i) => {
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
}

// POST /api/family/member { email } — 가족 구성원 추가 (오너 전용)
export async function POST(request: NextRequest) {
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

    const ownerEmail = session.user.email;

    let body: { email?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: '요청 형식이 올바르지 않습니다.' }, { status: 400 });
    }

    const targetEmail = body.email?.trim().toLowerCase();

    // 이메일 형식 검증
    if (!targetEmail || !isValidEmail(targetEmail)) {
      return NextResponse.json({ error: '올바른 이메일 주소를 입력해주세요.' }, { status: 400 });
    }

    // 자기 자신 추가 불가
    if (targetEmail === ownerEmail.toLowerCase()) {
      return NextResponse.json({ error: '자기 자신을 가족 구성원으로 추가할 수 없습니다.' }, { status: 400 });
    }

    // 오너 데이터 조회 및 가족 플랜 여부 확인
    const ownerData = await getUserData(ownerEmail);
    if (!ownerData) {
      return NextResponse.json({ error: '사용자 정보를 찾을 수 없습니다.' }, { status: 404 });
    }

    const ownerSub = ownerData.subscription;
    const today = new Date();
    const ownerExpiry = ownerSub.expiryDate ? new Date(ownerSub.expiryDate) : null;
    const ownerHasActiveFamilyPlan =
      isFamilyPlan(ownerSub.plan) &&
      ownerSub.status === 'active' &&
      ownerExpiry !== null &&
      ownerExpiry >= today;

    if (!ownerHasActiveFamilyPlan) {
      return NextResponse.json(
        { error: '가족 플랜이 활성화된 상태에서만 구성원을 추가할 수 있습니다.' },
        { status: 403 }
      );
    }

    const currentMembers: string[] = ownerSub.familyMembers || [];

    // 이미 추가된 구성원 여부
    if (currentMembers.map((e) => e.toLowerCase()).includes(targetEmail)) {
      return NextResponse.json({ error: '이미 가족 구성원으로 등록된 이메일입니다.' }, { status: 409 });
    }

    // 구성원 수 상한 초과
    if (currentMembers.length >= MAX_FAMILY_MEMBERS) {
      return NextResponse.json(
        { error: `가족 구성원은 최대 ${MAX_FAMILY_MEMBERS}명까지 추가할 수 있습니다.` },
        { status: 400 }
      );
    }

    // 대상 사용자 존재 여부
    const targetData = await getUserData(targetEmail);
    if (!targetData) {
      return NextResponse.json(
        { error: '상대방이 먼저 탭톡에 가입해야 합니다.' },
        { status: 404 }
      );
    }

    // 대상이 이미 다른 가족에 속해 있는지 확인
    const targetSub = targetData.subscription;
    if (
      targetSub.familyOwnerEmail &&
      targetSub.familyOwnerEmail.toLowerCase() !== ownerEmail.toLowerCase()
    ) {
      return NextResponse.json(
        { error: '해당 사용자는 이미 다른 가족 플랜에 속해 있습니다.' },
        { status: 409 }
      );
    }

    // 대상이 자체적으로 유료 구독 중인지 확인 (trial/expired는 흡수 허용)
    const targetExpiry = targetSub.expiryDate ? new Date(targetSub.expiryDate) : null;
    const targetHasOwnPaidSub =
      targetSub.status === 'active' &&
      targetExpiry !== null &&
      targetExpiry >= today &&
      (targetSub.plan === 'monthly' ||
        targetSub.plan === 'yearly' ||
        isFamilyPlan(targetSub.plan));

    if (targetHasOwnPaidSub) {
      return NextResponse.json(
        { error: '해당 사용자는 이미 유료 구독 중입니다. 구독 만료 후 가족 구성원으로 추가할 수 있습니다.' },
        { status: 409 }
      );
    }

    // 오너: familyMembers에 추가
    const updatedMembers = [...currentMembers, targetEmail];
    const ownerUpdated = await updateUserFields(ownerEmail, {
      subscription: { familyMembers: updatedMembers },
    });

    if (!ownerUpdated) {
      return NextResponse.json(
        { error: '구성원 추가 중 오류가 발생했습니다. 다시 시도해주세요.' },
        { status: 500 }
      );
    }

    // 대상: familyOwnerEmail 설정 (기존 subscription 필드 유지)
    await updateUserFields(targetEmail, {
      subscription: { familyOwnerEmail: ownerEmail },
    });

    const members = await buildMembersResponse(updatedMembers);

    return NextResponse.json({ members });
  } catch (error) {
    console.error('[family/member] POST error:', error);
    return NextResponse.json(
      { error: '구성원 추가 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// DELETE /api/family/member { email } — 가족 구성원 제거 (오너 또는 본인)
export async function DELETE(request: NextRequest) {
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

    const callerEmail = session.user.email.toLowerCase();

    let body: { email?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: '요청 형식이 올바르지 않습니다.' }, { status: 400 });
    }

    const targetEmail = body.email?.trim().toLowerCase();

    if (!targetEmail || !isValidEmail(targetEmail)) {
      return NextResponse.json({ error: '올바른 이메일 주소를 입력해주세요.' }, { status: 400 });
    }

    const isSelfRemoval = callerEmail === targetEmail;

    if (isSelfRemoval) {
      // 멤버가 자기 자신을 제거하는 경우
      const selfData = await getUserData(callerEmail);
      const ownerEmail = selfData?.subscription?.familyOwnerEmail;

      if (!ownerEmail) {
        return NextResponse.json(
          { error: '가족 플랜에 속해 있지 않습니다.' },
          { status: 400 }
        );
      }

      // 오너 목록에서 제거
      const ownerData = await getUserData(ownerEmail);
      if (ownerData) {
        const updatedOwnerMembers = (ownerData.subscription.familyMembers || []).filter(
          (e) => e.toLowerCase() !== callerEmail
        );
        await updateUserFields(ownerEmail, {
          subscription: { familyMembers: updatedOwnerMembers },
        });
      }

      // 본인 familyOwnerEmail 초기화
      await clearFamilyOwnerEmail(callerEmail);

      return NextResponse.json({ message: '가족 플랜에서 탈퇴했습니다.' });
    }

    // 오너가 멤버를 제거하는 경우
    const ownerData = await getUserData(callerEmail);
    if (!ownerData) {
      return NextResponse.json({ error: '사용자 정보를 찾을 수 없습니다.' }, { status: 404 });
    }

    const ownerSub = ownerData.subscription;
    const today = new Date();
    const ownerExpiry = ownerSub.expiryDate ? new Date(ownerSub.expiryDate) : null;
    const ownerHasActiveFamilyPlan =
      isFamilyPlan(ownerSub.plan) &&
      ownerSub.status === 'active' &&
      ownerExpiry !== null &&
      ownerExpiry >= today;

    if (!ownerHasActiveFamilyPlan) {
      return NextResponse.json(
        { error: '가족 플랜이 활성화된 상태에서만 구성원을 관리할 수 있습니다.' },
        { status: 403 }
      );
    }

    const currentMembers: string[] = ownerSub.familyMembers || [];
    const targetInList = currentMembers.map((e) => e.toLowerCase()).includes(targetEmail);

    if (!targetInList) {
      return NextResponse.json(
        { error: '해당 사용자는 가족 구성원이 아닙니다.' },
        { status: 404 }
      );
    }

    // 오너 목록에서 제거
    const updatedMembers = currentMembers.filter((e) => e.toLowerCase() !== targetEmail);
    await updateUserFields(callerEmail, {
      subscription: { familyMembers: updatedMembers },
    });

    // 대상 사용자의 familyOwnerEmail 초기화
    await clearFamilyOwnerEmail(targetEmail);

    const members = await buildMembersResponse(updatedMembers);

    return NextResponse.json({ members });
  } catch (error) {
    console.error('[family/member] DELETE error:', error);
    return NextResponse.json(
      { error: '구성원 제거 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
