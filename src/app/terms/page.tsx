import { cookies } from "next/headers";
import Link from "next/link";

type Language = 'ko' | 'en' | 'nl' | 'ru' | 'fr' | 'es' | 'zh' | 'de';

export default function TermsPage({
  searchParams,
}: {
  searchParams?: { lang?: string };
}) {
  const cookieStore = cookies();
  // 우선순위: ?lang= 쿼리 > lang 쿠키 > 한국어.
  // 기본값이 'en' 이면 쿠키 없는 방문자(외부 링크로 바로 들어온 경우)에게 영문이
  // 나간다. 운영 주체가 국내 법인(주식회사 누크랩스)이고 이 페이지는 국내 이용자
  // 대상 법정 고지이므로 한국어가 기본이어야 한다. 앱인토스 심사에 제출하는 URL
  // 처럼 외부에 그대로 노출되는 링크가 영문으로 뜨던 문제(2026-07-30).
  const language = (searchParams?.lang
    || cookieStore.get('lang')?.value
    || 'ko') as Language;

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 py-12 px-4">
      <div className="max-w-3xl mx-auto bg-white dark:bg-neutral-900 rounded-xl shadow-sm p-8">
        <Link
          href="/"
          className="text-blue-600 dark:text-blue-400 hover:underline mb-6 inline-block"
        >
          {language === 'ko' ? '← 홈으로' : '← Back to Home'}
        </Link>

        <h1 className="text-3xl font-bold mb-8">
          {language === 'ko' ? '이용약관' : 'Terms of Service'}
        </h1>

        {language === 'ko' ? (
          <div className="prose prose-neutral max-w-none space-y-6">
            <p className="text-neutral-600 dark:text-neutral-400">
              최종 수정일: 2026년 7월 8일
            </p>

            <section>
              <h2 className="text-xl font-semibold mt-8 mb-4">제1조 (목적)</h2>
              <p>
                이 약관은 주식회사 누크랩스(이하 &quot;회사&quot;)가 운영하는 TapTalk 서비스(이하 &quot;서비스&quot;)의
                이용과 관련하여 회사와 이용자 간의 권리, 의무 및 책임사항을 규정함을 목적으로 합니다.
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
                <li>단어장 자동 생성</li>
                <li>가족 공유 학습 기능</li>
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
              <h2 className="text-xl font-semibold mt-8 mb-4">제4조 (미성년자 이용)</h2>
              <p>
                만 14세 미만의 아동은 법정대리인(부모 등)의 동의 없이 서비스에 가입하거나 유료 서비스를 이용할 수 없습니다.
                만 14세 미만 이용자의 경우 회사는 법정대리인의 동의 여부를 확인할 수 있으며,
                동의가 확인되지 않을 경우 가입 또는 서비스 이용을 제한할 수 있습니다.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mt-8 mb-4">제5조 (유료 서비스)</h2>

              <h3 className="text-lg font-semibold mt-6 mb-2">1. 구독 플랜 구성 및 가격</h3>
              <p>회사는 다음의 유료 구독 플랜을 제공합니다:</p>
              <div className="overflow-x-auto mt-3">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-neutral-100 dark:bg-neutral-800">
                      <th className="border border-neutral-200 dark:border-neutral-700 px-3 py-2 text-left">플랜명</th>
                      <th className="border border-neutral-200 dark:border-neutral-700 px-3 py-2 text-left">이용 기간</th>
                      <th className="border border-neutral-200 dark:border-neutral-700 px-3 py-2 text-left">가격</th>
                      <th className="border border-neutral-200 dark:border-neutral-700 px-3 py-2 text-left">최대 이용 인원</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-neutral-200 dark:border-neutral-700 px-3 py-2">월간 이용권</td>
                      <td className="border border-neutral-200 dark:border-neutral-700 px-3 py-2">30일</td>
                      <td className="border border-neutral-200 dark:border-neutral-700 px-3 py-2">9,900원</td>
                      <td className="border border-neutral-200 dark:border-neutral-700 px-3 py-2">1인</td>
                    </tr>
                    <tr className="bg-neutral-50 dark:bg-neutral-800/50">
                      <td className="border border-neutral-200 dark:border-neutral-700 px-3 py-2">연간 이용권</td>
                      <td className="border border-neutral-200 dark:border-neutral-700 px-3 py-2">365일</td>
                      <td className="border border-neutral-200 dark:border-neutral-700 px-3 py-2">79,000원</td>
                      <td className="border border-neutral-200 dark:border-neutral-700 px-3 py-2">1인</td>
                    </tr>
                    <tr>
                      <td className="border border-neutral-200 dark:border-neutral-700 px-3 py-2">가족 월간 이용권</td>
                      <td className="border border-neutral-200 dark:border-neutral-700 px-3 py-2">30일</td>
                      <td className="border border-neutral-200 dark:border-neutral-700 px-3 py-2">19,900원</td>
                      <td className="border border-neutral-200 dark:border-neutral-700 px-3 py-2">최대 4인</td>
                    </tr>
                    <tr className="bg-neutral-50 dark:bg-neutral-800/50">
                      <td className="border border-neutral-200 dark:border-neutral-700 px-3 py-2">가족 연간 이용권</td>
                      <td className="border border-neutral-200 dark:border-neutral-700 px-3 py-2">365일</td>
                      <td className="border border-neutral-200 dark:border-neutral-700 px-3 py-2">149,000원</td>
                      <td className="border border-neutral-200 dark:border-neutral-700 px-3 py-2">최대 4인</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="mt-3 text-sm text-neutral-600 dark:text-neutral-400">
                위 가격은 부가가치세(VAT) 포함 가격입니다. 결제 통화는 대한민국 원(KRW)이며, 결제는 Toss Payments를 통해 처리됩니다.
              </p>

              <h3 className="text-lg font-semibold mt-6 mb-2">2. 자동 갱신 없음</h3>
              <p>
                TapTalk의 모든 구독 플랜은 <strong>자동으로 갱신되지 않습니다.</strong>
                구독 기간 만료 후에는 서비스 이용이 제한되며, 계속 이용하려면 별도로 재결제하여야 합니다.
                만료 전 재결제하는 경우 이용 기간은 기존 만료일로부터 연장됩니다.
              </p>

              <h3 className="text-lg font-semibold mt-6 mb-2">3. 결제 수단</h3>
              <p>
                신용카드, 체크카드 등 Toss Payments에서 지원하는 결제 수단을 이용할 수 있습니다.
                결제 처리는 Toss Payments(비바리퍼블리카)가 수행하며, 결제 관련 문의는 회사 고객센터로 접수할 수 있습니다.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mt-8 mb-4">제6조 (무료 체험)</h2>
              <ol className="list-decimal pl-6 space-y-2">
                <li>신규 가입 이용자에게는 가입 후 7일간 서비스의 모든 기능을 무료로 이용할 수 있는 체험 기간이 제공됩니다.</li>
                <li>무료 체험은 별도의 결제수단 등록 없이 자동으로 부여됩니다.</li>
                <li>무료 체험 기간 종료 후에는 자동 과금이 발생하지 않으며, 계속 이용하려면 유료 구독을 선택하여야 합니다.</li>
                <li>무료 체험은 계정당 1회에 한하여 제공됩니다.</li>
              </ol>
            </section>

            <section>
              <h2 className="text-xl font-semibold mt-8 mb-4">제7조 (청약철회 및 환불)</h2>

              <h3 className="text-lg font-semibold mt-6 mb-2">1. 청약철회 (전자상거래법 기준)</h3>
              <p>
                이용자는 결제일로부터 7일 이내에, 서비스를 이용하지 않았거나 경미하게 이용한 경우에 한하여
                청약을 철회하고 전액 환불을 받을 수 있습니다.
                단, 콘텐츠를 상당 부분 이용한 경우(예: 다수의 AI 대화 세션 진행, 학습 기록 생성 등)에는
                전자상거래 등에서의 소비자보호에 관한 법률 제17조 제2항에 따라 청약철회가 제한될 수 있습니다.
              </p>

              <h3 className="text-lg font-semibold mt-6 mb-2">2. 기간 만료 전 중도 환불</h3>
              <p>
                결제일로부터 7일이 경과하거나 서비스를 상당 부분 이용한 후에는
                콘텐츠산업 진흥법 시행령 제33조 기준에 따라 잔여 기간에 대한 일할 계산 환불을 제공합니다.
              </p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li>환불 금액 = 결제금액 × (잔여 일수 ÷ 전체 이용 일수)</li>
                <li>단, 결제 수수료 등 실비가 발생한 경우 이를 차감할 수 있습니다.</li>
              </ul>

              <h3 className="text-lg font-semibold mt-6 mb-2">3. 환불 불가 사유</h3>
              <ul className="list-disc pl-6 space-y-1">
                <li>무료 체험 기간 중 발생한 이용 내역</li>
                <li>이용자의 귀책사유로 서비스 이용이 불가능해진 경우</li>
                <li>이 약관에서 정한 이용 제한 사유에 해당하는 경우</li>
              </ul>

              <h3 className="text-lg font-semibold mt-6 mb-2">4. 환불 신청 방법 및 처리 기간</h3>
              <p>
                환불 신청은 고객센터 이메일(info@nuklabs.com)로 접수하여야 합니다.
                신청 시 결제 계정 이메일, 결제 일자, 주문번호, 환불 사유를 함께 기재하여 주세요.
                접수 후 영업일 기준 3일 이내에 처리되며, 실제 환불 반영은 카드사에 따라 추가 영업일이 소요될 수 있습니다.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mt-8 mb-4">제8조 (가족 플랜)</h2>
              <ol className="list-decimal pl-6 space-y-2">
                <li>가족 플랜은 결제자 본인 1인과 구성원 최대 3인, 합계 최대 4인이 함께 이용할 수 있습니다.</li>
                <li>구성원의 서비스 이용 자격은 결제자의 구독 기간에 종속됩니다. 결제자의 구독이 만료되거나 계정이 정지되면 구성원의 이용도 함께 제한됩니다.</li>
                <li>구성원 초대 및 관리는 결제자 계정에서 수행합니다.</li>
                <li>구성원은 각자 독립된 계정과 학습 기록을 보유하며, 결제자는 구성원의 학습 현황을 확인할 수 있습니다.</li>
                <li>구성원 탈퇴 또는 초대 취소로 인해 남은 이용 기간에 대한 환불은 제공되지 않습니다.</li>
              </ol>
            </section>

            <section>
              <h2 className="text-xl font-semibold mt-8 mb-4">제9조 (서비스 이용 제한)</h2>
              <p>
                회사는 이용자가 본 약관을 위반하거나 서비스의 정상적인 운영을
                방해한 경우, 서비스 이용을 제한하거나 계정을 삭제할 수 있습니다.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mt-8 mb-4">제10조 (면책조항)</h2>
              <ul className="list-disc pl-6 space-y-1">
                <li>AI가 제공하는 교정 및 피드백은 참고용이며, 완벽한 정확성을 보장하지 않습니다.</li>
                <li>서비스 이용 중 발생하는 기술적 문제에 대해 회사의 고의 또는 중과실이 없는 한 책임지지 않습니다.</li>
                <li>천재지변, 전쟁, 통신망 장애 등 불가항력적 사유로 인한 서비스 중단에 대해 책임지지 않습니다.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mt-8 mb-4">제11조 (분쟁 해결)</h2>
              <p>
                서비스 이용과 관련된 분쟁은 대한민국 법률에 따라 해결하며,
                관할 법원은 회사 소재지(경기도 화성시)를 관할하는 법원으로 합니다.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mt-8 mb-4">제12조 (약관 변경)</h2>
              <p>
                회사는 필요한 경우 약관을 변경할 수 있으며, 변경된 약관은
                시행일 7일 전부터 서비스 내 공지 또는 이메일을 통해 안내합니다.
                이용자가 변경된 약관에 동의하지 않을 경우 서비스 이용을 중단하고 탈퇴할 수 있습니다.
              </p>
            </section>

            {/* 사업자 정보 */}
            <section className="mt-12 pt-6 border-t border-neutral-200 dark:border-neutral-700">
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
                  <dt className="font-semibold text-neutral-700 dark:text-neutral-300">고객센터 이메일</dt>
                  <dd className="text-neutral-600 dark:text-neutral-400">info@nuklabs.com</dd>
                </div>
              </dl>
            </section>
          </div>
        ) : (
          <div className="prose prose-neutral max-w-none space-y-6">
            <p className="text-neutral-600 dark:text-neutral-400">
              Last updated: July 8, 2026
            </p>

            <section>
              <h2 className="text-xl font-semibold mt-8 mb-4">1. Acceptance of Terms</h2>
              <p>
                By accessing and using TapTalk (&quot;Service&quot;) operated by NUKLABS Co., Ltd. (&quot;Company&quot;),
                you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the Service.
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
                <li>Automatic vocabulary generation</li>
                <li>Family shared learning features</li>
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
              <h2 className="text-xl font-semibold mt-8 mb-4">4. Minors</h2>
              <p>
                Users under 14 years of age may not register for or use paid services without consent from a legal guardian.
                The Company may verify guardian consent and may restrict access where consent cannot be confirmed.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mt-8 mb-4">5. Paid Services</h2>

              <h3 className="text-lg font-semibold mt-6 mb-2">5.1 Subscription Plans and Pricing</h3>
              <div className="overflow-x-auto mt-3">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-neutral-100 dark:bg-neutral-800">
                      <th className="border border-neutral-200 dark:border-neutral-700 px-3 py-2 text-left">Plan</th>
                      <th className="border border-neutral-200 dark:border-neutral-700 px-3 py-2 text-left">Duration</th>
                      <th className="border border-neutral-200 dark:border-neutral-700 px-3 py-2 text-left">Price (KRW, VAT incl.)</th>
                      <th className="border border-neutral-200 dark:border-neutral-700 px-3 py-2 text-left">Users</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-neutral-200 dark:border-neutral-700 px-3 py-2">Monthly</td>
                      <td className="border border-neutral-200 dark:border-neutral-700 px-3 py-2">30 days</td>
                      <td className="border border-neutral-200 dark:border-neutral-700 px-3 py-2">₩9,900</td>
                      <td className="border border-neutral-200 dark:border-neutral-700 px-3 py-2">1</td>
                    </tr>
                    <tr className="bg-neutral-50 dark:bg-neutral-800/50">
                      <td className="border border-neutral-200 dark:border-neutral-700 px-3 py-2">Yearly</td>
                      <td className="border border-neutral-200 dark:border-neutral-700 px-3 py-2">365 days</td>
                      <td className="border border-neutral-200 dark:border-neutral-700 px-3 py-2">₩79,000</td>
                      <td className="border border-neutral-200 dark:border-neutral-700 px-3 py-2">1</td>
                    </tr>
                    <tr>
                      <td className="border border-neutral-200 dark:border-neutral-700 px-3 py-2">Family Monthly</td>
                      <td className="border border-neutral-200 dark:border-neutral-700 px-3 py-2">30 days</td>
                      <td className="border border-neutral-200 dark:border-neutral-700 px-3 py-2">₩19,900</td>
                      <td className="border border-neutral-200 dark:border-neutral-700 px-3 py-2">Up to 4</td>
                    </tr>
                    <tr className="bg-neutral-50 dark:bg-neutral-800/50">
                      <td className="border border-neutral-200 dark:border-neutral-700 px-3 py-2">Family Yearly</td>
                      <td className="border border-neutral-200 dark:border-neutral-700 px-3 py-2">365 days</td>
                      <td className="border border-neutral-200 dark:border-neutral-700 px-3 py-2">₩149,000</td>
                      <td className="border border-neutral-200 dark:border-neutral-700 px-3 py-2">Up to 4</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <h3 className="text-lg font-semibold mt-6 mb-2">5.2 No Auto-Renewal</h3>
              <p>
                <strong>All TapTalk subscription plans do not auto-renew.</strong> When your subscription expires,
                access is restricted and you must manually purchase a new subscription to continue using the Service.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mt-8 mb-4">6. Free Trial</h2>
              <ol className="list-decimal pl-6 space-y-2">
                <li>New users receive a 7-day free trial with full access to all features upon registration.</li>
                <li>No payment method is required to start the free trial.</li>
                <li>After the trial ends, no charges are applied automatically. You must select a paid plan to continue.</li>
                <li>The free trial is available once per account.</li>
              </ol>
            </section>

            <section>
              <h2 className="text-xl font-semibold mt-8 mb-4">7. Cancellation and Refunds</h2>

              <h3 className="text-lg font-semibold mt-6 mb-2">7.1 Right of Withdrawal (within 7 days)</h3>
              <p>
                You may withdraw your purchase and receive a full refund within 7 days of payment if you have not used
                or have only minimally used the Service. If substantial use has occurred (e.g., multiple AI conversation
                sessions, creation of learning records), withdrawal may be limited under applicable consumer protection law.
              </p>

              <h3 className="text-lg font-semibold mt-6 mb-2">7.2 Pro-rata Refunds</h3>
              <p>
                After 7 days or after substantial use, refunds are calculated on a pro-rata basis:
              </p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li>Refund = Amount paid × (Remaining days ÷ Total subscription days)</li>
                <li>Actual processing fees may be deducted where applicable.</li>
              </ul>

              <h3 className="text-lg font-semibold mt-6 mb-2">7.3 How to Request a Refund</h3>
              <p>
                Contact customer support at info@nuklabs.com with your account email, payment date,
                order number, and reason. Refunds are processed within 3 business days of receipt.
                Additional time may be required by your card issuer.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mt-8 mb-4">8. Family Plan</h2>
              <ol className="list-decimal pl-6 space-y-2">
                <li>The Family Plan allows the account owner plus up to 3 additional members (maximum 4 users total).</li>
                <li>Members&apos; access is tied to the owner&apos;s subscription. If the owner&apos;s subscription expires or is suspended, members lose access.</li>
                <li>Member management is performed from the owner&apos;s account.</li>
                <li>Each member has an independent account and learning records; the owner can view members&apos; learning progress.</li>
                <li>No refund is provided for remaining subscription time when a member leaves or is removed.</li>
              </ol>
            </section>

            <section>
              <h2 className="text-xl font-semibold mt-8 mb-4">9. Account Termination</h2>
              <p>
                We reserve the right to suspend or terminate your account if you violate
                these Terms of Service or engage in activities that disrupt the Service.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mt-8 mb-4">10. Disclaimer</h2>
              <ul className="list-disc pl-6 space-y-1">
                <li>AI-generated corrections and feedback are for reference only and may not be 100% accurate.</li>
                <li>We are not liable for technical issues absent gross negligence on our part.</li>
                <li>We are not responsible for Service interruptions due to force majeure events.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mt-8 mb-4">11. Governing Law</h2>
              <p>
                These Terms shall be governed by the laws of the Republic of Korea.
                Disputes shall be resolved in the court with jurisdiction over the Company&apos;s registered address.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mt-8 mb-4">12. Changes to Terms</h2>
              <p>
                We may update these Terms. Changes will be announced at least 7 days before taking effect
                via in-app notice or email. Continued use after the effective date constitutes acceptance.
              </p>
            </section>

            {/* Business Information */}
            <section className="mt-12 pt-6 border-t border-neutral-200 dark:border-neutral-700">
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

        <div className="mt-12 pt-6 border-t border-neutral-200 dark:border-neutral-700">
          <Link href="/privacy" className="text-blue-600 dark:text-blue-400 hover:underline">
            {language === 'ko' ? '개인정보처리방침 보기' : 'View Privacy Policy'}
          </Link>
        </div>
      </div>
    </div>
  );
}
