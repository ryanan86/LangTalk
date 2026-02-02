'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSession, signIn, signOut } from 'next-auth/react';
import Image from 'next/image';
import { useLanguage, LanguageToggle } from '@/lib/i18n';

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
function CircularProgress({ value, max, size = 80, strokeWidth = 6, color = 'purple', label }: {
  value: number;
  max: number;
  size?: number;
  strokeWidth?: number;
  color?: 'purple' | 'amber' | 'green' | 'blue';
  label?: string;
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
        <span className="text-lg font-bold text-white">{label || value}</span>
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
  voice: string;
  gradient: string;
  flag: string;
  sampleText: string;
}

const personas: Persona[] = [
  { id: 'emma', name: 'Emma', nationality: 'american', voice: 'shimmer', gradient: 'from-rose-400 to-pink-500', flag: 'US', sampleText: "Hi! I'm Emma. Let's have a fun conversation!" },
  { id: 'james', name: 'James', nationality: 'american', voice: 'echo', gradient: 'from-blue-400 to-indigo-500', flag: 'US', sampleText: "Hey! I'm James. Let's chat!" },
  { id: 'charlotte', name: 'Charlotte', nationality: 'british', voice: 'fable', gradient: 'from-violet-400 to-purple-500', flag: 'UK', sampleText: "Hello! I'm Charlotte. Lovely to meet you!" },
  { id: 'oliver', name: 'Oliver', nationality: 'british', voice: 'onyx', gradient: 'from-emerald-400 to-teal-500', flag: 'UK', sampleText: "Hi there! I'm Oliver. Let's get started!" },
];

// Grade level mapping
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
  const [, setCheckingSubscription] = useState(false);
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [signupMessage, setSignupMessage] = useState<string | null>(null);
  const [sessionCount, setSessionCount] = useState<number>(0);
  const [evaluatedGrade, setEvaluatedGrade] = useState<string | null>(null);
  const [levelDetails, setLevelDetails] = useState<{ grammar: number; vocabulary: number; fluency: number; comprehension: number } | null>(null);
  const [activeTab, setActiveTab] = useState<'talk' | 'debate'>('talk');
  const [playingVoice, setPlayingVoice] = useState<string | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const [mounted, setMounted] = useState(false);

  const typewriterTextsKo = [
    '매일 10분으로 습관을 만든다',
    'AI 튜터와 실시간 영어 대화',
    '부담 없이, 어디서든, 지금 바로',
  ];
  const typewriterTextsEn = [
    'Build habits in just 10 minutes a day',
    'Real-time English conversation with AI',
    'No pressure, anywhere, anytime',
  ];
  const typingText = useTypewriter(language === 'ko' ? typewriterTextsKo : typewriterTextsEn, 60, 30, 2500);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => { if (session?.user?.email) checkSubscription(); }, [session]);

  const checkSubscription = async () => {
    setCheckingSubscription(true);
    try {
      const res = await fetch('/api/check-subscription');
      const data = await res.json();
      setIsSubscribed(data.subscribed);
      setSubscriptionStatus(data.status || null);
      setSessionCount(data.sessionCount || 0);
      setEvaluatedGrade(data.evaluatedGrade || null);
      setLevelDetails(data.levelDetails || null);
    } catch {
      setIsSubscribed(true);
      setSessionCount(5);
    } finally {
      setCheckingSubscription(false);
    }
  };

  const handleBetaSignup = async () => {
    setIsSigningUp(true);
    try {
      const res = await fetch('/api/beta-signup', { method: 'POST' });
      const data = await res.json();
      setSignupMessage(data.message || data.error);
      if (data.success) setSubscriptionStatus('pending');
    } catch {
      setSignupMessage(language === 'ko' ? '오류가 발생했습니다.' : 'An error occurred.');
    } finally {
      setIsSigningUp(false);
    }
  };

  const playVoicePreview = async (persona: Persona, e: React.MouseEvent) => {
    e.stopPropagation();
    if (playingVoice === persona.id) {
      previewAudioRef.current?.pause();
      setPlayingVoice(null);
      return;
    }
    previewAudioRef.current?.pause();
    setPlayingVoice(persona.id);
    try {
      const response = await fetch('/api/text-to-speech', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: persona.sampleText, voice: persona.voice }),
      });
      const audioBlob = await response.blob();
      const audio = new Audio(URL.createObjectURL(audioBlob));
      previewAudioRef.current = audio;
      audio.onended = () => setPlayingVoice(null);
      await audio.play();
    } catch {
      setPlayingVoice(null);
    }
  };

  const canAccessDebate = sessionCount >= 5;
  const currentLevel = evaluatedGrade && gradeMapping[evaluatedGrade] ? gradeMapping[evaluatedGrade] : null;

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white overflow-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-gradient-to-br from-purple-600/30 to-pink-600/20 rounded-full blur-[100px] animate-morph" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-gradient-to-br from-blue-600/25 to-cyan-600/15 rounded-full blur-[100px] animate-morph" style={{ animationDelay: '-2s' }} />
        <div className="absolute top-[40%] right-[20%] w-[350px] h-[350px] bg-gradient-to-br from-pink-500/15 to-orange-500/10 rounded-full blur-[80px] animate-morph" style={{ animationDelay: '-4s' }} />
        {mounted && (
          <div className="absolute inset-0">
            {[...Array(15)].map((_, i) => (
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
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,#0a0a0f_70%)]" />
      </div>

      {/* Header */}
      <header className="relative z-50 border-b border-white/5">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16 sm:h-20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">{t.appName}</span>
            </div>

            <div className="flex items-center gap-3 sm:gap-4">
              <LanguageToggle />
              {status === 'loading' ? (
                <div className="w-10 h-10 rounded-full bg-white/10 animate-pulse" />
              ) : session ? (
                <div className="flex items-center gap-3">
                  <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
                    <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                    <span className="text-sm text-white/70">{session.user?.name?.split(' ')[0]}</span>
                  </div>
                  {session.user?.image && (
                    <Image src={session.user.image} alt="" width={40} height={40} className="w-10 h-10 rounded-full ring-2 ring-white/10" />
                  )}
                  <button onClick={() => signOut()} className="p-2 rounded-lg hover:bg-white/5 transition-colors">
                    <svg className="w-5 h-5 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                  </button>
                </div>
              ) : (
                <button onClick={() => signIn('google')} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-black font-medium hover:bg-white/90 transition-all">
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  {t.signIn}
                </button>
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
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-6 sm:mb-8">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </span>
                <span className="text-sm text-white/70">AI-Powered English Practice</span>
              </div>

              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-tight mb-4">
                <span className="bg-gradient-to-r from-white via-white to-white/50 bg-clip-text text-transparent">{t.heroTitle}</span>
                <br />
                <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400 bg-clip-text text-transparent animate-gradient bg-[length:200%_auto]">{t.heroSubtitle}</span>
              </h1>

              <div className="h-8 sm:h-10 flex items-center justify-center mb-6 sm:mb-8">
                <p className="text-lg sm:text-xl text-white/70 font-medium">
                  {typingText}<span className="animate-blink text-purple-400 ml-0.5">|</span>
                </p>
              </div>

              {/* Dashboard Stats - For logged in users */}
              {session && isSubscribed && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 max-w-2xl mx-auto mb-8">
                  {/* Sessions */}
                  <div className="relative group p-4 rounded-2xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 hover:border-purple-500/40 transition-all">
                    <CircularProgress value={sessionCount} max={10} color="purple" />
                    <div className="mt-2 text-xs text-white/50">{language === 'ko' ? '세션' : 'Sessions'}</div>
                  </div>

                  {/* Debate Progress */}
                  <div className="relative group p-4 rounded-2xl bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/20 hover:border-amber-500/40 transition-all">
                    <CircularProgress value={Math.min(sessionCount, 5)} max={5} color="amber" />
                    <div className="mt-2 text-xs text-white/50">{language === 'ko' ? '디베이트' : 'Debate'}</div>
                  </div>

                  {/* Level */}
                  <div className="relative group p-4 rounded-2xl bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/20 hover:border-blue-500/40 transition-all">
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
                    <div className="mt-2 text-xs text-white/50">{language === 'ko' ? '레벨' : 'Level'}</div>
                  </div>

                  {/* Streak */}
                  <div className="relative group p-4 rounded-2xl bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20 hover:border-green-500/40 transition-all">
                    <div className="w-20 h-20 flex items-center justify-center mx-auto">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-white flex items-center justify-center gap-1">
                          <AnimatedCounter target={Math.min(sessionCount, 7)} />
                        </div>
                        <div className="text-xs text-white/40">{language === 'ko' ? '일' : 'days'}</div>
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-white/50">{language === 'ko' ? '연속' : 'Streak'}</div>
                  </div>
                </div>
              )}

              {/* AI Level Details */}
              {session && isSubscribed && levelDetails && (
                <div className="max-w-lg mx-auto mb-8 p-4 rounded-2xl bg-white/5 border border-white/10">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs text-white/40 uppercase tracking-wider">{language === 'ko' ? 'AI 레벨 분석' : 'AI Level Analysis'}</span>
                    {currentLevel && <span className="text-sm font-medium text-white">{language === 'ko' ? currentLevel.nameKo : currentLevel.name}</span>}
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { label: language === 'ko' ? '문법' : 'Grammar', value: levelDetails.grammar, color: 'blue' },
                      { label: language === 'ko' ? '어휘' : 'Vocab', value: levelDetails.vocabulary, color: 'green' },
                      { label: language === 'ko' ? '유창성' : 'Fluency', value: levelDetails.fluency, color: 'purple' },
                      { label: language === 'ko' ? '이해' : 'Comp.', value: levelDetails.comprehension, color: 'amber' },
                    ].map((item) => (
                      <div key={item.label} className="text-center">
                        <CircularProgress value={item.value} max={100} size={48} strokeWidth={4} color={item.color as 'blue' | 'green' | 'purple' | 'amber'} />
                        <div className="mt-1 text-xs text-white/40">{item.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Progress Bar for debate unlock */}
              {session && isSubscribed && !canAccessDebate && (
                <div className="max-w-md mx-auto mb-6">
                  <div className="flex items-center justify-between text-xs text-white/40 mb-2">
                    <span>{language === 'ko' ? '디베이트 잠금 해제' : 'Unlock Debate'}</span>
                    <span>{sessionCount}/5</span>
                  </div>
                  <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-purple-500 via-pink-500 to-amber-500 transition-all duration-1000" style={{ width: `${(sessionCount / 5) * 100}%` }} />
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
                    className={`px-6 sm:px-8 py-3 rounded-xl font-medium transition-all ${activeTab === 'talk' ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/25' : 'text-white/50 hover:text-white'}`}
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
                    className={`px-6 sm:px-8 py-3 rounded-xl font-medium transition-all ${activeTab === 'debate' ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/25' : 'text-white/50 hover:text-white'}`}
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

              {/* Not Logged In */}
              {!session && (
                <div className="max-w-md mx-auto text-center py-12">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-white/10 flex items-center justify-center mx-auto mb-6">
                    <svg className="w-10 h-10 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-3">{t.loginRequired}</h3>
                  <p className="text-white/50 mb-6">{language === 'ko' ? 'Google 계정으로 시작하세요' : 'Sign in with Google to start'}</p>
                  <button onClick={() => signIn('google')} className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-black font-medium hover:bg-white/90 transition-all">
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                    {t.signIn}
                  </button>
                </div>
              )}

              {/* Beta States */}
              {session && subscriptionStatus === 'not_found' && (
                <div className="max-w-md mx-auto text-center py-12">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-white/10 flex items-center justify-center mx-auto mb-6">
                    <svg className="w-10 h-10 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-3">{language === 'ko' ? '베타 서비스 신청' : 'Join Beta'}</h3>
                  <p className="text-white/50 mb-6">{t.betaSignupPrompt}</p>
                  {signupMessage && <div className="mb-4 p-4 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-300 text-sm">{signupMessage}</div>}
                  <button onClick={handleBetaSignup} disabled={isSigningUp} className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium hover:opacity-90 transition-all disabled:opacity-50">
                    {isSigningUp ? '...' : t.betaSignupButton}
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

              {/* Subscribed User - Tutor Selection */}
              {session && isSubscribed && (
                <>
                  <div className="mb-10">
                    <h2 className="text-center text-white/40 text-sm font-medium uppercase tracking-wider mb-6">{t.chooseTutor}</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      {personas.map((persona) => {
                        const isSelected = selectedPersona === persona.id;
                        return (
                          <button
                            key={persona.id}
                            onClick={() => setSelectedPersona(persona.id)}
                            className={`group relative p-5 rounded-2xl text-left transition-all duration-300 ${isSelected ? 'bg-white/10 border-2 border-purple-500 scale-[1.02]' : 'bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20'}`}
                          >
                            {isSelected && (
                              <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-purple-500 flex items-center justify-center">
                                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              </div>
                            )}
                            <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${persona.gradient} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                              <span className="text-white text-2xl font-bold">{persona.name[0]}</span>
                            </div>
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-semibold text-white">{persona.name}</h3>
                              <span className="text-xs px-1.5 py-0.5 rounded bg-white/10 text-white/60">{persona.flag}</span>
                            </div>
                            <p className="text-white/40 text-sm">{persona.nationality === 'american' ? (language === 'ko' ? '미국 영어' : 'American English') : (language === 'ko' ? '영국 영어' : 'British English')}</p>
                            <button
                              onClick={(e) => playVoicePreview(persona, e)}
                              className={`mt-4 flex items-center gap-2 text-xs font-medium transition-colors ${playingVoice === persona.id ? 'text-purple-400' : 'text-white/40 hover:text-white/60'}`}
                            >
                              {playingVoice === persona.id ? (
                                <>
                                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16" rx="1" /><rect x="14" y="4" width="4" height="16" rx="1" /></svg>
                                  {t.playing}
                                </>
                              ) : (
                                <>
                                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                                  {t.previewVoice}
                                </>
                              )}
                            </button>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Start Button */}
                  <div className="text-center">
                    <button
                      onClick={() => selectedPersona && router.push(`/talk?tutor=${selectedPersona}`)}
                      disabled={!selectedPersona}
                      className={`inline-flex items-center gap-3 px-8 py-4 rounded-2xl font-semibold text-lg transition-all duration-300 ${selectedPersona ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/25 hover:shadow-xl hover:scale-105' : 'bg-white/10 text-white/30 cursor-not-allowed'}`}
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                      </svg>
                      {t.startConversation}
                    </button>
                    {!selectedPersona && <p className="text-white/30 text-sm mt-4">{t.selectTutorPrompt}</p>}
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
                <div className="text-center">
                  <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-amber-500/25">
                    <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
                    </svg>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">{t.debateMode}</h2>
                  <p className="text-white/50 mb-8 max-w-md mx-auto">{t.debateDescription}</p>
                  <button onClick={() => router.push('/debate')} className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl font-semibold text-lg bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/25 hover:shadow-xl hover:scale-105 transition-all">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {t.startDebate}
                  </button>
                </div>
              ) : (
                <div className="text-center">
                  <div className="w-24 h-24 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-6">
                    <svg className="w-12 h-12 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">{t.debateLocked}</h2>
                  <p className="text-white/50 mb-8">{t.sessionsToUnlock.replace('{n}', String(5 - sessionCount))}</p>
                  <div className="max-w-xs mx-auto mb-8">
                    <div className="flex justify-between text-sm text-white/40 mb-2">
                      <span>{t.sessionsCompleted.replace('{n}', String(sessionCount))}</span>
                      <span>5</span>
                    </div>
                    <div className="h-3 rounded-full bg-white/10 overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-500" style={{ width: `${(sessionCount / 5) * 100}%` }} />
                    </div>
                  </div>
                  <button onClick={() => setActiveTab('talk')} className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all">
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

        {/* Features - Non-logged in */}
        {!session && (
          <section className={`py-12 sm:py-20 transition-all duration-1000 delay-300 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            <div className="max-w-6xl mx-auto px-4 sm:px-6">
              <div className="text-center mb-12">
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-4">{language === 'ko' ? '왜 LangTalk인가?' : 'Why LangTalk?'}</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                {/* Feature Cards */}
                {[
                  { title: language === 'ko' ? '실시간 피드백' : 'Real-time Feedback', desc: language === 'ko' ? '문법, 발음, 표현을 즉시 교정' : 'Instant grammar and pronunciation correction', gradient: 'from-purple-500/10 to-pink-500/5', border: 'border-purple-500/20', icon: <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>, iconBg: 'from-purple-500 to-pink-500' },
                  { title: language === 'ko' ? 'AI 튜터' : 'AI Tutors', desc: language === 'ko' ? '미국/영국 발음의 4명의 튜터' : '4 tutors with American or British accents', gradient: 'from-blue-500/10 to-cyan-500/5', border: 'border-blue-500/20', icon: <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>, iconBg: 'from-blue-500 to-cyan-500' },
                  { title: language === 'ko' ? '음성 인식' : 'Voice Recognition', desc: language === 'ko' ? '말하면 AI가 자동으로 인식' : 'Speak and AI automatically responds', gradient: 'from-amber-500/10 to-orange-500/5', border: 'border-amber-500/20', icon: <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>, iconBg: 'from-amber-500 to-orange-500' },
                  { title: language === 'ko' ? '레벨 시스템' : 'Level System', desc: language === 'ko' ? 'AI가 실력을 평가하고 레벨업' : 'AI evaluates your skill and tracks progress', gradient: 'from-green-500/10 to-emerald-500/5', border: 'border-green-500/20', icon: <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>, iconBg: 'from-green-500 to-emerald-500' },
                ].map((feature, i) => (
                  <div key={i} className={`group relative p-6 sm:p-8 rounded-2xl bg-gradient-to-br ${feature.gradient} border ${feature.border} hover:border-white/30 transition-all overflow-hidden`}>
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.iconBg} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-lg`}>
                      {feature.icon}
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">{feature.title}</h3>
                    <p className="text-white/50">{feature.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-8 border-t border-white/5">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center">
          <p className="text-white/30 text-sm">{t.footer}</p>
        </div>
      </footer>
    </div>
  );
}
