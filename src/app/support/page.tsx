import { cookies } from "next/headers";
import Link from "next/link";

type Language = 'ko' | 'en' | 'nl' | 'ru' | 'fr' | 'es' | 'zh' | 'de';

export default function SupportPage() {
  const cookieStore = cookies();
  const language = (cookieStore.get('lang')?.value || 'en') as Language;

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 py-12 px-4">
      <div className="max-w-3xl mx-auto bg-white dark:bg-neutral-900 rounded-xl shadow-sm p-8">
        <Link
          href="/"
          className="text-blue-600 dark:text-blue-400 hover:underline mb-6 inline-block"
        >
          {language === 'ko' ? '← 홈으로' : '← Back to Home'}
        </Link>

        {/* App Header */}
        <div className="flex items-center gap-4 mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-2xl font-bold shadow-md">
            T
          </div>
          <div>
            <h1 className="text-3xl font-bold">
              {language === 'ko' ? 'TapTalk 고객지원' : 'TapTalk Support'}
            </h1>
            <p className="text-neutral-500 dark:text-neutral-400 text-sm mt-1">
              {language === 'ko'
                ? 'AI 영어 회화 연습 앱'
                : 'AI English Conversation Practice'}
            </p>
          </div>
        </div>

        {language === 'ko' ? (
          <div className="prose prose-neutral max-w-none space-y-6">

            {/* Contact Section */}
            <section className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-3">도움이 필요하신가요?</h2>
              <p>
                아래 이메일로 문의해 주세요. 영업일 기준 24시간 이내에 답변드립니다.
              </p>
              <a
                href="mailto:info@nuklabs.com"
                className="inline-block mt-3 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium no-underline"
              >
                info@nuklabs.com
              </a>
              <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-3">
                응답 시간: 영업일 기준 24시간 이내
              </p>
            </section>

            {/* Refund & Cancellation Section */}
            <section>
              <h2 className="text-xl font-semibold mt-8 mb-4">환불 및 해지 안내</h2>

              <div className="bg-neutral-50 dark:bg-neutral-800/50 rounded-lg p-5 space-y-4 text-sm">
                <div>
                  <h3 className="font-semibold text-neutral-800 dark:text-neutral-200 mb-1">자동 갱신 없음</h3>
                  <p className="text-neutral-600 dark:text-neutral-400">
                    TapTalk의 모든 구독 플랜은 자동으로 갱신되지 않습니다.
                    구독 기간이 만료되면 서비스 이용이 제한되며, 계속 이용하려면 별도로 재결제하면 됩니다.
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold text-neutral-800 dark:text-neutral-200 mb-1">7일 이내 전액 환불</h3>
                  <p className="text-neutral-600 dark:text-neutral-400">
                    결제일로부터 7일 이내이며 서비스를 거의 이용하지 않은 경우, 전액 환불을 받으실 수 있습니다.
                    환불 신청은 고객센터 이메일로 접수해 주세요.
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold text-neutral-800 dark:text-neutral-200 mb-1">7일 이후 일할 환불</h3>
                  <p className="text-neutral-600 dark:text-neutral-400">
                    결제일로부터 7일이 지났거나 서비스를 상당 부분 이용한 경우,
                    잔여 기간에 대해 일할 계산하여 환불됩니다(콘텐츠산업진흥법 시행령 기준).
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold text-neutral-800 dark:text-neutral-200 mb-1">환불 처리 방법</h3>
                  <p className="text-neutral-600 dark:text-neutral-400">
                    고객센터 이메일로 결제 계정 이메일, 결제 일자, 주문번호, 환불 사유를 기재하여 신청해 주세요.
                    접수 후 영업일 기준 3일 이내에 처리되며, 실제 환불 반영은 카드사에 따라 추가 영업일이 소요될 수 있습니다.
                  </p>
                </div>

                <div className="pt-2">
                  <Link
                    href="/terms#제7조"
                    className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
                  >
                    이용약관 제7조 (청약철회 및 환불) 전문 보기
                  </Link>
                </div>
              </div>
            </section>

            {/* FAQ Section */}
            <section>
              <h2 className="text-xl font-semibold mt-8 mb-4">자주 묻는 질문 (FAQ)</h2>

              <div className="space-y-6">
                <div>
                  <h3 className="font-semibold text-lg mb-2">Q. 환불은 어떻게 신청하나요?</h3>
                  <p className="text-neutral-700 dark:text-neutral-300">
                    고객센터 이메일(info@nuklabs.com)로
                    결제 계정 이메일, 결제 일자, 주문번호, 환불 사유를 기재하여 신청하시면 됩니다.
                    결제일로부터 7일 이내 미이용(또는 경미한 이용) 시 전액 환불, 이후에는 잔여 기간 일할 계산 환불이 적용됩니다.
                    접수 후 영업일 기준 3일 이내에 처리됩니다.
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold text-lg mb-2">Q. 가족 플랜에 구성원을 어떻게 추가하나요?</h3>
                  <p className="text-neutral-700 dark:text-neutral-300">
                    가족 플랜을 구독하신 후, 앱 내 프로필 &gt; 가족 관리 메뉴에서 구성원을 초대할 수 있습니다.
                    결제자 본인 포함 최대 4인까지 이용 가능하며, 구성원은 각자의 계정으로 로그인하여 독립적으로 학습합니다.
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold text-lg mb-2">Q. 7일 무료 체험이 끝나면 어떻게 되나요?</h3>
                  <p className="text-neutral-700 dark:text-neutral-300">
                    무료 체험이 종료되면 자동 과금은 발생하지 않습니다. 서비스 이용이 제한되며,
                    계속 이용하시려면 구독 페이지에서 원하는 플랜을 선택하여 결제하시면 됩니다.
                    결제수단 등록 없이 체험이 시작되므로 체험 종료 후 별도 취소 절차가 필요 없습니다.
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold text-lg mb-2">Q. TapTalk은 어떻게 사용하나요?</h3>
                  <p className="text-neutral-700 dark:text-neutral-300">
                    로그인 후 AI 튜터를 선택하고 대화를 시작하면 됩니다.
                    텍스트 또는 음성으로 영어 회화를 연습할 수 있으며,
                    AI가 실시간으로 문법과 표현을 교정해 드립니다.
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold text-lg mb-2">Q. 계정을 삭제하고 싶어요.</h3>
                  <p className="text-neutral-700 dark:text-neutral-300">
                    앱 내 프로필 &gt; 계정 설정에서 계정 삭제를 진행할 수 있습니다.
                    또는 info@nuklabs.com으로 계정 삭제를 요청해 주세요.
                    삭제 후 30일 이내에 모든 데이터가 영구 삭제됩니다.
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold text-lg mb-2">Q. 마이크가 작동하지 않아요.</h3>
                  <p className="text-neutral-700 dark:text-neutral-300">
                    브라우저 또는 앱 설정에서 마이크 권한이 허용되어 있는지 확인해 주세요.
                    iOS의 경우 설정 &gt; 개인정보 보호 &gt; 마이크에서 TapTalk의 접근을 허용해 주세요.
                    문제가 지속되면 앱을 재시작하거나 기기를 재부팅해 보세요.
                  </p>
                </div>
              </div>
            </section>

            {/* Business Info Section */}
            <section className="mt-10 pt-6 border-t border-neutral-200 dark:border-neutral-700">
              <h2 className="text-xl font-semibold mb-4">사업자 정보</h2>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 text-sm">
                <div>
                  <dt className="font-semibold text-neutral-700 dark:text-neutral-300">상호</dt>
                  <dd className="text-neutral-600 dark:text-neutral-400">주식회사 누크랩스 (NUKLABS Co., Ltd.)</dd>
                </div>
                <div>
                  <dt className="font-semibold text-neutral-700 dark:text-neutral-300">대표자</dt>
                  <dd className="text-neutral-600 dark:text-neutral-400">안태웅</dd>
                </div>
                <div>
                  <dt className="font-semibold text-neutral-700 dark:text-neutral-300">사업자등록번호</dt>
                  <dd className="text-neutral-600 dark:text-neutral-400">561-88-02777</dd>
                </div>
                <div>
                  <dt className="font-semibold text-neutral-700 dark:text-neutral-300">통신판매업신고번호</dt>
                  <dd className="text-neutral-600 dark:text-neutral-400">2022-서울서초-2594</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="font-semibold text-neutral-700 dark:text-neutral-300">주소</dt>
                  <dd className="text-neutral-600 dark:text-neutral-400">경기도 화성시 동탄영천로 150, 제비동 503호 (영천동, 현대실리콘앨리 동탄)</dd>
                </div>
                <div>
                  <dt className="font-semibold text-neutral-700 dark:text-neutral-300">고객센터</dt>
                  <dd className="text-neutral-600 dark:text-neutral-400">info@nuklabs.com</dd>
                </div>
              </dl>
            </section>
          </div>
        ) : (
          <div className="prose prose-neutral max-w-none space-y-6">

            {/* Contact Section */}
            <section className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-3">Need Help?</h2>
              <p>
                Send us an email and we will get back to you within 24 business hours.
              </p>
              <a
                href="mailto:info@nuklabs.com"
                className="inline-block mt-3 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium no-underline"
              >
                info@nuklabs.com
              </a>
              <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-3">
                Response time: within 24 business hours
              </p>
            </section>

            {/* Refund & Cancellation Section */}
            <section>
              <h2 className="text-xl font-semibold mt-8 mb-4">Refunds &amp; Cancellation</h2>

              <div className="bg-neutral-50 dark:bg-neutral-800/50 rounded-lg p-5 space-y-4 text-sm">
                <div>
                  <h3 className="font-semibold text-neutral-800 dark:text-neutral-200 mb-1">No Auto-Renewal</h3>
                  <p className="text-neutral-600 dark:text-neutral-400">
                    All TapTalk subscription plans do not auto-renew.
                    When your subscription expires, access is restricted until you manually purchase a new plan.
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold text-neutral-800 dark:text-neutral-200 mb-1">Full Refund within 7 Days</h3>
                  <p className="text-neutral-600 dark:text-neutral-400">
                    You may request a full refund within 7 days of payment if you have not used or have only
                    minimally used the Service. Contact customer support to initiate the request.
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold text-neutral-800 dark:text-neutral-200 mb-1">Pro-rata Refund after 7 Days</h3>
                  <p className="text-neutral-600 dark:text-neutral-400">
                    After 7 days or after substantial use, refunds are calculated on a pro-rata basis
                    for the remaining subscription period.
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold text-neutral-800 dark:text-neutral-200 mb-1">How to Request</h3>
                  <p className="text-neutral-600 dark:text-neutral-400">
                    Email customer support with your account email, payment date, order number, and reason.
                    Refunds are processed within 3 business days.
                  </p>
                </div>

                <div className="pt-2">
                  <Link
                    href="/terms"
                    className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
                  >
                    View full refund policy in Terms of Service (Section 7)
                  </Link>
                </div>
              </div>
            </section>

            {/* FAQ Section */}
            <section>
              <h2 className="text-xl font-semibold mt-8 mb-4">Frequently Asked Questions (FAQ)</h2>

              <div className="space-y-6">
                <div>
                  <h3 className="font-semibold text-lg mb-2">Q. How do I request a refund?</h3>
                  <p className="text-neutral-700 dark:text-neutral-300">
                    Email customer support with your account email, payment date, order number, and refund reason.
                    Full refunds are available within 7 days of payment if the Service has not been substantially used.
                    After 7 days, a pro-rata refund applies. Refunds are processed within 3 business days.
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold text-lg mb-2">Q. How do I add members to a Family Plan?</h3>
                  <p className="text-neutral-700 dark:text-neutral-300">
                    After subscribing to a Family Plan, go to Profile &gt; Family Management in the app to invite members.
                    Up to 4 users (including the plan owner) can use the service.
                    Each member signs in with their own account and has independent learning records.
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold text-lg mb-2">Q. What happens when my free trial ends?</h3>
                  <p className="text-neutral-700 dark:text-neutral-300">
                    When your 7-day free trial ends, no charge is applied automatically. Service access becomes restricted.
                    To continue, select a paid plan on the subscription page.
                    No cancellation action is needed since no payment method was registered during the trial.
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold text-lg mb-2">Q. How do I use TapTalk?</h3>
                  <p className="text-neutral-700 dark:text-neutral-300">
                    After signing in, select an AI tutor and start a conversation.
                    You can practice English via text or voice, and the AI provides
                    real-time grammar and expression corrections.
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold text-lg mb-2">Q. How do I delete my account?</h3>
                  <p className="text-neutral-700 dark:text-neutral-300">
                    You can delete your account in the app under Profile &gt; Account Settings.
                    Alternatively, email customer support to request account deletion.
                    All data will be permanently deleted within 30 days.
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold text-lg mb-2">Q. My microphone is not working.</h3>
                  <p className="text-neutral-700 dark:text-neutral-300">
                    Please check that microphone permissions are enabled in your browser or app settings.
                    On iOS, go to Settings &gt; Privacy &amp; Security &gt; Microphone and allow access for TapTalk.
                    If the issue persists, try restarting the app or rebooting your device.
                  </p>
                </div>
              </div>
            </section>

            {/* Business Info Section */}
            <section className="mt-10 pt-6 border-t border-neutral-200 dark:border-neutral-700">
              <h2 className="text-xl font-semibold mb-4">Business Information</h2>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 text-sm">
                <div>
                  <dt className="font-semibold text-neutral-700 dark:text-neutral-300">Company</dt>
                  <dd className="text-neutral-600 dark:text-neutral-400">NUKLABS Co., Ltd. (주식회사 누크랩스)</dd>
                </div>
                <div>
                  <dt className="font-semibold text-neutral-700 dark:text-neutral-300">Representative</dt>
                  <dd className="text-neutral-600 dark:text-neutral-400">Taewung Ahn (안태웅)</dd>
                </div>
                <div>
                  <dt className="font-semibold text-neutral-700 dark:text-neutral-300">Business Registration No.</dt>
                  <dd className="text-neutral-600 dark:text-neutral-400">561-88-02777</dd>
                </div>
                <div>
                  <dt className="font-semibold text-neutral-700 dark:text-neutral-300">Mail-Order Sales Report No.</dt>
                  <dd className="text-neutral-600 dark:text-neutral-400">2022-서울서초-2594</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="font-semibold text-neutral-700 dark:text-neutral-300">Address</dt>
                  <dd className="text-neutral-600 dark:text-neutral-400">150 Dongtanyeongcheon-ro, Jebidong 503, Hwaseong-si, Gyeonggi-do, Republic of Korea (Yeongcheondong, Hyundai Silicon Alley Dongtan)</dd>
                </div>
                <div>
                  <dt className="font-semibold text-neutral-700 dark:text-neutral-300">Customer Support</dt>
                  <dd className="text-neutral-600 dark:text-neutral-400">info@nuklabs.com</dd>
                </div>
              </dl>
            </section>
          </div>
        )}

        {/* Footer Links */}
        <div className="mt-12 pt-6 border-t border-neutral-200 dark:border-neutral-700 flex flex-col sm:flex-row gap-4">
          <Link href="/terms" className="text-blue-600 dark:text-blue-400 hover:underline">
            {language === 'ko' ? '이용약관 보기' : 'Terms of Service'}
          </Link>
          <Link href="/privacy" className="text-blue-600 dark:text-blue-400 hover:underline">
            {language === 'ko' ? '개인정보처리방침 보기' : 'Privacy Policy'}
          </Link>
        </div>
      </div>
    </div>
  );
}
