'use client';

import { useState, useEffect, useRef, useCallback, useMemo, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { useSession, signIn, signOut } from 'next-auth/react';
import Link from 'next/link';
import Image from 'next/image';
import { useLanguage, LanguageToggle } from '@/lib/i18n';
import { Flag } from '@/components/Icons';
import TapTalkLogo from '@/components/TapTalkLogo';
import ThemeToggle from '@/components/ThemeToggle';
import DashboardStats from '@/components/home/DashboardStats';
import HeroSection from '@/components/hero/HeroSection';
import QuickActions from '@/components/home/QuickActions';
import LessonHistory from '@/components/home/LessonHistory';
import XPBar from '@/components/gamification/XPBar';
import DailyChallengeCard from '@/components/gamification/DailyChallengeCard';
import OnboardingFlow from '@/components/onboarding/OnboardingFlow';
import BottomNav from '@/components/BottomNav';
import { getTodayChallenge } from '@/lib/dailyChallenges';
import { usePushNotifications } from '@/hooks/usePushNotifications';
// Helper function to check if running in Android WebView (Capacitor app)
function isAndroidWebView(): boolean {
  if (typeof window === 'undefined') return false;

  const userAgent = navigator.userAgent;
  const isAndroid = /Android/i.test(userAgent);
  return isAndroid;
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
    id: 'henry',
    name: 'Henry',
    nationality: 'american',
    gender: 'male',
    voice: 'alloy',
    gradient: 'from-lime-400 to-green-500',
    flag: 'US',
    sampleText: "Hey hey! I'm Henry! Wanna know something cool? I love asking questions! So, what do you wanna talk about?",
  },
];

// Grade level mapping for AI evaluation
const gradeMapping: Record<string, { grade: string; name: string; nameKo: string }> = {
  // CEFR levels (primary)
  'Pre-A1': { grade: 'Pre-A1', name: 'Beginner', nameKo: '입문' },
  'A1': { grade: 'A1', name: 'Elementary', nameKo: '초급' },
  'A2': { grade: 'A2', name: 'Pre-Intermediate', nameKo: '초중급' },
  'B1': { grade: 'B1', name: 'Intermediate', nameKo: '중급' },
  'B2': { grade: 'B2', name: 'Upper-Intermediate', nameKo: '중상급' },
  'C1': { grade: 'C1', name: 'Advanced', nameKo: '고급' },
  'C2': { grade: 'C2', name: 'Proficient', nameKo: '최상급' },
  // Legacy US Grade backward compatibility
  'K': { grade: 'Pre-A1', name: 'Beginner', nameKo: '입문' },
  '1-2': { grade: 'A1', name: 'Elementary', nameKo: '초급' },
  '3-4': { grade: 'A1', name: 'Elementary', nameKo: '초급' },
  '5-6': { grade: 'A2', name: 'Pre-Intermediate', nameKo: '초중급' },
  '7-8': { grade: 'B1', name: 'Intermediate', nameKo: '중급' },
  '9-10': { grade: 'B2', name: 'Upper-Intermediate', nameKo: '중상급' },
  '11-12': { grade: 'C1', name: 'Advanced', nameKo: '고급' },
  'College': { grade: 'C2', name: 'Proficient', nameKo: '최상급' },
};

function HomePageContent() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { t, language } = useLanguage();
  const [selectedPersona, setSelectedPersona] = useState<string | null>(null);
  const [isSubscribed, setIsSubscribed] = useState<boolean | null>(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(null);
  const [expiryDate, setExpiryDate] = useState<string | null>(null);
  const [checkingSubscription, setCheckingSubscription] = useState(false);
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
    language?: string;
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

  // Video hover states
  const [hoveredTutor, setHoveredTutor] = useState<string | null>(null);
  const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({});
  const tutorFileNameMap: Record<string, string> = { henry: 'henry' };
  const getTutorFileName = (id: string) => tutorFileNameMap[id] || id;

  // Animation states
  const [mounted, setMounted] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  // Onboarding state
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Gamification state
  const [userXP, setUserXP] = useState(0);
  const [currentStreak, setCurrentStreak] = useState(0);

  // Push notifications (Android only) - register FCM token & handle scheduled calls
  usePushNotifications(!!session?.user?.email, (tutorId) => {
    router.push(`/incoming-call?tutor=${tutorId}`);
  });

  // State for native sign-in error debugging
  const [nativeSignInError, setNativeSignInError] = useState<string | null>(null);

  // Hero video state for non-logged-in landing (mobile fullscreen)
  const [heroTutorIndex, setHeroTutorIndex] = useState(0);
  const heroVideoRef = useRef<HTMLVideoElement | null>(null);

  // Combined hero video timeline - persona index mapped to video order
  // Video order: Emma, James, Charlotte, Oliver, Henry, Alina
  const heroTutorTimeline = useRef([
    { personaIdx: 0, start: 0, end: 7.44 },       // Emma
    { personaIdx: 1, start: 7.44, end: 14.16 },    // James
    { personaIdx: 2, start: 14.16, end: 21.64 },   // Charlotte
    { personaIdx: 3, start: 21.64, end: 28.20 },   // Oliver
    { personaIdx: 5, start: 28.20, end: 35.64 },   // Henry (personas[5])
    { personaIdx: 4, start: 35.64, end: 43.52 },   // Alina (personas[4])
  ]);

  // Handle Google Sign-In (native for Android, web for browser)
  const handleGoogleSignIn = useCallback(async () => {
    // Check at runtime if we're on Android (native app or mobile browser)
    const isAndroid = isAndroidWebView();
    if (isAndroid) {
      try {
        setIsGoogleLoading(true);
        setNativeSignInError(null);

        // Dynamic import for Capacitor plugin
        const { GoogleAuth } = await import('@codetrix-studio/capacitor-google-auth');

        // Initialize with Android client ID
        await GoogleAuth.initialize({
          clientId: '670234764770-sib307dj55oj4pg2d5cu1k27i7u5hith.apps.googleusercontent.com',
          scopes: ['profile', 'email'],
          grantOfflineAccess: true,
        });

        const result = await GoogleAuth.signIn();

        // Sign in with NextAuth using the Google credential
        await signIn('google-native', {
          idToken: result.authentication.idToken,
          email: result.email,
          name: result.name || result.givenName,
          image: result.imageUrl,
          redirect: false,
        });

        // Reload to update session
        window.location.reload();
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('[TapTalk] Native Google Sign-In error:', errorMessage);
        // Auto-fallback to web OAuth (works via "wv" removal in WebView)
        signIn('google');
        return;
      } finally {
        setIsGoogleLoading(false);
      }
    } else {
      // Web (desktop): use standard NextAuth
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

  // Sync hero tutor overlay with combined video timeline (throttled to 1/sec)
  useEffect(() => {
    const video = heroVideoRef.current;
    if (!video || session) return;
    let lastUpdate = 0;
    const onTimeUpdate = () => {
      const now = Date.now();
      if (now - lastUpdate < 800) return;
      lastUpdate = now;
      const t = video.currentTime;
      const timeline = heroTutorTimeline.current;
      for (let i = timeline.length - 1; i >= 0; i--) {
        if (t >= timeline[i].start) {
          setHeroTutorIndex((prev) => prev === timeline[i].personaIdx ? prev : timeline[i].personaIdx);
          break;
        }
      }
    };
    video.addEventListener('timeupdate', onTimeUpdate);
    return () => video.removeEventListener('timeupdate', onTimeUpdate);
  }, [session]);

  // Unlock demo videos on first user interaction (browser autoplay policy)
  useEffect(() => {
    if (session) return;
    const unlockVideos = () => {
      ['emma', 'james', 'charlotte'].forEach((id) => {
        const video = videoRefs.current[`demo-${id}`];
        if (video) {
          video.muted = true;
          video.play().then(() => video.pause()).catch(() => {});
        }
      });
      document.removeEventListener('click', unlockVideos);
      document.removeEventListener('scroll', unlockVideos);
      document.removeEventListener('mousemove', unlockVideos);
    };
    document.addEventListener('click', unlockVideos, { once: true });
    document.addEventListener('scroll', unlockVideos, { once: true });
    document.addEventListener('mousemove', unlockVideos, { once: true });
    return () => {
      document.removeEventListener('click', unlockVideos);
      document.removeEventListener('scroll', unlockVideos);
      document.removeEventListener('mousemove', unlockVideos);
    };
  }, [session]);

  useEffect(() => {
    if (!session?.user?.email) return;
    const controller = new AbortController();
    checkSubscription(controller.signal);
    return () => controller.abort();
  // eslint-disable-next-line react-hooks/exhaustive-deps
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

          const response = await fetch('/api/speech-to-text', {
            method: 'POST',
            body: formData,
          });

          const data = await response.json();

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

  const checkSubscription = async (signal: AbortSignal) => {
    setCheckingSubscription(true);
    try {
      // Fetch subscription data first (other calls may depend on it)
      const res = await fetch('/api/check-subscription', { signal });
      const data = await res.json();
      setIsSubscribed(data.subscribed);
      setSubscriptionStatus(data.status || (data.subscribed ? 'active' : 'not_found'));
      setExpiryDate(data.expiryDate || null);
      setSessionCount(data.sessionCount || 0);
      setEvaluatedGrade(data.evaluatedGrade || null);
      setLevelDetails(data.levelDetails || null);
      if (data.xp !== undefined) setUserXP(data.xp);
      if (data.currentStreak !== undefined) setCurrentStreak(data.currentStreak);

      // Fetch independent data in parallel
      const [historyResult, correctionsResult, profileResult] = await Promise.allSettled([
        fetch('/api/lesson-history', { signal }).then((r) => r.json()),
        fetch('/api/corrections?due=true&limit=100', { signal }).then((r) => r.json()),
        fetch('/api/user-profile', { signal }).then((r) => r.json()),
      ]);

      if (historyResult.status === 'fulfilled' && historyResult.value.lessons) {
        setLessonHistory(historyResult.value.lessons.slice(0, 5));
      }

      if (correctionsResult.status === 'fulfilled') {
        setCorrectionsToReview(correctionsResult.value.count || 0);
      }

      if (profileResult.status === 'fulfilled') {
        const profileData = profileResult.value;
        setHasProfile(!!profileData.profile);

        // Auto-sync device timezone if schedule exists and timezone changed
        const schedule = profileData.profile?.schedule;
        if (schedule?.enabled) {
          const deviceTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
          if (schedule.timezone !== deviceTz) {
            fetch('/api/user-profile', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ schedule: { ...schedule, timezone: deviceTz } }),
            }).catch(() => {});
          }
        }

        // Show onboarding only for logged-in subscribers who haven't completed it
        const onboardingComplete = localStorage?.getItem('taptalk-onboarding-complete');
        if (!onboardingComplete && data.subscribed && !profileData.profile) {
          setShowOnboarding(true);
        }
      }
    } catch (err) {
      // Do not grant access on error. AbortError means component unmounted — ignore silently.
      if (err instanceof Error && err.name === 'AbortError') return;
      setIsSubscribed(false);
      setSubscriptionStatus('error');
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
      henry: { desc: t.henryDesc, style: t.henryStyle },
    };
    return descriptions[id] || { desc: '', style: '' };
  };

  const canAccessDebate = !checkingSubscription && sessionCount >= 5;

  const particlePositions = useMemo(
    () =>
      [...Array(8)].map(() => ({
        left: Math.random() * 100,
        top: Math.random() * 100,
        duration: 5 + Math.random() * 10,
        delay: Math.random() * 5,
      })),
    []
  );
  const currentLevel = evaluatedGrade && gradeMapping[evaluatedGrade] ? gradeMapping[evaluatedGrade] : null;

  return (
    <div className="min-h-screen bg-theme dark:text-white text-zinc-900 overflow-hidden">
      {/* Animated Background - Dark only (GPU-promoted layer) */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none" style={{ willChange: 'transform', contain: 'strict' }}>
        {/* Morphing Gradient Blobs - Dark, desktop only (mobile: static, reduced blur) */}
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-gradient-to-br from-purple-600/30 to-pink-600/20 rounded-full blur-[40px] md:blur-[100px] md:animate-morph" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-gradient-to-br from-blue-600/25 to-cyan-600/15 rounded-full blur-[40px] md:blur-[100px] md:animate-morph" style={{ animationDelay: '-2s' }} />
        <div className="absolute top-[40%] right-[20%] w-[350px] h-[350px] bg-gradient-to-br from-pink-500/15 to-orange-500/10 rounded-full blur-[30px] md:blur-[80px] md:animate-morph" style={{ animationDelay: '-4s' }} />
        <div className="absolute top-[60%] left-[10%] w-[250px] h-[250px] bg-gradient-to-br from-indigo-500/20 to-purple-500/10 rounded-full blur-[30px] md:blur-[60px] md:animate-float" />

        {/* Floating Particles - Dark only (reduced count for performance) */}
        {mounted && (
          <div className="absolute inset-0">
            {particlePositions.map((p, i) => (
              <div
                key={i}
                className="absolute w-1 h-1 bg-white/20 rounded-full"
                style={{
                  left: `${p.left}%`,
                  top: `${p.top}%`,
                  animation: `particle-float ${p.duration}s ease-in-out infinite`,
                  animationDelay: `${p.delay}s`,
                }}
              />
            ))}
          </div>
        )}

        {/* Grid Pattern - Dark only */}
        <div className="absolute inset-0 dark:bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[linear-gradient(rgba(0,0,0,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.03)_1px,transparent_1px)] bg-[size:64px_64px]" />

        {/* Radial Gradient Overlay - Dark only */}
        <div className="absolute inset-0 dark:bg-[radial-gradient(ellipse_at_center,transparent_0%,#020617_70%)] bg-[radial-gradient(ellipse_at_center,transparent_0%,#f8fafc_70%)]" />
      </div>

      {/* Header - safe area for notch/status bar */}
      <header style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }} className={`z-50 ${
        session
          ? 'relative border-b border-theme bg-theme/80 backdrop-blur-md'
          : 'absolute top-0 left-0 right-0 bg-transparent border-b dark:border-white/10 border-zinc-200/50 md:relative md:bg-theme/80 md:backdrop-blur-md md:border-theme'
      }`}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16 sm:h-20">
            {/* Logo */}
            <TapTalkLogo size="md" theme="auto" />

            {/* Right Side */}
            <div className="flex items-center gap-2 sm:gap-4">
              {/* Desktop: About link */}
              <Link
                href="/about"
                className="hidden sm:block text-theme-secondary hover:text-theme-primary text-sm font-medium transition-colors"
              >
                {language === 'ko' ? '소개' : 'About'}
              </Link>

              {/* Theme Toggle */}
              <ThemeToggle />

              {/* Desktop: Full language toggle, Mobile: Simple toggle */}
              <LanguageToggle />

              {status === 'loading' ? (
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white/10 animate-pulse" />
              ) : session ? (
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface border border-theme">
                    <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                    <span className="text-sm text-theme-secondary">{session.user?.name?.split(' ')[0]}</span>
                  </div>
                  {session.user?.image && (
                    <a
                      href="/profile"
                      title={language === 'ko' ? '프로필 설정' : 'Profile Settings'}
                      className="relative z-10 flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 -m-1 rounded-full"
                    >
                      <Image
                        src={session.user.image}
                        alt=""
                        width={40}
                        height={40}
                        className="w-8 h-8 sm:w-10 sm:h-10 rounded-full ring-2 dark:ring-white/10 ring-black/10 hover:ring-primary-400 transition-all cursor-pointer"
                        referrerPolicy="no-referrer"
                      />
                    </a>
                  )}
                  <button
                    onClick={() => signOut()}
                    className="p-1.5 sm:p-2 rounded-lg hover:bg-surface-hover transition-colors"
                    title={t.signOut}
                  >
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 text-theme-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                  </button>
                </div>
              ) : (
                <>
                  {/* Mobile: Single login button */}
                  <a
                    href="/login"
                    className="sm:hidden px-3 py-1.5 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm font-medium inline-block"
                  >
                    {language === 'ko' ? '로그인' : 'Login'}
                  </a>
                  {/* Desktop: Google + Kakao buttons */}
                  <div className="hidden sm:flex items-center gap-3">
                    <button
                      onClick={handleGoogleSignIn}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-surface backdrop-blur-sm border border-theme text-theme-primary font-medium hover:bg-surface-hover transition-all hover:scale-105 shadow-lg"
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
      <main id="main-content" className="relative z-10">
        {/* Fullscreen Tutor Video Hero - Mobile only, non-logged-in */}
        {!session && (
          <section
            className="relative h-screen flex items-end justify-center overflow-hidden md:hidden"
          >
            {/* Single combined hero video with proper poster */}
            <video
              ref={heroVideoRef}
              src="/tutors/tutors_hero.mp4"
              poster="/tutors/tutors_hero_poster.jpg"
              autoPlay
              loop
              muted
              playsInline
              preload="auto"
              className="absolute inset-0 w-full h-full object-cover"
            />

            {/* Gradient overlays */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/40" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/30 via-transparent to-black/30" />

            {/* Bottom Content Overlay */}
            <div className="relative z-10 w-full max-w-lg mx-auto px-6 pb-8 text-center">
              {/* Tutor Info - synced with video timeline */}
              <div className="mb-6 transition-opacity duration-500">
                <div className="inline-flex items-center gap-2 mb-3">
                  <div className="px-2 py-0.5 rounded bg-white/10 backdrop-blur-sm">
                    <Flag country={personas[heroTutorIndex].flag as 'US' | 'UK'} size={20} />
                  </div>
                  <span className="text-white/60 text-sm">
                    {personas[heroTutorIndex].nationality === 'american' ? 'American English' : 'British English'}
                  </span>
                </div>
                <h2 className="text-4xl sm:text-5xl font-bold text-white mb-2">
                  {personas[heroTutorIndex].name}
                </h2>
                <p className="text-white/60 text-sm">
                  {getPersonaDescription(personas[heroTutorIndex].id).desc}
                </p>
              </div>

              {/* Dot indicators - click to seek video */}
              <div className="flex justify-center gap-2 mb-6">
                {heroTutorTimeline.current.map((segment, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      if (heroVideoRef.current) {
                        heroVideoRef.current.currentTime = segment.start;
                      }
                    }}
                    className={`w-2 h-2 rounded-full transition-all ${
                      segment.personaIdx === heroTutorIndex ? 'w-6 bg-white' : 'bg-white/40 hover:bg-white/60'
                    }`}
                  />
                ))}
              </div>

              {/* CTA */}
              {session ? (
                <button
                  onClick={() => { document.getElementById('tutor-selection')?.scrollIntoView({ behavior: 'smooth' }); }}
                  className="block w-full py-4 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-500 text-white font-semibold text-lg shadow-lg shadow-purple-500/25 hover:shadow-xl hover:scale-[1.02] transition-all text-center"
                >
                  {language === 'ko' ? '튜터 선택하기' : 'Choose Tutor'}
                </button>
              ) : (
                <a
                  href="/login"
                  className="block w-full py-4 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-500 text-white font-semibold text-lg shadow-lg shadow-purple-500/25 hover:shadow-xl hover:scale-[1.02] transition-all text-center"
                >
                  {language === 'ko' ? '무료로 시작하기' : 'Start Free'}
                </a>
              )}

              {/* Scroll hint */}
              <div className="mt-6 animate-bounce">
                <svg className="w-6 h-6 mx-auto text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
              </div>
            </div>
          </section>
        )}

        {/* Hero Section */}
        <HeroSection
          typingText={typingText}
          language={language}
          t={t}
          mounted={mounted}
          isLoggedIn={!!session}
          onCtaClick={() => {
            if (session) {
              document.getElementById('tutor-selection')?.scrollIntoView({ behavior: 'smooth' });
            } else {
              signIn('google');
            }
          }}
        />

        {/* Dashboard & User Content */}
        <section className={`pb-8 sm:pb-12 transition-[opacity,transform] duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-4xl mx-auto">

              {/* Dashboard Stats - For logged in users with at least 1 session */}
              {session && isSubscribed && sessionCount > 0 && (
                <DashboardStats
                  sessionCount={sessionCount}
                  currentStreak={currentStreak}
                  currentLevel={currentLevel}
                  language={language}
                  canAccessDebate={canAccessDebate}
                />
              )}

              {/* Subscription Expiry Info - For active subscribers */}
              {session && isSubscribed && expiryDate && (
                <div className="max-w-2xl mx-auto mb-6">
                  <div className="text-center text-sm text-theme-muted">
                    {language === 'ko' ? '이용 기간: ' : 'Subscription valid until: '}
                    <span className="text-theme-secondary font-medium">{expiryDate}</span>
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
              {session && isSubscribed && (
                <QuickActions
                  correctionsToReview={correctionsToReview}
                  hasProfile={hasProfile}
                  language={language}
                  onNavigate={(path) => router.push(path)}
                />
              )}

              {/* Progress Bar for debate unlock - only show when user has started */}
              {session && isSubscribed && !canAccessDebate && sessionCount > 0 && (
                <div className="max-w-md mx-auto mb-6">
                  <div className="flex items-center justify-between text-xs text-theme-muted mb-2">
                    <span>{language === 'ko' ? '디베이트 모드 잠금 해제' : 'Unlock Debate Mode'}</span>
                    <span>{sessionCount}/5</span>
                  </div>
                  <div className="relative h-2 rounded-full dark:bg-white/10 bg-zinc-200 overflow-hidden">
                    <div
                      className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-purple-500 via-pink-500 to-amber-500 transition-all duration-1000"
                      style={{ width: `${(sessionCount / 5) * 100}%` }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
                  </div>
                </div>
              )}

              {/* Recent Lesson History */}
              {session && isSubscribed && (
                <LessonHistory
                  lessonHistory={lessonHistory}
                  language={language}
                />
              )}

              {/* Gamification Widgets - compact row below lesson history */}
              {session && isSubscribed && sessionCount > 0 && (
                <div className="max-w-4xl mx-auto mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* XP Progress */}
                  <div className="p-4 rounded-2xl bg-surface border border-theme">
                    <XPBar totalXP={userXP} />
                  </div>
                  {/* Daily Challenge */}
                  <DailyChallengeCard
                    challenge={getTodayChallenge()}
                    isComplete={false}
                    streakDays={currentStreak}
                    language={language}
                  />
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Mode Tabs */}
        {session && isSubscribed && (
          <section className={`pb-6 transition-[opacity,transform] duration-700 delay-100 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            <div className="max-w-6xl mx-auto px-4 sm:px-6">
              <div className="flex justify-center">
                <div className="inline-flex p-1.5 rounded-2xl bg-surface border border-theme">
                  <button
                    onClick={() => setActiveTab('talk')}
                    className={`px-6 sm:px-8 py-3 rounded-xl font-medium transition-all ${
                      activeTab === 'talk'
                        ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/25'
                        : 'text-theme-muted hover:text-theme-primary'
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
                        : 'text-theme-muted hover:text-theme-primary'
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
          <section className={`py-8 sm:py-12 transition-[opacity,transform] duration-700 delay-200 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">

              {/* Not Logged In State */}
              {!session && (
                <div className="max-w-md mx-auto text-center py-12">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-theme flex items-center justify-center mx-auto mb-6">
                    <svg className="w-10 h-10 text-theme-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-theme-primary mb-3">{t.loginRequired}</h3>
                  <p className="text-theme-secondary mb-6">{language === 'ko' ? '간편하게 시작하세요' : 'Get started easily'}</p>
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
              {session && !checkingSubscription && subscriptionStatus === 'not_found' && (
                <div className="max-w-md mx-auto text-center py-12">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-theme flex items-center justify-center mx-auto mb-6">
                    <svg className="w-10 h-10 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-theme-primary mb-3">{language === 'ko' ? '베타 서비스 신청' : 'Join Beta'}</h3>
                  <p className="text-theme-secondary mb-6">{t.betaSignupPrompt}</p>
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
                  <h3 className="text-xl font-semibold text-theme-primary mb-3">{language === 'ko' ? '검토 중' : 'Under Review'}</h3>
                  <p className="text-theme-secondary">{t.betaPending}</p>
                </div>
              )}

              {session && (subscriptionStatus === 'expired' || subscriptionStatus === 'inactive') && (
                <div className="max-w-md mx-auto text-center py-12">
                  <div className="w-20 h-20 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-6">
                    <svg className="w-10 h-10 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-theme-primary mb-3">{subscriptionStatus === 'expired' ? (language === 'ko' ? '만료됨' : 'Expired') : (language === 'ko' ? '비활성화됨' : 'Inactive')}</h3>
                  <p className="text-theme-secondary">{subscriptionStatus === 'expired' ? t.betaExpired : t.betaInactive}</p>
                </div>
              )}

              {/* Main Content - Subscribed User */}
              {session && isSubscribed && (
                <>
                  {/* Microphone Test */}
                  <div className="max-w-lg mx-auto mb-10">
                    <div className="p-5 rounded-2xl bg-surface border border-theme backdrop-blur-sm">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-400/20 to-emerald-400/20 flex items-center justify-center">
                          <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                          </svg>
                        </div>
                        <div>
                          <h3 className="font-medium text-theme-primary">{t.testMicrophone}</h3>
                          <p className="text-sm text-theme-muted">{t.micTestHint}</p>
                        </div>
                      </div>

                      {!isTesting ? (
                        <button
                          onClick={startMicTest}
                          className="w-full py-3 rounded-xl bg-surface-hover hover:bg-surface border border-theme text-theme-secondary hover:text-theme-primary transition-all flex items-center justify-center gap-2"
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
                                <span className="text-theme-secondary">{t.recording}</span>
                              </div>
                              <button onClick={stopMicTest} className="text-sm text-theme-muted hover:text-theme-primary">{t.stop}</button>
                            </div>
                          )}
                          {testStatus === 'processing' && (
                            <div className="flex items-center justify-center gap-3 py-4">
                              <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                              <span className="text-theme-secondary">{t.processing}</span>
                            </div>
                          )}
                          {(testStatus === 'success' || testStatus === 'error') && (
                            <div className={`p-4 rounded-xl ${testStatus === 'success' ? 'bg-green-500/10 border border-green-500/20' : 'bg-red-500/10 border border-red-500/20'}`}>
                              <p className={`text-sm ${testStatus === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                                {testStatus === 'success' ? t.weHeard : t.error}
                              </p>
                              <p className="text-theme-primary mt-1">&ldquo;{testResult}&rdquo;</p>
                              <button
                                onClick={() => { setIsTesting(false); setTestResult(null); setTestStatus('idle'); }}
                                className="mt-3 text-sm text-theme-muted hover:text-theme-primary"
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
                  <div id="tutor-selection" className="mb-12">
                    <div className="text-center mb-10">
                      <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-theme-primary mb-3">
                        {language === 'ko' ? 'AI 튜터를 선택하세요' : 'Meet Your AI Tutors'}
                      </h2>
                      <p className="text-theme-secondary">
                        {language === 'ko' ? '원어민 발음의 AI 튜터와 자유롭게 대화하세요' : 'Practice with native-speaking AI tutors'}
                      </p>
                      <div className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/20">
                        <svg className="w-4 h-4 text-indigo-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                        <span className="text-xs font-medium text-indigo-400">
                          {language === 'ko'
                            ? '13세 이하: IB 커리큘럼 기반 AI 튜터링'
                            : 'Ages 13 & under: IB curriculum-based AI tutoring'}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
                      {personas.map((persona) => {
                        const { desc, style } = getPersonaDescription(persona.id);
                        const isSelected = selectedPersona === persona.id;

                        return (
                          <button
                            key={persona.id}
                            onClick={() => {
                              setSelectedPersona(persona.id);
                              // Mobile: toggle video on tap
                              if ('ontouchstart' in window) {
                                if (hoveredTutor === persona.id) {
                                  setHoveredTutor(null);
                                  const video = videoRefs.current[persona.id];
                                  if (video) { video.pause(); video.currentTime = 0; video.muted = true; }
                                } else {
                                  // Stop previous video
                                  if (hoveredTutor) {
                                    const prev = videoRefs.current[hoveredTutor];
                                    if (prev) { prev.pause(); prev.currentTime = 0; prev.muted = true; }
                                  }
                                  setHoveredTutor(persona.id);
                                  const video = videoRefs.current[persona.id];
                                  if (video) { video.currentTime = 0; video.muted = true; video.play().then(() => { video.muted = false; }).catch(() => {}); }
                                }
                              }
                            }}
                            onMouseEnter={() => {
                              if ('ontouchstart' in window) return;
                              setHoveredTutor(persona.id);
                              const video = videoRefs.current[persona.id];
                              if (video) {
                                video.currentTime = 0;
                                video.muted = true;
                                video.play().then(() => {
                                  video.muted = false;
                                }).catch(() => {});
                              }
                            }}
                            onMouseLeave={() => {
                              if ('ontouchstart' in window) return;
                              setHoveredTutor(null);
                              const video = videoRefs.current[persona.id];
                              if (video) {
                                video.pause();
                                video.currentTime = 0;
                                video.muted = true;
                              }
                            }}
                            className={`group relative text-center transition-all duration-300 ${
                              isSelected ? 'scale-[1.02]' : 'hover:scale-[1.02]'
                            }`}
                          >
                            {/* Card Container */}
                            <div className={`relative rounded-3xl overflow-hidden transition-all duration-300 ${
                              isSelected
                                ? 'dark:bg-white/[0.04] bg-black/[0.03] ring-2 ring-purple-500'
                                : 'dark:bg-white/[0.04] bg-black/[0.03] dark:hover:bg-white/[0.06] hover:bg-black/[0.05]'
                            }`}>
                              {/* Video / Image Area */}
                              <div className="relative h-44 sm:h-56 lg:h-72 overflow-hidden dark:bg-slate-950 bg-zinc-100">
                                {/* Tutor Image (always visible as base layer) */}
                                <Image
                                  src={`/tutors/${getTutorFileName(persona.id)}.jpg`}
                                  alt={persona.name}
                                  fill
                                  className="absolute inset-0 w-full h-full object-cover"
                                />
                                {/* Tutor Video (plays on hover/tap, overlays image) */}
                                <video
                                  ref={(el) => { videoRefs.current[persona.id] = el; }}
                                  src={`/tutors/${getTutorFileName(persona.id)}_greeting.mp4`}
                                  muted
                                  loop
                                  playsInline
                                  preload="metadata"
                                  className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
                                    hoveredTutor === persona.id ? 'opacity-100' : 'opacity-0'
                                  }`}
                                />

                                {/* Selection Check */}
                                {isSelected && (
                                  <div className="absolute top-3 right-3 w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center shadow-lg shadow-purple-500/50 z-10">
                                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                    </svg>
                                  </div>
                                )}

                                {/* Flag Badge */}
                                <div className="absolute top-3 left-3 z-10 dark:bg-slate-900/80 bg-white/80 backdrop-blur-sm rounded-md p-1 shadow-sm">
                                  <Flag country={persona.flag as 'US' | 'UK'} size={24} />
                                </div>

                                {/* Play indicator on hover - desktop only */}
                                {hoveredTutor !== persona.id && (
                                  <div className="hidden md:flex absolute bottom-3 right-3 z-10 bg-black/50 backdrop-blur-sm rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity items-center justify-center">
                                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                                      <path d="M8 5v14l11-7z" />
                                    </svg>
                                  </div>
                                )}
                              </div>

                              {/* Info Section */}
                              <div className="relative p-4 sm:p-5 min-h-[100px] sm:min-h-[120px]">
                                <h3 className="text-xl sm:text-2xl font-bold text-theme-primary mb-1">{persona.name}</h3>
                                <p className="text-theme-secondary text-sm mb-1 line-clamp-1">{desc}</p>
                                <p className="text-theme-muted text-xs line-clamp-2">{style}</p>
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
                          : 'bg-surface text-theme-muted cursor-not-allowed'
                      }`}
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                      </svg>
                      {t.startConversation}
                    </button>
                    {!selectedPersona && (
                      <p className="text-theme-muted text-sm mt-4">{t.selectTutorPrompt}</p>
                    )}
                  </div>
                </>
              )}
            </div>
          </section>
        )}

        {/* Debate Mode Content */}
        {session && isSubscribed && activeTab === 'debate' && (
          <section className={`py-8 sm:py-12 transition-[opacity,transform] duration-500 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
              {canAccessDebate ? (
                /* Unlocked Debate */
                <div className="text-center">
                  <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-amber-500/25">
                    <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
                    </svg>
                  </div>

                  <h2 className="text-2xl sm:text-3xl font-bold text-theme-primary mb-4">{t.debateMode}</h2>
                  <p className="text-theme-secondary mb-8 max-w-md mx-auto">{t.debateDescription}</p>

                  {/* Features */}
                  <div className="grid grid-cols-3 gap-4 sm:gap-6 mb-8">
                    <div className="p-4 rounded-xl bg-surface border border-theme">
                      <div className="text-2xl mb-2">5</div>
                      <div className="text-xs text-theme-muted">{language === 'ko' ? '참가자' : 'Participants'}</div>
                    </div>
                    <div className="p-4 rounded-xl bg-surface border border-theme">
                      <div className="text-2xl mb-2">6</div>
                      <div className="text-xs text-theme-muted">{language === 'ko' ? '카테고리' : 'Categories'}</div>
                    </div>
                    <div className="p-4 rounded-xl bg-surface border border-theme">
                      <div className="text-2xl mb-2">AI</div>
                      <div className="text-xs text-theme-muted">{language === 'ko' ? '피드백' : 'Feedback'}</div>
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
                  <div className="w-24 h-24 rounded-3xl bg-surface border border-theme flex items-center justify-center mx-auto mb-6">
                    <svg className="w-12 h-12 text-theme-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>

                  <h2 className="text-2xl sm:text-3xl font-bold text-theme-primary mb-4">{t.debateLocked}</h2>
                  <p className="text-theme-secondary mb-8">
                    {t.sessionsToUnlock.replace('{n}', String(5 - sessionCount))}
                  </p>

                  {/* Progress */}
                  <div className="max-w-xs mx-auto mb-8">
                    <div className="flex justify-between text-sm text-theme-muted mb-2">
                      <span>{t.sessionsCompleted.replace('{n}', String(sessionCount))}</span>
                      <span>5</span>
                    </div>
                    <div className="h-3 rounded-full dark:bg-white/10 bg-zinc-200 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-500"
                        style={{ width: `${(sessionCount / 5) * 100}%` }}
                      />
                    </div>
                  </div>

                  <button
                    onClick={() => setActiveTab('talk')}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-surface hover:bg-surface-hover text-theme-primary transition-all"
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

        {/* Landing sections - Only for non-logged in users */}
        {!session && (
          <>
            {/* Product Demo Section - Conversation Mockup */}
            <section className={`py-16 sm:py-24 transition-[opacity,transform] duration-700 delay-200 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
              <div className="max-w-5xl mx-auto px-4 sm:px-6">
                {/* Tutor Video Showcase */}
                <div className="relative">
                  {/* Ambient glow */}
                  <div className="absolute -inset-10 bg-gradient-to-r from-purple-500/10 via-transparent to-pink-500/10 rounded-[3rem] blur-3xl pointer-events-none" />

                  <div className="grid grid-cols-3 gap-3 sm:gap-6 relative">
                    {[
                      { id: 'emma', name: 'Emma', gradient: 'from-rose-400 to-pink-500', flag: 'US' },
                      { id: 'james', name: 'James', gradient: 'from-blue-400 to-indigo-500', flag: 'US' },
                      { id: 'charlotte', name: 'Charlotte', gradient: 'from-violet-400 to-purple-500', flag: 'UK' },
                    ].map((tutor) => (
                      <div
                        key={tutor.id}
                        className="group relative rounded-2xl sm:rounded-3xl overflow-hidden dark:bg-neutral-950 bg-neutral-50 shadow-2xl shadow-black/20 aspect-[3/4] cursor-pointer"
                        onMouseEnter={() => {
                          const video = videoRefs.current[`demo-${tutor.id}`];
                          if (video) {
                            video.currentTime = 0;
                            video.muted = true;
                            video.play().then(() => {
                              video.muted = false;
                            }).catch(() => {});
                          }
                        }}
                        onMouseLeave={() => {
                          const video = videoRefs.current[`demo-${tutor.id}`];
                          if (video) {
                            video.muted = true;
                            video.pause();
                            video.currentTime = 0;
                          }
                        }}
                        onTouchStart={() => {
                          const video = videoRefs.current[`demo-${tutor.id}`];
                          if (video) {
                            if (video.paused) {
                              video.currentTime = 0;
                              video.muted = true;
                              video.play().then(() => {
                                video.muted = false;
                              }).catch(() => {});
                            } else {
                              video.muted = true;
                              video.pause();
                              video.currentTime = 0;
                            }
                          }
                        }}
                      >
                        {/* Tutor Image (always visible as base layer) */}
                        <Image
                          src={`/tutors/${getTutorFileName(tutor.id)}.jpg`}
                          alt={tutor.name}
                          fill
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                        {/* Tutor Video (plays on hover/tap, overlays image) */}
                        <video
                          ref={(el) => { videoRefs.current[`demo-${tutor.id}`] = el; }}
                          src={`/tutors/${getTutorFileName(tutor.id)}_greeting.mp4`}
                          muted
                          playsInline
                          preload="metadata"
                          className="absolute inset-0 w-full h-full object-cover opacity-0 transition-opacity duration-300"
                          onPlay={(e) => { (e.target as HTMLVideoElement).classList.remove('opacity-0'); }}
                          onPause={(e) => { (e.target as HTMLVideoElement).classList.add('opacity-0'); }}
                        />
                        {/* Name overlay */}
                        <div className="absolute bottom-0 left-0 right-0 p-2 sm:p-4 bg-gradient-to-t from-black/70 to-transparent">
                          <div className="flex items-center gap-1.5 sm:gap-2">
                            <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br ${tutor.gradient} flex items-center justify-center text-white text-[10px] sm:text-xs font-bold`}>
                              {tutor.name[0]}
                            </div>
                            <div>
                              <p className="text-white font-semibold text-xs sm:text-sm">{tutor.name}</p>
                              <p className="text-white/50 text-[10px] sm:text-xs">{tutor.flag === 'US' ? 'American' : 'British'}</p>
                            </div>
                          </div>
                        </div>
                        {/* Hover play indicator - desktop only */}
                        <div className="hidden md:flex absolute inset-0 items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                          <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                            <svg className="w-5 h-5 sm:w-7 sm:h-7 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M8 5v14l11-7z" />
                            </svg>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Value props - minimal, text-driven */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-12 mt-16 sm:mt-20">
                  <div>
                    <div className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent mb-2">
                      {language === 'ko' ? '실시간' : 'Real-time'}
                    </div>
                    <p className="text-theme-muted text-sm leading-relaxed">
                      {language === 'ko'
                        ? '대화 중 문법, 표현, 발음을 즉시 교정합니다. 틀린 부분만 짚어주니 흐름이 끊기지 않습니다.'
                        : 'Instant corrections on grammar, expressions, and pronunciation during your conversation.'}
                    </p>
                  </div>
                  <div>
                    <div className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-blue-500 to-cyan-500 bg-clip-text text-transparent mb-2">
                      6 {language === 'ko' ? '명의 튜터' : 'Tutors'}
                    </div>
                    <p className="text-theme-muted text-sm leading-relaxed">
                      {language === 'ko'
                        ? '미국/영국 발음, 다양한 성격의 AI 튜터. 편한 상대를 골라 부담 없이 대화하세요.'
                        : 'American & British accents, diverse personalities. Pick someone you vibe with.'}
                    </p>
                  </div>
                  <div>
                    <div className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent mb-2">
                      {language === 'ko' ? '음성 기반' : 'Voice-first'}
                    </div>
                    <p className="text-theme-muted text-sm leading-relaxed">
                      {language === 'ko'
                        ? '타이핑 없이 말하기만 하세요. AI가 듣고, 이해하고, 자연스럽게 응답합니다.'
                        : 'No typing needed. Just speak. AI listens, understands, and responds naturally.'}
                    </p>
                  </div>
                </div>

                {/* IB Curriculum Notice */}
                <div className="mt-12 sm:mt-16 flex justify-center">
                  <div className="inline-flex items-center gap-2.5 px-5 py-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/20">
                    <svg className="w-5 h-5 text-indigo-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                    <span className="text-sm font-medium text-indigo-400">
                      {language === 'ko'
                        ? '13세 이하: IB 커리큘럼 기반 AI 튜터링'
                        : 'Ages 13 & under: IB curriculum-based AI tutoring'}
                    </span>
                  </div>
                </div>
              </div>
            </section>

            {/* How It Works - Clean, no boxes */}
            <section className={`py-16 sm:py-24 transition-[opacity,transform] duration-700 delay-300 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
              <div className="max-w-4xl mx-auto px-4 sm:px-6">
                <h2 className="text-2xl sm:text-3xl font-bold text-theme-primary text-center mb-16">
                  {t.howItWorks}
                </h2>

                <div className="space-y-16 sm:space-y-0 sm:grid sm:grid-cols-3 sm:gap-16 relative">
                  {/* Connecting line */}
                  <div className="hidden sm:block absolute top-5 left-[16.67%] right-[16.67%] h-px bg-gradient-to-r from-purple-500/30 via-white/10 to-amber-500/30" />

                  {[
                    { num: '1', title: t.step1Title, desc: t.step1Desc, color: 'text-purple-400', dotColor: 'bg-purple-500' },
                    { num: '2', title: t.step2Title, desc: t.step2Desc, color: 'dark:text-white text-zinc-900', dotColor: 'dark:bg-white/40 bg-zinc-400' },
                    { num: '3', title: t.step3Title, desc: t.step3Desc, color: 'text-amber-400', dotColor: 'bg-amber-500' },
                  ].map((step) => (
                    <div key={step.num} className="relative text-center sm:text-left">
                      {/* Step dot */}
                      <div className="hidden sm:flex w-10 h-10 rounded-full dark:bg-neutral-900 bg-zinc-100 items-center justify-center mx-auto sm:mx-0 mb-6 relative z-10 ring-4 dark:ring-neutral-900 ring-zinc-100">
                        <div className={`w-3 h-3 rounded-full ${step.dotColor}`} />
                      </div>
                      <div className={`text-5xl sm:text-6xl font-black ${step.color} opacity-20 leading-none mb-3 sm:hidden`}>
                        {step.num}
                      </div>
                      <h3 className="text-lg font-semibold text-theme-primary mb-2">{step.title}</h3>
                      <p className="text-theme-muted text-sm leading-relaxed">{step.desc}</p>
                    </div>
                  ))}
                </div>

                {/* CTA */}
                <div className="text-center mt-16 sm:mt-20">
                  {session ? (
                    <button
                      onClick={() => { document.getElementById('tutor-selection')?.scrollIntoView({ behavior: 'smooth' }); }}
                      className="group relative inline-flex items-center gap-3 px-8 py-4 rounded-2xl font-semibold text-lg text-white overflow-hidden transition-all hover:scale-[1.02] active:scale-[0.98]"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-500 transition-all" />
                      <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-pink-500 rounded-2xl blur-xl opacity-30 group-hover:opacity-50 transition-opacity" />
                      <span className="relative">{language === 'ko' ? '튜터 선택하기' : 'Choose Tutor'}</span>
                      <svg className="relative w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>
                    </button>
                  ) : (
                    <a
                      href="/login"
                      className="group relative inline-flex items-center gap-3 px-8 py-4 rounded-2xl font-semibold text-lg text-white overflow-hidden transition-all hover:scale-[1.02] active:scale-[0.98]"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-500 transition-all" />
                      <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-pink-500 rounded-2xl blur-xl opacity-30 group-hover:opacity-50 transition-opacity" />
                      <span className="relative">{language === 'ko' ? '무료로 시작하기' : 'Get Started Free'}</span>
                      <svg className="relative w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                    </a>
                  )}
                  <p className="text-theme-muted opacity-60 text-xs mt-4 tracking-wide">
                    {session
                      ? (language === 'ko' ? '아래에서 원하는 튜터를 선택하세요' : 'Select your preferred tutor below')
                      : (language === 'ko' ? '가입만 하면 바로 시작 — 결제 정보 불필요' : 'Sign up and start immediately — no payment info needed')
                    }
                  </p>
                </div>
              </div>
            </section>
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-8 border-t border-theme">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center space-y-4">
          {/* Contact Button - WhatsApp */}
          <a
            href="https://wa.me/85270742030?text=Hi%2C%20I%20have%20a%20question%20about%20TapTalk"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#25D366] text-white text-sm font-medium hover:bg-[#20BD5A] transition-all"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            {t.contactUs}
          </a>
          <p className="text-theme-muted text-sm">{t.footer}</p>
        </div>
      </footer>

      {/* Onboarding Overlay - First time visitors */}
      {showOnboarding && (
        <OnboardingFlow
          onComplete={() => setShowOnboarding(false)}
          language={language}
        />
      )}

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
                className="flex-1 px-4 py-2 text-sm font-medium dark:text-white text-zinc-800 dark:bg-white/10 dark:hover:bg-white/20 bg-zinc-100 hover:bg-zinc-200 rounded-lg transition-colors"
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

      {/* Bottom nav spacer */}
      <div className="h-20" />
      <BottomNav />
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-theme" />}>
      <HomePageContent />
    </Suspense>
  );
}
