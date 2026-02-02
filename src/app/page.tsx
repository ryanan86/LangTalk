'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSession, signIn, signOut } from 'next-auth/react';
import Image from 'next/image';
import { useLanguage, LanguageToggle } from '@/lib/i18n';

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
    flag: '🇺🇸',
    sampleText: "Oh my gosh, hi! I'm Emma. I'm so excited to chat with you today! Let's have some fun conversations together.",
  },
  {
    id: 'james',
    name: 'James',
    nationality: 'american',
    gender: 'male',
    voice: 'echo',
    gradient: 'from-blue-400 to-indigo-500',
    flag: '🇺🇸',
    sampleText: "Hey, what's up! I'm James. Super chill vibes here, no pressure at all. Let's just hang out and talk about whatever.",
  },
  {
    id: 'charlotte',
    name: 'Charlotte',
    nationality: 'british',
    gender: 'female',
    voice: 'fable',
    gradient: 'from-violet-400 to-purple-500',
    flag: '🇬🇧',
    sampleText: "Hello there! I'm Charlotte. Lovely to meet you. I do enjoy a good chat, so let's get started, shall we?",
  },
  {
    id: 'oliver',
    name: 'Oliver',
    nationality: 'british',
    gender: 'male',
    voice: 'onyx',
    gradient: 'from-emerald-400 to-teal-500',
    flag: '🇬🇧',
    sampleText: "Right then, hello! I'm Oliver. Looking forward to having a proper conversation with you. No formalities needed here.",
  },
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

        try {
          const file = new File([audioBlob], 'test.webm', { type: mimeType });
          const formData = new FormData();
          formData.append('audio', file);

          const response = await fetch('/api/speech-to-text', {
            method: 'POST',
            body: formData,
          });
          const data = await response.json();

          if (data.text && data.text.trim()) {
            setTestResult(data.text);
            setTestStatus('success');
          } else {
            setTestResult(language === 'ko' ? '음성이 인식되지 않았습니다. 다시 시도해주세요.' : 'No speech detected. Please try again.');
            setTestStatus('error');
          }
        } catch {
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
    } catch {
      setIsSubscribed(true);
      setSubscriptionStatus('active');
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
    };
    return descriptions[id] || { desc: '', style: '' };
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-neutral-50 to-primary-50/30">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-neutral-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex justify-between items-center">
          <h1 className="font-display text-xl sm:text-2xl font-bold gradient-text">{t.appName}</h1>
          <div className="flex items-center gap-2 sm:gap-3">
            <LanguageToggle />
            {status === 'loading' ? (
              <div className="w-8 h-8 rounded-full bg-neutral-200 animate-pulse" />
            ) : session ? (
              <div className="flex items-center gap-2 sm:gap-3">
                {session.user?.image && (
                  <Image
                    src={session.user.image}
                    alt={session.user.name || ''}
                    width={32}
                    height={32}
                    className="w-8 h-8 rounded-full"
                  />
                )}
                <span className="text-sm text-neutral-600 hidden sm:block">
                  {session.user?.name}
                </span>
                <button
                  onClick={() => signOut()}
                  className="text-xs sm:text-sm px-3 py-1.5 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-600 transition-colors"
                >
                  {t.signOut}
                </button>
              </div>
            ) : (
              <button
                onClick={() => signIn('google')}
                className="flex items-center gap-2 text-sm px-4 py-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-white transition-colors"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
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
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Hero Section */}
        <div className="text-center mb-12 sm:mb-16">
          <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold text-neutral-900 mb-3 sm:mb-4 leading-tight">
            {t.heroTitle}
            <br />
            <span className="gradient-text">{t.heroSubtitle}</span>
          </h2>
          <p className="text-neutral-600 text-base sm:text-lg max-w-xl mx-auto leading-relaxed">
            {t.heroDescription}
          </p>
        </div>

        {/* Microphone Test */}
        <div className="mb-10 sm:mb-12 max-w-md mx-auto">
          <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-sm border border-neutral-100">
            <h3 className="text-neutral-900 font-semibold mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
              {t.testMicrophone}
            </h3>

            {!isTesting ? (
              <button
                onClick={startMicTest}
                className="w-full py-3 px-4 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-xl transition-colors flex items-center justify-center gap-2 font-medium"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
                {t.clickToTest}
              </button>
            ) : (
              <div className="space-y-4">
                {testStatus === 'recording' && (
                  <div className="flex items-center justify-center gap-3 py-4">
                    <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                    <span className="text-neutral-600">{t.recording} {t.speakNow}</span>
                    <button
                      onClick={stopMicTest}
                      className="ml-2 px-3 py-1 bg-neutral-200 hover:bg-neutral-300 rounded-lg text-sm"
                    >
                      {t.stop}
                    </button>
                  </div>
                )}

                {testStatus === 'processing' && (
                  <div className="flex items-center justify-center gap-3 py-4">
                    <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                    <span className="text-neutral-600">{t.processing}</span>
                  </div>
                )}

                {(testStatus === 'success' || testStatus === 'error') && (
                  <div className={`p-4 rounded-xl ${testStatus === 'success' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                    <div className="flex items-start gap-2">
                      {testStatus === 'success' ? (
                        <svg className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      )}
                      <div className="min-w-0">
                        <p className={`text-sm ${testStatus === 'success' ? 'text-green-800' : 'text-red-800'}`}>
                          {testStatus === 'success' ? t.weHeard : t.error}
                        </p>
                        <p className={`font-medium break-words ${testStatus === 'success' ? 'text-green-900' : 'text-red-900'}`}>
                          &ldquo;{testResult}&rdquo;
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setIsTesting(false);
                        setTestResult(null);
                        setTestStatus('idle');
                      }}
                      className="mt-3 w-full py-2 bg-white hover:bg-neutral-50 border border-neutral-200 rounded-lg text-sm text-neutral-600"
                    >
                      {t.testAgain}
                    </button>
                  </div>
                )}
              </div>
            )}

            <p className="text-neutral-400 text-xs mt-3 text-center">
              {t.micTestHint}
            </p>
          </div>
        </div>

        {/* Persona Selection */}
        <div className="mb-10 sm:mb-12">
          <h3 className="text-center text-neutral-500 text-sm font-medium uppercase tracking-wider mb-6 sm:mb-8">
            {t.chooseTutor}
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {personas.map((persona) => {
              const { desc, style } = getPersonaDescription(persona.id);
              return (
                <button
                  key={persona.id}
                  onClick={() => setSelectedPersona(persona.id)}
                  className={`relative bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 text-left transition-all duration-200 border-2 ${
                    selectedPersona === persona.id
                      ? 'border-primary-500 shadow-lg shadow-primary-100'
                      : 'border-transparent shadow-sm hover:shadow-md'
                  }`}
                >
                  <div className="flex items-start gap-3 sm:gap-4">
                    {/* Avatar */}
                    <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-gradient-to-br ${persona.gradient} flex items-center justify-center flex-shrink-0`}>
                      <span className="text-white text-xl sm:text-2xl font-display font-bold">
                        {persona.name[0]}
                      </span>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-display text-lg font-semibold text-neutral-900">
                          {persona.name}
                        </h4>
                        <span className="text-base">{persona.flag}</span>
                      </div>
                      <p className="text-neutral-600 text-sm mb-1">{desc}</p>
                      <p className="text-neutral-400 text-xs">{style}</p>
                    </div>
                  </div>

                  {/* Voice Preview Button */}
                  <div
                    onClick={(e) => playVoicePreview(persona, e)}
                    className={`mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      playingVoice === persona.id
                        ? 'bg-primary-100 text-primary-700'
                        : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                    }`}
                  >
                    {playingVoice === persona.id ? (
                      <>
                        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                          <rect x="6" y="4" width="4" height="16" rx="1" />
                          <rect x="14" y="4" width="4" height="16" rx="1" />
                        </svg>
                        {t.playing}
                      </>
                    ) : (
                      <>
                        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                        {t.previewVoice}
                      </>
                    )}
                  </div>

                  {/* Selection Indicator */}
                  {selectedPersona === persona.id && (
                    <div className="absolute top-3 right-3 sm:top-4 sm:right-4 w-6 h-6 bg-primary-500 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Start Button */}
        <div className="text-center mb-16 sm:mb-20">
          {/* Beta Signup Message */}
          {signupMessage && (
            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-xl text-blue-800 text-sm max-w-md mx-auto">
              {signupMessage}
            </div>
          )}

          {/* Not logged in */}
          {!session && (
            <div className="mb-4 p-4 bg-neutral-50 border border-neutral-200 rounded-xl text-neutral-600 text-sm max-w-md mx-auto">
              {t.loginRequired}
            </div>
          )}

          {/* Not signed up for beta */}
          {session && subscriptionStatus === 'not_found' && (
            <div className="mb-4 max-w-md mx-auto">
              <div className="p-4 bg-primary-50 border border-primary-200 rounded-xl">
                <p className="text-primary-800 text-sm mb-3">
                  {t.betaSignupPrompt}
                </p>
                <button
                  onClick={handleBetaSignup}
                  disabled={isSigningUp}
                  className="px-6 py-2.5 bg-primary-500 text-white rounded-xl font-medium hover:bg-primary-600 transition-colors disabled:bg-primary-300"
                >
                  {isSigningUp ? t.signingUp : t.betaSignupButton}
                </button>
              </div>
            </div>
          )}

          {/* Pending */}
          {session && subscriptionStatus === 'pending' && (
            <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-sm max-w-md mx-auto">
              {t.betaPending}
            </div>
          )}

          {/* Expired */}
          {session && subscriptionStatus === 'expired' && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-800 text-sm max-w-md mx-auto">
              {t.betaExpired}
            </div>
          )}

          {/* Inactive */}
          {session && subscriptionStatus === 'inactive' && (
            <div className="mb-4 p-4 bg-neutral-50 border border-neutral-200 rounded-xl text-neutral-600 text-sm max-w-md mx-auto">
              {t.betaInactive}
            </div>
          )}

          <button
            onClick={handleStart}
            disabled={!selectedPersona || !session || isSubscribed !== true}
            className={`inline-flex items-center gap-3 px-6 sm:px-8 py-3.5 sm:py-4 rounded-2xl text-base sm:text-lg font-semibold transition-all duration-300 ${
              selectedPersona && session && isSubscribed === true
                ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-lg shadow-primary-200 hover:shadow-xl hover:shadow-primary-300 hover:-translate-y-0.5'
                : 'bg-neutral-200 text-neutral-400 cursor-not-allowed'
            }`}
          >
            <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
            {t.startConversation}
          </button>

          {!selectedPersona && session && isSubscribed === true && (
            <p className="text-neutral-400 text-sm mt-4">
              {t.selectTutorPrompt}
            </p>
          )}
        </div>

        {/* How it works */}
        <div className="pt-10 sm:pt-12 border-t border-neutral-200">
          <h3 className="text-center text-neutral-500 text-sm font-medium uppercase tracking-wider mb-8 sm:mb-10">
            {t.howItWorks}
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8">
            <div className="text-center">
              <div className="w-14 h-14 bg-gradient-to-br from-primary-100 to-primary-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <span className="text-primary-600 font-bold text-lg">1</span>
              </div>
              <h4 className="font-semibold text-neutral-900 mb-2">{t.step1Title}</h4>
              <p className="text-neutral-500 text-sm leading-relaxed">
                {t.step1Desc}
              </p>
            </div>

            <div className="text-center">
              <div className="w-14 h-14 bg-gradient-to-br from-primary-100 to-primary-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <span className="text-primary-600 font-bold text-lg">2</span>
              </div>
              <h4 className="font-semibold text-neutral-900 mb-2">{t.step2Title}</h4>
              <p className="text-neutral-500 text-sm leading-relaxed">
                {t.step2Desc}
              </p>
            </div>

            <div className="text-center">
              <div className="w-14 h-14 bg-gradient-to-br from-primary-100 to-primary-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <span className="text-primary-600 font-bold text-lg">3</span>
              </div>
              <h4 className="font-semibold text-neutral-900 mb-2">{t.step3Title}</h4>
              <p className="text-neutral-500 text-sm leading-relaxed">
                {t.step3Desc}
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-8 text-center border-t border-neutral-100 mt-12">
        <p className="text-neutral-400 text-sm">{t.footer}</p>
      </footer>
    </div>
  );
}
