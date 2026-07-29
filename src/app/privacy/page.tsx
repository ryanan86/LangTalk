import { cookies } from "next/headers";
import Link from "next/link";

type Language = 'ko' | 'en' | 'nl' | 'ru' | 'fr' | 'es' | 'zh' | 'de';

export default function PrivacyPage({
  searchParams,
}: {
  searchParams?: { lang?: string };
}) {
  const cookieStore = cookies();
  // 우선순위: ?lang= 쿼리 > lang 쿠키 > 한국어. 사유는 terms/page.tsx 주석 참조
  // (외부 링크로 바로 들어온 방문자에게 영문 법정 고지가 나가던 문제).
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
          {language === 'ko' ? '개인정보처리방침' : 'Privacy Policy'}
        </h1>

        {language === 'ko' ? (
          <div className="prose prose-neutral max-w-none space-y-6">
            <p className="text-neutral-600 dark:text-neutral-400">
              최종 수정일: 2026년 7월 8일
            </p>
            <p>
              주식회사 누크랩스(이하 &quot;회사&quot;)는 TapTalk 서비스(이하 &quot;서비스&quot;) 운영과 관련하여
              개인정보보호법, 정보통신망 이용촉진 및 정보보호 등에 관한 법률 등 관련 법령을 준수하며,
              이용자의 개인정보를 다음과 같이 처리합니다.
            </p>

            <section>
              <h2 className="text-xl font-semibold mt-8 mb-4">1. 수집하는 개인정보</h2>
              <p>TapTalk은 서비스 제공을 위해 다음 정보를 수집합니다:</p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li><strong>계정 정보:</strong> 이메일 주소, 이름, 프로필 사진 (소셜 로그인 시 제공되는 정보)</li>
                <li><strong>학습 정보:</strong> 생년, 학습 세션 기록, AI 대화 전사(轉寫) 텍스트, 교정 내역</li>
                <li><strong>음성 데이터:</strong> 영어 연습 중 녹음된 음성 — 처리 방식은 아래 제2조 참조</li>
                <li><strong>결제 정보:</strong> 결제 수단 종류, 결제 금액, 주문번호 (카드번호 등 민감 정보는 Toss Payments가 직접 처리하며 회사는 보관하지 않음)</li>
                <li><strong>이용 기록:</strong> 접속 시간, 기기 정보, 브라우저 정보, 서비스 이용 기록</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mt-8 mb-4">2. 음성 데이터 처리</h2>
              <p>
                서비스는 이용자가 말하는 영어 음성을 AI 음성인식(STT, Speech-to-Text) 기술을 통해
                텍스트로 변환하여 대화 및 학습 기록에 활용합니다.
              </p>
              <ul className="list-disc pl-6 mt-3 space-y-2">
                <li>
                  <strong>원본 음성 저장 없음:</strong> 원본 음성 파일은 회사 서버에 저장되지 않습니다.
                  음성은 실시간으로 처리된 후 즉시 파기되며, 전사(轉寫)된 텍스트만 학습 기록으로 저장됩니다.
                </li>
                <li>
                  <strong>실시간 스트리밍 처리(Deepgram):</strong> 기본적으로 이용자의 음성은
                  임시 인증 토큰을 통해 Deepgram 서버에 실시간 스트리밍으로 전송되어 텍스트로 변환됩니다.
                  이 과정에서 원본 음성은 회사 서버를 경유하지 않습니다.
                </li>
                <li>
                  <strong>대체 처리(OpenAI Whisper):</strong> 실시간 스트리밍이 불가한 환경에서는
                  음성이 일시적으로 회사 API 서버를 통해 OpenAI Whisper 서비스로 전달되어 처리됩니다.
                  이 경우에도 원본 음성은 회사 서버에 저장되지 않으며, 처리 후 즉시 파기됩니다.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mt-8 mb-4">3. 개인정보 이용 목적</h2>
              <ul className="list-disc pl-6 space-y-1">
                <li>서비스 제공 및 계정 관리</li>
                <li>맞춤형 학습 경험 제공</li>
                <li>학습 진도 추적 및 분석</li>
                <li>서비스 개선 및 신규 기능 개발</li>
                <li>고객 지원 및 문의 응대</li>
                <li>결제 처리 및 환불 관리</li>
                <li>법령 준수 및 분쟁 해결</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mt-8 mb-4">4. 개인정보 보관 기간</h2>
              <ul className="list-disc pl-6 space-y-1">
                <li>계정 정보: 회원 탈퇴 시까지</li>
                <li>학습 기록(대화 전사 텍스트 포함): 계정 삭제 후 30일 이내 삭제</li>
                <li>원본 음성 데이터: 처리 즉시 파기 (서버에 저장하지 않음)</li>
                <li>결제 기록: 전자상거래법에 따라 5년간 보관</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mt-8 mb-4">5. 개인정보 처리 위탁 및 국외 이전</h2>
              <p>
                TapTalk은 서비스 운영을 위해 다음의 외부 서비스에 개인정보 처리를 위탁하며,
                일부 수탁사는 국외에 서버를 운영합니다. 이에 따라 개인정보가 국외로 이전될 수 있습니다.
              </p>
              <div className="overflow-x-auto mt-3">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-neutral-100 dark:bg-neutral-800">
                      <th className="border border-neutral-200 dark:border-neutral-700 px-3 py-2 text-left">수탁사</th>
                      <th className="border border-neutral-200 dark:border-neutral-700 px-3 py-2 text-left">이전 국가</th>
                      <th className="border border-neutral-200 dark:border-neutral-700 px-3 py-2 text-left">처리 목적</th>
                      <th className="border border-neutral-200 dark:border-neutral-700 px-3 py-2 text-left">이전 항목</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-neutral-200 dark:border-neutral-700 px-3 py-2">Google (OAuth)</td>
                      <td className="border border-neutral-200 dark:border-neutral-700 px-3 py-2">미국</td>
                      <td className="border border-neutral-200 dark:border-neutral-700 px-3 py-2">소셜 로그인 인증</td>
                      <td className="border border-neutral-200 dark:border-neutral-700 px-3 py-2">이메일, 이름, 프로필 사진</td>
                    </tr>
                    <tr className="bg-neutral-50 dark:bg-neutral-800/50">
                      <td className="border border-neutral-200 dark:border-neutral-700 px-3 py-2">Anthropic</td>
                      <td className="border border-neutral-200 dark:border-neutral-700 px-3 py-2">미국</td>
                      <td className="border border-neutral-200 dark:border-neutral-700 px-3 py-2">AI 대화 처리 (Claude)</td>
                      <td className="border border-neutral-200 dark:border-neutral-700 px-3 py-2">대화 텍스트</td>
                    </tr>
                    <tr>
                      <td className="border border-neutral-200 dark:border-neutral-700 px-3 py-2">OpenAI</td>
                      <td className="border border-neutral-200 dark:border-neutral-700 px-3 py-2">미국</td>
                      <td className="border border-neutral-200 dark:border-neutral-700 px-3 py-2">AI 대화 처리, STT(음성인식) 대체 처리</td>
                      <td className="border border-neutral-200 dark:border-neutral-700 px-3 py-2">대화 텍스트, 음성 데이터(일시적)</td>
                    </tr>
                    <tr className="bg-neutral-50 dark:bg-neutral-800/50">
                      <td className="border border-neutral-200 dark:border-neutral-700 px-3 py-2">Deepgram</td>
                      <td className="border border-neutral-200 dark:border-neutral-700 px-3 py-2">미국</td>
                      <td className="border border-neutral-200 dark:border-neutral-700 px-3 py-2">실시간 음성인식(STT)</td>
                      <td className="border border-neutral-200 dark:border-neutral-700 px-3 py-2">음성 데이터(실시간, 저장 안 함)</td>
                    </tr>
                    <tr>
                      <td className="border border-neutral-200 dark:border-neutral-700 px-3 py-2">ElevenLabs</td>
                      <td className="border border-neutral-200 dark:border-neutral-700 px-3 py-2">미국</td>
                      <td className="border border-neutral-200 dark:border-neutral-700 px-3 py-2">AI 음성 합성(TTS)</td>
                      <td className="border border-neutral-200 dark:border-neutral-700 px-3 py-2">대화 텍스트</td>
                    </tr>
                    <tr className="bg-neutral-50 dark:bg-neutral-800/50">
                      <td className="border border-neutral-200 dark:border-neutral-700 px-3 py-2">Toss Payments (비바리퍼블리카)</td>
                      <td className="border border-neutral-200 dark:border-neutral-700 px-3 py-2">대한민국</td>
                      <td className="border border-neutral-200 dark:border-neutral-700 px-3 py-2">결제 처리</td>
                      <td className="border border-neutral-200 dark:border-neutral-700 px-3 py-2">결제 정보</td>
                    </tr>
                    <tr>
                      <td className="border border-neutral-200 dark:border-neutral-700 px-3 py-2">Supabase</td>
                      <td className="border border-neutral-200 dark:border-neutral-700 px-3 py-2">대한민국 (서울 리전)</td>
                      <td className="border border-neutral-200 dark:border-neutral-700 px-3 py-2">데이터베이스 (계정, 학습 기록 저장)</td>
                      <td className="border border-neutral-200 dark:border-neutral-700 px-3 py-2">계정 정보, 학습 기록</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="mt-3 text-sm text-neutral-600 dark:text-neutral-400">
                각 수탁사의 개인정보 보호 정책은 해당 업체 웹사이트에서 확인할 수 있습니다.
                국외 이전되는 개인정보는 해당 국가의 개인정보 보호 법령 및 수탁사의 보안 정책에 따라 보호됩니다.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mt-8 mb-4">6. 개인정보 제3자 제공</h2>
              <p>TapTalk은 다음의 경우를 제외하고 개인정보를 제3자에게 제공하지 않습니다:</p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li>이용자의 동의가 있는 경우</li>
                <li>법령에 의해 요구되는 경우</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mt-8 mb-4">7. 이용자의 권리</h2>
              <p>이용자는 다음의 권리를 행사할 수 있습니다:</p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li>개인정보 열람, 수정, 삭제 요청</li>
                <li>개인정보 처리 정지 요청</li>
                <li>계정 삭제 요청</li>
              </ul>
              <p className="mt-2">
                권리 행사를 원하시면 info@nuklabs.com으로 문의해 주세요.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mt-8 mb-4">8. 쿠키 사용</h2>
              <p>
                TapTalk은 서비스 이용 편의를 위해 쿠키를 사용합니다.
                쿠키는 언어 설정, 로그인 상태 유지 등에 사용됩니다.
                브라우저 설정에서 쿠키를 비활성화할 수 있으나, 일부 기능이 제한될 수 있습니다.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mt-8 mb-4">9. 개인정보 보호</h2>
              <p>TapTalk은 개인정보 보호를 위해 다음 조치를 취합니다:</p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li>SSL/TLS 암호화 통신</li>
                <li>접근 권한 제한</li>
                <li>정기적인 보안 점검</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mt-8 mb-4">10. 아동의 개인정보</h2>
              <p>
                TapTalk은 만 14세 미만 아동의 경우 법정대리인의 동의를 받아 서비스를 제공합니다.
                아동의 개인정보는 더욱 신중하게 처리되며, 필요 최소한의 정보만 수집합니다.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mt-8 mb-4">11. 개인정보 보호책임자</h2>
              <p>
                개인정보 처리에 관한 업무를 총괄하고 이용자의 개인정보 관련 불만 처리 및 피해구제를 위해
                아래와 같이 개인정보 보호책임자를 지정하고 있습니다.
              </p>
              <ul className="list-none pl-0 mt-2 space-y-1 text-sm">
                <li>성명: 이지응</li>
                <li>이메일: info@nuklabs.com</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mt-8 mb-4">12. 방침 변경</h2>
              <p>
                본 개인정보처리방침은 변경될 수 있으며, 변경 시 시행일 7일 전에 서비스 내 공지를 통해 안내합니다.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mt-8 mb-4">13. 문의처</h2>
              <p>
                개인정보 관련 문의: info@nuklabs.com
              </p>
            </section>
          </div>
        ) : (
          <div className="prose prose-neutral max-w-none space-y-6">
            <p className="text-neutral-600 dark:text-neutral-400">
              Last updated: July 8, 2026
            </p>
            <p>
              NUKLABS Co., Ltd. (&quot;Company&quot;) operates TapTalk (&quot;Service&quot;) and is committed to protecting
              your personal information in accordance with applicable laws.
            </p>

            <section>
              <h2 className="text-xl font-semibold mt-8 mb-4">1. Information We Collect</h2>
              <p>TapTalk collects the following information to provide our services:</p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li><strong>Account Information:</strong> Email address, name, profile picture (via social sign-in)</li>
                <li><strong>Learning Information:</strong> Birth year, session history, AI conversation transcripts, correction records</li>
                <li><strong>Voice Data:</strong> Audio recordings during practice — see Section 2 for processing details</li>
                <li><strong>Payment Information:</strong> Payment method type, amount, order number (sensitive card data is handled exclusively by Toss Payments)</li>
                <li><strong>Usage Data:</strong> Access times, device information, browser information, service usage logs</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mt-8 mb-4">2. Voice Data Processing</h2>
              <p>
                The Service converts your spoken English into text using AI speech recognition (STT) technology
                for conversation and learning record purposes.
              </p>
              <ul className="list-disc pl-6 mt-3 space-y-2">
                <li>
                  <strong>No raw audio storage:</strong> Original audio files are not stored on Company servers.
                  Audio is processed in real time and immediately discarded; only the resulting text transcript
                  is retained as a learning record.
                </li>
                <li>
                  <strong>Real-time streaming (Deepgram):</strong> By default, your voice is streamed in real time
                  to Deepgram via a temporary scoped token and converted to text. The raw audio does not pass
                  through Company servers.
                </li>
                <li>
                  <strong>Fallback processing (OpenAI Whisper):</strong> When real-time streaming is unavailable,
                  audio is transmitted through the Company&apos;s API server to OpenAI Whisper for transcription.
                  In this case the audio is not stored on Company servers and is discarded immediately after processing.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mt-8 mb-4">3. How We Use Your Information</h2>
              <ul className="list-disc pl-6 space-y-1">
                <li>Provide and manage services</li>
                <li>Deliver personalized learning experiences</li>
                <li>Track and analyze learning progress</li>
                <li>Improve services and develop new features</li>
                <li>Customer support</li>
                <li>Payment processing and refund management</li>
                <li>Legal compliance and dispute resolution</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mt-8 mb-4">4. Data Retention</h2>
              <ul className="list-disc pl-6 space-y-1">
                <li>Account information: Until account deletion</li>
                <li>Learning records (including transcripts): Deleted within 30 days of account deletion</li>
                <li>Raw voice data: Discarded immediately after processing (not stored on servers)</li>
                <li>Payment records: Retained for 5 years as required by Korean e-commerce law</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mt-8 mb-4">5. Third-Party Processors and Cross-Border Transfers</h2>
              <p>
                TapTalk uses the following third-party services for processing. Some of these processors
                operate outside the Republic of Korea, resulting in cross-border transfer of personal data.
              </p>
              <div className="overflow-x-auto mt-3">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-neutral-100 dark:bg-neutral-800">
                      <th className="border border-neutral-200 dark:border-neutral-700 px-3 py-2 text-left">Provider</th>
                      <th className="border border-neutral-200 dark:border-neutral-700 px-3 py-2 text-left">Country</th>
                      <th className="border border-neutral-200 dark:border-neutral-700 px-3 py-2 text-left">Purpose</th>
                      <th className="border border-neutral-200 dark:border-neutral-700 px-3 py-2 text-left">Data transferred</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-neutral-200 dark:border-neutral-700 px-3 py-2">Google (OAuth)</td>
                      <td className="border border-neutral-200 dark:border-neutral-700 px-3 py-2">USA</td>
                      <td className="border border-neutral-200 dark:border-neutral-700 px-3 py-2">Social sign-in</td>
                      <td className="border border-neutral-200 dark:border-neutral-700 px-3 py-2">Email, name, profile picture</td>
                    </tr>
                    <tr className="bg-neutral-50 dark:bg-neutral-800/50">
                      <td className="border border-neutral-200 dark:border-neutral-700 px-3 py-2">Anthropic</td>
                      <td className="border border-neutral-200 dark:border-neutral-700 px-3 py-2">USA</td>
                      <td className="border border-neutral-200 dark:border-neutral-700 px-3 py-2">AI conversation (Claude)</td>
                      <td className="border border-neutral-200 dark:border-neutral-700 px-3 py-2">Conversation text</td>
                    </tr>
                    <tr>
                      <td className="border border-neutral-200 dark:border-neutral-700 px-3 py-2">OpenAI</td>
                      <td className="border border-neutral-200 dark:border-neutral-700 px-3 py-2">USA</td>
                      <td className="border border-neutral-200 dark:border-neutral-700 px-3 py-2">AI conversation, STT fallback</td>
                      <td className="border border-neutral-200 dark:border-neutral-700 px-3 py-2">Conversation text, voice data (transient)</td>
                    </tr>
                    <tr className="bg-neutral-50 dark:bg-neutral-800/50">
                      <td className="border border-neutral-200 dark:border-neutral-700 px-3 py-2">Deepgram</td>
                      <td className="border border-neutral-200 dark:border-neutral-700 px-3 py-2">USA</td>
                      <td className="border border-neutral-200 dark:border-neutral-700 px-3 py-2">Real-time STT</td>
                      <td className="border border-neutral-200 dark:border-neutral-700 px-3 py-2">Voice data (real-time, not stored)</td>
                    </tr>
                    <tr>
                      <td className="border border-neutral-200 dark:border-neutral-700 px-3 py-2">ElevenLabs</td>
                      <td className="border border-neutral-200 dark:border-neutral-700 px-3 py-2">USA</td>
                      <td className="border border-neutral-200 dark:border-neutral-700 px-3 py-2">AI voice synthesis (TTS)</td>
                      <td className="border border-neutral-200 dark:border-neutral-700 px-3 py-2">Conversation text</td>
                    </tr>
                    <tr className="bg-neutral-50 dark:bg-neutral-800/50">
                      <td className="border border-neutral-200 dark:border-neutral-700 px-3 py-2">Toss Payments</td>
                      <td className="border border-neutral-200 dark:border-neutral-700 px-3 py-2">Republic of Korea</td>
                      <td className="border border-neutral-200 dark:border-neutral-700 px-3 py-2">Payment processing</td>
                      <td className="border border-neutral-200 dark:border-neutral-700 px-3 py-2">Payment information</td>
                    </tr>
                    <tr>
                      <td className="border border-neutral-200 dark:border-neutral-700 px-3 py-2">Supabase</td>
                      <td className="border border-neutral-200 dark:border-neutral-700 px-3 py-2">Republic of Korea (Seoul)</td>
                      <td className="border border-neutral-200 dark:border-neutral-700 px-3 py-2">Database (accounts, learning records)</td>
                      <td className="border border-neutral-200 dark:border-neutral-700 px-3 py-2">Account info, learning records</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold mt-8 mb-4">6. Information Sharing</h2>
              <p>TapTalk does not share your personal information with third parties except:</p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li>With your consent</li>
                <li>When required by law</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mt-8 mb-4">7. Your Rights</h2>
              <p>You have the right to:</p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li>Access, modify, or delete your personal information</li>
                <li>Request cessation of data processing</li>
                <li>Request account deletion</li>
              </ul>
              <p className="mt-2">
                To exercise these rights, contact us at info@nuklabs.com
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mt-8 mb-4">8. Cookies</h2>
              <p>
                TapTalk uses cookies to enhance your experience. Cookies are used for
                language preferences, maintaining login status, and analytics.
                You can disable cookies in your browser settings, but some features may be limited.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mt-8 mb-4">9. Data Security</h2>
              <p>We protect your information through:</p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li>SSL/TLS encrypted communications</li>
                <li>Access restrictions</li>
                <li>Regular security audits</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mt-8 mb-4">10. Children&apos;s Privacy</h2>
              <p>
                For users under 14, we require parental or guardian consent.
                We take extra care with children&apos;s data and collect only the minimum necessary information.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mt-8 mb-4">11. Privacy Officer</h2>
              <ul className="list-none pl-0 mt-2 space-y-1 text-sm">
                <li>Name: Lee Ji-eung (이지응)</li>
                <li>Email: info@nuklabs.com</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mt-8 mb-4">12. Changes to This Policy</h2>
              <p>
                We may update this Privacy Policy. Changes will be announced at least 7 days before
                they take effect through the Service.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mt-8 mb-4">13. Contact Us</h2>
              <p>
                For privacy inquiries: info@nuklabs.com
              </p>
            </section>
          </div>
        )}

        <div className="mt-12 pt-6 border-t border-neutral-200 dark:border-neutral-700">
          <Link href="/terms" className="text-blue-600 dark:text-blue-400 hover:underline">
            {language === 'ko' ? '이용약관 보기' : 'View Terms of Service'}
          </Link>
        </div>
      </div>
    </div>
  );
}
