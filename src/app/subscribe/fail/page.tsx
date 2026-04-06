'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

function FailContent() {
  const searchParams = useSearchParams();
  const errorCode = searchParams.get('code') || '';
  const errorMessage = searchParams.get('message') || '결제가 취소되었거나 실패했습니다.';

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="w-20 h-20 rounded-full bg-red-100 dark:bg-red-500/20 flex items-center justify-center mx-auto">
          <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">결제 실패</h1>
          <p className="text-neutral-600 dark:text-neutral-400">{decodeURIComponent(errorMessage)}</p>
          {errorCode && (
            <p className="text-xs text-neutral-400 dark:text-neutral-500">오류 코드: {errorCode}</p>
          )}
        </div>
        <div className="flex flex-col gap-3">
          <Link
            href="/subscribe"
            className="w-full py-3 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-center transition-colors"
          >
            다시 시도
          </Link>
          <Link
            href="/"
            className="w-full py-3 rounded-2xl border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 font-medium text-center hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            홈으로
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function SubscribeFailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 flex items-center justify-center">
          <div className="w-12 h-12 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <FailContent />
    </Suspense>
  );
}
