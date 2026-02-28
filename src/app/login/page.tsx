'use client';

import { signIn } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { Suspense, useState, useCallback, useEffect } from 'react';
import TapTalkLogo from '@/components/TapTalkLogo';
import { useLanguage } from '@/lib/i18n';

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
  const { t } = useLanguage();

  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [showApple, setShowApple] = useState(false);

  // Show Apple button only in native iOS app
  useEffect(() => {
    setShowApple(isNativeApp() && isIOSDevice());
  }, []);

  // Google Sign-In: use Capacitor plugin in native app, NextAuth redirect on web
  const handleGoogleSignIn = useCallback(async () => {
    if (isNativeApp()) {
      try {
        setIsLoading(true);
        const { GoogleAuth } = await import('@codetrix-studio/capacitor-google-auth');
        await GoogleAuth.initialize({
          clientId: '670234764770-sib307dj55oj4pg2d5cu1k27i7u5hith.apps.googleusercontent.com',
          scopes: ['profile', 'email'],
          grantOfflineAccess: true,
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
          window.location.href = callbackUrl;
        } else {
          // Fallback to web OAuth
          signIn('google', { callbackUrl });
        }
      } catch (error) {
        console.error('[TapTalk] Native Google Sign-In error:', error);
        // Fallback to web OAuth
        signIn('google', { callbackUrl });
      } finally {
        setIsLoading(false);
      }
    } else {
      signIn('google', { callbackUrl });
    }
  }, [callbackUrl]);

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
    <div className="min-h-screen bg-neutral-50 dark:bg-gradient-to-br dark:from-slate-900 dark:via-purple-900 dark:to-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-3">
            <TapTalkLogo size="lg" theme="auto" />
          </div>
          <p className="text-neutral-500 dark:text-neutral-400">{t.aiEnglishPractice}</p>
        </div>

        <div className="bg-white dark:bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-neutral-200 dark:border-white/20 shadow-card dark:shadow-none">
          <h2 className="text-2xl font-semibold text-neutral-900 dark:text-white text-center mb-6">
            {t.welcomeBack}
          </h2>

          {(error || authError) && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-500/20 border border-red-200 dark:border-red-500/50 rounded-lg text-red-700 dark:text-red-200 text-sm text-center">
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
                className="w-full flex items-center justify-center gap-3 bg-black text-white font-medium py-3 px-4 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl hover:bg-black/90 disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-white/90"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                </svg>
                {isLoading ? t.loading : t.continueWithApple}
              </button>
            )}

            {/* Google Sign-In */}
            <button
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-3 bg-white dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-700 text-neutral-800 dark:text-white font-medium py-3 px-4 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 border border-neutral-200 dark:border-transparent"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              {isLoading ? t.loading : t.continueWithGoogle}
            </button>

            <div className="relative my-1">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-neutral-200 dark:border-white/20"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white dark:bg-transparent text-neutral-400 dark:text-neutral-400">{t.orDivider}</span>
              </div>
            </div>

            {/* Kakao Sign-In */}
            <button
              onClick={() => signIn('kakao', { callbackUrl })}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-3 bg-[#FEE500] hover:bg-[#FDD800] text-[#191919] font-medium py-3 px-4 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#191919" d="M12 3C6.477 3 2 6.463 2 10.691c0 2.72 1.8 5.108 4.5 6.454-.144.522-.926 3.36-.962 3.587 0 0-.02.166.088.229.108.063.235.014.235.014.31-.043 3.59-2.357 4.156-2.759.647.09 1.314.138 1.983.138 5.523 0 10-3.463 10-7.663S17.523 3 12 3z"/>
              </svg>
              {t.continueWithKakao}
            </button>
          </div>

          <p className="mt-6 text-center text-neutral-400 dark:text-neutral-400 text-sm">
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
      <div className="min-h-screen bg-neutral-50 dark:bg-gradient-to-br dark:from-slate-900 dark:via-purple-900 dark:to-slate-900 flex items-center justify-center">
        <div className="text-neutral-900 dark:text-white">Loading...</div>
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
