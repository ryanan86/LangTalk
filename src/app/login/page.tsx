'use client';

import { signIn } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { Suspense, useState, useCallback, useEffect } from 'react';
import TapTalkLogo from '@/components/TapTalkLogo';
import { useLanguage } from '@/lib/i18n';
import { track } from '@/lib/analytics';

// Check if running in TapTalk native app (via User-Agent)
function isNativeApp(): boolean {
  if (typeof window === 'undefined') return false;
  return navigator.userAgent.includes('TapTalkNative');
}

function isIOSDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return /iPad|iPhone|iPod/i.test(navigator.userAgent);
}

function LoginContent() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/';
  const error = searchParams.get('error');
  const { t, language } = useLanguage();

  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [showApple, setShowApple] = useState(false);

  // Show Apple button only in native iOS app
  useEffect(() => {
    setShowApple(isNativeApp() && isIOSDevice());
  }, []);

  // Open URL in in-app browser (SFSafariViewController) instead of external Safari
  const openInAppBrowser = useCallback(async (url: string) => {
    try {
      const { Browser } = await import('@capacitor/browser');
      await Browser.open({ url, presentationStyle: 'popover' });
    } catch {
      // Fallback: navigate in WebView
      window.location.href = url;
    }
  }, []);

  // Google Sign-In: use Capacitor plugin in native app, in-app browser fallback
  const handleGoogleSignIn = useCallback(async () => {
    if (isNativeApp()) {
      try {
        setIsLoading(true);
        const { GoogleAuth } = await import('@codetrix-studio/capacitor-google-auth');
        await GoogleAuth.initialize({
          clientId: isIOSDevice()
            ? '670234764770-7s17o1cfit5vkb3hbf29uh0r42j52gdh.apps.googleusercontent.com'
            : '670234764770-sib307dj55oj4pg2d5cu1k27i7u5hith.apps.googleusercontent.com',
          scopes: ['profile', 'email'],
          grantOfflineAccess: false,
        });

        const result = await GoogleAuth.signIn();
        const signInResult = await signIn('google-native', {
          idToken: result.authentication.idToken,
          email: result.email,
          name: result.name || result.givenName,
          image: result.imageUrl,
          redirect: false,
        });

        if (signInResult?.ok) {
          track('sign_up_complete', { method: 'google_native' });
          window.location.href = callbackUrl;
        } else {
          setAuthError(language === 'ko'
            ? 'Google 로그인에 실패했습니다. 다시 시도해주세요.'
            : 'Google sign-in failed. Please try again.');
        }
      } catch (error) {
        console.error('[TapTalk] Native Google Sign-In error:', error);
        // Fallback: open Google OAuth in in-app browser (SFSafariViewController)
        const googleAuthUrl = `https://taptalk.xyz/api/auth/signin/google?callbackUrl=${encodeURIComponent(callbackUrl)}`;
        await openInAppBrowser(googleAuthUrl);
      } finally {
        setIsLoading(false);
      }
    } else {
      signIn('google', { callbackUrl });
    }
  }, [callbackUrl, openInAppBrowser, language]);

  // Apple Sign-In: use Capacitor plugin on iOS native, NextAuth redirect on web
  const handleAppleSignIn = useCallback(async () => {
    if (isNativeApp() && isIOSDevice()) {
      try {
        setIsLoading(true);
        const { SignInWithApple } = await import('@capacitor-community/apple-sign-in');
        const result = await SignInWithApple.authorize({
          clientId: 'com.taptalk.app',
          redirectURI: 'https://taptalk.xyz',
          scopes: 'email name',
        });

        const response = result.response;
        const signInResult = await signIn('apple-native', {
          identityToken: response.identityToken,
          email: response.email || '',
          name: response.givenName ? `${response.givenName} ${response.familyName || ''}`.trim() : '',
          userId: response.user,
          redirect: false,
        });

        if (signInResult?.ok) {
          track('sign_up_complete', { method: 'apple_native' });
          window.location.href = callbackUrl;
        } else {
          setAuthError('Apple Sign-In failed. Please try again.');
        }
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        console.error('[TapTalk] Apple Sign-In error:', msg);
        setAuthError(msg);
      } finally {
        setIsLoading(false);
      }
    } else {
      // Web: use NextAuth Apple provider (if configured)
      signIn('apple', { callbackUrl });
    }
  }, [callbackUrl]);

  return (
    <div className="min-h-screen bg-neutral-950 dark:bg-neutral-950 flex items-center justify-center p-4 relative overflow-hidden safe-top safe-bottom">
      {/* Ambient glow orbs — matches StudyDashboard hero pattern */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-32 -left-24 w-80 h-80 rounded-full bg-violet-600/20 blur-[100px] motion-safe:animate-glow"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-24 -right-24 w-72 h-72 rounded-full bg-indigo-500/20 blur-[90px] motion-safe:animate-glow"
        style={{ animationDelay: '1s' }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-primary-700/10 blur-[120px]"
      />

      <div className="relative max-w-sm w-full motion-safe:animate-fade-up">
        {/* Logo block */}
        <div className="text-center mb-10">
          <div className="flex justify-center mb-4">
            <TapTalkLogo size="lg" theme="auto" />
          </div>
          <p className="text-neutral-400 text-sm tracking-wide">{t.aiEnglishPractice}</p>
        </div>

        {/* Card */}
        <div className="bg-white/[0.04] backdrop-blur-xl rounded-card-lg border border-white/[0.07] shadow-float-dark p-7 space-y-5">
          <h2 className="text-xl font-bold text-white text-center">
            {t.welcomeBack}
          </h2>

          {(error || authError) && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-300 text-sm text-center">
              {error === 'AccessDenied'
                ? t.accessDenied
                : authError || t.loginError}
            </div>
          )}

          <div className="flex flex-col gap-3">
            {/* Apple Sign-In - only shown in native iOS app */}
            {showApple && (
              <button
                onClick={handleAppleSignIn}
                disabled={isLoading}
                className="pressable w-full flex items-center justify-center gap-3 bg-white hover:bg-neutral-100 text-neutral-900 font-semibold py-3.5 px-5 rounded-2xl transition-all duration-200 shadow-md disabled:opacity-50 h-14"
                aria-label={isLoading ? t.loading : t.continueWithApple}
              >
                <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                </svg>
                <span>{isLoading ? t.loading : t.continueWithApple}</span>
              </button>
            )}

            {/* Google Sign-In */}
            <button
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className="pressable w-full flex items-center justify-center gap-3 bg-white/[0.06] hover:bg-white/[0.10] border border-white/[0.10] text-white font-semibold py-3.5 px-5 rounded-2xl transition-all duration-200 disabled:opacity-50 h-14"
              aria-label={isLoading ? t.loading : t.continueWithGoogle}
            >
              <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <span>{isLoading ? t.loading : t.continueWithGoogle}</span>
            </button>

            {/* Divider */}
            <div className="relative my-1">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/[0.08]" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-3 bg-transparent text-neutral-500">{t.orDivider}</span>
              </div>
            </div>

            {/* Kakao Sign-In */}
            <button
              onClick={async () => {
                if (isNativeApp()) {
                  const kakaoAuthUrl = `https://taptalk.xyz/api/auth/signin/kakao?callbackUrl=${encodeURIComponent(callbackUrl)}`;
                  await openInAppBrowser(kakaoAuthUrl);
                } else {
                  signIn('kakao', { callbackUrl });
                }
              }}
              disabled={isLoading}
              className="pressable w-full flex items-center justify-center gap-3 bg-[#FEE500] hover:bg-[#FDD800] text-[#191919] font-semibold py-3.5 px-5 rounded-2xl transition-all duration-200 shadow-md disabled:opacity-50 h-14"
              aria-label={t.continueWithKakao}
            >
              <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#191919" d="M12 3C6.477 3 2 6.463 2 10.691c0 2.72 1.8 5.108 4.5 6.454-.144.522-.926 3.36-.962 3.587 0 0-.02.166.088.229.108.063.235.014.235.014.31-.043 3.59-2.357 4.156-2.759.647.09 1.314.138 1.983.138 5.523 0 10-3.463 10-7.663S17.523 3 12 3z"/>
              </svg>
              <span>{t.continueWithKakao}</span>
            </button>
          </div>

          <p className="text-center text-neutral-500 text-xs leading-relaxed">
            {t.termsAgreement}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
