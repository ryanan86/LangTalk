'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSession, signIn, signOut } from 'next-auth/react';
import Image from 'next/image';
import Link from 'next/link';
import { useLanguage, LanguageToggle } from '@/lib/i18n';
import { Flag } from '@/components/Icons';
import TapTalkLogo from '@/components/TapTalkLogo';
// Helper function to check if running in Android WebView (Capacitor app)
function isAndroidWebView(): boolean {
  if (typeof window === 'undefined') return false;

  const userAgent = navigator.userAgent;
  // Android WebView detection: has 'Android' and 'wv' in user agent, or has Capacitor bridge
  const isAndroid = /Android/i.test(userAgent);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const win = window as any;
  const hasCapacitor = !!(win.Capacitor);

  // If on Android and either has Capacitor or is in a WebView context (not standalone Chrome)
  const isWebView = isAndroid && (hasCapacitor || !userAgent.includes('Chrome/'));

  console.log('[TapTalk] isAndroidWebView check - isAndroid:', isAndroid, 'hasCapacitor:', hasCapacitor, 'result:', isWebView);

  return isAndroid; // Try native sign-in for ALL Android (WebView or browser on device)
}

// Typewriter Effect Hook
function useTypewriter(texts: string[], typingSpeed = 80, deletingSpeed = 40, pauseTime = 2000) {
  const [displayText, setDisplayText] = useState('');
  const [textIndex, setTextIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const currentText = texts[textIndex];

    const timeout = setTimeout(() => {
      if (!isDeleting) {
        if (displayText.length < currentText.length) {
          setDisplayText(currentText.slice(0, displayText.length + 1));
        } else {
          setTimeout(() => setIsDeleting(true), pauseTime);
        }
      } else {
        if (displayText.length > 0) {
          setDisplayText(displayText.slice(0, -1));
        } else {
          setIsDeleting(false);
          setTextIndex((prev) => (prev + 1) % texts.length);
        }
      }
    }, isDeleting ? deletingSpeed : typingSpeed);

    return () => clearTimeout(timeout);
  }, [displayText, isDeleting, textIndex, texts, typingSpeed, deletingSpeed, pauseTime]);

  return displayText;
}

// Circular Progress Component
function CircularProgress({ value, max, size = 80, strokeWidth = 6, color = 'purple' }: {
  value: number;
  max: number;
  size?: number;
  strokeWidth?: number;
  color?: 'purple' | 'amber' | 'green' | 'blue';
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const progress = Math.min(value / max, 1);
  const strokeDashoffset = circumference - progress * circumference;

  const colors = {
    purple: 'stroke-purple-500',
    amber: 'stroke-amber-500',
    green: 'stroke-green-500',
    blue: 'stroke-blue-500',
  };

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-white/10"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          className={`${colors[color]} transition-all duration-1000 ease-out`}
          style={{
            strokeDasharray: circumference,
            strokeDashoffset: strokeDashoffset,
          }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-lg font-bold text-white">{value}</span>
      </div>
    </div>
  );
}

// Animated Counter Component
function AnimatedCounter({ target, duration = 1500 }: { target: number; duration?: number }) {
  const [count, setCount] = useState(0);
  const [hasAnimated, setHasAnimated] = useState(false);

  useEffect(() => {
    if (hasAnimated) return;
    setHasAnimated(true);

    const steps = 30;
    const increment = target / steps;
    const stepDuration = duration / steps;
    let current = 0;

    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.floor(current));
      }
    }, stepDuration);

    return () => clearInterval(timer);
  }, [target, duration, hasAnimated]);

  return <span>{count}</span>;
}

interface Persona {
  id: string;
  name: string;
  nationality: 'american' | 'british';
  gender: 'female' | 'male';
  voice: string;
  gradient: string;
  flag: string;
  sampleText: string;
}

const personas: Persona[] = [
  {
    id: 'emma',
    name: 'Emma',
    nationality: 'american',
    gender: 'female',
    voice: 'shimmer',
    gradient: 'from-rose-400 to-pink-500',
    flag: 'US',
    sampleText: "Oh my gosh, hi! I'm Emma. I'm so excited to chat with you today! Let's have some fun conversations together.",
  },
  {
    id: 'james',
    name: 'James',
    nationality: 'american',
    gender: 'male',
    voice: 'echo',
    gradient: 'from-blue-400 to-indigo-500',
    flag: 'US',
    sampleText: "Hey, what's up! I'm James. Super chill vibes here, no pressure at all. Let's just hang out and talk about whatever.",
  },
  {
    id: 'charlotte',
    name: 'Charlotte',
    nationality: 'british',
    gender: 'female',
    voice: 'fable',
    gradient: 'from-violet-400 to-purple-500',
    flag: 'UK',
    sampleText: "Hello there! I'm Charlotte. Lovely to meet you. I do enjoy a good chat, so let's get started, shall we?",
  },
  {
    id: 'oliver',
    name: 'Oliver',
    nationality: 'british',
    gender: 'male',
    voice: 'onyx',
    gradient: 'from-emerald-400 to-teal-500',
    flag: 'UK',
    sampleText: "Right then, hello! I'm Oliver. Looking forward to having a proper conversation with you. No formalities needed here.",
  },
  {
    id: 'alina',
    name: 'Alina',
    nationality: 'american',
    gender: 'female',
    voice: 'nova',
    gradient: 'from-amber-400 to-orange-500',
    flag: 'US',
    sampleText: "Hi hi! I'm Alina! I'm so happy to meet you! Let's talk about fun stuff together, okay?",
  },
  {
    id: 'henly',
    name: 'Henly',
    nationality: 'american',
    gender: 'male',
    voice: 'alloy',
    gradient: 'from-lime-400 to-green-500',
    flag: 'US',
    sampleText: "Hey hey! I'm Henly! Wanna know something cool? I love asking questions! So, what do you wanna talk about?",
  },
];

// Grade level mapping for AI evaluation
const gradeMapping: Record<string, { grade: string; name: string; nameKo: string }> = {
  'K': { grade: 'K', name: 'Kindergarten', nameKo: '유치원' },
  '1-2': { grade: '1-2', name: 'Grade 1-2', nameKo: '초등 1-2' },
  '3-4': { grade: '3-4', name: 'Grade 3-4', nameKo: '초등 3-4' },
  '5-6': { grade: '5-6', name: 'Grade 5-6', nameKo: '초등 5-6' },
  '7-8': { grade: '7-8', name: 'Middle School', nameKo: '중학교' },
  '9-10': { grade: '9-10', name: 'High School', nameKo: '고등학교' },
  '11-12': { grade: '11-12', name: 'Advanced', nameKo: '고급' },
  'College': { grade: 'College', name: 'College', nameKo: '대학' },
};

export default function HomePage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { t, language } = useLanguage();
  const [selectedPersona, setSelectedPersona] = useState<string | null>(null);
  const [isSubscribed, setIsSubscribed] = useState<boolean | null>(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(null);
  const [expiryDate, setExpiryDate] = useState<string | null>(null);
  const [, setCheckingSubscription] = useState(false);
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [signupMessage, setSignupMessage] = useState<string | null>(null);
  const [sessionCount, setSessionCount] = useState<number>(0);
  const [evaluatedGrade, setEvaluatedGrade] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [levelDetails, setLevelDetails] = useState<{ grammar: number; vocabulary: number; fluency: number; comprehension: number } | null>(null);
  const [activeTab, setActiveTab] = useState<'talk' | 'debate'>('talk');
  const [lessonHistory, setLessonHistory] = useState<Array<{
    dateTime: string;
    tutor: string;
    duration: number;
    topicSummary: string;
    feedbackSummary: string;
    keyCorrections: string;
    level: string;
  }>>([]);
  const [correctionsToReview, setCorrectionsToReview] = useState<number>(0);
  const [hasProfile, setHasProfile] = useState<boolean>(false);

  // Mic test states
  const [isTesting, setIsTesting] = useState(false);
  const [, setIsRecording] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [testStatus, setTestStatus] = useState<'idle' | 'recording' | 'processing' | 'success' | 'error'>('idle');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Voice preview states
  const [playingVoice, setPlayingVoice] = useState<string | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  // Animation states
  const [mounted, setMounted] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  // State for native sign-in error debugging
  const [nativeSignInError, setNativeSignInError] = useState<string | null>(null);

  // Debug info state - shows platform detection at top of screen
  const [debugInfo, setDebugInfo] = useState<string>('');

  // Check platform on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const ua = navigator.userAgent;
      const isAndroid = /Android/i.test(ua);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const hasCapacitor = !!(window as any).Capacitor;
      setDebugInfo(`Android:${isAndroid} Cap:${hasCapacitor} UA:${ua.substring(0, 50)}...`);
    }
  }, []);

  // Handle Google Sign-In (native for Android, web for browser)
  const handleGoogleSignIn = useCallback(async () => {
    // Check at runtime if we're on Android (native app or mobile browser)
    const isAndroid = isAndroidWebView();
    console.log('[TapTalk] Google Sign-In - isAndroid:', isAndroid);

    if (isAndroid) {
      try {
        setIsGoogleLoading(true);
        setNativeSignInError(null);
        console.log('[TapTalk] Starting native Google Sign-In...');

        // Check if Capacitor bridge is available
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const win = window as any;
        if (!win.Capacitor) {
          throw new Error('Capacitor bridge not available');
        }
        console.log('[TapTalk] Capacitor bridge found');

        // Dynamic import for Capacitor plugin
        const { GoogleAuth } = await import('@codetrix-studio/capacitor-google-auth');
        console.log('[TapTalk] GoogleAuth imported, initializing...');

        // Initialize with Android client ID
        await GoogleAuth.initialize({
          clientId: '670234764770-sib307dj55oj4pg2d5cu1k27i7u5hith.apps.googleusercontent.com',
          scopes: ['profile', 'email'],
          grantOfflineAccess: true,
        });
        console.log('[TapTalk] GoogleAuth initialized, signing in...');

        const result = await GoogleAuth.signIn();
        console.log('[TapTalk] GoogleAuth signIn result:', JSON.stringify(result));

        // Sign in with NextAuth using the Google credential
        const signInResult = await signIn('google-native', {
          idToken: result.authentication.idToken,
          email: result.email,
          name: result.name || result.givenName,
          image: result.imageUrl,
          redirect: false,
        });
        console.log('[TapTalk] NextAuth signIn result:', signInResult);

        // Reload to update session
        window.location.reload();
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('[TapTalk] Native Google Sign-In error:', errorMessage);
        setNativeSignInError(errorMessage);
        // Don't auto-fallback - show the error to user for debugging
      } finally {
        setIsGoogleLoading(false);
      }
    } else {
      // Web (desktop): use standard NextAuth
      console.log('[TapTalk] Using web Google Sign-In (desktop)');
      signIn('google');
    }
  }, []);

  // Force web sign-in (for when native fails)
  const handleWebSignIn = useCallback(() => {
    setNativeSignInError(null);
    signIn('google');
  }, []);

  // Typewriter texts
  const typewriterTextsKo = [
    '매일 10분으로 습관을 만든다',
    'AI 튜터와 실시간 영어 대화',
    '부담 없이, 어디서든, 지금 바로',
    '발음부터 문법까지 즉시 피드백',
  ];
  const typewriterTextsEn = [
    'Build habits in just 10 minutes a day',
    'Real-time English conversation with AI',
    'No pressure, anywhere, anytime',
    'Instant feedback on pronunciation & grammar',
  ];
  const typingText = useTypewriter(
    language === 'ko' ? typewriterTextsKo : typewriterTextsEn,
    60,
    30,
    2500
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (session?.user?.email) {
      checkSubscription();
    }
  }, [session]);

  const startMicTest = async () => {
    setIsTesting(true);
    setTestResult(null);
    setTestStatus('recording');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : 'audio/mp4';

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        setTestStatus('processing');
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        stream.getTracks().forEach(track => track.stop());

        console.log('=== Mic Test Debug ===');
        console.log('Audio chunks:', audioChunksRef.current.length);
        console.log('Audio blob size:', audioBlob.size, 'bytes');
        console.log('Audio blob type:', audioBlob.type);
        console.log('MIME type used:', mimeType);

        if (audioBlob.size < 1000) {
          console.error('Audio blob is too small, likely no audio recorded');
          setTestResult(language === 'ko' ? '오디오가 녹음되지 않았습니다. 마이크를 확인해주세요.' : 'No audio recorded. Please check your microphone.');
          setTestStatus('error');
          setIsTesting(false);
          return;
        }

        try {
          const file = new File([audioBlob], 'test.webm', { type: mimeType });
          const formData = new FormData();
          formData.append('audio', file);

          console.log('Sending to API, file size:', file.size);

          const response = await fetch('/api/speech-to-text', {
            method: 'POST',
            body: formData,
          });

          console.log('API response status:', response.status);
          const data = await response.json();
          console.log('API response data:', data);

          if (data.error) {
            setTestResult(language === 'ko' ? `오류: ${data.error}` : `Error: ${data.error}`);
            setTestStatus('error');
          } else if (data.text && data.text.trim()) {
            setTestResult(data.text);
            setTestStatus('success');
          } else {
            setTestResult(language === 'ko' ? '음성이 인식되지 않았습니다. 더 크게 말해주세요.' : 'No speech detected. Please speak louder.');
            setTestStatus('error');
          }
        } catch (err) {
          console.error('Fetch error:', err);
          setTestResult(language === 'ko' ? '오디오 처리 중 오류가 발생했습니다.' : 'Error processing audio. Please try again.');
          setTestStatus('error');
        }
      };

      mediaRecorder.start(1000);
      setIsRecording(true);

      setTimeout(() => {
        if (mediaRecorder.state === 'recording') {
          mediaRecorder.stop();
          setIsRecording(false);
        }
      }, 5000);

    } catch {
      setTestResult(language === 'ko' ? '마이크 접근이 거부되었습니다. 마이크를 허용해주세요.' : 'Microphone access denied. Please allow microphone.');
      setTestStatus('error');
    }
  };

  const stopMicTest = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const checkSubscription = async () => {
    setCheckingSubscription(true);
    try {
      const res = await fetch('/api/check-subscription');
      const data = await res.json();
      setIsSubscribed(data.subscribed);
      setSubscriptionStatus(data.status || null);
      setExpiryDate(data.expiryDate || null);
      setSessionCount(data.sessionCount || 0);
      setEvaluatedGrade(data.evaluatedGrade || null);
      setLevelDetails(data.levelDetails || null);

      // Fetch lesson history
      const historyRes = await fetch('/api/lesson-history');
      const historyData = await historyRes.json();
      if (historyData.lessons) {
        setLessonHistory(historyData.lessons.slice(0, 5)); // Last 5 lessons
      }

      // Fetch corrections to review
      const correctionsRes = await fetch('/api/corrections?due=true&limit=100');
      const correctionsData = await correctionsRes.json();
      setCorrectionsToReview(correctionsData.count || 0);

      // Fetch user profile
      const profileRes = await fetch('/api/user-profile');
      const profileData = await profileRes.json();
      setHasProfile(!!profileData.profile);
    } catch {
      setIsSubscribed(true);
      setSubscriptionStatus('active');
      setSessionCount(5);
    } finally {
      setCheckingSubscription(false);
    }
  };

  const handleBetaSignup = async () => {
    setIsSigningUp(true);
    setSignupMessage(null);
    try {
      const res = await fetch('/api/beta-signup', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setSignupMessage(data.message);
        setSubscriptionStatus('pending');
      } else {
        setSignupMessage(data.message || data.error);
      }
    } catch {
      setSignupMessage(language === 'ko' ? '신청 중 오류가 발생했습니다.' : 'An error occurred during signup.');
    } finally {
      setIsSigningUp(false);
    }
  };

  const playVoicePreview = async (persona: Persona, e: React.MouseEvent) => {
    e.stopPropagation();

    if (playingVoice === persona.id) {
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
        previewAudioRef.current = null;
      }
      setPlayingVoice(null);
      return;
    }

    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
    }

    setPlayingVoice(persona.id);

    try {
      const response = await fetch('/api/text-to-speech', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: persona.sampleText,
          voice: persona.voice,
        }),
      });

      if (!response.ok) throw new Error('TTS failed');

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      previewAudioRef.current = audio;

      audio.onended = () => {
        setPlayingVoice(null);
        URL.revokeObjectURL(audioUrl);
      };

      audio.onerror = () => {
        setPlayingVoice(null);
        URL.revokeObjectURL(audioUrl);
      };

      await audio.play();
    } catch {
      setPlayingVoice(null);
    }
  };

  const handleStart = () => {
    if (selectedPersona) {
      router.push(`/talk?tutor=${selectedPersona}`);
    }
  };

  const getPersonaDescription = (id: string) => {
    const descriptions: Record<string, { desc: string; style: string }> = {
      emma: { desc: t.emmaDesc, style: t.emmaStyle },
      james: { desc: t.jamesDesc, style: t.jamesStyle },
      charlotte: { desc: t.charlotteDesc, style: t.charlotteStyle },
      oliver: { desc: t.oliverDesc, style: t.oliverStyle },
      alina: { desc: t.alinaDesc, style: t.alinaStyle },
      henly: { desc: t.henlyDesc, style: t.henlyStyle },
    };
    return descriptions[id] || { desc: '', style: '' };
  };

  const canAccessDebate = sessionCount >= 5;
  const currentLevel = evaluatedGrade && gradeMapping[evaluatedGrade] ? gradeMapping[evaluatedGrade] : null;

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white overflow-hidden">
      {/* Debug Banner - REMOVE BEFORE PRODUCTION */}
      {debugInfo && (
        <div className="fixed top-0 left-0 right-0 z-[9999] bg-yellow-500 text-black text-xs p-2 font-mono">
          DEBUG v2: {debugInfo}
        </div>
      )}
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {/* Morphing Gradient Blobs */}
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-gradient-to-br from-purple-600/30 to-pink-600/20 rounded-full blur-[100px] animate-morph" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-gradient-to-br from-blue-600/25 to-cyan-600/15 rounded-full blur-[100px] animate-morph" style={{ animationDelay: '-2s' }} />
        <div className="absolute top-[40%] right-[20%] w-[350px] h-[350px] bg-gradient-to-br from-pink-500/15 to-orange-500/10 rounded-full blur-[80px] animate-morph" style={{ animationDelay: '-4s' }} />
        <div className="absolute top-[60%] left-[10%] w-[250px] h-[250px] bg-gradient-to-br from-indigo-500/20 to-purple-500/10 rounded-full blur-[60px] animate-float" />

        {/* Floating Particles */}
        {mounted && (
          <div className="absolute inset-0">
            {[...Array(20)].map((_, i) => (
              <div
                key={i}
                className="absolute w-1 h-1 bg-white/20 rounded-full"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animation: `particle-float ${5 + Math.random() * 10}s ease-in-out infinite`,
                  animationDelay: `${Math.random() * 5}s`,
                }}
              />
            ))}
          </div>
        )}

        {/* Grid Pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px]" />

        {/* Radial Gradient Overlay */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,#0a0a0f_70%)]" />
      </div>

      {/* Header - pt-12 for Android status bar + notch clearance */}
      <header className="relative z-50 border-b border-white/5 pt-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16 sm:h-20">
            {/* Logo */}
            <TapTalkLogo size="md" theme="dark" />

            {/* Right Side */}
            <div className="flex items-center gap-2 sm:gap-4">
              {/* Desktop: About link */}
              <Link
                href="/about"
                className="hidden sm:block text-white/70 hover:text-white text-sm font-medium transition-colors"
              >
                {language === 'ko' ? '소개' : 'About'}
              </Link>

              {/* Desktop: Full language toggle, Mobile: Simple toggle */}
              <div className="hidden sm:block">
                <LanguageToggle />
              </div>
              <button
                onClick={() => {
                  const newLang = language === 'ko' ? 'en' : 'ko';
                  localStorage.setItem('taptalk-language', newLang);
                  window.location.reload();
                }}
                className="sm:hidden px-2.5 py-1.5 rounded-full bg-white/10 border border-white/20 text-white/70 text-xs font-medium"
              >
                {language === 'ko' ? 'EN' : '한'}
              </button>

              {status === 'loading' ? (
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white/10 animate-pulse" />
              ) : session ? (
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
                    <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                    <span className="text-sm text-white/70">{session.user?.name?.split(' ')[0]}</span>
                  </div>
                  {session.user?.image && (
                    <Image
                      src={session.user.image}
                      alt=""
                      width={40}
                      height={40}
                      className="w-8 h-8 sm:w-10 sm:h-10 rounded-full ring-2 ring-white/10"
                    />
                  )}
                  <button
                    onClick={() => signOut()}
                    className="p-1.5 sm:p-2 rounded-lg hover:bg-white/5 transition-colors"
                    title={t.signOut}
                  >
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                  </button>
                </div>
              ) : (
                <>
                  {/* Mobile: Single login button */}
                  <button
                    onClick={() => router.push('/login')}
                    className="sm:hidden px-3 py-1.5 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm font-medium"
                  >
                    {language === 'ko' ? '로그인' : 'Login'}
                  </button>
                  {/* Desktop: Google + Kakao buttons */}
                  <div className="hidden sm:flex items-center gap-3">
                    <button
                      onClick={handleGoogleSignIn}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-white font-medium hover:bg-white/20 transition-all hover:scale-105 shadow-lg"
                    >
                      <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                      </svg>
                      <span className="text-sm">Google</span>
                    </button>
                    <button
                      onClick={() => signIn('kakao')}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-[#FEE500] text-[#3C1E1E] font-medium hover:bg-[#FDD800] transition-all hover:scale-105 shadow-lg shadow-yellow-500/20"
                    >
                      <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path fill="#3C1E1E" d="M12 3C6.477 3 2 6.463 2 10.691c0 2.72 1.8 5.108 4.5 6.454-.144.522-.926 3.36-.962 3.587 0 0-.02.166.088.229.108.063.235.014.235.014.31-.043 3.59-2.357 4.156-2.759.647.09 1.314.138 1.983.138 5.523 0 10-3.463 10-7.663S17.523 3 12 3z"/>
                      </svg>
                      <span className="text-sm">Kakao</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10">
        {/* Hero Section */}
        <section className={`pt-12 sm:pt-20 pb-8 sm:pb-12 transition-all duration-1000 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="text-center max-w-3xl mx-auto">
              {/* Badge with live indicator */}
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-6 sm:mb-8 backdrop-blur-sm">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </span>
                <span className="text-sm text-white/70">AI-Powered English Practice</span>
                <span className="text-xs text-white/40 hidden sm:inline">|</span>
                <span className="text-xs text-purple-400 hidden sm:inline">Live</span>
              </div>

              {/* Main Heading */}
              <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold leading-tight mb-6">
                <span className="bg-gradient-to-r from-white via-white to-white/50 bg-clip-text text-transparent">
                  {t.heroTitle}
                </span>
                <br />
                <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400 bg-clip-text text-transparent animate-gradient bg-[length:200%_auto]">
                  {t.heroSubtitle}
                </span>
              </h1>

              {/* Typewriter Effect */}
              <div className="h-10 sm:h-12 flex items-center justify-center mb-8 sm:mb-10">
                <p className="text-xl sm:text-2xl text-white/70 font-medium">
                  {typingText}
                  <span className="animate-blink text-purple-400 ml-0.5">|</span>
                </p>
              </div>

              {/* Feature Pills */}
              <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 mb-8 sm:mb-10">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-sm text-white/60 hover:bg-white/10 hover:text-white/80 transition-all cursor-default">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  <span>{language === 'ko' ? '실시간 피드백' : 'Real-time Feedback'}</span>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-sm text-white/60 hover:bg-white/10 hover:text-white/80 transition-all cursor-default">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                  <span>{language === 'ko' ? '음성 인식' : 'Voice Recognition'}</span>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-sm text-white/60 hover:bg-white/10 hover:text-white/80 transition-all cursor-default">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                  <span>{language === 'ko' ? 'AI 튜터' : 'AI Tutors'}</span>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-sm text-white/60 hover:bg-white/10 hover:text-white/80 transition-all cursor-default">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                  <span>{language === 'ko' ? '진행 추적' : 'Progress Tracking'}</span>
                </div>
              </div>

              {/* Dashboard Stats - For logged in users with at least 1 session */}
              {session && isSubscribed && sessionCount > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 max-w-2xl mx-auto mb-8">
                  {/* Sessions Completed */}
                  <div className="relative group p-4 rounded-2xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 hover:border-purple-500/40 transition-all">
                    <div className="absolute inset-0 rounded-2xl bg-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <CircularProgress value={sessionCount} max={10} color="purple" />
                    <div className="mt-2 text-xs text-white/50">{language === 'ko' ? '완료 세션' : 'Sessions'}</div>
                  </div>

                  {/* Debate Progress */}
                  <div className="relative group p-4 rounded-2xl bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/20 hover:border-amber-500/40 transition-all">
                    <div className="absolute inset-0 rounded-2xl bg-amber-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <CircularProgress value={Math.min(sessionCount, 5)} max={5} color="amber" />
                    <div className="mt-2 text-xs text-white/50">{language === 'ko' ? '디베이트' : 'Debate'}</div>
                  </div>

                  {/* Streak (placeholder) */}
                  <div className="relative group p-4 rounded-2xl bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20 hover:border-green-500/40 transition-all">
                    <div className="absolute inset-0 rounded-2xl bg-green-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="w-20 h-20 flex items-center justify-center mx-auto">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-white flex items-center justify-center gap-1">
                          <svg className="w-6 h-6 text-orange-400" fill="currentColor" viewBox="0 0 24 24"><path d="M12 23c-3.866 0-7-3.134-7-7 0-2.55 1.61-4.948 3.12-6.7.35-.41.94-.42 1.3-.03.31.33.3.85-.03 1.17C8.2 11.69 7 13.51 7 16c0 2.757 2.243 5 5 5s5-2.243 5-5c0-2.49-1.2-4.31-2.39-5.56-.33-.32-.34-.84-.03-1.17.36-.39.95-.38 1.3.03C17.39 11.052 19 13.45 19 16c0 3.866-3.134 7-7 7zm0-11c-1.657 0-3-1.343-3-3 0-1.4 1.5-2.9 2.58-3.83.27-.23.67-.23.94 0C13.5 6.1 15 7.6 15 9c0 1.657-1.343 3-3 3z"/></svg>
                          <AnimatedCounter target={sessionCount > 0 ? Math.min(sessionCount, 7) : 0} />
                        </div>
                        <div className="text-xs text-white/40">{language === 'ko' ? '일' : 'days'}</div>
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-white/50">{language === 'ko' ? '연속 학습' : 'Streak'}</div>
                  </div>

                  {/* Level - AI Evaluated */}
                  <div className="relative group p-4 rounded-2xl bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/20 hover:border-blue-500/40 transition-all">
                    <div className="absolute inset-0 rounded-2xl bg-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="w-20 h-20 flex items-center justify-center mx-auto">
                      <div className="text-center">
                        {currentLevel ? (
                          <>
                            <div className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                              {currentLevel.grade}
                            </div>
                            <div className="text-xs text-blue-400/60 mt-1 flex items-center justify-center gap-1">
                              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                              </svg>
                              AI
                            </div>
                          </>
                        ) : (
                          <div className="text-2xl font-bold text-white/30">-</div>
                        )}
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-white/50">{language === 'ko' ? '현재 레벨' : 'Level'}</div>
                  </div>
                </div>
              )}

              {/* Subscription Expiry Info - For active subscribers */}
              {session && isSubscribed && expiryDate && (
                <div className="max-w-2xl mx-auto mb-6">
                  <div className="text-center text-sm text-white/40">
                    {language === 'ko' ? '이용 기간: ' : 'Subscription valid until: '}
                    <span className="text-white/60 font-medium">{expiryDate}</span>
                    {(() => {
                      const daysLeft = Math.ceil((new Date(expiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                      if (daysLeft <= 7 && daysLeft > 0) {
                        return (
                          <span className="ml-2 text-amber-400">
                            ({language === 'ko' ? `${daysLeft}일 남음` : `${daysLeft} days left`})
                          </span>
                        );
                      }
                      return null;
                    })()}
                  </div>
                </div>
              )}

              {/* Review & Profile Widgets - For logged in users */}
              {session && isSubscribed && (correctionsToReview > 0 || !hasProfile) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl mx-auto mb-6">
                  {/* Review Reminder Widget */}
                  {correctionsToReview > 0 && (
                    <button
                      onClick={() => router.push('/review')}
                      className="relative group p-4 rounded-2xl bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/20 hover:border-amber-500/40 transition-all text-left"
                    >
                      <div className="absolute inset-0 rounded-2xl bg-amber-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="relative flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center">
                          <svg className="w-6 h-6 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-white font-medium">
                              {language === 'ko' ? '복습할 항목' : 'Due for Review'}
                            </span>
                            <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-xs font-bold">
                              {correctionsToReview}
                            </span>
                          </div>
                          <p className="text-white/40 text-xs mt-0.5">
                            {language === 'ko' ? '지금 복습하고 기억을 강화하세요' : 'Strengthen your memory now'}
                          </p>
                        </div>
                        <svg className="w-5 h-5 text-white/30 group-hover:text-white/60 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </button>
                  )}

                  {/* Profile Setup Widget */}
                  {!hasProfile && (
                    <button
                      onClick={() => router.push('/profile')}
                      className="relative group p-4 rounded-2xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 hover:border-indigo-500/40 transition-all text-left"
                    >
                      <div className="absolute inset-0 rounded-2xl bg-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="relative flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center">
                          <svg className="w-6 h-6 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-white font-medium">
                              {language === 'ko' ? '학습 프로필 설정' : 'Set Up Profile'}
                            </span>
                            <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 text-xs">
                              {language === 'ko' ? '추천' : 'New'}
                            </span>
                          </div>
                          <p className="text-white/40 text-xs mt-0.5">
                            {language === 'ko' ? '맞춤형 학습을 위해 프로필을 완성하세요' : 'Complete your profile for personalized learning'}
                          </p>
                        </div>
                        <svg className="w-5 h-5 text-white/30 group-hover:text-white/60 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </button>
                  )}
                </div>
              )}

              {/* Progress Bar for debate unlock - only show when user has started */}
              {session && isSubscribed && !canAccessDebate && sessionCount > 0 && (
                <div className="max-w-md mx-auto mb-6">
                  <div className="flex items-center justify-between text-xs text-white/40 mb-2">
                    <span>{language === 'ko' ? '디베이트 모드 잠금 해제' : 'Unlock Debate Mode'}</span>
                    <span>{sessionCount}/5</span>
                  </div>
                  <div className="relative h-2 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-purple-500 via-pink-500 to-amber-500 transition-all duration-1000"
                      style={{ width: `${(sessionCount / 5) * 100}%` }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
                  </div>
                </div>
              )}

              {/* Recent Lesson History */}
              {session && isSubscribed && lessonHistory.length > 0 && (
                <div className="max-w-2xl mx-auto mt-8">
                  <h3 className="text-sm font-medium text-white/40 uppercase tracking-wider mb-4 text-center">
                    {language === 'ko' ? '최근 학습 기록' : 'Recent Lessons'}
                  </h3>
                  <div className="space-y-3">
                    {lessonHistory.map((lesson, idx) => (
                      <div
                        key={idx}
                        className="p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${
                              lesson.tutor === 'emma' ? 'from-rose-400 to-pink-500' :
                              lesson.tutor === 'james' ? 'from-blue-400 to-indigo-500' :
                              lesson.tutor === 'charlotte' ? 'from-violet-400 to-purple-500' :
                              'from-emerald-400 to-teal-500'
                            } flex items-center justify-center text-white font-bold text-sm`}>
                              {lesson.tutor ? lesson.tutor[0].toUpperCase() : '?'}
                            </div>
                            <div>
                              <p className="text-white font-medium capitalize">{lesson.tutor || 'Unknown'}</p>
                              <p className="text-white/40 text-xs">{lesson.dateTime}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            {lesson.level && (
                              <span className="inline-block px-2 py-1 rounded-full bg-blue-500/20 text-blue-400 text-xs font-medium">
                                {lesson.level}
                              </span>
                            )}
                            {lesson.duration > 0 && (
                              <p className="text-white/40 text-xs mt-1">{lesson.duration}{language === 'ko' ? '분' : 'min'}</p>
                            )}
                          </div>
                        </div>
                        {lesson.topicSummary && (
                          <p className="text-white/60 text-sm mb-2 line-clamp-1">{lesson.topicSummary}</p>
                        )}
                        {lesson.keyCorrections && (
                          <p className="text-amber-400/70 text-xs">
                            <span className="text-white/30">{language === 'ko' ? '교정: ' : 'Corrections: '}</span>
                            {lesson.keyCorrections}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Mode Tabs */}
        {session && isSubscribed && (
          <section className={`pb-6 transition-all duration-1000 delay-200 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            <div className="max-w-6xl mx-auto px-4 sm:px-6">
              <div className="flex justify-center">
                <div className="inline-flex p-1.5 rounded-2xl bg-white/5 border border-white/10">
                  <button
                    onClick={() => setActiveTab('talk')}
                    className={`px-6 sm:px-8 py-3 rounded-xl font-medium transition-all ${
                      activeTab === 'talk'
                        ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/25'
                        : 'text-white/50 hover:text-white'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                      </svg>
                      Talk
                    </span>
                  </button>
                  <button
                    onClick={() => setActiveTab('debate')}
                    className={`px-6 sm:px-8 py-3 rounded-xl font-medium transition-all relative ${
                      activeTab === 'debate'
                        ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/25'
                        : 'text-white/50 hover:text-white'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
                      </svg>
                      Debate
                      {!canAccessDebate && (
                        <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                      )}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Talk Mode Content */}
        {(!session || !isSubscribed || activeTab === 'talk') && (
          <section className={`py-8 sm:py-12 transition-all duration-1000 delay-300 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            <div className="max-w-6xl mx-auto px-4 sm:px-6">

              {/* Not Logged In State */}
              {!session && (
                <div className="max-w-md mx-auto text-center py-12">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-white/10 flex items-center justify-center mx-auto mb-6">
                    <svg className="w-10 h-10 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-3">{t.loginRequired}</h3>
                  <p className="text-white/50 mb-6">{language === 'ko' ? '간편하게 시작하세요' : 'Get started easily'}</p>
                  <div className="flex flex-col gap-3">
                    <button
                      onClick={handleGoogleSignIn}
                      className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-white text-black font-medium hover:bg-white/90 transition-all hover:scale-105"
                    >
                      <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                      </svg>
                      {t.continueWithGoogle}
                    </button>
                    <button
                      onClick={() => signIn('kakao')}
                      className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#FEE500] text-[#191919] font-medium hover:bg-[#FDD800] transition-all hover:scale-105"
                    >
                      <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path fill="#191919" d="M12 3C6.477 3 2 6.463 2 10.691c0 2.72 1.8 5.108 4.5 6.454-.144.522-.926 3.36-.962 3.587 0 0-.02.166.088.229.108.063.235.014.235.014.31-.043 3.59-2.357 4.156-2.759.647.09 1.314.138 1.983.138 5.523 0 10-3.463 10-7.663S17.523 3 12 3z"/>
                      </svg>
                      {t.continueWithKakao}
                    </button>
                  </div>
                </div>
              )}

              {/* Beta Signup States */}
              {session && subscriptionStatus === 'not_found' && (
                <div className="max-w-md mx-auto text-center py-12">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-white/10 flex items-center justify-center mx-auto mb-6">
                    <svg className="w-10 h-10 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-3">{language === 'ko' ? '베타 서비스 신청' : 'Join Beta'}</h3>
                  <p className="text-white/50 mb-6">{t.betaSignupPrompt}</p>
                  {signupMessage && (
                    <div className="mb-4 p-4 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-300 text-sm">
                      {signupMessage}
                    </div>
                  )}
                  <button
                    onClick={handleBetaSignup}
                    disabled={isSigningUp}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium hover:opacity-90 transition-all disabled:opacity-50"
                  >
                    {isSigningUp ? t.signingUp : t.betaSignupButton}
                  </button>
                </div>
              )}

              {session && subscriptionStatus === 'pending' && (
                <div className="max-w-md mx-auto text-center py-12">
                  <div className="w-20 h-20 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-6">
                    <svg className="w-10 h-10 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-3">{language === 'ko' ? '검토 중' : 'Under Review'}</h3>
                  <p className="text-white/50">{t.betaPending}</p>
                </div>
              )}

              {session && (subscriptionStatus === 'expired' || subscriptionStatus === 'inactive') && (
                <div className="max-w-md mx-auto text-center py-12">
                  <div className="w-20 h-20 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-6">
                    <svg className="w-10 h-10 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-3">{subscriptionStatus === 'expired' ? (language === 'ko' ? '만료됨' : 'Expired') : (language === 'ko' ? '비활성화됨' : 'Inactive')}</h3>
                  <p className="text-white/50">{subscriptionStatus === 'expired' ? t.betaExpired : t.betaInactive}</p>
                </div>
              )}

              {/* Main Content - Subscribed User */}
              {session && isSubscribed && (
                <>
                  {/* Microphone Test */}
                  <div className="max-w-md mx-auto mb-10">
                    <div className="p-5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-400/20 to-emerald-400/20 flex items-center justify-center">
                          <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                          </svg>
                        </div>
                        <div>
                          <h3 className="font-medium text-white">{t.testMicrophone}</h3>
                          <p className="text-sm text-white/40">{t.micTestHint}</p>
                        </div>
                      </div>

                      {!isTesting ? (
                        <button
                          onClick={startMicTest}
                          className="w-full py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white transition-all flex items-center justify-center gap-2"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                          </svg>
                          {t.clickToTest}
                        </button>
                      ) : (
                        <div className="space-y-3">
                          {testStatus === 'recording' && (
                            <div className="flex items-center justify-between py-3 px-4 rounded-xl bg-red-500/10 border border-red-500/20">
                              <div className="flex items-center gap-3">
                                <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
                                <span className="text-white/70">{t.recording}</span>
                              </div>
                              <button onClick={stopMicTest} className="text-sm text-white/50 hover:text-white">{t.stop}</button>
                            </div>
                          )}
                          {testStatus === 'processing' && (
                            <div className="flex items-center justify-center gap-3 py-4">
                              <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                              <span className="text-white/70">{t.processing}</span>
                            </div>
                          )}
                          {(testStatus === 'success' || testStatus === 'error') && (
                            <div className={`p-4 rounded-xl ${testStatus === 'success' ? 'bg-green-500/10 border border-green-500/20' : 'bg-red-500/10 border border-red-500/20'}`}>
                              <p className={`text-sm ${testStatus === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                                {testStatus === 'success' ? t.weHeard : t.error}
                              </p>
                              <p className="text-white mt-1">&ldquo;{testResult}&rdquo;</p>
                              <button
                                onClick={() => { setIsTesting(false); setTestResult(null); setTestStatus('idle'); }}
                                className="mt-3 text-sm text-white/50 hover:text-white"
                              >
                                {t.testAgain}
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Tutor Selection - Team Style */}
                  <div className="mb-12">
                    <div className="text-center mb-10">
                      <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">
                        {language === 'ko' ? 'AI 튜터를 선택하세요' : 'Meet Your AI Tutors'}
                      </h2>
                      <p className="text-white/50">
                        {language === 'ko' ? '원어민 발음의 AI 튜터와 자유롭게 대화하세요' : 'Practice with native-speaking AI tutors'}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
                      {personas.map((persona) => {
                        const { desc, style } = getPersonaDescription(persona.id);
                        const isSelected = selectedPersona === persona.id;

                        return (
                          <button
                            key={persona.id}
                            onClick={() => setSelectedPersona(persona.id)}
                            className={`group relative text-center transition-all duration-300 ${
                              isSelected ? 'scale-[1.02]' : 'hover:scale-[1.02]'
                            }`}
                          >
                            {/* Card Container */}
                            <div className={`relative rounded-3xl overflow-hidden transition-all duration-300 ${
                              isSelected
                                ? 'bg-gradient-to-b from-purple-500/20 to-transparent ring-2 ring-purple-500'
                                : 'bg-gradient-to-b from-white/5 to-transparent hover:from-white/10'
                            }`}>
                              {/* Large Profile Image - No circular frame */}
                              <div className="relative h-44 sm:h-56 lg:h-72 overflow-hidden">
                                {/* Background Glow */}
                                <div className={`absolute bottom-0 left-1/2 -translate-x-1/2 w-full h-2/3 bg-gradient-to-t ${persona.gradient} rounded-full blur-3xl opacity-30 group-hover:opacity-50 transition-opacity`} />

                                {/* Tutor Image - Large cutout style filling the card */}
                                <div className="absolute inset-0">
                                  <Image
                                    src={`/tutors/${persona.id}.png`}
                                    alt={persona.name}
                                    fill
                                    className={`object-cover transition-transform duration-500 contrast-[1.02] ${
                                      persona.id === 'emma' ? 'scale-110 group-hover:scale-115 object-top' :
                                      persona.id === 'james' ? 'scale-105 group-hover:scale-110 object-top' :
                                      persona.id === 'charlotte' ? 'scale-110 group-hover:scale-115 object-top' :
                                      persona.id === 'alina' ? 'scale-110 group-hover:scale-115 object-top' :
                                      persona.id === 'henly' ? 'scale-110 group-hover:scale-115 object-top' :
                                      'scale-90 group-hover:scale-95 object-center'
                                    }`}
                                    style={{
                                      filter: 'drop-shadow(0 0 1px rgba(0,0,0,0.3))',
                                      objectPosition: persona.id === 'oliver' ? 'center 20%' : undefined
                                    }}
                                    onError={(e) => {
                                      const target = e.target as HTMLImageElement;
                                      target.src = `/tutors/${persona.id}.jpg`;
                                    }}
                                  />
                                </div>

                                {/* Selection Check */}
                                {isSelected && (
                                  <div className="absolute top-3 right-3 w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center shadow-lg shadow-purple-500/50 z-10">
                                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                    </svg>
                                  </div>
                                )}

                                {/* Flag Badge */}
                                <div className="absolute top-3 left-3 z-10 bg-white/90 backdrop-blur-sm rounded-md p-1 shadow-sm">
                                  <Flag country={persona.flag as 'US' | 'UK'} size={24} />
                                </div>
                              </div>

                              {/* Info Section */}
                              <div className="relative p-4 sm:p-5 bg-gradient-to-t from-black/40 to-transparent -mt-8 pt-12">
                                <h3 className="text-xl sm:text-2xl font-bold text-white mb-1">{persona.name}</h3>
                                <p className="text-white/60 text-sm mb-1">{desc}</p>
                                <p className="text-white/40 text-xs mb-4">{style}</p>

                                {/* Voice Preview Button */}
                                <button
                                  onClick={(e) => playVoicePreview(persona, e)}
                                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                                    playingVoice === persona.id
                                      ? 'bg-purple-500 text-white'
                                      : 'bg-white/10 text-white/70 hover:bg-white/20 hover:text-white'
                                  }`}
                                >
                                  {playingVoice === persona.id ? (
                                    <>
                                      <svg className="w-4 h-4 animate-pulse" fill="currentColor" viewBox="0 0 24 24">
                                        <rect x="6" y="4" width="4" height="16" rx="1" />
                                        <rect x="14" y="4" width="4" height="16" rx="1" />
                                      </svg>
                                      {t.playing}
                                    </>
                                  ) : (
                                    <>
                                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M8 5v14l11-7z" />
                                      </svg>
                                      {t.previewVoice}
                                    </>
                                  )}
                                </button>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Start Button */}
                  <div className="text-center">
                    <button
                      onClick={handleStart}
                      disabled={!selectedPersona}
                      className={`inline-flex items-center gap-3 px-8 py-4 rounded-2xl font-semibold text-lg transition-all duration-300 ${
                        selectedPersona
                          ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/25 hover:shadow-xl hover:shadow-purple-500/30 hover:scale-105'
                          : 'bg-white/10 text-white/30 cursor-not-allowed'
                      }`}
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                      </svg>
                      {t.startConversation}
                    </button>
                    {!selectedPersona && (
                      <p className="text-white/30 text-sm mt-4">{t.selectTutorPrompt}</p>
                    )}
                  </div>
                </>
              )}
            </div>
          </section>
        )}

        {/* Debate Mode Content */}
        {session && isSubscribed && activeTab === 'debate' && (
          <section className={`py-8 sm:py-12 transition-all duration-500 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            <div className="max-w-2xl mx-auto px-4 sm:px-6">
              {canAccessDebate ? (
                /* Unlocked Debate */
                <div className="text-center">
                  <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-amber-500/25">
                    <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
                    </svg>
                  </div>

                  <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">{t.debateMode}</h2>
                  <p className="text-white/50 mb-8 max-w-md mx-auto">{t.debateDescription}</p>

                  {/* Features */}
                  <div className="grid grid-cols-3 gap-4 mb-8">
                    <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                      <div className="text-2xl mb-2">5</div>
                      <div className="text-xs text-white/40">{language === 'ko' ? '참가자' : 'Participants'}</div>
                    </div>
                    <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                      <div className="text-2xl mb-2">6</div>
                      <div className="text-xs text-white/40">{language === 'ko' ? '카테고리' : 'Categories'}</div>
                    </div>
                    <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                      <div className="text-2xl mb-2">AI</div>
                      <div className="text-xs text-white/40">{language === 'ko' ? '피드백' : 'Feedback'}</div>
                    </div>
                  </div>

                  <button
                    onClick={() => router.push('/debate')}
                    className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl font-semibold text-lg bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/25 hover:shadow-xl hover:shadow-amber-500/30 hover:scale-105 transition-all"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {t.startDebate}
                  </button>
                </div>
              ) : (
                /* Locked Debate */
                <div className="text-center">
                  <div className="w-24 h-24 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-6">
                    <svg className="w-12 h-12 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>

                  <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">{t.debateLocked}</h2>
                  <p className="text-white/50 mb-8">
                    {t.sessionsToUnlock.replace('{n}', String(5 - sessionCount))}
                  </p>

                  {/* Progress */}
                  <div className="max-w-xs mx-auto mb-8">
                    <div className="flex justify-between text-sm text-white/40 mb-2">
                      <span>{t.sessionsCompleted.replace('{n}', String(sessionCount))}</span>
                      <span>5</span>
                    </div>
                    <div className="h-3 rounded-full bg-white/10 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-500"
                        style={{ width: `${(sessionCount / 5) * 100}%` }}
                      />
                    </div>
                  </div>

                  <button
                    onClick={() => setActiveTab('talk')}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                    {language === 'ko' ? 'Talk 모드로 연습하기' : 'Practice with Talk Mode'}
                  </button>
                </div>
              )}
            </div>
          </section>
        )}

        {/* How It Works - Only for non-logged in users */}
        {!session && (
          <>
            {/* Feature Showcase */}
            <section className={`py-12 sm:py-20 transition-all duration-1000 delay-300 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
              <div className="max-w-6xl mx-auto px-4 sm:px-6">
                {/* Section Header */}
                <div className="text-center mb-12">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-medium mb-4">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                    </svg>
                    {language === 'ko' ? '핵심 기능' : 'Key Features'}
                  </div>
                  <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-4">
                    {language === 'ko' ? '왜 TapTalk인가?' : 'Why TapTalk?'}
                  </h2>
                  <p className="text-white/50 max-w-lg mx-auto">
                    {language === 'ko'
                      ? 'AI 기술로 실제 원어민과 대화하는 것처럼 자연스러운 영어 회화를 연습하세요'
                      : 'Practice natural English conversations as if talking to a native speaker, powered by AI'}
                  </p>
                </div>

                {/* Feature Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                  {/* Real-time Feedback */}
                  <div className="group relative p-6 sm:p-8 rounded-2xl bg-gradient-to-br from-purple-500/10 to-pink-500/5 border border-purple-500/20 hover:border-purple-500/40 transition-all overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl group-hover:bg-purple-500/20 transition-all" />
                    <div className="relative">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-lg shadow-purple-500/20">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <h3 className="text-xl font-bold text-white mb-2">{language === 'ko' ? '실시간 피드백' : 'Real-time Feedback'}</h3>
                      <p className="text-white/50 leading-relaxed">
                        {language === 'ko'
                          ? '문법, 발음, 표현을 즉시 교정받고 자연스러운 영어를 배우세요'
                          : 'Get instant corrections on grammar, pronunciation, and expressions'}
                      </p>
                      {/* Mini Dashboard Preview */}
                      <div className="mt-6 p-4 rounded-xl bg-white/5 border border-white/10">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
                            <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                          <div className="flex-1">
                            <div className="text-xs text-white/40 mb-1">Accuracy</div>
                            <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                              <div className="h-full w-[85%] rounded-full bg-gradient-to-r from-green-400 to-emerald-400" />
                            </div>
                          </div>
                          <span className="text-sm font-bold text-green-400">85%</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                            <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                            </svg>
                          </div>
                          <div className="flex-1">
                            <div className="text-xs text-white/40 mb-1">Fluency</div>
                            <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                              <div className="h-full w-[72%] rounded-full bg-gradient-to-r from-blue-400 to-cyan-400" />
                            </div>
                          </div>
                          <span className="text-sm font-bold text-blue-400">72%</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* AI Tutors */}
                  <div className="group relative p-6 sm:p-8 rounded-2xl bg-gradient-to-br from-blue-500/10 to-cyan-500/5 border border-blue-500/20 hover:border-blue-500/40 transition-all overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl group-hover:bg-blue-500/20 transition-all" />
                    <div className="relative">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-lg shadow-blue-500/20">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                      </div>
                      <h3 className="text-xl font-bold text-white mb-2">{language === 'ko' ? '다양한 AI 튜터' : 'Multiple AI Tutors'}</h3>
                      <p className="text-white/50 leading-relaxed">
                        {language === 'ko'
                          ? '미국/영국 발음의 4명의 AI 튜터 중 선택하세요'
                          : 'Choose from 4 AI tutors with American or British accents'}
                      </p>
                      {/* Tutor Preview */}
                      <div className="mt-6 flex items-center gap-3">
                        {[
                          { name: 'E', gradient: 'from-rose-400 to-pink-500', flag: 'US' as const },
                          { name: 'J', gradient: 'from-blue-400 to-indigo-500', flag: 'US' as const },
                          { name: 'C', gradient: 'from-violet-400 to-purple-500', flag: 'UK' as const },
                          { name: 'O', gradient: 'from-emerald-400 to-teal-500', flag: 'UK' as const },
                        ].map((tutor, i) => (
                          <div
                            key={i}
                            className="relative group/tutor"
                            style={{ animationDelay: `${i * 100}ms` }}
                          >
                            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${tutor.gradient} flex items-center justify-center text-white font-bold shadow-lg group-hover/tutor:scale-110 transition-transform cursor-pointer`}>
                              {tutor.name}
                            </div>
                            <span className="absolute -top-1 -right-1 bg-white rounded shadow-sm">
                              <Flag country={tutor.flag} size={16} />
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Voice Recognition */}
                  <div className="group relative p-6 sm:p-8 rounded-2xl bg-gradient-to-br from-amber-500/10 to-orange-500/5 border border-amber-500/20 hover:border-amber-500/40 transition-all overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl group-hover:bg-amber-500/20 transition-all" />
                    <div className="relative">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-lg shadow-amber-500/20">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                        </svg>
                      </div>
                      <h3 className="text-xl font-bold text-white mb-2">{language === 'ko' ? '음성 인식' : 'Voice Recognition'}</h3>
                      <p className="text-white/50 leading-relaxed">
                        {language === 'ko'
                          ? '말하기만 하면 AI가 자동으로 인식하고 응답합니다'
                          : 'Just speak and AI automatically recognizes and responds'}
                      </p>
                      {/* Voice Animation Preview */}
                      <div className="mt-6 flex items-center justify-center gap-1 h-12">
                        {[...Array(12)].map((_, i) => (
                          <div
                            key={i}
                            className="w-1 bg-gradient-to-t from-amber-500 to-orange-400 rounded-full voice-bar"
                            style={{
                              height: `${12 + Math.sin(i * 0.8) * 20}px`,
                              animationDelay: `${i * 0.1}s`,
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Debate Mode */}
                  <div className="group relative p-6 sm:p-8 rounded-2xl bg-gradient-to-br from-green-500/10 to-emerald-500/5 border border-green-500/20 hover:border-green-500/40 transition-all overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/10 rounded-full blur-3xl group-hover:bg-green-500/20 transition-all" />
                    <div className="relative">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg shadow-green-500/20">
                          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
                          </svg>
                        </div>
                        <span className="px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 text-xs font-medium">NEW</span>
                      </div>
                      <h3 className="text-xl font-bold text-white mb-2">{language === 'ko' ? '디베이트 모드' : 'Debate Mode'}</h3>
                      <p className="text-white/50 leading-relaxed">
                        {language === 'ko'
                          ? 'AI 토론자들과 함께 영어 토론 실력을 키우세요'
                          : 'Improve your debate skills with AI debaters'}
                      </p>
                      {/* Debate Preview */}
                      <div className="mt-6 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="flex -space-x-2">
                            <div className="w-8 h-8 rounded-full bg-green-500 border-2 border-[#0a0a0f] flex items-center justify-center text-xs text-white font-bold">P</div>
                            <div className="w-8 h-8 rounded-full bg-green-600 border-2 border-[#0a0a0f] flex items-center justify-center text-xs text-white font-bold">U</div>
                          </div>
                          <span className="text-xs text-green-400 font-medium">Pro Team</span>
                        </div>
                        <span className="text-white/30 font-bold">VS</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-red-400 font-medium">Con Team</span>
                          <div className="flex -space-x-2">
                            <div className="w-8 h-8 rounded-full bg-red-500 border-2 border-[#0a0a0f] flex items-center justify-center text-xs text-white font-bold">A</div>
                            <div className="w-8 h-8 rounded-full bg-red-600 border-2 border-[#0a0a0f] flex items-center justify-center text-xs text-white font-bold">B</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* How It Works Steps */}
            <section className={`py-12 sm:py-20 transition-all duration-1000 delay-500 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
              <div className="max-w-6xl mx-auto px-4 sm:px-6">
                <div className="text-center mb-12">
                  <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
                    {t.howItWorks}
                  </h2>
                </div>

                <div className="relative">
                  {/* Connection Line */}
                  <div className="hidden sm:block absolute top-1/2 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-y-1/2" />

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8">
                    {[
                      { num: '01', title: t.step1Title, desc: t.step1Desc, gradient: 'from-purple-500 to-pink-500', iconPath: 'M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z' },
                      { num: '02', title: t.step2Title, desc: t.step2Desc, gradient: 'from-blue-500 to-cyan-500', iconPath: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
                      { num: '03', title: t.step3Title, desc: t.step3Desc, gradient: 'from-amber-500 to-orange-500', iconPath: 'M13 10V3L4 14h7v7l9-11h-7z' },
                    ].map((step, i) => (
                      <div
                        key={i}
                        className="relative group"
                        style={{ animationDelay: `${i * 150}ms` }}
                      >
                        <div className="relative p-6 rounded-2xl bg-white/5 border border-white/10 group-hover:bg-white/10 group-hover:border-white/20 transition-all">
                          {/* Step Number Circle */}
                          <div className="absolute -top-4 left-1/2 -translate-x-1/2 sm:relative sm:top-0 sm:left-0 sm:translate-x-0 sm:mb-4">
                            <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${step.gradient} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
                              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={step.iconPath} /></svg>
                            </div>
                          </div>
                          <div className="pt-6 sm:pt-0">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-xs text-white/30 font-mono">STEP {step.num}</span>
                            </div>
                            <h3 className="text-lg font-bold text-white mb-2">{step.title}</h3>
                            <p className="text-white/50 text-sm leading-relaxed">{step.desc}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* CTA Button */}
                <div className="text-center mt-12">
                  <button
                    onClick={() => router.push('/login')}
                    className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl font-semibold text-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/25 hover:shadow-xl hover:shadow-purple-500/40 hover:scale-105 transition-all animate-breathe"
                  >
                    {language === 'ko' ? '무료체험 신청하기' : 'Start Free Trial'}
                  </button>
                  <p className="text-white/30 text-sm mt-4">
                    {language === 'ko' ? '신용카드 없이 바로 시작' : 'No credit card required'}
                  </p>
                </div>
              </div>
            </section>
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-8 border-t border-white/5">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center">
          <p className="text-white/30 text-sm">{t.footer}</p>
        </div>
      </footer>

      {/* Native Sign-In Error Display (for debugging) */}
      {nativeSignInError && (
        <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-red-900/95 border-t border-red-500/50 backdrop-blur-sm">
          <div className="max-w-lg mx-auto">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center">
                <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-red-200">
                  {language === 'ko' ? 'Native 로그인 오류:' : 'Native Sign-In Error:'}
                </p>
                <p className="text-xs text-red-300/80 mt-1 break-all">{nativeSignInError}</p>
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button
                onClick={handleWebSignIn}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
              >
                {language === 'ko' ? '웹 로그인 사용' : 'Use Web Sign-In'}
              </button>
              <button
                onClick={() => setNativeSignInError(null)}
                className="px-4 py-2 text-sm font-medium text-red-300 hover:text-red-200 transition-colors"
              >
                {language === 'ko' ? '닫기' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
