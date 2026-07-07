'use client';

import { Suspense, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { track } from '@/lib/analytics';

function FailContent() {
  const searchParams = useSearchParams();
  const errorCode = searchParams.get('code') || '';
  const errorMessage = searchParams.get('message') || '결제가 취소되었거나 실패했습니다.';

  useEffect(() => {
    track('purchase_fail', { code: errorCode });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex items-center justify-center px-4">
      {/* Subtle ambient — muted red tint, not alarming */}
      <div aria-hidden="true" className="pointer-events-none fixed top-0 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full bg-red-500/5 dark:bg-red-500/8 blur-[100px]" />

      <div className="relative max-w-sm w-full text-center space-y-7 motion-safe:animate-fade-up">

        {/* Icon — calm, not panicked */}
        <div className="flex justify-center">
          <div className="w-20 h-20 rounded-full bg-neutral-100 dark:bg-white/[0.06] border border-neutral-200 dark:border-white/[0.08] flex items-center justify-center shadow-card dark:shadow-card-dark">
            <svg className="w-9 h-9 text-neutral-500 dark:text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
        </div>

        {/* Copy */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">결제 실패</h1>
          <p className="text-neutral-600 dark:text-neutral-400 text-sm leading-relaxed">
            {decodeURIComponent(errorMessage)}
          </p>
          {errorCode && (
            <p className="text-xs text-neutral-400 dark:text-neutral-500 font-mono mt-1">
              오류 코드: {errorCode}
            </p>
          )}
        </div>

        {/* CTAs */}
        <div className="flex flex-col gap-3">
          <Link
            href="/subscribe"
            className="pressable w-full py-3.5 rounded-2xl bg-brand-gradient text-white font-semibold text-center shadow-glow-sm hover:opacity-90 transition-opacity"
          >
            다시 시도
          </Link>
          <Link
            href="/"
            className="pressable w-full py-3.5 rounded-2xl border border-neutral-200 dark:border-white/[0.08] text-neutral-600 dark:text-neutral-400 font-medium text-center hover:bg-neutral-100 dark:hover:bg-white/[0.05] transition-colors"
          >
            홈으로
          </Link>
        </div>

        {/* Help nudge */}
        <p className="text-xs text-neutral-400 dark:text-neutral-500">
          문제가 계속되면 고객센터로 문의해주세요.
        </p>
      </div>
    </div>
  );
}

export default function SubscribeFailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex items-center justify-center">
          <div className="w-12 h-12 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <FailContent />
    </Suspense>
  );
}
