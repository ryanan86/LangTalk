'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { PLANS, type PlanId } from '@/lib/plans';
import { loadTossPayments } from '@tosspayments/tosspayments-sdk';
import { track } from '@/lib/analytics';
import { Badge } from '@/components/ui';

interface SubscriptionInfo {
  status: string;
  expiryDate?: string;
  plan?: string;
  familyRole?: 'owner' | 'member';
  familyOwnerEmail?: string;
}

// ── SVG check icon (no emoji) ──────────────────────────────────────────────────
function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414L8.414 15 3.293 9.879a1 1 0 111.414-1.414L8.414 12.172l6.879-6.879a1 1 0 011.414 0z" clipRule="evenodd" />
    </svg>
  );
}

// ── Shield / trust icon ────────────────────────────────────────────────────────
function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  );
}

// ── Users icon for family tab ──────────────────────────────────────────────────
function UsersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  );
}

// ── Person icon for personal tab ───────────────────────────────────────────────
function PersonIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  );
}

type PlanTab = 'personal' | 'family';

export default function SubscribePage() {
  const router = useRouter();
  const { data: session, status: authStatus } = useSession();
  const [selectedPlan, setSelectedPlan] = useState<PlanId | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [checkingStatus, setCheckingStatus] = useState(true);

  // Initialise tab from ?tab=family query param (for CTA links from /family page)
  const [activeTab, setActiveTab] = useState<PlanTab>(() => {
    if (typeof window !== 'undefined') {
      return new URLSearchParams(window.location.search).get('tab') === 'family' ? 'family' : 'personal';
    }
    return 'personal';
  });

  useEffect(() => {
    if (authStatus === 'unauthenticated') {
      router.push('/login');
    }
  }, [authStatus, router]);

  useEffect(() => {
    track('paywall_view');
  }, []);

  useEffect(() => {
    if (!session?.user?.email) return;
    fetchSubscriptionStatus();
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
          familyRole: data.familyRole,
          familyOwnerEmail: data.familyOwnerEmail,
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
    track('checkout_start', { plan: planId });

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
      const tossPayments = await loadTossPayments(clientKey);

      stage = 'payment 객체 생성';
      const payment = tossPayments.payment({ customerKey });

      stage = 'requestPayment 호출';
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
  const isTrial = subscription?.plan === 'trial';
  const expiryDate = subscription?.expiryDate ? new Date(subscription.expiryDate) : null;
  const remainingDays = expiryDate ? Math.max(0, Math.ceil((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))) : 0;

  const monthlyPrice = PLANS.monthly.price;
  const yearlyMonthlyPrice = Math.round(PLANS.yearly.price / 12);
  const savingsPercent = Math.round((1 - yearlyMonthlyPrice / monthlyPrice) * 100);

  const familyYearlyMonthlyPrice = Math.round(PLANS['family-yearly'].price / 12);
  const familyYearlyPerPersonMonthly = Math.round(familyYearlyMonthlyPrice / 4);
  const familyYearlySavingsPercent = Math.round(
    (1 - familyYearlyMonthlyPrice / PLANS['family-monthly'].price) * 100
  );

  if (authStatus === 'loading' || checkingStatus) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      {/* Header */}
      <header className="bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xl border-b border-black/[0.06] dark:border-white/[0.06] px-4 py-4 sticky top-0 z-50 safe-top">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="pressable p-2 -ml-2 text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors"
            aria-label="뒤로가기"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-base font-semibold text-neutral-900 dark:text-white">구독하기</h1>
          <div className="w-8" />
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-8 pb-24 space-y-6 motion-safe:animate-fade-up">

        {/* ── Trial / active subscription status banner ──────────────────────── */}
        {isActive && expiryDate && (
          <div className={`p-5 rounded-card-lg border ${
            isTrial
              ? 'bg-indigo-50 dark:bg-indigo-500/10 border-indigo-200 dark:border-indigo-500/30'
              : 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30'
          } motion-safe:animate-fade-up`}>
            <div className="flex items-start gap-3">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                isTrial
                  ? 'bg-indigo-100 dark:bg-indigo-500/20'
                  : 'bg-emerald-100 dark:bg-emerald-500/20'
              }`}>
                <svg className={`w-5 h-5 ${isTrial ? 'text-indigo-600 dark:text-indigo-400' : 'text-emerald-600 dark:text-emerald-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <p className={`font-bold text-sm ${isTrial ? 'text-indigo-900 dark:text-indigo-200' : 'text-emerald-900 dark:text-emerald-200'}`}>
                    {isTrial ? '무료 체험 중' : subscription?.plan === 'yearly' ? '연간 이용권 활성화' : subscription?.plan === 'monthly' ? '월간 이용권 활성화' : subscription?.plan === 'family-yearly' ? '가족 연간 이용권 활성화' : subscription?.plan === 'family-monthly' ? '가족 월간 이용권 활성화' : '구독 활성화'}
                  </p>
                  {/* D-n badge using the Badge primitive */}
                  <Badge
                    variant={isTrial ? 'info' : 'success'}
                    size="md"
                    dot
                    className="tabular-nums font-bold motion-safe:animate-count-pop"
                  >
                    {isTrial ? `D-${remainingDays}` : `${remainingDays}일 남음`}
                  </Badge>
                </div>
                <p className={`text-sm mt-1 ${isTrial ? 'text-indigo-700 dark:text-indigo-400' : 'text-emerald-700 dark:text-emerald-400'}`}>
                  {isTrial ? '체험 종료일' : '만료일'}: <span className="font-semibold">{expiryDate.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                </p>
                <p className={`text-xs mt-2 leading-relaxed ${isTrial ? 'text-indigo-600/80 dark:text-indigo-400/70' : 'text-emerald-600/80 dark:text-emerald-400/70'}`}>
                  {isTrial
                    ? '무료 체험이 종료됩니다. 지금 구독하면 체험 종료 후 이어집니다.'
                    : '지금 추가 구독하시면 만료일에서부터 자동으로 연장됩니다.'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── Hero heading ──────────────────────────────────────────────────── */}
        <div className="text-center pt-2">
          <h2 className="text-display-1 font-display text-neutral-900 dark:text-white mb-2">
            {isActive && !isTrial ? '구독 연장하기' : 'TapTalk 프리미엄'}
          </h2>
          <p className="text-neutral-500 dark:text-neutral-400 text-sm">
            {isActive && !isTrial ? '원하는 플랜으로 이용 기간을 연장하세요' : 'AI 튜터와 무제한 영어 회화 연습'}
          </p>
        </div>

        {/* ── 개인 / 가족 segmented toggle ──────────────────────────────────── */}
        <div className="flex items-center gap-1 p-1 rounded-2xl bg-neutral-100 dark:bg-white/[0.06]" role="tablist" aria-label="플랜 종류 선택">
          <button
            role="tab"
            aria-selected={activeTab === 'personal'}
            onClick={() => setActiveTab('personal')}
            className={`pressable flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'personal'
                ? 'bg-white dark:bg-white/[0.10] text-neutral-900 dark:text-white shadow-card dark:shadow-card-dark'
                : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'
            }`}
          >
            <PersonIcon className="w-4 h-4 flex-shrink-0" />
            개인
          </button>
          <button
            role="tab"
            aria-selected={activeTab === 'family'}
            onClick={() => setActiveTab('family')}
            className={`pressable flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'family'
                ? 'bg-white dark:bg-white/[0.10] text-neutral-900 dark:text-white shadow-card dark:shadow-card-dark'
                : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'
            }`}
          >
            <UsersIcon className="w-4 h-4 flex-shrink-0" />
            가족
          </button>
        </div>

        {/* ── Plan cards ────────────────────────────────────────────────────── */}
        {activeTab === 'personal' ? (
          <div className="space-y-3">

            {/* ── Yearly (featured / 인기) ────────────────────────────────────── */}
            <button
              onClick={() => handlePayment('yearly')}
              disabled={loading}
              className="pressable w-full text-left p-5 rounded-card-lg border-2 border-violet-500 dark:border-violet-400 bg-white dark:bg-white/[0.04] relative overflow-hidden transition-all hover:shadow-card-hover dark:hover:shadow-card-hover-dark disabled:opacity-50 group"
              aria-label={`연간 플랜 ${PLANS.yearly.label} 선택`}
            >
              {/* subtle gradient wash on hover */}
              <div aria-hidden="true" className="absolute inset-0 bg-brand-gradient opacity-0 group-hover:opacity-[0.04] transition-opacity duration-300 pointer-events-none" />

              {/* 인기 badge — top right */}
              <div className="absolute top-0 right-0">
                <div className="bg-brand-gradient text-white text-[11px] font-bold px-3 py-1 rounded-bl-xl tracking-wide">
                  인기
                </div>
              </div>

              <div className="flex items-start justify-between pr-12">
                <div>
                  <p className="font-bold text-neutral-900 dark:text-white text-lg leading-tight">{PLANS.yearly.name}</p>
                  <p className="text-neutral-500 dark:text-neutral-400 text-sm mt-1">
                    월 {yearlyMonthlyPrice.toLocaleString()}원 (자동 갱신 없음)
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-display-2 font-display font-extrabold text-violet-600 dark:text-violet-400 tabular-nums">
                    {PLANS.yearly.label}
                  </p>
                </div>
              </div>

              {/* Savings callout */}
              <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-50 dark:bg-violet-500/15 border border-violet-200 dark:border-violet-500/30">
                <svg className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M5 2a2 2 0 00-2 2v14l3.5-2 3.5 2 3.5-2 3.5 2V4a2 2 0 00-2-2H5zm2.5 3a1.5 1.5 0 100 3 1.5 1.5 0 000-3zm6.207.293a1 1 0 00-1.414 0l-6 6a1 1 0 101.414 1.414l6-6a1 1 0 000-1.414zM12.5 10a1.5 1.5 0 100 3 1.5 1.5 0 000-3z" clipRule="evenodd" />
                </svg>
                <span className="text-xs font-bold text-violet-700 dark:text-violet-300">월간 대비 {savingsPercent}% 절약</span>
              </div>

              {loading && selectedPlan === 'yearly' && (
                <div className="mt-3 flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm text-violet-500">결제 준비 중...</span>
                </div>
              )}
            </button>

            {/* ── Monthly ─────────────────────────────────────────────────────── */}
            <button
              onClick={() => handlePayment('monthly')}
              disabled={loading}
              className="pressable w-full text-left p-5 rounded-card-lg border-2 border-neutral-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.03] hover:border-neutral-300 dark:hover:border-white/[0.12] transition-all disabled:opacity-50"
              aria-label={`월간 플랜 ${PLANS.monthly.label} 선택`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-bold text-neutral-900 dark:text-white text-lg leading-tight">{PLANS.monthly.name}</p>
                  <p className="text-neutral-500 dark:text-neutral-400 text-sm mt-1">매월 자동 갱신 없음</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-display-2 font-display font-extrabold text-neutral-900 dark:text-white tabular-nums">
                    {PLANS.monthly.label}
                  </p>
                </div>
              </div>
              {loading && selectedPlan === 'monthly' && (
                <div className="mt-3 flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm text-violet-500">결제 준비 중...</span>
                </div>
              )}
            </button>
          </div>
        ) : (
          /* ── Family plan cards ──────────────────────────────────────────────── */
          <div className="space-y-3">

            {/* ── Family value proposition ──────────────────────────────────── */}
            <div className="p-4 rounded-card bg-violet-50 dark:bg-violet-500/10 border border-violet-200 dark:border-violet-500/20">
              <p className="text-sm font-semibold text-violet-800 dark:text-violet-300 mb-1">최대 4인 · 인당 약 {familyYearlyPerPersonMonthly.toLocaleString()}원/월</p>
              <p className="text-xs text-violet-700/80 dark:text-violet-400/80">가족 모두 함께 영어를 배우는 가장 경제적인 방법</p>
            </div>

            {/* ── Family Yearly (featured / 인기) ──────────────────────────── */}
            <button
              onClick={() => handlePayment('family-yearly')}
              disabled={loading}
              className="pressable w-full text-left p-5 rounded-card-lg border-2 border-violet-500 dark:border-violet-400 bg-white dark:bg-white/[0.04] relative overflow-hidden transition-all hover:shadow-card-hover dark:hover:shadow-card-hover-dark disabled:opacity-50 group"
              aria-label={`가족 연간 플랜 ${PLANS['family-yearly'].label} 선택`}
            >
              <div aria-hidden="true" className="absolute inset-0 bg-brand-gradient opacity-0 group-hover:opacity-[0.04] transition-opacity duration-300 pointer-events-none" />

              {/* 인기 badge */}
              <div className="absolute top-0 right-0">
                <div className="bg-brand-gradient text-white text-[11px] font-bold px-3 py-1 rounded-bl-xl tracking-wide">
                  인기
                </div>
              </div>

              <div className="flex items-start justify-between pr-12">
                <div>
                  <p className="font-bold text-neutral-900 dark:text-white text-lg leading-tight">{PLANS['family-yearly'].name}</p>
                  <p className="text-neutral-500 dark:text-neutral-400 text-sm mt-1">
                    월 {familyYearlyMonthlyPrice.toLocaleString()}원 (자동 갱신 없음)
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-display-2 font-display font-extrabold text-violet-600 dark:text-violet-400 tabular-nums">
                    {PLANS['family-yearly'].label}
                  </p>
                </div>
              </div>

              {/* Savings callout */}
              <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-50 dark:bg-violet-500/15 border border-violet-200 dark:border-violet-500/30">
                <svg className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M5 2a2 2 0 00-2 2v14l3.5-2 3.5 2 3.5-2 3.5 2V4a2 2 0 00-2-2H5zm2.5 3a1.5 1.5 0 100 3 1.5 1.5 0 000-3zm6.207.293a1 1 0 00-1.414 0l-6 6a1 1 0 101.414 1.414l6-6a1 1 0 000-1.414zM12.5 10a1.5 1.5 0 100 3 1.5 1.5 0 000-3z" clipRule="evenodd" />
                </svg>
                <span className="text-xs font-bold text-violet-700 dark:text-violet-300">월간 대비 {familyYearlySavingsPercent}% 절약</span>
              </div>

              {loading && selectedPlan === 'family-yearly' && (
                <div className="mt-3 flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm text-violet-500">결제 준비 중...</span>
                </div>
              )}
            </button>

            {/* ── Family Monthly ───────────────────────────────────────────── */}
            <button
              onClick={() => handlePayment('family-monthly')}
              disabled={loading}
              className="pressable w-full text-left p-5 rounded-card-lg border-2 border-neutral-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.03] hover:border-neutral-300 dark:hover:border-white/[0.12] transition-all disabled:opacity-50"
              aria-label={`가족 월간 플랜 ${PLANS['family-monthly'].label} 선택`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-bold text-neutral-900 dark:text-white text-lg leading-tight">{PLANS['family-monthly'].name}</p>
                  <p className="text-neutral-500 dark:text-neutral-400 text-sm mt-1">매월 자동 갱신 없음</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-display-2 font-display font-extrabold text-neutral-900 dark:text-white tabular-nums">
                    {PLANS['family-monthly'].label}
                  </p>
                </div>
              </div>
              {loading && selectedPlan === 'family-monthly' && (
                <div className="mt-3 flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm text-violet-500">결제 준비 중...</span>
                </div>
              )}
            </button>

            {/* ── Family benefits list ──────────────────────────────────────── */}
            <div className="p-5 rounded-card bg-white dark:bg-white/[0.03] border border-neutral-200 dark:border-white/[0.06] space-y-3">
              <h3 className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-widest mb-4">가족 플랜 혜택</h3>
              {[
                '부모 대시보드 — 자녀 학습 현황 한눈에 확인',
                '각자의 개인 플랜과 진도로 맞춤 학습',
                '한 번의 결제로 최대 4인 동시 이용',
                'AI 튜터와 무제한 회화 연습',
                '실시간 교정 및 피드백',
              ].map((feature) => (
                <div key={feature} className="flex items-center gap-3">
                  <span className="w-5 h-5 rounded-full bg-violet-100 dark:bg-violet-500/20 flex items-center justify-center flex-shrink-0">
                    <CheckIcon className="w-3 h-3 text-violet-600 dark:text-violet-400" />
                  </span>
                  <span className="text-sm text-neutral-700 dark:text-neutral-300">{feature}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Benefits checklist (개인 탭) ──────────────────────────────────── */}
        {activeTab === 'personal' && (
          <div className="p-5 rounded-card bg-white dark:bg-white/[0.03] border border-neutral-200 dark:border-white/[0.06] space-y-3">
            <h3 className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-widest mb-4">포함 기능</h3>
            {[
              'AI 튜터와 무제한 회화 연습',
              '6명의 원어민 AI 튜터',
              '실시간 교정 및 피드백',
              '토론 모드 & 복습 시스템',
              '단어장 자동 생성',
            ].map((feature) => (
              <div key={feature} className="flex items-center gap-3">
                <span className="w-5 h-5 rounded-full bg-violet-100 dark:bg-violet-500/20 flex items-center justify-center flex-shrink-0">
                  <CheckIcon className="w-3 h-3 text-violet-600 dark:text-violet-400" />
                </span>
                <span className="text-sm text-neutral-700 dark:text-neutral-300">{feature}</span>
              </div>
            ))}
          </div>
        )}

        {/* ── Error ─────────────────────────────────────────────────────────── */}
        {error && (
          <div className="p-4 rounded-card bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-400 text-sm motion-safe:animate-fade-up">
            {error}
          </div>
        )}

        {/* ── Trust footer ─────────────────────────────────────────────────── */}
        <div className="flex items-center justify-center gap-2 text-xs text-neutral-400 dark:text-neutral-500">
          <ShieldIcon className="w-4 h-4 flex-shrink-0" />
          <span>Toss Payments로 안전하게 처리 · 자동 갱신 없음</span>
        </div>
      </main>
    </div>
  );
}
