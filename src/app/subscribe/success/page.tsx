'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { track } from '@/lib/analytics';

function PaymentConfirm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [planName, setPlanName] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const confirmedRef = useRef(false);

  useEffect(() => {
    if (confirmedRef.current) return;
    confirmedRef.current = true;

    const paymentKey = searchParams.get('paymentKey');
    const orderId = searchParams.get('orderId');
    const amount = searchParams.get('amount');

    if (!paymentKey || !orderId || !amount) {
      setStatus('error');
      setErrorMessage('결제 정보가 올바르지 않습니다.');
      return;
    }

    fetch('/api/payment/toss/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        paymentKey,
        orderId,
        amount: Number(amount),
      }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || '결제 승인에 실패했습니다.');
        }
        setPlanName(data.plan === 'yearly' ? '연간 이용권' : '월간 이용권');
        setExpiresAt(data.expiresAt ? new Date(data.expiresAt).toLocaleDateString('ko-KR') : '');
        track('purchase_complete', { plan: data.plan });
        setStatus('success');
      })
      .catch((err) => {
        setStatus('error');
        setErrorMessage(err.message);
      });
  }, [searchParams]);

  /* ── Loading ─────────────────────────────────────────────────────────── */
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex items-center justify-center">
        <div className="text-center space-y-5">
          <div className="w-14 h-14 border-2 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-base font-semibold text-neutral-700 dark:text-neutral-300">결제를 확인하고 있습니다...</p>
        </div>
      </div>
    );
  }

  /* ── Error ───────────────────────────────────────────────────────────── */
  if (status === 'error') {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex items-center justify-center px-4">
        <div className="max-w-sm w-full text-center space-y-7 motion-safe:animate-fade-up">
          {/* Icon */}
          <div className="w-20 h-20 rounded-full bg-red-100 dark:bg-red-500/20 flex items-center justify-center mx-auto">
            <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">결제 실패</h1>
            <p className="text-neutral-600 dark:text-neutral-400 text-sm leading-relaxed">{errorMessage}</p>
          </div>

          <div className="flex flex-col gap-3">
            <Link
              href="/subscribe"
              className="pressable w-full py-3.5 rounded-2xl bg-brand-gradient text-white font-semibold text-center shadow-glow-sm transition-opacity hover:opacity-90"
            >
              다시 시도하기
            </Link>
            <Link
              href="/"
              className="pressable w-full py-3.5 rounded-2xl border border-neutral-200 dark:border-white/[0.08] text-neutral-600 dark:text-neutral-400 font-medium text-center hover:bg-neutral-100 dark:hover:bg-white/[0.05] transition-colors"
            >
              홈으로
            </Link>
          </div>
        </div>
      </div>
    );
  }

  /* ── Success ─────────────────────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex items-center justify-center px-4">
      {/* Ambient glow */}
      <div aria-hidden="true" className="pointer-events-none fixed top-0 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full bg-violet-500/10 dark:bg-violet-500/15 blur-[120px]" />

      <div className="relative max-w-sm w-full text-center space-y-8 motion-safe:animate-fade-up">

        {/* ── Celebration medallion — gentle-bounce + count-pop (matches StudyDashboard) ── */}
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            {/* Outer glow ring */}
            <div
              aria-hidden="true"
              className="absolute inset-0 rounded-full bg-brand-gradient opacity-20 blur-xl scale-125"
            />
            {/* Medallion */}
            <div className="relative w-24 h-24 rounded-full bg-brand-gradient flex items-center justify-center shadow-float dark:shadow-float-dark motion-safe:animate-gentle-bounce">
              <svg
                className="w-12 h-12 text-white motion-safe:animate-count-pop"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>

            {/* Sparkle dots */}
            <div aria-hidden="true" className="absolute -top-1 -left-2 w-3 h-3 rounded-full bg-amber-400 motion-safe:animate-bounce-soft" style={{ animationDelay: '0s' }} />
            <div aria-hidden="true" className="absolute -top-1 -right-2 w-2.5 h-2.5 rounded-full bg-pink-400 motion-safe:animate-bounce-soft" style={{ animationDelay: '0.25s' }} />
            <div aria-hidden="true" className="absolute -bottom-1 -left-3 w-2.5 h-2.5 rounded-full bg-sky-400 motion-safe:animate-bounce-soft" style={{ animationDelay: '0.5s' }} />
            <div aria-hidden="true" className="absolute -bottom-1 -right-2 w-3 h-3 rounded-full bg-emerald-400 motion-safe:animate-bounce-soft" style={{ animationDelay: '0.75s' }} />
          </div>
        </div>

        {/* Copy */}
        <div className="space-y-2">
          <h1 className="text-display-1 font-display font-extrabold text-neutral-900 dark:text-white">
            결제 완료!
          </h1>
          <p className="text-neutral-600 dark:text-neutral-400 font-medium">
            {planName}이 활성화되었습니다.
          </p>
          {expiresAt && (
            <p className="text-sm text-neutral-400 dark:text-neutral-500">
              만료일: {expiresAt}
            </p>
          )}
        </div>

        {/* CTAs */}
        <div className="flex flex-col gap-3">
          <button
            onClick={() => router.push('/')}
            className="pressable w-full py-3.5 rounded-2xl bg-brand-gradient text-white font-semibold shadow-glow-sm hover:opacity-90 transition-opacity"
          >
            학습 시작하기
          </button>
          <Link
            href="/"
            className="pressable w-full py-3.5 rounded-2xl border border-neutral-200 dark:border-white/[0.08] text-neutral-600 dark:text-neutral-400 font-medium text-center hover:bg-neutral-100 dark:hover:bg-white/[0.05] transition-colors"
          >
            홈으로
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function SubscribeSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex items-center justify-center">
          <div className="w-12 h-12 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <PaymentConfirm />
    </Suspense>
  );
}
