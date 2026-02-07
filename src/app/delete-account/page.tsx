"use client";

import { useLanguage } from "@/lib/i18n";
import Link from "next/link";

export default function DeleteAccountPage() {
  const { language } = useLanguage();

  return (
    <div className="min-h-screen bg-neutral-50 py-12 px-4">
      <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-sm p-8">
        <Link
          href="/"
          className="text-blue-600 hover:underline mb-6 inline-block"
        >
          {language === 'ko' ? '← 홈으로' : '← Back to Home'}
        </Link>

        <h1 className="text-3xl font-bold mb-6">
          {language === 'ko' ? '계정 삭제 요청' : 'Delete Account Request'}
        </h1>

        {language === 'ko' ? (
          <div className="space-y-6 text-neutral-700">
            <section>
              <h2 className="text-xl font-semibold mb-3">계정 삭제 안내</h2>
              <p className="leading-relaxed">
                TapTalk 계정 삭제를 원하시면 아래 이메일로 삭제 요청을 보내주세요.
                요청 후 7일 이내에 계정 및 관련 데이터가 삭제됩니다.
              </p>
            </section>

            <section className="bg-blue-50 p-6 rounded-lg">
              <h3 className="font-semibold mb-2">삭제 요청 방법</h3>
              <p className="mb-3">아래 이메일로 다음 정보를 보내주세요:</p>
              <ul className="list-disc pl-6 space-y-1 mb-4">
                <li>제목: &quot;계정 삭제 요청&quot;</li>
                <li>가입 시 사용한 이메일 주소</li>
                <li>삭제 요청 사유 (선택)</li>
              </ul>
              <a
                href="mailto:support@taptalk.xyz?subject=계정 삭제 요청"
                className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition"
              >
                support@taptalk.xyz로 이메일 보내기
              </a>
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

            <section>
              <h2 className="text-xl font-semibold mb-3">처리 기간</h2>
              <ul className="list-disc pl-6 space-y-1">
                <li>삭제 요청 접수 후 7일 이내 처리</li>
                <li>처리 완료 시 이메일로 안내</li>
                <li>삭제 후에는 데이터 복구가 불가능합니다</li>
              </ul>
            </section>

            <section className="bg-yellow-50 p-4 rounded-lg">
              <p className="text-yellow-800 text-sm">
                <strong>참고:</strong> 법적 의무에 따라 일부 데이터(결제 기록 등)는
                관련 법령에서 정한 기간 동안 보관될 수 있습니다.
              </p>
            </section>
          </div>
        ) : (
          <div className="space-y-6 text-neutral-700">
            <section>
              <h2 className="text-xl font-semibold mb-3">Account Deletion Information</h2>
              <p className="leading-relaxed">
                To delete your TapTalk account, please send a deletion request to the email below.
                Your account and related data will be deleted within 7 days of the request.
              </p>
            </section>

            <section className="bg-blue-50 p-6 rounded-lg">
              <h3 className="font-semibold mb-2">How to Request Deletion</h3>
              <p className="mb-3">Send an email with the following information:</p>
              <ul className="list-disc pl-6 space-y-1 mb-4">
                <li>Subject: &quot;Account Deletion Request&quot;</li>
                <li>Email address used for registration</li>
                <li>Reason for deletion (optional)</li>
              </ul>
              <a
                href="mailto:support@taptalk.xyz?subject=Account Deletion Request"
                className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition"
              >
                Send Email to support@taptalk.xyz
              </a>
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

            <section>
              <h2 className="text-xl font-semibold mb-3">Processing Time</h2>
              <ul className="list-disc pl-6 space-y-1">
                <li>Processed within 7 days of request</li>
                <li>Email notification upon completion</li>
                <li>Data cannot be recovered after deletion</li>
              </ul>
            </section>

            <section className="bg-yellow-50 p-4 rounded-lg">
              <p className="text-yellow-800 text-sm">
                <strong>Note:</strong> Some data (such as payment records) may be retained
                for the period required by applicable laws.
              </p>
            </section>
          </div>
        )}

        <div className="mt-8 pt-6 border-t border-neutral-200">
          <Link href="/privacy" className="text-blue-600 hover:underline">
            {language === 'ko' ? '개인정보처리방침 보기' : 'View Privacy Policy'}
          </Link>
        </div>
      </div>
    </div>
  );
}
