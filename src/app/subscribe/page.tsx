'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { PLANS, type PlanId } from '@/lib/plans';
import { loadTossPayments } from '@tosspayments/tosspayments-sdk';

interface SubscriptionInfo {
  status: string;
  expiryDate?: string;
  plan?: string;
}

export default function SubscribePage() {
  const router = useRouter();
  const { data: session, status: authStatus } = useSession();
  const [selectedPlan, setSelectedPlan] = useState<PlanId | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [checkingStatus, setCheckingStatus] = useState(true);

  useEffect(() => {
    if (authStatus === 'unauthenticated') {
      router.push('/login');
    }
  }, [authStatus, router]);

  useEffect(() => {
    if (!session?.user?.email) return;
    fetchSubscriptionStatus();
  }, [session]);

  const fetchSubscriptionStatus = async () => {
    try {
      const res = await fetch('/api/check-subscription');
      if (res.ok) {
        const data = await res.json();
        setSubscription({
          status: data.status,
          expiryDate: data.expiryDate,
          plan: data.plan,
        });
      }
    } catch {
      // ignore
    } finally {
      setCheckingStatus(false);
    }
  };

  const handlePayment = async (planId: PlanId) => {
    setLoading(true);
    setError(null);
    setSelectedPlan(planId);

    let stage = 'init';
    try {
      stage = '서버 결제 세션 생성';
      const res = await fetch('/api/payment/toss', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `세션 생성 실패 (HTTP ${res.status})`);
      }

      const payload = await res.json();
      const { orderId, amount, orderName, clientKey, customerKey } = payload;

      if (!clientKey) throw new Error('clientKey가 없습니다. 서버 설정 확인 필요');
      if (!customerKey) throw new Error('customerKey가 없습니다');

      stage = 'Toss SDK 로드';
      console.log('[toss] loading SDK with clientKey:', clientKey.slice(0, 15) + '...');
      const tossPayments = await loadTossPayments(clientKey);

      stage = 'payment 객체 생성';
      console.log('[toss] creating payment with customerKey:', customerKey);
      const payment = tossPayments.payment({ customerKey });

      stage = 'requestPayment 호출';
      console.log('[toss] requesting payment:', { orderId, amount, orderName });
      await payment.requestPayment({
        method: 'CARD',
        amount: { currency: 'KRW', value: amount },
        orderId,
        orderName,
        customerName: session?.user?.name || undefined,
        customerEmail: session?.user?.email || undefined,
        successUrl: `${window.location.origin}/subscribe/success`,
        failUrl: `${window.location.origin}/subscribe/fail`,
      });
    } catch (err) {
      const e = err as { message?: string; code?: string; name?: string };
      console.error('[toss] payment error at', stage, err);
      if (e?.code === 'USER_CANCEL' || e?.message === 'USER_CANCEL') {
        // 사용자 취소는 무시
      } else {
        const detail = [e?.code, e?.message || String(err)].filter(Boolean).join(' | ');
        setError(`[${stage}] ${detail}`);
      }
    } finally {
      setLoading(false);
      setSelectedPlan(null);
    }
  };

  const isActive = subscription?.status === 'active';
  const expiryDate = subscription?.expiryDate ? new Date(subscription.expiryDate) : null;
  const remainingDays = expiryDate ? Math.max(0, Math.ceil((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))) : 0;

  const monthlyPrice = PLANS.monthly.price;
  const yearlyMonthlyPrice = Math.round(PLANS.yearly.price / 12);
  const savingsPercent = Math.round((1 - yearlyMonthlyPrice / monthlyPrice) * 100);

  if (authStatus === 'loading' || checkingStatus) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900">
      {/* Header */}
      <header className="bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md border-b border-neutral-200 dark:border-neutral-800 px-4 py-4 sticky top-0 z-50">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 p-1"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-lg font-semibold text-neutral-900 dark:text-white">구독하기</h1>
          <div className="w-8" />
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-8 pb-24">
        {/* Current Subscription Status */}
        {isActive && expiryDate && (
          <div className="mb-8 p-5 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-500/10 dark:to-teal-500/10 border border-emerald-200 dark:border-emerald-500/30">
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-xl bg-white dark:bg-emerald-500/20 flex items-center justify-center shrink-0 ring-1 ring-emerald-200 dark:ring-emerald-400/30">
                <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <p className="font-bold text-emerald-900 dark:text-emerald-200">
                    {subscription?.plan === 'yearly' ? '연간 이용권 활성화' : subscription?.plan === 'monthly' ? '월간 이용권 활성화' : '구독 활성화'}
                  </p>
                  <span className="px-2 py-0.5 bg-white dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs font-bold rounded-full ring-1 ring-emerald-200 dark:ring-emerald-400/30 tabular-nums">
                    {remainingDays}일 남음
                  </span>
                </div>
                <p className="text-sm text-emerald-700 dark:text-emerald-400 mt-1">
                  만료일: <span className="font-semibold">{expiryDate.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                </p>
                <p className="text-xs text-emerald-600/80 dark:text-emerald-400/70 mt-2 leading-relaxed">
                  지금 추가 구독하시면 만료일에서부터 자동으로 연장됩니다.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Hero */}
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-2">
            {isActive ? '구독 연장하기' : 'TapTalk 프리미엄'}
          </h2>
          <p className="text-neutral-500 dark:text-neutral-400">
            {isActive ? '원하는 플랜으로 이용 기간을 연장하세요' : 'AI 튜터와 무제한 영어 회화 연습'}
          </p>
        </div>

        {/* Plan Cards */}
        <div className="space-y-4 mb-8">
          {/* Monthly */}
          <button
            onClick={() => handlePayment('monthly')}
            disabled={loading}
            className="w-full text-left p-5 rounded-2xl border-2 border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:border-purple-400 dark:hover:border-purple-500 transition-all disabled:opacity-50"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-neutral-900 dark:text-white text-lg">{PLANS.monthly.name}</p>
                <p className="text-neutral-500 dark:text-neutral-400 text-sm mt-1">매월 자동 갱신 없음</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-neutral-900 dark:text-white">{PLANS.monthly.label}</p>
              </div>
            </div>
            {loading && selectedPlan === 'monthly' && (
              <div className="mt-3 flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                <span className="ml-2 text-sm text-purple-500">결제 준비 중...</span>
              </div>
            )}
          </button>

          {/* Yearly */}
          <button
            onClick={() => handlePayment('yearly')}
            disabled={loading}
            className="w-full text-left p-5 rounded-2xl border-2 border-purple-500 dark:border-purple-400 bg-white dark:bg-neutral-800 hover:border-purple-600 dark:hover:border-purple-300 transition-all relative overflow-hidden disabled:opacity-50"
          >
            {/* Savings Badge */}
            <div className="absolute top-0 right-0 bg-purple-500 text-white text-xs font-bold px-3 py-1 rounded-bl-xl">
              {savingsPercent}% 할인
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-neutral-900 dark:text-white text-lg">{PLANS.yearly.name}</p>
                <p className="text-neutral-500 dark:text-neutral-400 text-sm mt-1">
                  월 {yearlyMonthlyPrice.toLocaleString()}원 (자동 갱신 없음)
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{PLANS.yearly.label}</p>
              </div>
            </div>
            {loading && selectedPlan === 'yearly' && (
              <div className="mt-3 flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                <span className="ml-2 text-sm text-purple-500">결제 준비 중...</span>
              </div>
            )}
          </button>
        </div>

        {/* Features */}
        <div className="space-y-3 mb-8">
          <h3 className="text-sm font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">포함 기능</h3>
          {[
            'AI 튜터와 무제한 회화 연습',
            '6명의 원어민 AI 튜터',
            '실시간 교정 및 피드백',
            '토론 모드 & 복습 시스템',
            '단어장 자동 생성',
          ].map((feature) => (
            <div key={feature} className="flex items-center gap-3">
              <svg className="w-5 h-5 text-purple-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-neutral-700 dark:text-neutral-300 text-sm">{feature}</span>
            </div>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="p-4 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-400 text-sm mb-4">
            {error}
          </div>
        )}

        {/* Note */}
        <p className="text-center text-xs text-neutral-400 dark:text-neutral-500">
          결제는 Toss Payments를 통해 안전하게 처리됩니다.
          <br />자동 갱신되지 않으며, 만료 후 재구독할 수 있습니다.
        </p>
      </main>
    </div>
  );
}
