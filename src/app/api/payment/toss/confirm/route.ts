import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PLANS, type PlanId } from '@/lib/plans';
import { updateUserFields, getUserData } from '@/lib/dataHelper';

// POST /api/payment/toss/confirm — Toss 결제 승인 + 구독 업데이트
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      console.error('[toss/confirm] no session');
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }

    const body = await request.json();
    const { paymentKey, orderId, amount } = body;
    console.log('[toss/confirm] request:', { email: session.user.email, paymentKey: paymentKey?.slice(0, 10), orderId, amount });

    if (!paymentKey || !orderId || !amount) {
      console.error('[toss/confirm] missing params:', body);
      return NextResponse.json({ error: '결제 정보가 누락되었습니다.' }, { status: 400 });
    }

    // orderId 형식: LANGTALK_MONTHLY_xxxx_timestamp
    const planFromOrder = orderId.split('_')[1]?.toLowerCase() as PlanId;
    if (!(planFromOrder in PLANS)) {
      console.error('[toss/confirm] invalid plan in orderId:', orderId, '→', planFromOrder);
      return NextResponse.json({ error: '올바르지 않은 주문입니다.' }, { status: 400 });
    }

    const plan = PLANS[planFromOrder];
    if (amount !== plan.price) {
      console.error('[toss/confirm] amount mismatch:', amount, 'vs', plan.price);
      return NextResponse.json({ error: '결제 금액이 올바르지 않습니다.' }, { status: 400 });
    }

    // 이중 결제 방지
    let existingUser = null;
    try {
      existingUser = await getUserData(session.user.email);
    } catch (e) {
      console.error('[toss/confirm] getUserData error:', e);
    }

    if (existingUser?.subscription?.orderId === orderId) {
      return NextResponse.json({
        message: '이미 처리된 결제입니다.',
        plan: planFromOrder,
        expiresAt: existingUser?.subscription?.expiryDate,
      });
    }

    // Toss 결제 승인 API 호출
    const secretKey = process.env.TOSS_SECRET_KEY;
    if (!secretKey) {
      console.error('[toss/confirm] TOSS_SECRET_KEY missing');
      return NextResponse.json({ error: '결제 설정이 완료되지 않았습니다.' }, { status: 500 });
    }

    const response = await fetch('https://api.tosspayments.com/v1/payments/confirm', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${secretKey}:`).toString('base64')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ paymentKey, orderId, amount }),
    });

    const tossData = await response.json();
    console.log('[toss/confirm] toss response:', response.status, tossData);

    if (!response.ok) {
      return NextResponse.json(
        { error: tossData.message || '결제 승인에 실패했습니다.', code: tossData.code },
        { status: 400 }
      );
    }

    // 만료일 계산
    const now = new Date();
    let baseDate = now;
    if (existingUser?.subscription?.expiryDate) {
      const existingExpiry = new Date(existingUser.subscription.expiryDate);
      if (existingExpiry > now) baseDate = existingExpiry;
    }
    const expiresAt = new Date(baseDate);
    expiresAt.setDate(expiresAt.getDate() + plan.durationDays);

    // 구독 업데이트
    const updated = await updateUserFields(session.user.email, {
      subscription: {
        status: 'active',
        plan: planFromOrder,
        expiryDate: expiresAt.toISOString(),
        startedAt: now.toISOString(),
        paymentKey,
        orderId,
      },
    });

    if (!updated) {
      console.error('[toss/confirm] updateUserFields returned false for', session.user.email);
      // 결제는 이미 승인됐으므로 성공으로 응답하되 경고 로그
      return NextResponse.json({
        message: '결제는 완료되었으나 계정 동기화에 실패했습니다. 고객센터에 문의해주세요.',
        plan: planFromOrder,
        expiresAt: expiresAt.toISOString(),
        warning: 'sync_failed',
      });
    }

    return NextResponse.json({
      message: '결제가 완료되었습니다.',
      plan: planFromOrder,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (error) {
    console.error('[toss/confirm] uncaught error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '알 수 없는 에러가 발생했습니다.' },
      { status: 500 }
    );
  }
}
