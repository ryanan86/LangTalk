import { cookies } from "next/headers";
import Link from "next/link";

type Language = 'ko' | 'en' | 'nl' | 'ru' | 'fr' | 'es' | 'zh' | 'de';

export default function PrivacyPage() {
  const cookieStore = cookies();
  const language = (cookieStore.get('lang')?.value || 'en') as Language;

  return (
    <div className="min-h-screen bg-neutral-50 py-12 px-4">
      <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-sm p-8">
        <Link
          href="/"
          className="text-blue-600 hover:underline mb-6 inline-block"
        >
          {language === 'ko' ? '← 홈으로' : '← Back to Home'}
        </Link>

        <h1 className="text-3xl font-bold mb-8">
          {language === 'ko' ? '개인정보처리방침' : 'Privacy Policy'}
        </h1>

        {language === 'ko' ? (
          <div className="prose prose-neutral max-w-none space-y-6">
            <p className="text-neutral-600">
              최종 수정일: 2025년 2월 7일
            </p>

            <section>
              <h2 className="text-xl font-semibold mt-8 mb-4">1. 수집하는 개인정보</h2>
              <p>TapTalk은 서비스 제공을 위해 다음 정보를 수집합니다:</p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li><strong>계정 정보:</strong> 이메일 주소, 이름, 프로필 사진 (Google 로그인 시)</li>
                <li><strong>학습 정보:</strong> 생년, 학습 세션 기록, 교정 내역</li>
                <li><strong>음성 데이터:</strong> 영어 연습 중 녹음된 음성 (처리 후 즉시 삭제)</li>
                <li><strong>이용 기록:</strong> 접속 시간, 기기 정보, 브라우저 정보</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mt-8 mb-4">2. 개인정보 이용 목적</h2>
              <ul className="list-disc pl-6 space-y-1">
                <li>서비스 제공 및 계정 관리</li>
                <li>맞춤형 학습 경험 제공</li>
                <li>학습 진도 추적 및 분석</li>
                <li>서비스 개선 및 신규 기능 개발</li>
                <li>고객 지원 및 문의 응대</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mt-8 mb-4">3. 개인정보 보관 기간</h2>
              <ul className="list-disc pl-6 space-y-1">
                <li>계정 정보: 회원 탈퇴 시까지</li>
                <li>학습 기록: 계정 삭제 후 30일 이내 삭제</li>
                <li>음성 데이터: 처리 즉시 삭제 (서버에 저장하지 않음)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mt-8 mb-4">4. 개인정보 제3자 제공</h2>
              <p>TapTalk은 다음의 경우를 제외하고 개인정보를 제3자에게 제공하지 않습니다:</p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li>이용자의 동의가 있는 경우</li>
                <li>법령에 의해 요구되는 경우</li>
              </ul>
              <p className="mt-4">서비스 운영을 위해 다음 외부 서비스를 이용합니다:</p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li><strong>Google OAuth:</strong> 로그인 인증</li>
                <li><strong>OpenAI:</strong> AI 대화 및 음성 처리</li>
                <li><strong>ElevenLabs:</strong> 음성 합성</li>
                <li><strong>Google Analytics:</strong> 서비스 이용 통계</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mt-8 mb-4">5. 이용자의 권리</h2>
              <p>이용자는 다음의 권리를 행사할 수 있습니다:</p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li>개인정보 열람, 수정, 삭제 요청</li>
                <li>개인정보 처리 정지 요청</li>
                <li>계정 삭제 요청</li>
              </ul>
              <p className="mt-2">
                권리 행사를 원하시면 support@taptalk.xyz로 문의해 주세요.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mt-8 mb-4">6. 쿠키 사용</h2>
              <p>
                TapTalk은 서비스 이용 편의를 위해 쿠키를 사용합니다.
                쿠키는 언어 설정, 로그인 상태 유지 등에 사용됩니다.
                브라우저 설정에서 쿠키를 비활성화할 수 있으나, 일부 기능이 제한될 수 있습니다.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mt-8 mb-4">7. 개인정보 보호</h2>
              <p>TapTalk은 개인정보 보호를 위해 다음 조치를 취합니다:</p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li>SSL/TLS 암호화 통신</li>
                <li>접근 권한 제한</li>
                <li>정기적인 보안 점검</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mt-8 mb-4">8. 아동의 개인정보</h2>
              <p>
                TapTalk은 만 14세 미만 아동의 경우 법정대리인의 동의를 받아 서비스를 제공합니다.
                아동의 개인정보는 더욱 신중하게 처리되며, 필요 최소한의 정보만 수집합니다.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mt-8 mb-4">9. 방침 변경</h2>
              <p>
                본 개인정보처리방침은 변경될 수 있으며, 변경 시 서비스 내 공지를 통해 안내합니다.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mt-8 mb-4">10. 문의처</h2>
              <p>
                개인정보 관련 문의: support@taptalk.xyz
              </p>
            </section>
          </div>
        ) : (
          <div className="prose prose-neutral max-w-none space-y-6">
            <p className="text-neutral-600">
              Last updated: February 7, 2025
            </p>

            <section>
              <h2 className="text-xl font-semibold mt-8 mb-4">1. Information We Collect</h2>
              <p>TapTalk collects the following information to provide our services:</p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li><strong>Account Information:</strong> Email address, name, profile picture (via Google Sign-in)</li>
                <li><strong>Learning Information:</strong> Birth year, session history, correction records</li>
                <li><strong>Voice Data:</strong> Audio recordings during practice (deleted immediately after processing)</li>
                <li><strong>Usage Data:</strong> Access times, device information, browser information</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mt-8 mb-4">2. How We Use Your Information</h2>
              <ul className="list-disc pl-6 space-y-1">
                <li>Provide and manage services</li>
                <li>Deliver personalized learning experiences</li>
                <li>Track and analyze learning progress</li>
                <li>Improve services and develop new features</li>
                <li>Customer support</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mt-8 mb-4">3. Data Retention</h2>
              <ul className="list-disc pl-6 space-y-1">
                <li>Account information: Until account deletion</li>
                <li>Learning records: Deleted within 30 days of account deletion</li>
                <li>Voice data: Deleted immediately after processing (not stored on servers)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mt-8 mb-4">4. Information Sharing</h2>
              <p>TapTalk does not share your personal information with third parties except:</p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li>With your consent</li>
                <li>When required by law</li>
              </ul>
              <p className="mt-4">We use the following third-party services:</p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li><strong>Google OAuth:</strong> Authentication</li>
                <li><strong>OpenAI:</strong> AI conversation and voice processing</li>
                <li><strong>ElevenLabs:</strong> Voice synthesis</li>
                <li><strong>Google Analytics:</strong> Usage statistics</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mt-8 mb-4">5. Your Rights</h2>
              <p>You have the right to:</p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li>Access, modify, or delete your personal information</li>
                <li>Request cessation of data processing</li>
                <li>Request account deletion</li>
              </ul>
              <p className="mt-2">
                To exercise these rights, contact us at support@taptalk.xyz
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mt-8 mb-4">6. Cookies</h2>
              <p>
                TapTalk uses cookies to enhance your experience. Cookies are used for
                language preferences, maintaining login status, and analytics.
                You can disable cookies in your browser settings, but some features may be limited.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mt-8 mb-4">7. Data Security</h2>
              <p>We protect your information through:</p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li>SSL/TLS encrypted communications</li>
                <li>Access restrictions</li>
                <li>Regular security audits</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mt-8 mb-4">8. Children&apos;s Privacy</h2>
              <p>
                For users under 14, we require parental or guardian consent.
                We take extra care with children&apos;s data and collect only the minimum necessary information.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mt-8 mb-4">9. Changes to This Policy</h2>
              <p>
                We may update this Privacy Policy. Changes will be announced through the Service.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mt-8 mb-4">10. Contact Us</h2>
              <p>
                For privacy inquiries: support@taptalk.xyz
              </p>
            </section>
          </div>
        )}

        <div className="mt-12 pt-6 border-t border-neutral-200">
          <Link href="/terms" className="text-blue-600 hover:underline">
            {language === 'ko' ? '이용약관 보기' : 'View Terms of Service'}
          </Link>
        </div>
      </div>
    </div>
  );
}
