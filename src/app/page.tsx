'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSession, signIn, signOut } from 'next-auth/react';
import Image from 'next/image';
import { useLanguage, LanguageToggle } from '@/lib/i18n';

// US Grade Level System
const gradeLevel = {
  getLevel: (sessionCount: number) => {
    if (sessionCount < 2) return { grade: 'K', name: 'Kindergarten', nameKo: '유치원', color: 'from-pink-400 to-rose-500' };
    if (sessionCount < 4) return { grade: '1-2', name: 'Grade 1-2', nameKo: '초등 1-2학년', color: 'from-orange-400 to-amber-500' };
    if (sessionCount < 7) return { grade: '3-4', name: 'Grade 3-4', nameKo: '초등 3-4학년', color: 'from-yellow-400 to-orange-500' };
    if (sessionCount < 11) return { grade: '5-6', name: 'Grade 5-6', nameKo: '초등 5-6학년', color: 'from-lime-400 to-green-500' };
    if (sessionCount < 16) return { grade: '7-8', name: 'Middle School', nameKo: '중학교', color: 'from-emerald-400 to-teal-500' };
    if (sessionCount < 22) return { grade: '9-10', name: 'High School', nameKo: '고등학교', color: 'from-cyan-400 to-blue-500' };
    if (sessionCount < 30) return { grade: '11-12', name: 'Advanced', nameKo: '고급', color: 'from-blue-400 to-indigo-500' };
    return { grade: 'College', name: 'College Level', nameKo: '대학 수준', color: 'from-violet-400 to-purple-500' };
  },
  getProgress: (sessionCount: number) => {
    const thresholds = [0, 2, 4, 7, 11, 16, 22, 30];
    for (let i = 0; i < thresholds.length - 1; i++) {
      if (sessionCount < thresholds[i + 1]) {
        const current = sessionCount - thresholds[i];
        const needed = thresholds[i + 1] - thresholds[i];
        return { current, needed, percent: (current / needed) * 100 };
      }
    }
    return { current: 0, needed: 0, percent: 100 };
  }
};

// Typewriter Hook
function useTypewriter(texts: string[], speed = 60) {
  const [text, setText] = useState('');
  const [index, setIndex] = useState(0);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const current = texts[index];
    const timeout = setTimeout(() => {
      if (!deleting) {
        if (text.length < current.length) {
          setText(current.slice(0, text.length + 1));
        } else {
          setTimeout(() => setDeleting(true), 2000);
        }
      } else {
        if (text.length > 0) {
          setText(text.slice(0, -1));
        } else {
          setDeleting(false);
          setIndex((i) => (i + 1) % texts.length);
        }
      }
    }, deleting ? 30 : speed);
    return () => clearTimeout(timeout);
  }, [text, deleting, index, texts, speed]);

  return text;
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
  { id: 'emma', name: 'Emma', nationality: 'american', voice: 'shimmer', gradient: 'from-rose-400 to-pink-500', flag: '🇺🇸', sampleText: "Hi! I'm Emma. Let's have a fun conversation!" },
  { id: 'james', name: 'James', nationality: 'american', voice: 'echo', gradient: 'from-blue-400 to-indigo-500', flag: '🇺🇸', sampleText: "Hey! I'm James. Let's chat!" },
  { id: 'charlotte', name: 'Charlotte', nationality: 'british', voice: 'fable', gradient: 'from-violet-400 to-purple-500', flag: '🇬🇧', sampleText: "Hello! I'm Charlotte. Lovely to meet you!" },
  { id: 'oliver', name: 'Oliver', nationality: 'british', voice: 'onyx', gradient: 'from-emerald-400 to-teal-500', flag: '🇬🇧', sampleText: "Hi there! I'm Oliver. Let's get started!" },
];

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

  const typewriterTexts = language === 'ko'
    ? ['매일 10분으로 영어 습관 만들기', 'AI 튜터와 실시간 대화', '부담 없이, 어디서든']
    : ['Build English habits in 10 min/day', 'Real-time AI conversations', 'No pressure, anywhere'];
  const typingText = useTypewriter(typewriterTexts);

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

  // Use AI-evaluated grade if available, otherwise fall back to session-count-based level
  const gradeMapping: Record<string, { grade: string; name: string; nameKo: string; color: string }> = {
    'K': { grade: 'K', name: 'Kindergarten', nameKo: '유치원', color: 'from-pink-400 to-rose-500' },
    '1-2': { grade: '1-2', name: 'Grade 1-2', nameKo: '초등 1-2학년', color: 'from-orange-400 to-amber-500' },
    '3-4': { grade: '3-4', name: 'Grade 3-4', nameKo: '초등 3-4학년', color: 'from-yellow-400 to-orange-500' },
    '5-6': { grade: '5-6', name: 'Grade 5-6', nameKo: '초등 5-6학년', color: 'from-lime-400 to-green-500' },
    '7-8': { grade: '7-8', name: 'Middle School', nameKo: '중학교', color: 'from-emerald-400 to-teal-500' },
    '9-10': { grade: '9-10', name: 'High School', nameKo: '고등학교', color: 'from-cyan-400 to-blue-500' },
    '11-12': { grade: '11-12', name: 'Advanced', nameKo: '고급', color: 'from-blue-400 to-indigo-500' },
    'College': { grade: 'College', name: 'College Level', nameKo: '대학 수준', color: 'from-violet-400 to-purple-500' },
  };

  const level = evaluatedGrade && gradeMapping[evaluatedGrade]
    ? gradeMapping[evaluatedGrade]
    : gradeLevel.getLevel(sessionCount);
  const progress = gradeLevel.getProgress(sessionCount);
  const canAccessDebate = sessionCount >= 5;
  const hasEvaluatedLevel = !!evaluatedGrade;

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-neutral-200">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <span className="font-bold text-lg text-neutral-900">{t.appName}</span>
          </div>
          <div className="flex items-center gap-3">
            <LanguageToggle />
            {status === 'loading' ? (
              <div className="w-9 h-9 rounded-full bg-neutral-200 animate-pulse" />
            ) : session ? (
              <div className="flex items-center gap-2">
                {session.user?.image && (
                  <Image src={session.user.image} alt="" width={36} height={36} className="rounded-full" />
                )}
                <button onClick={() => signOut()} className="text-neutral-500 hover:text-neutral-700 p-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </button>
              </div>
            ) : (
              <button onClick={() => signIn('google')} className="flex items-center gap-2 px-4 py-2 bg-neutral-900 text-white rounded-lg text-sm font-medium hover:bg-neutral-800">
                {t.signIn}
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Hero */}
        <section className={`text-center mb-12 transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-neutral-900 mb-3">
            {t.heroTitle} <span className="bg-gradient-to-r from-indigo-500 to-purple-600 bg-clip-text text-transparent">{t.heroSubtitle}</span>
          </h1>
          <div className="h-7 flex items-center justify-center">
            <p className="text-neutral-500">{typingText}<span className="animate-pulse">|</span></p>
          </div>
        </section>

        {/* Level Card - Logged in users */}
        {session && isSubscribed && (
          <section className={`mb-8 transition-all duration-700 delay-100 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <div className="bg-white rounded-2xl border border-neutral-200 p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                {/* Level Info */}
                <div className="flex items-center gap-4">
                  <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${level.color} flex items-center justify-center`}>
                    <span className="text-white font-bold text-lg">{level.grade}</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm text-neutral-500">{language === 'ko' ? '현재 레벨' : 'Current Level'}</p>
                      {hasEvaluatedLevel && (
                        <span className="px-1.5 py-0.5 bg-indigo-100 text-indigo-600 text-xs rounded-full font-medium">
                          AI
                        </span>
                      )}
                    </div>
                    <p className="text-xl font-bold text-neutral-900">{language === 'ko' ? level.nameKo : level.name}</p>
                  </div>
                </div>

                {/* Stats */}
                <div className="flex gap-6">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-neutral-900">{sessionCount}</p>
                    <p className="text-xs text-neutral-500">{language === 'ko' ? '세션' : 'Sessions'}</p>
                  </div>
                  {!hasEvaluatedLevel && (
                    <div className="text-center">
                      <p className="text-2xl font-bold text-neutral-900">{progress.needed - progress.current}</p>
                      <p className="text-xs text-neutral-500">{language === 'ko' ? '다음 레벨까지' : 'To Next'}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Level Details (AI Evaluated) */}
              {hasEvaluatedLevel && levelDetails && (
                <div className="mt-4 grid grid-cols-4 gap-2">
                  {[
                    { label: language === 'ko' ? '문법' : 'Grammar', value: levelDetails.grammar, color: 'bg-blue-500' },
                    { label: language === 'ko' ? '어휘' : 'Vocab', value: levelDetails.vocabulary, color: 'bg-green-500' },
                    { label: language === 'ko' ? '유창성' : 'Fluency', value: levelDetails.fluency, color: 'bg-purple-500' },
                    { label: language === 'ko' ? '이해력' : 'Comp.', value: levelDetails.comprehension, color: 'bg-amber-500' },
                  ].map((item) => (
                    <div key={item.label} className="text-center">
                      <div className="flex justify-center mb-1">
                        <div className="w-10 h-10 rounded-full border-4 border-neutral-100 flex items-center justify-center relative">
                          <span className="text-xs font-bold text-neutral-900">{item.value}</span>
                          <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 36 36">
                            <circle cx="18" cy="18" r="16" fill="none" stroke="#f3f4f6" strokeWidth="3" />
                            <circle cx="18" cy="18" r="16" fill="none" stroke={item.color === 'bg-blue-500' ? '#3b82f6' : item.color === 'bg-green-500' ? '#22c55e' : item.color === 'bg-purple-500' ? '#a855f7' : '#f59e0b'} strokeWidth="3" strokeDasharray={`${item.value} 100`} strokeLinecap="round" />
                          </svg>
                        </div>
                      </div>
                      <p className="text-xs text-neutral-500">{item.label}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Progress Bar (Estimated level only) */}
              {!hasEvaluatedLevel && (
                <div className="mt-4">
                  <div className="flex justify-between text-xs text-neutral-400 mb-1">
                    <span>{language === 'ko' ? '레벨 진행도 (추정)' : 'Level Progress (Est.)'}</span>
                    <span>{Math.round(progress.percent)}%</span>
                  </div>
                  <div className="h-2 bg-neutral-100 rounded-full overflow-hidden">
                    <div className={`h-full bg-gradient-to-r ${level.color} transition-all duration-500`} style={{ width: `${progress.percent}%` }} />
                  </div>
                  <p className="text-xs text-neutral-400 mt-2">{language === 'ko' ? '세션 완료 후 AI가 실제 레벨을 평가합니다' : 'AI will evaluate your actual level after a session'}</p>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Mode Tabs */}
        {session && isSubscribed && (
          <section className="mb-6">
            <div className="flex gap-2 p-1 bg-neutral-100 rounded-xl w-fit">
              <button
                onClick={() => setActiveTab('talk')}
                className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'talk' ? 'bg-white shadow-sm text-neutral-900' : 'text-neutral-500 hover:text-neutral-700'}`}
              >
                Talk
              </button>
              <button
                onClick={() => setActiveTab('debate')}
                className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${activeTab === 'debate' ? 'bg-white shadow-sm text-neutral-900' : 'text-neutral-500 hover:text-neutral-700'}`}
              >
                Debate
                {!canAccessDebate && <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>}
              </button>
            </div>
          </section>
        )}

        {/* Auth States */}
        {!session && (
          <section className="text-center py-16">
            <div className="w-16 h-16 rounded-2xl bg-neutral-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-neutral-900 mb-2">{t.loginRequired}</h3>
            <p className="text-neutral-500 mb-6 text-sm">{language === 'ko' ? 'Google 계정으로 시작하세요' : 'Sign in with Google to start'}</p>
            <button onClick={() => signIn('google')} className="inline-flex items-center gap-2 px-6 py-3 bg-neutral-900 text-white rounded-xl font-medium hover:bg-neutral-800">
              <svg className="w-5 h-5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
              {t.signIn}
            </button>
          </section>
        )}

        {session && subscriptionStatus === 'not_found' && (
          <section className="text-center py-16">
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-neutral-900 mb-2">{language === 'ko' ? '베타 서비스 신청' : 'Join Beta'}</h3>
            <p className="text-neutral-500 mb-4 text-sm">{t.betaSignupPrompt}</p>
            {signupMessage && <p className="text-sm text-indigo-600 mb-4">{signupMessage}</p>}
            <button onClick={handleBetaSignup} disabled={isSigningUp} className="px-6 py-3 bg-indigo-500 text-white rounded-xl font-medium hover:bg-indigo-600 disabled:opacity-50">
              {isSigningUp ? '...' : t.betaSignupButton}
            </button>
          </section>
        )}

        {session && subscriptionStatus === 'pending' && (
          <section className="text-center py-16">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-neutral-900 mb-2">{language === 'ko' ? '검토 중' : 'Under Review'}</h3>
            <p className="text-neutral-500 text-sm">{t.betaPending}</p>
          </section>
        )}

        {/* Talk Mode */}
        {session && isSubscribed && activeTab === 'talk' && (
          <section className={`transition-all duration-500 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
            {/* Tutor Selection */}
            <div className="mb-8">
              <h2 className="text-sm font-medium text-neutral-500 uppercase tracking-wide mb-4">{t.chooseTutor}</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {personas.map((persona) => {
                  const isSelected = selectedPersona === persona.id;
                  return (
                    <button
                      key={persona.id}
                      onClick={() => setSelectedPersona(persona.id)}
                      className={`relative p-4 rounded-xl border-2 transition-all ${isSelected ? 'border-indigo-500 bg-indigo-50' : 'border-neutral-200 bg-white hover:border-neutral-300'}`}
                    >
                      <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${persona.gradient} flex items-center justify-center mx-auto mb-2`}>
                        <span className="text-white font-bold">{persona.name[0]}</span>
                      </div>
                      <p className="font-medium text-neutral-900 text-sm">{persona.name}</p>
                      <p className="text-xs text-neutral-500">{persona.flag} {persona.nationality === 'american' ? 'US' : 'UK'}</p>
                      <button
                        onClick={(e) => playVoicePreview(persona, e)}
                        className={`mt-2 text-xs ${playingVoice === persona.id ? 'text-indigo-500' : 'text-neutral-400 hover:text-neutral-600'}`}
                      >
                        {playingVoice === persona.id ? '▶ Playing...' : '▶ Preview'}
                      </button>
                      {isSelected && (
                        <div className="absolute top-2 right-2 w-5 h-5 bg-indigo-500 rounded-full flex items-center justify-center">
                          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Start Button */}
            <button
              onClick={() => selectedPersona && router.push(`/talk?tutor=${selectedPersona}`)}
              disabled={!selectedPersona}
              className={`w-full py-4 rounded-xl font-semibold text-lg transition-all ${selectedPersona ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:shadow-lg' : 'bg-neutral-200 text-neutral-400 cursor-not-allowed'}`}
            >
              {t.startConversation}
            </button>
          </section>
        )}

        {/* Debate Mode */}
        {session && isSubscribed && activeTab === 'debate' && (
          <section className="text-center py-8">
            {canAccessDebate ? (
              <>
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-neutral-900 mb-2">{t.debateMode}</h2>
                <p className="text-neutral-500 mb-6 max-w-md mx-auto">{t.debateDescription}</p>
                <button onClick={() => router.push('/debate')} className="px-8 py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-semibold hover:shadow-lg transition-all">
                  {t.startDebate}
                </button>
              </>
            ) : (
              <>
                <div className="w-20 h-20 rounded-2xl bg-neutral-100 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-10 h-10 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-neutral-900 mb-2">{t.debateLocked}</h2>
                <p className="text-neutral-500 mb-6">{t.sessionsToUnlock.replace('{n}', String(5 - sessionCount))}</p>
                <div className="max-w-xs mx-auto">
                  <div className="flex justify-between text-sm text-neutral-500 mb-2">
                    <span>{sessionCount}/5 {language === 'ko' ? '세션' : 'sessions'}</span>
                  </div>
                  <div className="h-2 bg-neutral-200 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-500 rounded-full" style={{ width: `${(sessionCount / 5) * 100}%` }} />
                  </div>
                </div>
              </>
            )}
          </section>
        )}

        {/* Features for non-logged in users */}
        {!session && (
          <section className="mt-16 grid gap-4 sm:grid-cols-3">
            {[
              {
                icon: (
                  <svg className="w-8 h-8 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ),
                title: language === 'ko' ? '실시간 피드백' : 'Real-time Feedback',
                desc: language === 'ko' ? '문법과 발음을 즉시 교정' : 'Instant grammar & pronunciation correction'
              },
              {
                icon: (
                  <svg className="w-8 h-8 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                ),
                title: language === 'ko' ? '음성 인식' : 'Voice Recognition',
                desc: language === 'ko' ? '말하면 AI가 바로 인식' : 'Speak and AI responds'
              },
              {
                icon: (
                  <svg className="w-8 h-8 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                ),
                title: language === 'ko' ? '레벨 시스템' : 'Level System',
                desc: language === 'ko' ? '미국 학년 기준 레벨업' : 'US grade-based progression'
              },
            ].map((f, i) => (
              <div key={i} className="p-6 bg-white rounded-xl border border-neutral-200">
                <div className="w-12 h-12 rounded-xl bg-neutral-50 flex items-center justify-center">
                  {f.icon}
                </div>
                <h3 className="font-semibold text-neutral-900 mt-3 mb-1">{f.title}</h3>
                <p className="text-sm text-neutral-500">{f.desc}</p>
              </div>
            ))}
          </section>
        )}
      </main>

      <footer className="py-8 text-center text-sm text-neutral-400">
        {t.footer}
      </footer>
    </div>
  );
}
