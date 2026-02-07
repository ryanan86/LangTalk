'use client';

import { signIn } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { Suspense, useState, useEffect, useCallback } from 'react';
import TapTalkLogo from '@/components/TapTalkLogo';

// Check if running in TapTalk native app (via User-Agent)
function isTapTalkNativeApp(): boolean {
  if (typeof window === 'undefined') return false;
  return navigator.userAgent.includes('TapTalkNative');
}

// Check if running on Android
function isAndroidDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return /Android/i.test(navigator.userAgent);
}

// Get platform info for debugging
function getPlatformInfo(): { isNative: boolean; isAndroid: boolean; ua: string } {
  if (typeof window === 'undefined') {
    return { isNative: false, isAndroid: false, ua: 'ssr' };
  }
  const ua = navigator.userAgent;
  return {
    isNative: ua.includes('TapTalkNative'),
    isAndroid: /Android/i.test(ua),
    ua: ua.substring(0, 60),
  };
}

function LoginContent() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/';
  const error = searchParams.get('error');

  const [debugInfo, setDebugInfo] = useState('Loading...');
  const [nativeError, setNativeError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const info = getPlatformInfo();
      setDebugInfo(`LOGIN v4: Native:${info.isNative} Android:${info.isAndroid} UA:${info.ua}`);
    }
  }, []);

  const handleGoogleSignIn = useCallback(async () => {
    const isNative = isTapTalkNativeApp();
    const isAndroid = isAndroidDevice();

    setDebugInfo(`CLICKED! Native:${isNative} Android:${isAndroid}`);

    if (isNative && isAndroid) {
      // Native sign-in path
      try {
        setIsLoading(true);
        setNativeError(null);

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
          setNativeError('로그인 실패');
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setNativeError(msg);
        setDebugInfo(`ERROR: ${msg}`);
      } finally {
        setIsLoading(false);
      }
    } else {
      // Web OAuth - not in native app
      setDebugInfo(`Web OAuth: Native:${isNative} Android:${isAndroid}`);
      signIn('google', { callbackUrl });
    }
  }, [callbackUrl]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      {/* Debug Banner */}
      {debugInfo && (
        <div className="fixed top-0 left-0 right-0 z-[9999] bg-yellow-500 text-black text-xs p-2 font-mono">
          {debugInfo}
        </div>
      )}
      {/* Native Error */}
      {nativeError && (
        <div className="fixed top-8 left-0 right-0 z-[9999] bg-red-500 text-white text-xs p-2 font-mono">
          Error: {nativeError}
        </div>
      )}
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-3">
            <TapTalkLogo size="lg" theme="dark" />
          </div>
          <p className="text-gray-400">AI English Conversation Practice</p>
        </div>

        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20">
          <h2 className="text-2xl font-semibold text-white text-center mb-6">
            Welcome Back
          </h2>

          {error && (
            <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200 text-sm text-center">
              {error === 'AccessDenied'
                ? 'Your subscription is not active. Please contact support.'
                : 'An error occurred. Please try again.'}
            </div>
          )}

          <button
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-100 text-gray-800 font-medium py-3 px-4 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            {isLoading ? 'Loading...' : 'Continue with Google'}
          </button>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/20"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-transparent text-gray-400">or</span>
            </div>
          </div>

          <button
            onClick={() => signIn('kakao', { callbackUrl })}
            className="w-full flex items-center justify-center gap-3 bg-[#FEE500] hover:bg-[#FDD800] text-[#191919] font-medium py-3 px-4 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#191919"
                d="M12 3C6.477 3 2 6.463 2 10.691c0 2.72 1.8 5.108 4.5 6.454-.144.522-.926 3.36-.962 3.587 0 0-.02.166.088.229.108.063.235.014.235.014.31-.043 3.59-2.357 4.156-2.759.647.09 1.314.138 1.983.138 5.523 0 10-3.463 10-7.663S17.523 3 12 3z"
              />
            </svg>
            카카오로 계속하기
          </button>

          <p className="mt-6 text-center text-gray-400 text-sm">
            By signing in, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
