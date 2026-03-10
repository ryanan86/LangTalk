"use client";

import { useLanguage } from "@/lib/i18n";
import { useSession, signOut } from "next-auth/react";
import { useState } from "react";
import Link from "next/link";

export default function DeleteAccountPage() {
  const { language } = useLanguage();
  const { data: session } = useSession();
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    setIsDeleting(true);
    setError(null);
    try {
      const res = await fetch('/api/account/delete', { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        await signOut({ callbackUrl: '/login' });
      } else {
        setError(language === 'ko' ? '계정 삭제에 실패했습니다. 다시 시도해주세요.' : 'Failed to delete account. Please try again.');
        setShowConfirm(false);
      }
    } catch {
      setError(language === 'ko' ? '계정 삭제에 실패했습니다. 다시 시도해주세요.' : 'Failed to delete account. Please try again.');
      setShowConfirm(false);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-dark-bg py-12 px-4">
      <div className="max-w-2xl mx-auto bg-white dark:bg-dark-surface rounded-xl shadow-sm dark:shadow-none p-8">
        <Link
          href="/"
          className="text-blue-600 dark:text-blue-400 hover:underline mb-6 inline-block"
        >
          {language === 'ko' ? '← 홈으로' : '← Back to Home'}
        </Link>

        <h1 className="text-3xl font-bold mb-6">
          {language === 'ko' ? '계정 삭제' : 'Delete Account'}
        </h1>

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-lg text-red-700 dark:text-red-300 text-sm">
            {error}
          </div>
        )}

        {language === 'ko' ? (
          <div className="space-y-6 text-neutral-700 dark:text-neutral-300">
            <section>
              <h2 className="text-xl font-semibold mb-3">계정 삭제 안내</h2>
              <p className="leading-relaxed">
                계정을 삭제하면 모든 데이터가 즉시 영구적으로 삭제되며 복구할 수 없습니다.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">삭제되는 데이터</h2>
              <ul className="list-disc pl-6 space-y-1">
                <li>계정 정보 (이메일, 이름, 프로필 사진)</li>
                <li>학습 기록 및 세션 히스토리</li>
                <li>교정 내역</li>
                <li>구독 정보</li>
              </ul>
            </section>

            <section className="bg-yellow-50 dark:bg-yellow-500/10 p-4 rounded-lg">
              <p className="text-yellow-800 dark:text-yellow-300 text-sm">
                <strong>참고:</strong> 법적 의무에 따라 일부 데이터(결제 기록 등)는
                관련 법령에서 정한 기간 동안 보관될 수 있습니다.
              </p>
            </section>

            {session ? (
              <section className="pt-4">
                {!showConfirm ? (
                  <button
                    onClick={() => setShowConfirm(true)}
                    className="w-full py-3 rounded-xl bg-red-600 text-white font-medium hover:bg-red-700 transition-colors"
                  >
                    계정 삭제하기
                  </button>
                ) : (
                  <div className="bg-red-50 dark:bg-red-500/10 p-6 rounded-lg border border-red-200 dark:border-red-500/30">
                    <p className="text-red-700 dark:text-red-300 font-medium mb-4">
                      정말로 계정을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
                    </p>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setShowConfirm(false)}
                        disabled={isDeleting}
                        className="flex-1 py-3 rounded-xl border border-neutral-300 dark:border-neutral-600 text-neutral-700 dark:text-neutral-300 font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors disabled:opacity-50"
                      >
                        취소
                      </button>
                      <button
                        onClick={handleDelete}
                        disabled={isDeleting}
                        className="flex-1 py-3 rounded-xl bg-red-600 text-white font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
                      >
                        {isDeleting ? '삭제 중...' : '확인, 삭제합니다'}
                      </button>
                    </div>
                  </div>
                )}
              </section>
            ) : (
              <section className="pt-4">
                <p className="text-neutral-500 dark:text-neutral-400 mb-4">
                  계정 삭제를 위해 먼저 로그인해주세요.
                </p>
                <Link
                  href="/login"
                  className="inline-block w-full text-center py-3 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors"
                >
                  로그인
                </Link>
              </section>
            )}
          </div>
        ) : (
          <div className="space-y-6 text-neutral-700 dark:text-neutral-300">
            <section>
              <h2 className="text-xl font-semibold mb-3">Account Deletion</h2>
              <p className="leading-relaxed">
                Deleting your account will immediately and permanently remove all your data. This action cannot be undone.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">Data to be Deleted</h2>
              <ul className="list-disc pl-6 space-y-1">
                <li>Account information (email, name, profile picture)</li>
                <li>Learning records and session history</li>
                <li>Correction history</li>
                <li>Subscription information</li>
              </ul>
            </section>

            <section className="bg-yellow-50 dark:bg-yellow-500/10 p-4 rounded-lg">
              <p className="text-yellow-800 dark:text-yellow-300 text-sm">
                <strong>Note:</strong> Some data (such as payment records) may be retained
                for the period required by applicable laws.
              </p>
            </section>

            {session ? (
              <section className="pt-4">
                {!showConfirm ? (
                  <button
                    onClick={() => setShowConfirm(true)}
                    className="w-full py-3 rounded-xl bg-red-600 text-white font-medium hover:bg-red-700 transition-colors"
                  >
                    Delete My Account
                  </button>
                ) : (
                  <div className="bg-red-50 dark:bg-red-500/10 p-6 rounded-lg border border-red-200 dark:border-red-500/30">
                    <p className="text-red-700 dark:text-red-300 font-medium mb-4">
                      Are you sure you want to delete your account? This action cannot be undone.
                    </p>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setShowConfirm(false)}
                        disabled={isDeleting}
                        className="flex-1 py-3 rounded-xl border border-neutral-300 dark:border-neutral-600 text-neutral-700 dark:text-neutral-300 font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors disabled:opacity-50"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleDelete}
                        disabled={isDeleting}
                        className="flex-1 py-3 rounded-xl bg-red-600 text-white font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
                      >
                        {isDeleting ? 'Deleting...' : 'Yes, Delete'}
                      </button>
                    </div>
                  </div>
                )}
              </section>
            ) : (
              <section className="pt-4">
                <p className="text-neutral-500 dark:text-neutral-400 mb-4">
                  Please sign in first to delete your account.
                </p>
                <Link
                  href="/login"
                  className="inline-block w-full text-center py-3 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors"
                >
                  Sign In
                </Link>
              </section>
            )}
          </div>
        )}

        <div className="mt-8 pt-6 border-t border-neutral-200 dark:border-neutral-700">
          <Link href="/privacy" className="text-blue-600 dark:text-blue-400 hover:underline">
            {language === 'ko' ? '개인정보처리방침 보기' : 'View Privacy Policy'}
          </Link>
        </div>
      </div>
    </div>
  );
}
