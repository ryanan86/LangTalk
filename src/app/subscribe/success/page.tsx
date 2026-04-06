'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';

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
        setStatus('success');
      })
      .catch((err) => {
        setStatus('error');
        setErrorMessage(err.message);
      });
  }, [searchParams]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-lg font-semibold text-neutral-700 dark:text-neutral-300">결제를 확인하고 있습니다...</p>
        </div>
      </div>
    );
  }

  if (status === 'error') {
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
            <p className="text-neutral-600 dark:text-neutral-400">{errorMessage}</p>
          </div>
          <div className="flex flex-col gap-3">
            <Link
              href="/subscribe"
              className="w-full py-3 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-center transition-colors"
            >
              다시 시도하기
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

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-500/20 flex items-center justify-center mx-auto">
          <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">결제가 완료되었습니다!</h1>
          <p className="text-neutral-600 dark:text-neutral-400">
            {planName}이 활성화되었습니다.
          </p>
          {expiresAt && (
            <p className="text-sm text-neutral-500 dark:text-neutral-500">
              만료일: {expiresAt}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-3">
          <button
            onClick={() => router.push('/')}
            className="w-full py-3 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white font-semibold transition-colors"
          >
            학습 시작하기
          </button>
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

export default function SubscribeSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 flex items-center justify-center">
          <div className="w-12 h-12 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <PaymentConfirm />
    </Suspense>
  );
}
