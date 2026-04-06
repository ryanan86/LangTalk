import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PLANS, type PlanId } from '@/lib/plans';
import { updateUserFields, getUserData } from '@/lib/dataHelper';

// POST /api/payment/toss/confirm — Toss 결제 승인 + 구독 업데이트
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { paymentKey, orderId, amount } = await request.json();

  if (!paymentKey || !orderId || !amount) {
    return NextResponse.json({ error: '결제 정보가 누락되었습니다.' }, { status: 400 });
  }

  // orderId에서 plan 추출: LANGTALK_MONTHLY_xxxx_timestamp
  const planFromOrder = orderId.split('_')[1]?.toLowerCase() as PlanId;
  if (!(planFromOrder in PLANS)) {
    return NextResponse.json({ error: '올바르지 않은 주문입니다.' }, { status: 400 });
  }

  const plan = PLANS[planFromOrder];
  if (amount !== plan.price) {
    return NextResponse.json({ error: '결제 금액이 올바르지 않습니다.' }, { status: 400 });
  }

  // 이중 결제 방지: 동일 orderId로 이미 결제된 구독 확인
  const existingUser = await getUserData(session.user.email);
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

  if (!response.ok) {
    const errorData = await response.json();
    return NextResponse.json(
      { error: errorData.message || '결제 승인에 실패했습니다.' },
      { status: 400 }
    );
  }

  // 만료일 계산: 기존 만료일이 미래면 거기서 + durationDays, 아니면 오늘부터
  const now = new Date();
  let baseDate = now;
  if (existingUser?.subscription?.expiryDate) {
    const existingExpiry = new Date(existingUser.subscription.expiryDate);
    if (existingExpiry > now) {
      baseDate = existingExpiry;
    }
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
    return NextResponse.json({ error: '구독 업데이트에 실패했습니다.' }, { status: 500 });
  }

  return NextResponse.json({
    message: '결제가 완료되었습니다.',
    plan: planFromOrder,
    expiresAt: expiresAt.toISOString(),
  });
}
