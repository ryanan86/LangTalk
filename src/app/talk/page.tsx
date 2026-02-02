'use client';

import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { personas } from '@/lib/personas';
import { useLanguage } from '@/lib/i18n';
import TutorAvatar, { TutorAvatarLarge } from '@/components/TutorAvatar';

type Phase = 'ready' | 'recording' | 'interview' | 'analysis' | 'review' | 'shadowing' | 'summary';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface Correction {
  original: string;
  intended: string;
  corrected: string;
  explanation: string;
  category: string;
}

interface ErrorPattern {
  type: string;
  count: number;
  tip: string;
}

interface LevelDetails {
  grammar: number;
  vocabulary: number;
  fluency: number;
  comprehension: number;
  summary: string;
}

interface Analysis {
  corrections: Correction[];
  patterns: ErrorPattern[];
  strengths: string[];
  overallLevel: string;
  evaluatedGrade?: string;
  levelDetails?: LevelDetails;
  encouragement: string;
}

function TalkContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { t, language } = useLanguage();
  const tutorId = searchParams.get('tutor') || 'emma';
  const persona = personas[tutorId];

  // Phase management
  const [phase, setPhase] = useState<Phase>('ready');
  const [timeLeft, setTimeLeft] = useState(30);

  // Conversation state
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationTime, setConversationTime] = useState(0);
  const maxConversationTime = 10 * 60;

  // Processing states
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRecordingReply, setIsRecordingReply] = useState(false);

  // Analysis & Review state
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [currentReviewIndex, setCurrentReviewIndex] = useState(0);

  // Shadowing state
  const [shadowingIndex, setShadowingIndex] = useState(0);
  const [, setShadowingAttempts] = useState<string[]>([]);

  // Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Auto-scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Timer for initial recording (counts up, no auto-stop)
  useEffect(() => {
    if (phase === 'recording') {
      timerRef.current = setTimeout(() => setTimeLeft(t => t + 1), 1000);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [phase, timeLeft]);

  // Timer for conversation (counts up)
  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    if (phase === 'interview') {
      intervalId = setInterval(() => {
        setConversationTime(t => t + 1);
      }, 1000);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [phase]);

  // Increment session count and store evaluated level when session is completed (summary phase)
  useEffect(() => {
    if (phase === 'summary') {
      // Increment session count and store AI-evaluated level
      const body: { evaluatedGrade?: string; levelDetails?: LevelDetails } = {};

      if (analysis?.evaluatedGrade) {
        body.evaluatedGrade = analysis.evaluatedGrade;
      }
      if (analysis?.levelDetails) {
        body.levelDetails = analysis.levelDetails;
      }

      fetch('/api/session-count', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            console.log('Session count incremented:', data.newCount, 'Level:', data.evaluatedGrade);
          }
        })
        .catch(err => console.error('Failed to increment session count:', err));
    }
  }, [phase, analysis]);

  // Format time as MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Get phase display text
  const getPhaseText = () => {
    switch (phase) {
      case 'ready': return t.phaseReady;
      case 'recording': return t.phaseFreeTalk;
      case 'interview': return `${t.phaseConversation} ${formatTime(conversationTime)} / ${formatTime(maxConversationTime)}`;
      case 'analysis': return t.phaseAnalyzing;
      case 'review': return t.phaseReview;
      case 'shadowing': return t.phaseShadowing;
      case 'summary': return t.phaseComplete;
      default: return '';
    }
  };

  // ========== Recording Functions ==========

  const startRecording = async () => {
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
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        stream.getTracks().forEach(track => track.stop());
        await processAudio(audioBlob, true);
      };

      mediaRecorder.start(1000);
      setPhase('recording');
      setTimeLeft(0);
    } catch (error) {
      console.error('Microphone error:', error);
      alert(language === 'ko' ? '마이크 접근을 허용해주세요.' : 'Please allow microphone access.');
    }
  };

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current) {
      if (mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      } else {
        try {
          mediaRecorderRef.current.stop();
        } catch (e) {
          console.log('Error stopping:', e);
        }
      }
    }
  }, []);

  const recordReply = async () => {
    if (isRecordingReply) {
      stopRecording();
      setIsRecordingReply(false);
      return;
    }

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
      setIsRecordingReply(true);

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        setIsRecordingReply(false);
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        stream.getTracks().forEach(track => track.stop());
        await processAudio(audioBlob, false);
      };

      mediaRecorder.start(1000);
    } catch (error) {
      console.error('Recording error:', error);
      setIsRecordingReply(false);
    }
  };

  // ========== Audio Processing ==========

  const processAudio = async (audioBlob: Blob, isInitial: boolean) => {
    setIsProcessing(true);

    try {
      const file = new File([audioBlob], 'audio.webm', { type: 'audio/webm' });
      const formData = new FormData();
      formData.append('audio', file);

      const sttResponse = await fetch('/api/speech-to-text', {
        method: 'POST',
        body: formData,
      });
      const sttData = await sttResponse.json();

      if (sttData.text && sttData.text.trim()) {
        const userMessage: Message = { role: 'user', content: sttData.text };
        const newMessages = [...messages, userMessage];
        setMessages(newMessages);

        if (isInitial) {
          setPhase('interview');
        }

        await getAIResponse(newMessages);
      } else {
        if (isInitial) {
          setPhase('interview');
          const defaultMessage: Message = { role: 'user', content: "Hi, I'd like to practice English conversation." };
          const newMessages = [defaultMessage];
          setMessages(newMessages);
          await getAIResponse(newMessages);
        }
      }
    } catch (error) {
      console.error('Audio processing error:', error);
      if (isInitial) {
        setPhase('interview');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // ========== AI Functions ==========

  const getAIResponse = async (currentMessages: Message[]) => {
    setIsProcessing(true);
    try {
      const MAX_MESSAGES = 10;
      let messagesToSend = currentMessages;

      if (currentMessages.length > MAX_MESSAGES) {
        const firstMessage = currentMessages[0];
        const recentMessages = currentMessages.slice(-MAX_MESSAGES + 1);
        messagesToSend = [firstMessage, ...recentMessages];
      }

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: messagesToSend,
          tutorId,
          mode: 'interview',
        }),
      });
      const data = await response.json();

      if (data.message) {
        const assistantMessage: Message = { role: 'assistant', content: data.message };
        setMessages(prev => [...prev, assistantMessage]);
        await playTTS(data.message);
      }
    } catch (error) {
      console.error('AI response error:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const getAnalysis = async () => {
    setPhase('analysis');
    setIsProcessing(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: messages,
          tutorId,
          mode: 'analysis',
          language: language,
        }),
      });
      const data = await response.json();

      if (data.analysis) {
        setAnalysis(data.analysis);
        setPhase('review');
      } else {
        console.error('Analysis parsing failed');
        setPhase('summary');
      }
    } catch (error) {
      console.error('Analysis error:', error);
      setPhase('summary');
    } finally {
      setIsProcessing(false);
    }
  };

  // ========== TTS Function ==========

  const playTTS = async (text: string) => {
    setIsPlaying(true);
    try {
      const response = await fetch('/api/text-to-speech', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voice: persona.voice }),
      });

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);

      if (audioRef.current) {
        audioRef.current.src = audioUrl;
        await audioRef.current.play();
      }
    } catch (error) {
      console.error('TTS error:', error);
    } finally {
      setIsPlaying(false);
    }
  };

  // ========== Navigation ==========

  const nextReview = () => {
    if (analysis && currentReviewIndex < analysis.corrections.length - 1) {
      setCurrentReviewIndex(prev => prev + 1);
    } else {
      if (analysis && analysis.corrections.length > 0) {
        setShadowingIndex(0);
        setPhase('shadowing');
      } else {
        setPhase('summary');
      }
    }
  };

  const nextShadowing = () => {
    if (analysis && shadowingIndex < analysis.corrections.length - 1) {
      setShadowingIndex(prev => prev + 1);
    } else {
      setPhase('summary');
    }
  };

  const resetSession = () => {
    setMessages([]);
    setConversationTime(0);
    setAnalysis(null);
    setCurrentReviewIndex(0);
    setShadowingIndex(0);
    setShadowingAttempts([]);
    setPhase('ready');
  };

  if (!persona) {
    return <div className="min-h-screen flex items-center justify-center">Invalid tutor</div>;
  }

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col">
      <audio ref={audioRef} onEnded={() => setIsPlaying(false)} />

      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-neutral-200 px-4 sm:px-6 py-3 sm:py-4 sticky top-0 z-50">
        <div className="max-w-2xl mx-auto flex justify-between items-center">
          <button onClick={() => router.push('/')} className="text-neutral-500 hover:text-neutral-700 p-1">
            <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <div className="flex items-center gap-2 sm:gap-3">
            <TutorAvatar
              tutorId={tutorId as 'emma' | 'james' | 'charlotte' | 'oliver'}
              size="sm"
              speaking={isPlaying}
            />
            <div>
              <h2 className="font-semibold text-neutral-900 text-sm sm:text-base">{persona.name}</h2>
              <p className="text-xs text-neutral-500">{getPhaseText()}</p>
            </div>
          </div>

          {phase === 'interview' && conversationTime >= 60 && (
            <button onClick={getAnalysis} className="text-xs sm:text-sm text-primary-600 font-medium hover:text-primary-700">
              {t.done}
            </button>
          )}
          {phase !== 'interview' && <div className="w-12 sm:w-20" />}
        </div>
      </header>

      {/* Progress Bar */}
      <div className="bg-white border-b border-neutral-100 px-4 sm:px-6 py-2">
        <div className="max-w-2xl mx-auto">
          <div className="flex gap-1">
            {['recording', 'interview', 'review', 'shadowing', 'summary'].map((step, idx) => (
              <div
                key={step}
                className={`h-1 flex-1 rounded-full transition-colors ${
                  ['ready', 'recording', 'interview', 'analysis', 'review', 'shadowing', 'summary'].indexOf(phase) > idx
                    ? 'bg-primary-500'
                    : 'bg-neutral-200'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 flex flex-col max-w-2xl mx-auto w-full">

        {/* ========== READY PHASE ========== */}
        {phase === 'ready' && (
          <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8 text-center">
            <div className="mb-4 sm:mb-6 animate-bounce-soft">
              <TutorAvatar
                tutorId={tutorId as 'emma' | 'james' | 'charlotte' | 'oliver'}
                size="xl"
                showName
              />
            </div>

            <h2 className="text-xl sm:text-2xl font-bold text-neutral-900 mb-2">
              {persona.name}{t.readyToStart}
            </h2>
            <p className="text-sm sm:text-base text-neutral-600 mb-6 sm:mb-8 max-w-md px-4">
              {t.readyDescription}
            </p>

            <div className="bg-primary-50 rounded-2xl p-4 sm:p-6 mb-6 sm:mb-8 max-w-md w-full mx-4">
              <h3 className="font-semibold text-primary-900 mb-3 text-sm sm:text-base">{t.sessionFlow}</h3>
              <div className="space-y-2 text-xs sm:text-sm text-primary-700">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 sm:w-6 sm:h-6 bg-primary-200 rounded-full flex items-center justify-center text-xs font-bold">1</span>
                  <span>{t.flowStep1}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 sm:w-6 sm:h-6 bg-primary-200 rounded-full flex items-center justify-center text-xs font-bold">2</span>
                  <span>{t.flowStep2}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 sm:w-6 sm:h-6 bg-primary-200 rounded-full flex items-center justify-center text-xs font-bold">3</span>
                  <span>{t.flowStep3}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 sm:w-6 sm:h-6 bg-primary-200 rounded-full flex items-center justify-center text-xs font-bold">4</span>
                  <span>{t.flowStep4}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 sm:w-6 sm:h-6 bg-primary-200 rounded-full flex items-center justify-center text-xs font-bold">5</span>
                  <span>{t.flowStep5}</span>
                </div>
              </div>
            </div>

            <button onClick={startRecording} className="btn-primary flex items-center gap-2 sm:gap-3 text-base sm:text-lg px-6 sm:px-8 py-3 sm:py-4">
              <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
              {t.startFreeTalk}
            </button>
          </div>
        )}

        {/* ========== RECORDING PHASE ========== */}
        {phase === 'recording' && (
          <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8">
            <div className="relative mb-6 sm:mb-8">
              <svg className="w-32 h-32 sm:w-40 sm:h-40 timer-circle" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="45" stroke="#E5E5E5" />
                <circle
                  cx="50" cy="50" r="45"
                  stroke={timeLeft >= 30 ? '#22C55E' : '#4F46E5'}
                  strokeDasharray={`${Math.min(timeLeft / 30, 1) * 283} 283`}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className={`text-3xl sm:text-4xl font-bold ${timeLeft >= 30 ? 'text-green-600' : 'text-neutral-900'}`}>
                  {formatTime(timeLeft)}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1 h-8 mb-4 sm:mb-6">
              {[...Array(5)].map((_, i) => (<div key={i} className="voice-bar" />))}
            </div>

            {timeLeft < 30 ? (
              <>
                <p className="text-neutral-600 mb-2 text-base sm:text-lg">{t.speakFreely}</p>
                <p className="text-neutral-400 text-xs sm:text-sm mb-6 sm:mb-8">{t.keepGoing30}</p>
              </>
            ) : (
              <>
                <p className="text-green-600 mb-2 text-base sm:text-lg font-medium">{t.greatKeepGoing}</p>
                <p className="text-neutral-400 text-xs sm:text-sm mb-6 sm:mb-8">{t.moreYouShare}</p>
              </>
            )}

            <button
              onClick={() => stopRecording()}
              className="px-6 sm:px-8 py-3 rounded-2xl font-medium transition-colors bg-green-500 text-white hover:bg-green-600 text-sm sm:text-base"
            >
              {t.doneSpeaking} ({formatTime(timeLeft)})
            </button>
          </div>
        )}

        {/* ========== INTERVIEW PHASE ========== */}
        {phase === 'interview' && (
          <>
            <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8">
              {/* Tutor Avatar with Status */}
              <TutorAvatarLarge
                tutorId={tutorId as 'emma' | 'james' | 'charlotte' | 'oliver'}
                speaking={isPlaying}
                status={
                  isPlaying ? 'speaking' :
                  isProcessing ? 'thinking' :
                  isRecordingReply ? 'listening' : 'idle'
                }
              />

              <div className="text-center mt-4 mb-6 sm:mb-8">
                {isPlaying && (
                  <p className="text-neutral-600 font-medium text-sm sm:text-base">{persona.name}{t.speaking}</p>
                )}
                {isProcessing && !isPlaying && (
                  <div className="flex flex-col items-center">
                    <div className="flex gap-2 mb-3">
                      <div className="loading-dot" />
                      <div className="loading-dot" />
                      <div className="loading-dot" />
                    </div>
                    <p className="text-neutral-500 text-sm sm:text-base">{t.thinking}</p>
                  </div>
                )}
                {isRecordingReply && (
                  <div className="flex flex-col items-center">
                    <div className="flex items-center gap-1 h-8 mb-3">
                      {[...Array(5)].map((_, i) => (<div key={i} className="voice-bar" style={{ backgroundColor: '#EF4444' }} />))}
                    </div>
                    <p className="text-red-500 font-medium text-sm sm:text-base">{t.recordingVoice}</p>
                  </div>
                )}
                {!isPlaying && !isProcessing && !isRecordingReply && (
                  <p className="text-neutral-500 text-sm sm:text-base">{t.tapToSpeak}</p>
                )}
              </div>

              <div ref={messagesEndRef} className="hidden" />
            </div>

            <div className="p-4 sm:p-6 bg-white border-t border-neutral-200">
              <div className="flex gap-2 sm:gap-3">
                <button
                  onClick={recordReply}
                  disabled={isProcessing || isPlaying}
                  className={`flex-1 py-3 sm:py-4 rounded-2xl font-medium flex items-center justify-center gap-2 transition-all text-sm sm:text-base ${
                    isRecordingReply
                      ? 'bg-red-500 text-white recording-active'
                      : isProcessing || isPlaying
                        ? 'bg-neutral-100 text-neutral-400'
                        : 'btn-primary'
                  }`}
                >
                  <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                  {isRecordingReply ? t.stop : isPlaying ? t.listening : isProcessing ? t.processing : t.reply}
                </button>

                <button
                  onClick={getAnalysis}
                  disabled={isProcessing || isPlaying || isRecordingReply}
                  className="px-4 sm:px-6 py-3 sm:py-4 rounded-2xl font-medium bg-neutral-800 text-white hover:bg-neutral-900 transition-all disabled:bg-neutral-300 disabled:text-neutral-500 text-sm sm:text-base"
                >
                  {t.done}
                </button>
              </div>

              <p className="text-center text-neutral-400 text-xs sm:text-sm mt-3">
                {formatTime(conversationTime)} / {formatTime(maxConversationTime)}
              </p>
            </div>
          </>
        )}

        {/* ========== ANALYSIS PHASE ========== */}
        {phase === 'analysis' && (
          <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8">
            <TutorAvatar
              tutorId={tutorId as 'emma' | 'james' | 'charlotte' | 'oliver'}
              size="lg"
            />
            <h2 className="text-lg sm:text-xl font-bold text-neutral-900 mb-2 text-center mt-4">{persona.name}{t.analyzing}</h2>
            <p className="text-neutral-500 mb-6 text-sm sm:text-base text-center">{t.analyzingDesc}</p>
            <div className="flex gap-2">
              <div className="loading-dot" />
              <div className="loading-dot" />
              <div className="loading-dot" />
            </div>
          </div>
        )}

        {/* ========== REVIEW PHASE ========== */}
        {phase === 'review' && analysis && (
          <div className="flex-1 flex flex-col p-4 sm:p-6">
            <div className="text-center mb-4 sm:mb-6">
              <span className="text-xs sm:text-sm text-neutral-500">{t.correction} {currentReviewIndex + 1} {t.of} {analysis.corrections.length}</span>
            </div>

            {analysis.corrections.length > 0 ? (
              <div className="flex-1 flex flex-col justify-center">
                <div className="card-premium p-4 sm:p-6 mb-4 sm:mb-6">
                  {/* Original */}
                  <div className="mb-4 sm:mb-6">
                    <span className="text-xs font-medium text-red-500 uppercase tracking-wider">{t.whatYouSaid}</span>
                    <p className="text-base sm:text-lg text-neutral-800 mt-2 line-through decoration-red-300">
                      {analysis.corrections[currentReviewIndex].original}
                    </p>
                  </div>

                  {/* Intended */}
                  <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-neutral-50 rounded-xl">
                    <span className="text-xs font-medium text-neutral-500 uppercase tracking-wider">{t.whatYouMeant}</span>
                    <p className="text-neutral-700 mt-2 text-sm sm:text-base">
                      {analysis.corrections[currentReviewIndex].intended}
                    </p>
                  </div>

                  {/* Corrected */}
                  <div className="mb-4 sm:mb-6">
                    <span className="text-xs font-medium text-green-600 uppercase tracking-wider">{t.correctWay}</span>
                    <div className="flex items-center gap-2 sm:gap-3 mt-2">
                      <p className="text-base sm:text-lg text-green-700 font-medium flex-1">
                        {analysis.corrections[currentReviewIndex].corrected}
                      </p>
                      <button
                        onClick={() => playTTS(analysis.corrections[currentReviewIndex].corrected)}
                        disabled={isPlaying}
                        className="w-10 h-10 sm:w-12 sm:h-12 bg-green-100 rounded-xl flex items-center justify-center hover:bg-green-200 transition-colors flex-shrink-0"
                      >
                        {isPlaying ? (
                          <div className="w-4 h-4 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <svg className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Explanation */}
                  <div className="p-3 sm:p-4 bg-primary-50 rounded-xl">
                    <span className="text-xs font-medium text-primary-600 uppercase tracking-wider">{t.why}</span>
                    <p className="text-primary-900 mt-2 text-xs sm:text-sm">
                      {analysis.corrections[currentReviewIndex].explanation}
                    </p>
                    <span className="inline-block mt-2 px-2 py-1 bg-primary-100 text-primary-700 text-xs rounded-full">
                      {analysis.corrections[currentReviewIndex].category}
                    </span>
                  </div>
                </div>

                <button onClick={nextReview} className="btn-primary w-full text-sm sm:text-base py-3 sm:py-4">
                  {currentReviewIndex < analysis.corrections.length - 1 ? t.nextCorrection : t.startShadowing}
                </button>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center">
                <div className="w-14 h-14 sm:w-16 sm:h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-7 h-7 sm:w-8 sm:h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-neutral-900 mb-2">{language === 'ko' ? '훌륭해요!' : 'Great job!'}</h3>
                <p className="text-neutral-600 mb-6 text-sm sm:text-base">{language === 'ko' ? '주요 교정 사항이 없습니다.' : 'No major corrections needed.'}</p>
                <button onClick={() => setPhase('summary')} className="btn-primary text-sm sm:text-base">
                  {t.viewSummary}
                </button>
              </div>
            )}
          </div>
        )}

        {/* ========== SHADOWING PHASE ========== */}
        {phase === 'shadowing' && analysis && analysis.corrections.length > 0 && (
          <div className="flex-1 flex flex-col p-4 sm:p-6">
            <div className="text-center mb-4 sm:mb-6">
              <span className="text-xs sm:text-sm text-neutral-500">{t.shadowing} {shadowingIndex + 1} {t.of} {analysis.corrections.length}</span>
            </div>

            <div className="flex-1 flex flex-col justify-center">
              <div className="card-premium p-4 sm:p-6 mb-4 sm:mb-6 text-center">
                <p className="text-xs sm:text-sm text-neutral-500 mb-3 sm:mb-4">{t.listenAndRepeat}</p>
                <p className="text-xl sm:text-2xl font-medium text-neutral-900 mb-4 sm:mb-6">
                  {analysis.corrections[shadowingIndex].corrected}
                </p>

                <button
                  onClick={() => playTTS(analysis.corrections[shadowingIndex].corrected)}
                  disabled={isPlaying}
                  className="w-16 h-16 sm:w-20 sm:h-20 mx-auto bg-primary-100 rounded-full flex items-center justify-center hover:bg-primary-200 transition-colors mb-4 sm:mb-6"
                >
                  {isPlaying ? (
                    <div className="flex items-center gap-1 h-8">
                      {[...Array(5)].map((_, i) => (<div key={i} className="voice-bar" />))}
                    </div>
                  ) : (
                    <svg className="w-8 h-8 sm:w-10 sm:h-10 text-primary-600" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  )}
                </button>

                <p className="text-xs sm:text-sm text-neutral-400">{t.practiceAloud}</p>
              </div>

              <button onClick={nextShadowing} className="btn-primary w-full text-sm sm:text-base py-3 sm:py-4">
                {shadowingIndex < analysis.corrections.length - 1 ? t.nextSentence : t.viewSummary}
              </button>
            </div>
          </div>
        )}

        {/* ========== SUMMARY PHASE ========== */}
        {phase === 'summary' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6">
            <div className="text-center mb-6 sm:mb-8">
              <div className="flex justify-center mb-4">
                <TutorAvatar
                  tutorId={tutorId as 'emma' | 'james' | 'charlotte' | 'oliver'}
                  size="lg"
                />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-neutral-900">{t.sessionComplete}</h2>
            </div>

            {analysis && (
              <>
                {/* AI Evaluated Level */}
                {analysis.evaluatedGrade && analysis.levelDetails && (
                  <div className="card-premium p-4 sm:p-6 mb-4 bg-gradient-to-br from-indigo-50 to-purple-50">
                    <h3 className="font-semibold text-neutral-900 mb-3 flex items-center gap-2 text-sm sm:text-base">
                      <span className="w-5 h-5 sm:w-6 sm:h-6 bg-indigo-100 rounded-full flex items-center justify-center">
                        <svg className="w-3 h-3 sm:w-4 sm:h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                      </span>
                      {language === 'ko' ? '오늘의 레벨 평가' : "Today's Level Assessment"}
                    </h3>

                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                        <span className="text-white font-bold text-lg">{analysis.evaluatedGrade}</span>
                      </div>
                      <div>
                        <p className="text-xs text-neutral-500">{language === 'ko' ? '평가 등급' : 'Evaluated Grade'}</p>
                        <p className="text-lg font-bold text-neutral-900">
                          {analysis.evaluatedGrade === 'K' && (language === 'ko' ? '유치원' : 'Kindergarten')}
                          {analysis.evaluatedGrade === '1-2' && (language === 'ko' ? '초등 1-2학년' : 'Grade 1-2')}
                          {analysis.evaluatedGrade === '3-4' && (language === 'ko' ? '초등 3-4학년' : 'Grade 3-4')}
                          {analysis.evaluatedGrade === '5-6' && (language === 'ko' ? '초등 5-6학년' : 'Grade 5-6')}
                          {analysis.evaluatedGrade === '7-8' && (language === 'ko' ? '중학교' : 'Middle School')}
                          {analysis.evaluatedGrade === '9-10' && (language === 'ko' ? '고등학교' : 'High School')}
                          {analysis.evaluatedGrade === '11-12' && (language === 'ko' ? '고급' : 'Advanced')}
                          {analysis.evaluatedGrade === 'College' && (language === 'ko' ? '대학 수준' : 'College Level')}
                        </p>
                      </div>
                    </div>

                    {/* Score Breakdown */}
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { label: language === 'ko' ? '문법' : 'Grammar', value: analysis.levelDetails.grammar, color: 'bg-blue-500' },
                        { label: language === 'ko' ? '어휘' : 'Vocabulary', value: analysis.levelDetails.vocabulary, color: 'bg-green-500' },
                        { label: language === 'ko' ? '유창성' : 'Fluency', value: analysis.levelDetails.fluency, color: 'bg-purple-500' },
                        { label: language === 'ko' ? '이해력' : 'Comprehension', value: analysis.levelDetails.comprehension, color: 'bg-amber-500' },
                      ].map((item) => (
                        <div key={item.label} className="bg-white/60 rounded-lg p-2">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-xs text-neutral-600">{item.label}</span>
                            <span className="text-xs font-bold text-neutral-900">{item.value}</span>
                          </div>
                          <div className="h-1.5 bg-neutral-200 rounded-full overflow-hidden">
                            <div className={`h-full ${item.color} rounded-full`} style={{ width: `${item.value}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>

                    {analysis.levelDetails.summary && (
                      <p className="mt-3 text-xs sm:text-sm text-neutral-600 italic">{analysis.levelDetails.summary}</p>
                    )}
                  </div>
                )}

                {/* Strengths */}
                <div className="card-premium p-4 sm:p-6 mb-4">
                  <h3 className="font-semibold text-neutral-900 mb-3 flex items-center gap-2 text-sm sm:text-base">
                    <span className="w-5 h-5 sm:w-6 sm:h-6 bg-green-100 rounded-full flex items-center justify-center">
                      <svg className="w-3 h-3 sm:w-4 sm:h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </span>
                    {t.whatYouDidWell}
                  </h3>
                  <ul className="space-y-2">
                    {analysis.strengths.map((strength, idx) => (
                      <li key={idx} className="text-neutral-700 text-xs sm:text-sm flex items-start gap-2">
                        <span className="text-green-500 mt-0.5">•</span>
                        {strength}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Error Patterns */}
                {analysis.patterns.length > 0 && (
                  <div className="card-premium p-4 sm:p-6 mb-4">
                    <h3 className="font-semibold text-neutral-900 mb-3 flex items-center gap-2 text-sm sm:text-base">
                      <span className="w-5 h-5 sm:w-6 sm:h-6 bg-amber-100 rounded-full flex items-center justify-center">
                        <svg className="w-3 h-3 sm:w-4 sm:h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                      </span>
                      {t.areasToFocus}
                    </h3>
                    <div className="space-y-3">
                      {analysis.patterns.map((pattern, idx) => (
                        <div key={idx} className="p-3 bg-amber-50 rounded-xl">
                          <div className="flex justify-between items-center mb-1">
                            <span className="font-medium text-amber-900 text-sm">{pattern.type}</span>
                            <span className="text-xs bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full">{pattern.count}x</span>
                          </div>
                          <p className="text-xs sm:text-sm text-amber-700">{pattern.tip}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Encouragement */}
                <div className="card-premium p-4 sm:p-6 mb-6 bg-gradient-to-br from-primary-50 to-white">
                  <p className="text-primary-900 italic text-sm sm:text-base">&ldquo;{analysis.encouragement}&rdquo;</p>
                  <p className="text-xs sm:text-sm text-primary-600 mt-2">— {persona.name}</p>
                </div>
              </>
            )}

            <div className="flex gap-3 sm:gap-4">
              <button onClick={() => router.push('/')} className="flex-1 btn-secondary text-sm sm:text-base py-3 sm:py-4">
                {t.backToHome}
              </button>
              <button onClick={resetSession} className="flex-1 btn-primary text-sm sm:text-base py-3 sm:py-4">
                {t.practiceAgain}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function TalkPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex gap-2">
          <div className="loading-dot" />
          <div className="loading-dot" />
          <div className="loading-dot" />
        </div>
      </div>
    }>
      <TalkContent />
    </Suspense>
  );
}
