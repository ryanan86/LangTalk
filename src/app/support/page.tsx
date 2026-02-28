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
          {language === 'ko' ? '\u2190 \ud648\uc73c\ub85c' : '\u2190 Back to Home'}
        </Link>

        {/* App Header */}
        <div className="flex items-center gap-4 mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-2xl font-bold shadow-md">
            T
          </div>
          <div>
            <h1 className="text-3xl font-bold">
              {language === 'ko' ? 'TapTalk \uace0\uac1d\uc9c0\uc6d0' : 'TapTalk Support'}
            </h1>
            <p className="text-neutral-500 dark:text-neutral-400 text-sm mt-1">
              {language === 'ko'
                ? 'AI \uc601\uc5b4 \ud68c\ud654 \uc5f0\uc2b5 \uc571'
                : 'AI English Conversation Practice'}
            </p>
          </div>
        </div>

        {language === 'ko' ? (
          <div className="prose prose-neutral max-w-none space-y-6">
            {/* Contact Section */}
            <section className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-3">\ub3c4\uc6c0\uc774 \ud544\uc694\ud558\uc2e0\uac00\uc694?</h2>
              <p>
                \uc544\ub798 \uc774\uba54\uc77c\ub85c \ubb38\uc758\ud574 \uc8fc\uc138\uc694. \uc601\uc5c5\uc77c \uae30\uc900 24\uc2dc\uac04 \uc774\ub0b4\uc5d0 \ub2f5\ubcc0\ub4dc\ub9bd\ub2c8\ub2e4.
              </p>
              <a
                href="mailto:support@taptalk.xyz"
                className="inline-block mt-3 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium no-underline"
              >
                support@taptalk.xyz
              </a>
              <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-3">
                \uc751\ub2f5 \uc2dc\uac04: \uc601\uc5c5\uc77c \uae30\uc900 24\uc2dc\uac04 \uc774\ub0b4
              </p>
            </section>

            {/* FAQ Section */}
            <section>
              <h2 className="text-xl font-semibold mt-8 mb-4">\uc790\uc8fc \ubb3b\ub294 \uc9c8\ubb38 (FAQ)</h2>

              <div className="space-y-6">
                <div>
                  <h3 className="font-semibold text-lg mb-2">Q. TapTalk\uc740 \uc5b4\ub5bb\uac8c \uc0ac\uc6a9\ud558\ub098\uc694?</h3>
                  <p className="text-neutral-700 dark:text-neutral-300">
                    \ub85c\uadf8\uc778 \ud6c4 AI \ud29c\ud130\ub97c \uc120\ud0dd\ud558\uace0 \ub300\ud654\ub97c \uc2dc\uc791\ud558\uba74 \ub429\ub2c8\ub2e4.
                    \ud14d\uc2a4\ud2b8 \ub610\ub294 \uc74c\uc131\uc73c\ub85c \uc601\uc5b4 \ud68c\ud654\ub97c \uc5f0\uc2b5\ud560 \uc218 \uc788\uc73c\uba70,
                    AI\uac00 \uc2e4\uc2dc\uac04\uc73c\ub85c \ubb38\ubc95\uacfc \ud45c\ud604\uc744 \uad50\uc815\ud574 \uc90d\ub2c8\ub2e4.
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold text-lg mb-2">Q. \uacc4\uc815\uc744 \uc0ad\uc81c\ud558\uace0 \uc2f6\uc5b4\uc694.</h3>
                  <p className="text-neutral-700 dark:text-neutral-300">
                    \uc571 \ub0b4 \ud504\ub85c\ud544 &gt; \uacc4\uc815 \uc124\uc815\uc5d0\uc11c \uacc4\uc815 \uc0ad\uc81c\ub97c \uc9c4\ud589\ud560 \uc218 \uc788\uc2b5\ub2c8\ub2e4.
                    \ub610\ub294 support@taptalk.xyz\ub85c \uacc4\uc815 \uc0ad\uc81c\ub97c \uc694\uccad\ud574 \uc8fc\uc138\uc694.
                    \uc0ad\uc81c \ud6c4 30\uc77c \uc774\ub0b4\uc5d0 \ubaa8\ub4e0 \ub370\uc774\ud130\uac00 \uc601\uad6c \uc0ad\uc81c\ub429\ub2c8\ub2e4.
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold text-lg mb-2">Q. \uad6c\ub3c5\uc744 \ud574\uc9c0\ud558\uace0 \uc2f6\uc5b4\uc694.</h3>
                  <p className="text-neutral-700 dark:text-neutral-300">
                    iOS\uc758 \uacbd\uc6b0 \uc124\uc815 &gt; Apple ID &gt; \uad6c\ub3c5\uc5d0\uc11c TapTalk \uad6c\ub3c5\uc744 \ud574\uc9c0\ud560 \uc218 \uc788\uc2b5\ub2c8\ub2e4.
                    \ud574\uc9c0 \ud6c4\uc5d0\ub3c4 \ud604\uc7ac \uad6c\ub3c5 \uae30\uac04\uc774 \ub05d\ub0a0 \ub54c\uae4c\uc9c0 \uc11c\ube44\uc2a4\ub97c \uc774\uc6a9\ud560 \uc218 \uc788\uc2b5\ub2c8\ub2e4.
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold text-lg mb-2">Q. \ub9c8\uc774\ud06c\uac00 \uc791\ub3d9\ud558\uc9c0 \uc54a\uc544\uc694.</h3>
                  <p className="text-neutral-700 dark:text-neutral-300">
                    \ube0c\ub77c\uc6b0\uc800 \ub610\ub294 \uc571 \uc124\uc815\uc5d0\uc11c \ub9c8\uc774\ud06c \uad8c\ud55c\uc774 \ud5c8\uc6a9\ub418\uc5b4 \uc788\ub294\uc9c0 \ud655\uc778\ud574 \uc8fc\uc138\uc694.
                    iOS\uc758 \uacbd\uc6b0 \uc124\uc815 &gt; \uac1c\uc778\uc815\ubcf4 \ubcf4\ud638 &gt; \ub9c8\uc774\ud06c\uc5d0\uc11c TapTalk\uc758 \uc811\uadfc\uc744 \ud5c8\uc6a9\ud574 \uc8fc\uc138\uc694.
                    \ubb38\uc81c\uac00 \uc9c0\uc18d\ub418\uba74 \uc571\uc744 \uc7ac\uc2dc\uc791\ud558\uac70\ub098 \uae30\uae30\ub97c \uc7ac\ubd80\ud305\ud574 \ubcf4\uc138\uc694.
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold text-lg mb-2">Q. AI \ud29c\ud130\uc758 \uad50\uc815\uc774 \uc815\ud655\ud55c\uac00\uc694?</h3>
                  <p className="text-neutral-700 dark:text-neutral-300">
                    AI \ud29c\ud130\ub294 \ub192\uc740 \uc218\uc900\uc758 \ubb38\ubc95 \ubc0f \ud45c\ud604 \uad50\uc815\uc744 \uc81c\uacf5\ud558\uc9c0\ub9cc,
                    AI \ud2b9\uc131\uc0c1 100% \uc815\ud655\ud558\uc9c0 \uc54a\uc744 \uc218 \uc788\uc2b5\ub2c8\ub2e4.
                    \ud559\uc2b5 \ubcf4\uc870 \ub3c4\uad6c\ub85c \ud65c\uc6a9\ud574 \uc8fc\uc138\uc694.
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold text-lg mb-2">Q. \uc624\ud504\ub77c\uc778\uc5d0\uc11c\ub3c4 \uc0ac\uc6a9\ud560 \uc218 \uc788\ub098\uc694?</h3>
                  <p className="text-neutral-700 dark:text-neutral-300">
                    TapTalk\uc740 AI \ub300\ud654\ub97c \uc704\ud574 \uc778\ud130\ub137 \uc5f0\uacb0\uc774 \ud544\uc694\ud569\ub2c8\ub2e4.
                    \uc624\ud504\ub77c\uc778 \uc0c1\ud0dc\uc5d0\uc11c\ub294 \uc774\uc804 \ud559\uc2b5 \uae30\ub85d \ud655\uc778\ub9cc \uac00\ub2a5\ud569\ub2c8\ub2e4.
                  </p>
                </div>
              </div>
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
                href="mailto:support@taptalk.xyz"
                className="inline-block mt-3 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium no-underline"
              >
                support@taptalk.xyz
              </a>
              <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-3">
                Response time: within 24 business hours
              </p>
            </section>

            {/* FAQ Section */}
            <section>
              <h2 className="text-xl font-semibold mt-8 mb-4">Frequently Asked Questions (FAQ)</h2>

              <div className="space-y-6">
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
                    Alternatively, email support@taptalk.xyz to request account deletion.
                    All data will be permanently deleted within 30 days.
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold text-lg mb-2">Q. How do I cancel my subscription?</h3>
                  <p className="text-neutral-700 dark:text-neutral-300">
                    On iOS, go to Settings &gt; Apple ID &gt; Subscriptions to cancel your TapTalk subscription.
                    You can continue using the service until the end of your current billing period.
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

                <div>
                  <h3 className="font-semibold text-lg mb-2">Q. Are the AI tutor&apos;s corrections accurate?</h3>
                  <p className="text-neutral-700 dark:text-neutral-300">
                    Our AI tutor provides high-quality grammar and expression corrections,
                    but due to the nature of AI, it may not be 100% accurate.
                    Please use it as a learning aid.
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold text-lg mb-2">Q. Can I use TapTalk offline?</h3>
                  <p className="text-neutral-700 dark:text-neutral-300">
                    TapTalk requires an internet connection for AI conversations.
                    In offline mode, you can only review your previous learning history.
                  </p>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* Footer Links */}
        <div className="mt-12 pt-6 border-t border-neutral-200 dark:border-neutral-700 flex flex-col sm:flex-row gap-4">
          <Link href="/terms" className="text-blue-600 dark:text-blue-400 hover:underline">
            {language === 'ko' ? '\uc774\uc6a9\uc57d\uad00 \ubcf4\uae30' : 'Terms of Service'}
          </Link>
          <Link href="/privacy" className="text-blue-600 dark:text-blue-400 hover:underline">
            {language === 'ko' ? '\uac1c\uc778\uc815\ubcf4\ucc98\ub9ac\ubc29\uce68 \ubcf4\uae30' : 'Privacy Policy'}
          </Link>
        </div>
      </div>
    </div>
  );
}
