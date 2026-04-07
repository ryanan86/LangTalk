import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PLANS, type PlanId } from '@/lib/plans';

// POST /api/payment/toss — Toss 결제 요청 생성
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { planId?: string };
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const planId = body.planId as PlanId;
  if (!planId || !(planId in PLANS)) {
    return NextResponse.json({ error: '올바르지 않은 플랜입니다.' }, { status: 400 });
  }

  const plan = PLANS[planId];
  // customerKey: 영문/숫자/-/_만 허용, 2~50자
  const customerKey = session.user.email.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 50);
  const emailHash = session.user.email.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8);
  const orderId = `LANGTALK_${planId.toUpperCase()}_${emailHash}_${Date.now()}`;

  const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY?.trim();
  if (!clientKey) {
    return NextResponse.json({ error: '결제 설정이 완료되지 않았습니다.' }, { status: 500 });
  }

  return NextResponse.json({
    orderId,
    amount: plan.price,
    orderName: `TapTalk ${plan.name}`,
    customerKey,
    clientKey,
    planId,
  });
}
