import { cookies } from "next/headers";
import Link from "next/link";

type Language = 'ko' | 'en' | 'nl' | 'ru' | 'fr' | 'es' | 'zh' | 'de';

export default function TermsPage() {
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
          {language === 'ko' ? '이용약관' : 'Terms of Service'}
        </h1>

        {language === 'ko' ? (
          <div className="prose prose-neutral max-w-none space-y-6">
            <p className="text-neutral-600">
              최종 수정일: 2025년 2월 7일
            </p>

            <section>
              <h2 className="text-xl font-semibold mt-8 mb-4">제1조 (목적)</h2>
              <p>
                이 약관은 TapTalk(이하 &quot;서비스&quot;)의 이용과 관련하여 서비스 제공자와
                이용자 간의 권리, 의무 및 책임사항을 규정함을 목적으로 합니다.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mt-8 mb-4">제2조 (서비스 내용)</h2>
              <p>TapTalk은 다음과 같은 서비스를 제공합니다:</p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li>AI 튜터와의 영어 회화 연습</li>
                <li>실시간 문법 및 발음 피드백</li>
                <li>학습 기록 및 진도 관리</li>
                <li>맞춤형 난이도 조정</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mt-8 mb-4">제3조 (이용자의 의무)</h2>
              <ul className="list-disc pl-6 space-y-1">
                <li>서비스를 부정한 목적으로 이용하지 않습니다.</li>
                <li>타인의 정보를 도용하거나 허위 정보를 등록하지 않습니다.</li>
                <li>서비스의 운영을 방해하는 행위를 하지 않습니다.</li>
                <li>저작권 등 지적재산권을 침해하지 않습니다.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mt-8 mb-4">제4조 (서비스 이용 제한)</h2>
              <p>
                서비스 제공자는 이용자가 본 약관을 위반하거나 서비스의 정상적인 운영을
                방해한 경우, 서비스 이용을 제한하거나 계정을 삭제할 수 있습니다.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mt-8 mb-4">제5조 (면책조항)</h2>
              <ul className="list-disc pl-6 space-y-1">
                <li>AI가 제공하는 교정 및 피드백은 참고용이며, 완벽한 정확성을 보장하지 않습니다.</li>
                <li>서비스 이용 중 발생하는 기술적 문제에 대해 책임지지 않습니다.</li>
                <li>천재지변, 전쟁 등 불가항력적 사유로 인한 서비스 중단에 대해 책임지지 않습니다.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mt-8 mb-4">제6조 (분쟁 해결)</h2>
              <p>
                서비스 이용과 관련된 분쟁은 대한민국 법률에 따라 해결하며,
                관할 법원은 서비스 제공자 소재지의 법원으로 합니다.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mt-8 mb-4">제7조 (약관 변경)</h2>
              <p>
                서비스 제공자는 필요한 경우 약관을 변경할 수 있으며, 변경된 약관은
                서비스 내 공지를 통해 안내합니다.
              </p>
            </section>
          </div>
        ) : (
          <div className="prose prose-neutral max-w-none space-y-6">
            <p className="text-neutral-600">
              Last updated: February 7, 2025
            </p>

            <section>
              <h2 className="text-xl font-semibold mt-8 mb-4">1. Acceptance of Terms</h2>
              <p>
                By accessing and using TapTalk (&quot;Service&quot;), you agree to be bound by these
                Terms of Service. If you do not agree to these terms, please do not use the Service.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mt-8 mb-4">2. Service Description</h2>
              <p>TapTalk provides the following services:</p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li>English conversation practice with AI tutors</li>
                <li>Real-time grammar and pronunciation feedback</li>
                <li>Learning history and progress tracking</li>
                <li>Adaptive difficulty adjustment</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mt-8 mb-4">3. User Responsibilities</h2>
              <ul className="list-disc pl-6 space-y-1">
                <li>You agree not to use the Service for any unlawful purpose.</li>
                <li>You will not impersonate others or provide false information.</li>
                <li>You will not interfere with the operation of the Service.</li>
                <li>You will respect intellectual property rights.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mt-8 mb-4">4. Account Termination</h2>
              <p>
                We reserve the right to suspend or terminate your account if you violate
                these Terms of Service or engage in activities that disrupt the Service.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mt-8 mb-4">5. Disclaimer</h2>
              <ul className="list-disc pl-6 space-y-1">
                <li>AI-generated corrections and feedback are for reference only and may not be 100% accurate.</li>
                <li>We are not liable for technical issues that may occur during Service use.</li>
                <li>We are not responsible for Service interruptions due to force majeure events.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mt-8 mb-4">6. Governing Law</h2>
              <p>
                These Terms shall be governed by and construed in accordance with the laws
                of the Republic of Korea.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mt-8 mb-4">7. Changes to Terms</h2>
              <p>
                We may update these Terms from time to time. Changes will be posted on the
                Service and your continued use constitutes acceptance of the updated Terms.
              </p>
            </section>
          </div>
        )}

        <div className="mt-12 pt-6 border-t border-neutral-200">
          <Link href="/privacy" className="text-blue-600 hover:underline">
            {language === 'ko' ? '개인정보처리방침 보기' : 'View Privacy Policy'}
          </Link>
        </div>
      </div>
    </div>
  );
}
