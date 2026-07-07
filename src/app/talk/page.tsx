'use client';

import { useState, useEffect, useRef, useCallback, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { personas } from '@/lib/personas';
import { useLanguage } from '@/lib/i18n';
import TutorAvatar, { TutorAvatarLarge } from '@/components/TutorAvatar';
import type { SpeechMetrics } from '@/lib/speechMetrics';
// html2canvas is dynamically imported when needed (lazy loading for ~46kB bundle savings)
// import { useLipSync } from '@/hooks/useLipSync';
import { useTTSPlayback } from '@/hooks/useTTSPlayback';
import { useAudioRecording } from '@/hooks/useAudioRecording';
import { useSessionPersistence } from '@/hooks/useSessionPersistence';
import { useDeepgramSTT } from '@/hooks/useDeepgramSTT';
import { useConversationAI } from '@/hooks/useConversationAI';
import { useAnalysisPhase } from '@/hooks/useAnalysisPhase';
import CorrectionCard from '@/components/talk/CorrectionCard';
import SummaryReport from '@/components/talk/SummaryReport';
import LevelUpModal from '@/components/gamification/LevelUpModal';
import AchievementToast from '@/components/gamification/AchievementToast';
import { calculateXP, checkLevelUp, checkAchievements, calculateLevel, createDefaultGamificationState } from '@/lib/gamification';
import type { Achievement } from '@/lib/gamification';
import StartModeSelector, { type StartMode } from '@/components/talk/StartModeSelector';
import TopicSelector from '@/components/talk/TopicSelector';
import WarmupUI from '@/components/talk/WarmupUI';
import { getRandomOpener } from '@/lib/tutorOpeners';
import { getTopicSuggestions, shuffleTopics, type TopicCard } from '@/lib/topicSuggestions';
import { getWarmupSet } from '@/lib/warmupPhrases';
import type { VocabBookItem } from '@/lib/sheetTypes';
import type { SpeakingEvaluationResponse } from '@/app/api/speaking-evaluate/route';
import { track } from '@/lib/analytics';
import Badge from '@/components/ui/Badge';
import Skeleton from '@/components/ui/Skeleton';
import AiBadge from '@/components/ai/AiBadge';

type Phase = 'ready' | 'mode-select' | 'topic-select' | 'warmup' | 'tutor-intro'
           | 'recording' | 'interview' | 'analysis' | 'review' | 'shadowing' | 'summary';

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
  confidence?: 'high' | 'medium' | 'low';
}

// ─── Mic SVG Icon ─────────────────────────────────────────────────────────────
function MicIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
    </svg>
  );
}

function StopIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="6" y="6" width="12" height="12" rx="2" />
    </svg>
  );
}

function PlayIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
    </svg>
  );
}

function BackIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  );
}

function EyeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  );
}

function EyeOffIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
    </svg>
  );
}

function SpinnerIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

function TalkContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { t, language } = useLanguage();
  const tutorId = searchParams.get('tutor') || 'emma';
  const persona = personas[tutorId];

  // TTS playback hook
  const aiFinishedSpeakingTimeRef = useRef<number>(0);
  const tts = useTTSPlayback({
    voice: persona.voice,
    onQueueEnd: () => {
      aiFinishedSpeakingTimeRef.current = Date.now();
    },
  });
  const {
    isPlaying, setIsPlaying,
    ttsLoading,
    streamingText, setStreamingText,
    playTTS, extractCompleteSentences, queueTTS,
    prefetchAudio,
    clearQueue,
    audioRef, fillerAudioRef,
    audioQueueRef, isPlayingQueueRef,
  } = tts;

  // Stable ref for playTTS — avoids useEffect dependency churn since playTTS
  // is not memoised inside the hook and creates a new reference each render.
  const playTTSRef = useRef(playTTS);
  playTTSRef.current = playTTS;

  // Phase management
  const [phase, setPhase] = useState<Phase>('ready');

  // First Utterance Scaffolding state
  const [, setStartMode] = useState<StartMode | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<TopicCard | null>(null);
  const [topicPool, setTopicPool] = useState<TopicCard[]>(() => getTopicSuggestions({ count: 4 }));
  const [warmupPhrases] = useState(() => getWarmupSet());
  const [sessionCount, setSessionCount] = useState<number>(0);
  const [correctionLevel, setCorrectionLevel] = useState<1 | 2 | 3 | 4>(2);

  // Conversation state
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationTime, setConversationTime] = useState(0);
  const maxConversationTime = 10 * 60;

  // Processing states
  const [isProcessing, setIsProcessing] = useState(false);

  // Lip-sync disabled - was causing face image split glitch on mobile

  // Analysis & Review state
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [currentReviewIndex, setCurrentReviewIndex] = useState(0);

  // Shadowing state
  const [shadowingIndex, setShadowingIndex] = useState(0);
  const [, setShadowingAttempts] = useState<string[]>([]);

  // Speech metrics state
  const [speechMetrics, setSpeechMetrics] = useState<SpeechMetrics | null>(null);
  const responseTimesRef = useRef<number[]>([]);
  const userSpeakingTimeRef = useRef<number>(0);

  // Auto-play voice feedback flag
  const [hasPlayedReviewIntro, setHasPlayedReviewIntro] = useState(false);
  const [lastPlayedReviewIndex, setLastPlayedReviewIndex] = useState(-1);

  // Streaming state
  const [showTranscript, setShowTranscript] = useState(false);

  const isEndingSessionRef = useRef(false);

  // Exit confirmation modal
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  // User info for session (birth year & name)
  const [showUserInfoModal, setShowUserInfoModal] = useState(false);
  const [birthYear, setBirthYear] = useState<number | null>(null);
  const [userName, setUserName] = useState<string>('');
  const [selectedDecade, setSelectedDecade] = useState<number | null>(null);

  // Previous session data for adaptive difficulty
  const [previousGrade, setPreviousGrade] = useState<string | null>(null);
  const [previousLevelDetails, setPreviousLevelDetails] = useState<{ grammar: number; vocabulary: number; fluency: number; comprehension: number } | null>(null);
  const [sessionVocab, setSessionVocab] = useState<VocabBookItem[]>([]);

  // Refs
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const summaryRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef<Message[]>([]);
  const conversationTimeRef = useRef(0);

  // Deepgram streaming STT hook
  const { connectDeepgram, closeDeepgram, sendToDeepgram, realtimeTranscriptRef } = useDeepgramSTT();
  const [isSavingImage, setIsSavingImage] = useState(false);

  // Gamification state
  const [earnedXP, setEarnedXP] = useState(0);
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [levelUpData, setLevelUpData] = useState<{ previousLevel: number; newLevel: number }>({ previousLevel: 1, newLevel: 1 });
  const [newAchievements, setNewAchievements] = useState<Achievement[]>([]);
  const [currentAchievementIndex, setCurrentAchievementIndex] = useState(0);
  const gamificationTriggeredRef = useRef(false);

  // ========== Recording Hook ==========

  const {
    startRecording,
    stopRecording,
    recordReply,
    isRecordingReply,
    timeLeft,
    setTimeLeft,
  } = useAudioRecording({
    onInitialRecordingComplete: (audioBlob, transcript) => {
      if (transcript) {
        processAudioWithText(transcript, true);
      } else {
        processAudio(audioBlob, true);
      }
    },
    onReplyRecordingComplete: (audioBlob, transcript) => {
      if (transcript) {
        processAudioWithText(transcript, false);
      } else {
        processAudio(audioBlob, false);
      }
    },
    onRecordingStarted: () => {
      setPhase('recording');
    },
    onStopRecordingStart: () => {
      // Immediately transition to interview phase with processing state
      // so user gets instant visual feedback
      setPhase('interview');
      setIsProcessing(true);
    },
    connectDeepgram,
    sendToDeepgram,
    closeDeepgram,
    realtimeTranscriptRef,
    aiFinishedSpeakingTimeRef,
    responseTimesRef,
    userSpeakingTimeRef,
  });

  // Conversation AI hook (streaming SSE response)
  const { getAIResponse, abortControllerRef } = useConversationAI({
    tutorId,
    queueTTS,
    extractCompleteSentences,
    clearQueue,
    playTTS,
    prefetchAudio,
    audioQueueRef,
    isPlayingQueueRef,
    setMessages,
    setStreamingText,
    setIsProcessing,
    setIsPlaying,
    setShowTranscript,
    isEndingSessionRef,
  });

  // Analysis phase hook (end-of-session analysis with retry)
  const { getAnalysis } = useAnalysisPhase({
    isEndingSessionRef,
    abortControllerRef,
    audioRef,
    audioQueueRef,
    isPlayingQueueRef,
    userSpeakingTimeRef,
    responseTimesRef,
    getMessages: useCallback(() => messagesRef.current, []),
    getConversationTime: useCallback(() => conversationTimeRef.current, []),
    tutorId,
    language,
    birthYear,
    userName,
    previousGrade,
    previousLevelDetails,
    setIsPlaying,
    setIsProcessing,
    setStreamingText,
    setPhase,
    setSpeechMetrics,
    setAnalysis,
  });

  // Speaking Evaluation state (algorithmic grade-level analysis)
  const [speakingEval, setSpeakingEval] = useState<SpeakingEvaluationResponse['evaluation'] | null>(null);
  const [isLoadingEval, setIsLoadingEval] = useState(false);
  const [repeatedCategories, setRepeatedCategories] = useState<Set<string>>(new Set());

  // Save summary as single merged image (mobile browsers block rapid sequential downloads)
  const saveAsImage = async () => {
    if (!summaryRef.current) return;

    setIsSavingImage(true);
    try {
      await document.fonts.ready;

      // Report uses Midnight Glass (dark) design - always capture with dark background
      const bgColor = '#0f172a';
      const sections = summaryRef.current.querySelectorAll<HTMLElement>('[data-report-section]');
      const date = new Date().toISOString().split('T')[0];
      const scale = 3;
      const gap = 24 * scale; // spacing between sections

      // Capture all sections first
      const canvases: HTMLCanvasElement[] = [];
      for (let i = 0; i < sections.length; i++) {
        const { default: html2canvas } = await import('html2canvas');
        const canvas = await html2canvas(sections[i], {
          backgroundColor: bgColor,
          scale,
          useCORS: true,
          logging: false,
          allowTaint: true,
        });
        canvases.push(canvas);
      }

      // Merge into single tall canvas
      const totalWidth = Math.max(...canvases.map(c => c.width));
      const totalHeight = canvases.reduce((sum, c) => sum + c.height, 0) + gap * (canvases.length - 1);

      const merged = document.createElement('canvas');
      merged.width = totalWidth;
      merged.height = totalHeight;
      const ctx = merged.getContext('2d');
      if (!ctx) throw new Error('Canvas context unavailable');

      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, totalWidth, totalHeight);

      let y = 0;
      for (const canvas of canvases) {
        const x = Math.round((totalWidth - canvas.width) / 2);
        ctx.drawImage(canvas, x, y);
        y += canvas.height + gap;
      }

      // Single download - works reliably on mobile
      const link = document.createElement('a');
      link.download = `taptalk-report-${date}.jpg`;
      link.href = merged.toDataURL('image/jpeg', 0.92);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Failed to save image:', error);
    } finally {
      setIsSavingImage(false);
    }
  };

  // Check if session is actively in progress (not ready, mode-select, or summary)
  const isSessionActive = phase !== 'ready' && phase !== 'summary' && phase !== 'mode-select' && phase !== 'topic-select' && phase !== 'warmup' && phase !== 'tutor-intro';

  // Lip-sync disabled - was causing face image split glitch on mobile
  // useEffect(() => {
  //   if (isPlaying) startAnalysis();
  //   else stopAnalysis();
  // }, [isPlaying, startAnalysis, stopAnalysis]);

  // Handle back button click - show confirmation if session is active
  const handleBackClick = useCallback(() => {
    if (isSessionActive) {
      setShowExitConfirm(true);
    } else {
      router.push('/');
    }
  }, [isSessionActive, router]);

  // Browser back button and beforeunload guards
  useEffect(() => {
    if (!isSessionActive) return;

    // Push a dummy state so browser back triggers popstate instead of navigating
    window.history.pushState({ taptalkSession: true }, '');

    const handlePopState = () => {
      setShowExitConfirm(true);
      // Re-push state to keep the guard active if user cancels
      window.history.pushState({ taptalkSession: true }, '');
    };

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isSessionActive]);

  // Fetch previous session data for adaptive difficulty & session count
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/session-count', { signal: controller.signal })
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(data => {
        if (data.evaluatedGrade) setPreviousGrade(data.evaluatedGrade);
        if (data.levelDetails) setPreviousLevelDetails(data.levelDetails);
        if (typeof data.sessionCount === 'number') setSessionCount(data.sessionCount);
      })
      .catch(() => { /* ignore */ });
    // Fetch correction level from user profile
    fetch('/api/user-profile', { signal: controller.signal })
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(data => {
        if (data.profile?.correctionLevel) setCorrectionLevel(data.profile.correctionLevel);
      })
      .catch(() => { /* ignore */ });
    return () => controller.abort();
  }, []);

  // Keep refs in sync with state
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);
  useEffect(() => {
    conversationTimeRef.current = conversationTime;
  }, [conversationTime]);

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
  }, [phase, timeLeft, setTimeLeft]);

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

  // Session persistence: save session count, lesson history, and vocab book when summary phase is reached
  const { resetSaved: resetSessionSaved } = useSessionPersistence({
    phase,
    analysis,
    messages,
    conversationTime,
    tutorId,
    language,
    birthYear,
    previousGrade,
    previousLevelDetails,
    speechMetrics,
    correctionLevel,
    onVocabSaved: setSessionVocab,
  });

  // Auto-play voice feedback for review phase
  useEffect(() => {
    if (phase === 'review' && analysis && analysis.corrections.length > 0 && !isPlaying) {
      // Play intro message when first entering review phase
      if (!hasPlayedReviewIntro) {
        const correction = analysis.corrections[0];
        const introMessage = `Let me help you improve. You said: "${correction.original}". A better way to say this is: "${correction.corrected}".`;
        playTTSRef.current(introMessage);
        setHasPlayedReviewIntro(true);
        setLastPlayedReviewIndex(0);
      }
      // Play correction explanation when index changes
      else if (currentReviewIndex !== lastPlayedReviewIndex) {
        const clampedIndex = Math.min(currentReviewIndex, analysis.corrections.length - 1);
        const correction = analysis.corrections[clampedIndex];
        const feedbackMessage = `You said: "${correction.original}". Try saying: "${correction.corrected}".`;
        playTTSRef.current(feedbackMessage);
        setLastPlayedReviewIndex(currentReviewIndex);
      }
    }
  }, [phase, analysis, currentReviewIndex, hasPlayedReviewIntro, lastPlayedReviewIndex, isPlaying]);

  // Detect repeated mistake categories when entering review or summary phase
  useEffect(() => {
    if ((phase === 'review' || phase === 'summary') && analysis?.corrections?.length) {
      fetch('/api/corrections?due=false&limit=100')
        .then(res => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.json();
        })
        .then(data => {
          if (data.corrections?.length) {
            const catCounts: Record<string, number> = {};
            for (const c of data.corrections) {
              catCounts[c.category] = (catCounts[c.category] || 0) + 1;
            }
            // Categories with existing corrections = repeated if new session also has them
            const newCategories = analysis.corrections.map((c: { category: string }) => c.category);
            const repeated = new Set<string>();
            newCategories.forEach((cat: string) => {
              if (catCounts[cat]) repeated.add(cat);
            });
            setRepeatedCategories(repeated);
          }
        })
        .catch(err => console.error('Repeat detection error:', err));
    }
  }, [phase, analysis]);

  // Fetch speaking evaluation when entering review phase
  useEffect(() => {
    if (phase === 'review' && messages.length > 0 && !speakingEval && !isLoadingEval) {
      const userMessages = messages.filter(m => m.role === 'user').map(m => m.content);
      if (userMessages.length === 0) return;

      setIsLoadingEval(true);
      fetch('/api/speaking-evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userMessages,
          birthYear,
          language,
        }),
      })
        .then(res => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.json();
        })
        .then(data => {
          if (data.success && data.evaluation) {
            setSpeakingEval(data.evaluation);
          }
        })
        .catch(err => console.error('Speaking evaluation error:', err))
        .finally(() => setIsLoadingEval(false));
    }
  }, [phase, messages, birthYear, language, speakingEval, isLoadingEval]);

  // Auto-play summary feedback
  useEffect(() => {
    if (phase === 'summary' && analysis) {
      // Small delay to let the UI render first
      const timer = setTimeout(() => {
        const summaryMessage = analysis.encouragement;
        playTTSRef.current(summaryMessage);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [phase, analysis]);

  // Analytics: session start / complete
  const sessionStartFiredRef = useRef(false);
  useEffect(() => {
    if (phase === 'interview' && !sessionStartFiredRef.current) {
      sessionStartFiredRef.current = true;
      track('talk_session_start', { tutor: tutorId });
    }
    if (phase === 'summary') {
      track('talk_session_complete', { tutor: tutorId, durationMin: Math.round(conversationTimeRef.current / 60) });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // Gamification: calculate XP, check achievements, check level-up on session completion
  useEffect(() => {
    if (phase !== 'summary' || !analysis || gamificationTriggeredRef.current) return;
    gamificationTriggeredRef.current = true;

    // Load existing gamification state from localStorage
    let stored: string | null = null;
    try { stored = localStorage.getItem('taptalk-gamification-state'); } catch { /* Safari private mode */ }
    const existingState = stored ? JSON.parse(stored) : createDefaultGamificationState();

    // Calculate XP earned this session
    let xpGained = calculateXP('session_complete');
    const hasPerfect = analysis.corrections.length === 0;
    if (hasPerfect) {
      xpGained += calculateXP('no_corrections');
    }
    if (existingState.streakDays > 1) {
      xpGained += calculateXP('streak_bonus', { streakDays: existingState.streakDays });
    }

    setEarnedXP(xpGained);

    // Check level-up
    const levelResult = checkLevelUp(existingState.totalXP, xpGained);
    if (levelResult.leveled) {
      setLevelUpData({ previousLevel: levelResult.previousLevel, newLevel: levelResult.newLevel });
      setTimeout(() => setShowLevelUp(true), 1500);
    }

    // Build updated state for achievement checking
    const updatedState = {
      ...existingState,
      totalXP: existingState.totalXP + xpGained,
      level: calculateLevel(existingState.totalXP + xpGained),
      sessionsCompleted: existingState.sessionsCompleted + 1,
      perfectSessions: hasPerfect ? existingState.perfectSessions + 1 : existingState.perfectSessions,
      tutorsUsed: existingState.tutorsUsed.includes(tutorId)
        ? existingState.tutorsUsed
        : [...existingState.tutorsUsed, tutorId],
    };

    // Check new achievements
    const unlocked = checkAchievements(updatedState);
    if (unlocked.length > 0) {
      updatedState.unlockedAchievements = [
        ...updatedState.unlockedAchievements,
        ...unlocked.map((a: Achievement) => a.id),
      ];
      setNewAchievements(unlocked);
      setCurrentAchievementIndex(0);
    }

    // Save updated state and XP to localStorage
    try { localStorage.setItem('taptalk-gamification-state', JSON.stringify(updatedState)); } catch { /* Safari private mode */ }
    let prevXP = 0;
    try { prevXP = parseInt(localStorage.getItem('taptalk-user-xp') || '0', 10); } catch { /* Safari private mode */ }
    try { localStorage.setItem('taptalk-user-xp', String(prevXP + xpGained)); } catch { /* Safari private mode */ }
  }, [phase, analysis, tutorId]);

  // Handle tutor-first mode: play opener then let user respond
  const handleTutorIntroComplete = useCallback(async () => {
    const opener = getRandomOpener(tutorId);
    // Add tutor's opener as first assistant message
    const assistantMessage: Message = { role: 'assistant', content: opener.text };
    setMessages([assistantMessage]);
    // Play the opener via TTS
    setPhase('interview');
    setConversationTime(0);
    await playTTSRef.current(opener.text);
  }, [tutorId]);

  // Handle warmup complete: transition to tutor-first conversation
  const handleWarmupComplete = useCallback(async () => {
    const opener = getRandomOpener(tutorId);
    const assistantMessage: Message = { role: 'assistant', content: opener.text };
    setMessages([assistantMessage]);
    setPhase('interview');
    setConversationTime(0);
    await playTTSRef.current(opener.text);
  }, [tutorId]);

  // Trigger tutor-first intro when entering tutor-intro phase
  useEffect(() => {
    if (phase === 'tutor-intro') {
      handleTutorIntroComplete();
    }
  }, [phase, handleTutorIntroComplete]);

  // Format time as MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Determine recommended start mode based on session count
  const recommendedMode: StartMode = sessionCount <= 3 ? 'tutor-first' : sessionCount <= 8 ? 'topic-guided' : 'free-talk';

  // Handle start mode selection from StartModeSelector
  const handleStartModeSelect = (mode: StartMode) => {
    setStartMode(mode);
    switch (mode) {
      case 'free-talk':
        // Go directly to recording (existing flow)
        startRecording();
        break;
      case 'topic-guided':
        setTopicPool(getTopicSuggestions({ count: 4 }));
        setPhase('topic-select');
        break;
      case 'tutor-first':
        setPhase('tutor-intro');
        break;
      case 'warmup':
        setPhase('warmup');
        break;
    }
  };

  // Handle topic selection → start recording with topic context
  const handleTopicSelect = (topic: TopicCard) => {
    setSelectedTopic(topic);
    startRecording();
  };

  // Get phase display text
  const getPhaseText = () => {
    switch (phase) {
      case 'ready': return t.phaseReady;
      case 'mode-select': return language === 'ko' ? '시작 모드 선택' : 'Choose Start Mode';
      case 'topic-select': return language === 'ko' ? '주제 선택' : 'Pick a Topic';
      case 'warmup': return language === 'ko' ? '워밍업' : 'Warm Up';
      case 'tutor-intro': return language === 'ko' ? '튜터가 시작 중...' : 'Tutor Starting...';
      case 'recording': return t.phaseFreeTalk;
      case 'interview': return `${t.phaseConversation} ${formatTime(conversationTime)} / ${formatTime(maxConversationTime)}`;
      case 'analysis': return t.phaseAnalyzing;
      case 'review': return t.phaseReview;
      case 'shadowing': return t.phaseShadowing;
      case 'summary': return t.phaseComplete;
      default: return '';
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
      if (!sttResponse.ok) {
        console.error('STT error:', sttResponse.status);
        setIsProcessing(false);
        return;
      }
      const sttData = await sttResponse.json();

      if (sttData.text && sttData.text.trim()) {
        const userMessage: Message = { role: 'user', content: sttData.text };
        const newMessages = [...messagesRef.current, userMessage];
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
      if (isInitial && !isEndingSessionRef.current) {
        setPhase('interview');
      }
    } finally {
      if (!isEndingSessionRef.current) {
        setIsProcessing(false);
      }
    }
  };

  const processAudioWithText = async (text: string, isInitial: boolean) => {
    setIsProcessing(true);
    try {
      if (text.trim()) {
        const userMessage: Message = { role: 'user', content: text };
        const newMessages = [...messagesRef.current, userMessage];
        setMessages(newMessages);
        if (isInitial) setPhase('interview');
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
      console.error('processAudioWithText error:', error);
      if (isInitial && !isEndingSessionRef.current) setPhase('interview');
    } finally {
      if (!isEndingSessionRef.current) setIsProcessing(false);
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
    isEndingSessionRef.current = false;
    gamificationTriggeredRef.current = false;
    sessionStartFiredRef.current = false;
    resetSessionSaved();
    setMessages([]);
    setConversationTime(0);
    setAnalysis(null);
    setCurrentReviewIndex(0);
    setShadowingIndex(0);
    setShadowingAttempts([]);
    setSpeechMetrics(null);
    responseTimesRef.current = [];
    aiFinishedSpeakingTimeRef.current = 0;
    userSpeakingTimeRef.current = 0;
    setHasPlayedReviewIntro(false);
    setLastPlayedReviewIndex(-1);
    setIsSavingImage(false);
    setStartMode(null);
    setSelectedTopic(null);
    setTopicPool(getTopicSuggestions({ count: 4 }));
    setEarnedXP(0);
    setShowLevelUp(false);
    setNewAchievements([]);
    setCurrentAchievementIndex(0);
    setPhase('ready');
  };

  // Pre-compute random bar heights for recording visualizer (avoids Math.random in render)
  const recordingBarHeights = useMemo(
    () => [1, 2, 3, 4, 5].map(() => 12 + Math.random() * 20),
    []
  );

  if (!persona) {
    return <div className="min-h-screen flex items-center justify-center">Invalid tutor</div>;
  }

  // Dynamic theme based on phase
  const isDarkPhase = phase === 'interview' || phase === 'recording' || phase === 'tutor-intro';
  const accentColor = persona.accentColor;

  // Safe array index clamping to prevent out-of-bounds crash if array shrinks
  const safeReviewIndex = analysis
    ? Math.min(currentReviewIndex, Math.max(0, analysis.corrections.length - 1))
    : 0;
  const safeShadowingIndex = analysis
    ? Math.min(shadowingIndex, Math.max(0, analysis.corrections.length - 1))
    : 0;

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-500 ${
      isDarkPhase ? 'bg-neutral-950' : 'bg-neutral-50 dark:bg-dark-bg'
    }`}>
      <audio ref={audioRef} onEnded={() => setIsPlaying(false)} />
      <audio ref={fillerAudioRef} />

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header
        style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}
        className={`px-4 sm:px-6 pb-2 sm:pb-3 sticky top-0 z-50 transition-colors duration-500 ${
          isDarkPhase
            ? 'bg-neutral-950/90 backdrop-blur-xl border-b border-white/[0.05]'
            : 'bg-white/85 dark:bg-dark-surface/85 backdrop-blur-xl border-b border-black/[0.06] dark:border-white/[0.06]'
        }`}
      >
        <div className="max-w-3xl mx-auto flex justify-between items-center gap-3">
          {/* Back */}
          <button
            onClick={handleBackClick}
            aria-label="Go back"
            className={`pressable p-2 -ml-1 rounded-xl transition-colors ${
              isDarkPhase
                ? 'text-white/50 hover:text-white hover:bg-white/[0.06]'
                : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-white/[0.06]'
            }`}
          >
            <BackIcon className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>

          {/* Tutor identity */}
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            {/* Speaking-state pulse ring around accent dot */}
            <div className="relative flex-shrink-0">
              {isPlaying && (
                <>
                  <span
                    aria-hidden="true"
                    className="absolute inset-0 rounded-full motion-safe:animate-pulse-ring-recording"
                    style={{ backgroundColor: accentColor.primary, opacity: 0.5 }}
                  />
                  <span
                    aria-hidden="true"
                    className="absolute inset-0 rounded-full motion-safe:animate-pulse-ring-recording"
                    style={{ backgroundColor: accentColor.primary, opacity: 0.3, animationDelay: '0.5s' }}
                  />
                </>
              )}
              <span
                className="relative w-2.5 h-2.5 rounded-full block"
                style={{ backgroundColor: accentColor.primary }}
              />
            </div>
            <div className="min-w-0">
              <p className={`font-semibold text-sm sm:text-base leading-tight truncate ${
                isDarkPhase ? 'text-white' : 'text-neutral-900 dark:text-white'
              }`}>
                {persona.name}
              </p>
              <p className={`text-[11px] leading-tight truncate ${
                isDarkPhase ? 'text-white/40' : 'text-neutral-500 dark:text-neutral-400'
              }`}>
                {getPhaseText()}
              </p>
            </div>
          </div>

          {/* Done button — only in interview */}
          {phase === 'interview' ? (
            <button
              onClick={getAnalysis}
              className={`pressable flex-shrink-0 text-xs sm:text-sm font-semibold px-3 py-1.5 rounded-xl transition-all ${
                isDarkPhase
                  ? 'text-primary-300 bg-primary-500/15 hover:bg-primary-500/25 border border-primary-500/25'
                  : 'text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-500/10 hover:bg-primary-100 dark:hover:bg-primary-500/20 border border-primary-200 dark:border-primary-500/25'
              }`}
            >
              {t.done}
            </button>
          ) : (
            <div className="w-12 sm:w-16 flex-shrink-0" />
          )}
        </div>

        {/* ── Progress rail ───────────────────────────────────────────────── */}
        <div className="max-w-3xl mx-auto mt-2.5 flex gap-1.5">
          {['start', 'conversation', 'review', 'shadowing', 'summary'].map((step, idx) => {
            const phaseOrder = ['ready', 'mode-select', 'topic-select', 'warmup', 'tutor-intro', 'recording', 'interview', 'analysis', 'review', 'shadowing', 'summary'];
            const currentIdx = phaseOrder.indexOf(phase);
            const stepThresholds = [4, 6, 7, 8, 9];
            const filled = currentIdx >= stepThresholds[idx];
            const active = idx === stepThresholds.findIndex((t, i) => currentIdx >= t && (i === stepThresholds.length - 1 || currentIdx < stepThresholds[i + 1]));
            return (
              <div
                key={step}
                className={`h-1 flex-1 rounded-full overflow-hidden transition-colors duration-300 ${
                  isDarkPhase ? 'bg-white/[0.08]' : 'bg-neutral-200 dark:bg-white/[0.08]'
                }`}
              >
                <div
                  className={`h-full rounded-full origin-left transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                    filled ? 'bg-brand-gradient scale-x-100' : active ? 'bg-primary-400/50 scale-x-100 motion-safe:animate-pulse' : 'scale-x-0'
                  }`}
                />
              </div>
            );
          })}
        </div>
      </header>

      {/* ── Main Content ─────────────────────────────────────────────────────── */}
      <main id="main-content" className="flex-1 flex flex-col max-w-3xl mx-auto w-full">

        {/* ========== READY PHASE ========== */}
        {phase === 'ready' && (
          <div
            className="motion-safe:animate-fade-up flex-1 flex flex-col items-center justify-center p-5 sm:p-8 text-center"
            style={{ paddingBottom: 'max(8rem, calc(2rem + env(safe-area-inset-bottom)))' }}
          >
            {/* Elevated avatar with gentle-bounce and ambient glow */}
            <div className="relative mb-6">
              <div
                aria-hidden="true"
                className="absolute inset-0 rounded-full blur-2xl scale-110 opacity-30"
                style={{ background: `radial-gradient(circle, ${accentColor.primary} 0%, transparent 70%)` }}
              />
              <div className="relative motion-safe:animate-bounce-soft">
                <TutorAvatar
                  tutorId={tutorId as 'emma' | 'james' | 'charlotte' | 'oliver'}
                  size="xl"
                  showName
                />
              </div>
            </div>

            <h2 className="text-display-2 text-neutral-900 dark:text-white mb-2">
              {t.readyToStart.replace('{name}', persona.name)}
            </h2>
            <p className="text-sm sm:text-base text-neutral-500 dark:text-neutral-400 mb-7 max-w-sm">
              {t.readyDescription}
            </p>

            {/* Session flow card */}
            <div className="w-full max-w-sm mb-7 p-5 rounded-card-lg bg-white/80 dark:bg-white/[0.04] backdrop-blur-xl border border-black/[0.06] dark:border-white/[0.06] shadow-card dark:shadow-card-dark text-left">
              <p className="text-xs font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider mb-3">
                {t.sessionFlow}
              </p>
              <div className="space-y-2.5">
                {[t.flowStep1, t.flowStep2, t.flowStep3, t.flowStep4, t.flowStep5].map((step, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary-100 dark:bg-primary-500/20 flex items-center justify-center text-[10px] font-bold text-primary-600 dark:text-primary-400 mt-0.5">
                      {i + 1}
                    </span>
                    <span className="text-sm text-neutral-700 dark:text-neutral-300 leading-snug">{step}</span>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => { setSelectedDecade(null); setShowUserInfoModal(true); }}
              className="pressable btn-primary flex items-center gap-2.5 text-base px-7 py-3.5 rounded-2xl"
            >
              <MicIcon className="w-5 h-5" />
              {t.startFreeTalk}
            </button>
          </div>
        )}

        {/* ========== MODE SELECT PHASE ========== */}
        {phase === 'mode-select' && (
          <div className="motion-safe:animate-fade-up flex-1 flex flex-col">
            <StartModeSelector
              tutorId={tutorId}
              tutorName={persona.name}
              recommendedMode={recommendedMode}
              onSelect={handleStartModeSelect}
              onBack={() => setPhase('ready')}
            />
          </div>
        )}

        {/* ========== TOPIC SELECT PHASE ========== */}
        {phase === 'topic-select' && (
          <div className="motion-safe:animate-fade-up flex-1 flex flex-col">
            <TopicSelector
              topics={topicPool}
              onSelect={handleTopicSelect}
              onBack={() => setPhase('mode-select')}
              onShuffle={() => setTopicPool(shuffleTopics([...topicPool]))}
            />
          </div>
        )}

        {/* ========== WARMUP PHASE ========== */}
        {phase === 'warmup' && (
          <WarmupUI
            phrases={warmupPhrases}
            onComplete={handleWarmupComplete}
            onBack={() => setPhase('mode-select')}
            onPlayPhrase={(text) => playTTS(text, 0.85)}
            isPlaying={isPlaying}
            ttsLoading={ttsLoading}
          />
        )}

        {/* ========== TUTOR INTRO PHASE ========== */}
        {phase === 'tutor-intro' && (
          <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8 relative">
            {/* Ambient glow */}
            <div
              aria-hidden="true"
              className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[300px] h-[300px] rounded-full blur-3xl pointer-events-none"
              style={{ backgroundColor: accentColor.glow }}
            />
            <div className="relative z-10 text-center motion-safe:animate-fade-up">
              <TutorAvatarLarge
                tutorId={tutorId as 'emma' | 'james' | 'charlotte' | 'oliver'}
                speaking={true}
                mouthOpen={0}
                status="speaking"
              />
              <p className="text-white/80 mt-6 mb-1 text-base sm:text-lg font-medium">
                {language === 'ko'
                  ? `${persona.name}님이 말을 걸고 있어요...`
                  : `${persona.name} is starting the conversation...`}
              </p>
              <p className="text-white/40 text-xs sm:text-sm mb-4">
                {language === 'ko' ? '잠시 기다려주세요' : 'Please wait a moment'}
              </p>
              <div className="flex gap-2 justify-center">
                <div className="loading-dot" />
                <div className="loading-dot" />
                <div className="loading-dot" />
              </div>
            </div>
          </div>
        )}

        {/* ========== RECORDING PHASE ========== */}
        {phase === 'recording' && (
          <div className="motion-safe:animate-ds-scale-in flex-1 flex flex-col items-center justify-center p-4 sm:p-8 relative">
            {/* Ambient glow */}
            <div
              aria-hidden="true"
              className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[320px] h-[320px] rounded-full blur-3xl opacity-25 pointer-events-none"
              style={{ backgroundColor: accentColor.primary }}
            />

            {/* Hero record button with pulse rings */}
            <div className="relative mb-10 z-10">
              {/* Timer ring */}
              <svg className="w-40 h-40 sm:w-48 sm:h-48 timer-circle" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="45" stroke="rgba(255,255,255,0.08)" />
                <circle
                  cx="50" cy="50" r="45"
                  stroke={timeLeft >= 30 ? '#22C55E' : accentColor.primary}
                  strokeDasharray={`${Math.min(timeLeft / 30, 1) * 283} 283`}
                  className="transition-all duration-300"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className={`text-4xl sm:text-5xl font-bold tabular-nums ${timeLeft >= 30 ? 'text-green-400' : 'text-white'}`}>
                  {formatTime(timeLeft)}
                </span>
              </div>
            </div>

            {/* Voice bars */}
            <div className="flex items-center justify-center gap-1.5 h-12 mb-5 relative z-10">
              {[1,2,3,4,5,4,3,2,1].map((h, i) => (
                <div
                  key={i}
                  className="w-1 rounded-full motion-safe:animate-pulse"
                  style={{
                    height: `${h * 8}px`,
                    backgroundColor: accentColor.primary,
                    animationDelay: `${i * 0.05}s`,
                    animationDuration: '0.6s'
                  }}
                />
              ))}
            </div>

            {selectedTopic ? (
              <div className="relative z-10 text-center">
                <p className="text-white/80 mb-1.5 text-base sm:text-lg font-medium">
                  {language === 'ko' ? selectedTopic.titleKo : selectedTopic.titleEn}
                </p>
                <p className="text-sm sm:text-base mb-1.5 font-mono" style={{ color: accentColor.primary }}>
                  &ldquo;{selectedTopic.starterHint}&rdquo;
                </p>
                <p className="text-white/40 text-xs sm:text-sm mb-8">
                  {language === 'ko' ? '이 힌트로 시작해보세요!' : 'Try starting with this hint!'}
                </p>
              </div>
            ) : timeLeft < 30 ? (
              <div className="relative z-10 text-center mb-8">
                <p className="text-white/80 mb-1 text-base sm:text-lg font-medium">{t.speakFreely}</p>
                <p className="text-white/40 text-xs sm:text-sm">{t.keepGoing30}</p>
              </div>
            ) : (
              <div className="relative z-10 text-center mb-8">
                <p className="text-green-400 mb-1 text-base sm:text-lg font-semibold">{t.greatKeepGoing}</p>
                <p className="text-white/40 text-xs sm:text-sm">{t.moreYouShare}</p>
              </div>
            )}

            <button
              onClick={() => stopRecording()}
              className="pressable relative z-10 px-8 py-4 rounded-2xl font-semibold transition-all bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/40 hover:-translate-y-0.5 text-base"
            >
              {t.doneSpeaking} ({formatTime(timeLeft)})
            </button>
          </div>
        )}

        {/* ========== INTERVIEW PHASE ========== */}
        {phase === 'interview' && (
          <div className="motion-safe:animate-ds-scale-in flex-1 flex flex-col">
            {/* Ambient radial glow shifts with state */}
            <div aria-hidden="true" className="absolute inset-0 overflow-hidden pointer-events-none">
              <div
                className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[400px] h-[400px] rounded-full opacity-15 transition-all duration-700"
                style={{
                  background: `radial-gradient(circle, ${
                    isRecordingReply ? 'rgba(239,68,68,0.6)' :
                    isPlaying ? accentColor.glow.replace('0.2)', '0.5)') :
                    accentColor.glow
                  } 0%, transparent 70%)`,
                }}
              />
            </div>

            <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8 relative z-10">
              {/* ── Tutor avatar: elevated presence, speaking-state pulse ring ── */}
              <div className="relative mb-6">
                {/* Pulse rings when speaking */}
                {isPlaying && (
                  <>
                    <span
                      aria-hidden="true"
                      className="absolute inset-0 rounded-full motion-safe:animate-pulse-ring-recording"
                      style={{ backgroundColor: accentColor.primary, opacity: 0.35, transform: 'scale(1.18)' }}
                    />
                    <span
                      aria-hidden="true"
                      className="absolute inset-0 rounded-full motion-safe:animate-pulse-ring-recording"
                      style={{ backgroundColor: accentColor.primary, opacity: 0.2, transform: 'scale(1.36)', animationDelay: '0.55s' }}
                    />
                  </>
                )}
                <TutorAvatarLarge
                  tutorId={tutorId as 'emma' | 'james' | 'charlotte' | 'oliver'}
                  speaking={isPlaying}
                  mouthOpen={0}
                  status={
                    isPlaying ? 'speaking' :
                    isProcessing ? 'thinking' :
                    isRecordingReply ? 'listening' : 'idle'
                  }
                />
              </div>

              {/* Name + level badges */}
              <div className="flex items-center gap-2 mb-5">
                <span className="font-semibold text-white text-sm">{persona.name}</span>
                <Badge variant="info" size="sm">{persona.nationality ?? 'English'}</Badge>
                {previousGrade && <Badge variant="default" size="sm">{previousGrade}</Badge>}
                <AiBadge variant="neutral" />
              </div>

              {/* State label area */}
              <div className="text-center mb-6" aria-live="polite" aria-atomic="true">
                {/* Streaming transcript panel */}
                {(streamingText || isPlaying) && (
                  <div className="px-4 mb-2">
                    {showTranscript ? (
                      <div className="bg-white/[0.05] backdrop-blur-xl rounded-2xl p-4 border border-white/[0.08] max-w-sm mx-auto text-left motion-safe:animate-fade-up">
                        <p className="text-white/90 text-sm sm:text-base leading-relaxed">
                          {streamingText || messages[messages.length - 1]?.content}
                          {streamingText && (
                            <span
                              className="inline-block w-1.5 h-4 ml-0.5 motion-safe:animate-pulse rounded-sm"
                              style={{ backgroundColor: accentColor.primary }}
                            />
                          )}
                        </p>
                        <button
                          onClick={() => setShowTranscript(false)}
                          className="mt-3 text-xs text-white/40 hover:text-white/60 transition-colors flex items-center gap-1"
                        >
                          <EyeOffIcon className="w-3.5 h-3.5" />
                          {language === 'ko' ? '텍스트 숨기기' : 'Hide text'}
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setShowTranscript(true)}
                        className="text-xs text-white/35 hover:text-white/55 flex items-center gap-1.5 mx-auto transition-colors"
                      >
                        <EyeIcon className="w-3.5 h-3.5" />
                        {language === 'ko' ? '텍스트 보기' : 'Show text'}
                      </button>
                    )}
                  </div>
                )}

                {ttsLoading && !isPlaying && (
                  <p className="text-white/45 text-sm motion-safe:animate-pulse">
                    {language === 'ko' ? 'AI 튜터가 준비 중이에요...' : 'Tutor is preparing...'}
                  </p>
                )}
                {isPlaying && !streamingText && (
                  <p className="text-white/65 font-medium text-sm">{persona.name}{t.speaking}</p>
                )}
                {isProcessing && !isPlaying && !streamingText && (
                  <div className="flex flex-col items-center gap-2">
                    <div className="flex gap-1.5">
                      {[1,2,3].map(i => (
                        <div
                          key={i}
                          className="w-2 h-2 rounded-full motion-safe:animate-pulse"
                          style={{ backgroundColor: accentColor.primary, animationDelay: `${i * 0.15}s` }}
                        />
                      ))}
                    </div>
                    <p className="text-white/45 text-sm">{t.thinking}</p>
                  </div>
                )}
                {isRecordingReply && (
                  <div className="flex flex-col items-center gap-2">
                    <div className="flex items-center gap-1 h-9">
                      {[1,2,3,4,5].map((_, idx) => (
                        <div
                          key={idx}
                          className="w-1 bg-red-500 rounded-full motion-safe:animate-pulse"
                          style={{
                            height: `${recordingBarHeights[idx]}px`,
                            animationDelay: `${idx * 0.1}s`,
                            animationDuration: '0.4s'
                          }}
                        />
                      ))}
                    </div>
                    <p className="text-red-400 font-medium text-sm">{t.recordingVoice}</p>
                  </div>
                )}
                {!isPlaying && !isProcessing && !isRecordingReply && !streamingText && (
                  <p className="text-white/35 text-sm">{t.tapToSpeak}</p>
                )}
              </div>

              <div ref={messagesEndRef} className="hidden" />
            </div>

            {/* ── Bottom control panel ──────────────────────────────────────── */}
            <div
              className="px-4 sm:px-6 py-4 bg-neutral-900/85 dark:bg-black/50 backdrop-blur-xl border-t border-white/[0.05]"
              style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom, 1rem))' }}
            >
              <div className="max-w-lg mx-auto space-y-3">
                <div className="flex gap-3">
                  {/* Replay last tutor message */}
                  {messages.length > 0 && (
                    <button
                      onClick={() => {
                        const lastAssistant = [...messages].reverse().find(m => m.role === 'assistant');
                        if (lastAssistant) playTTS(lastAssistant.content);
                      }}
                      disabled={isPlaying || ttsLoading || isRecordingReply || isProcessing}
                      aria-label={language === 'ko' ? '튜터 메시지 다시 듣기' : 'Replay tutor message'}
                      className={`pressable w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 transition-all ${
                        isPlaying || ttsLoading || isRecordingReply || isProcessing
                          ? 'bg-white/[0.04] text-white/20 cursor-not-allowed'
                          : 'bg-white/[0.08] text-white/60 hover:bg-white/[0.12] hover:text-white/80'
                      }`}
                    >
                      {ttsLoading ? (
                        <SpinnerIcon className="w-5 h-5 animate-spin" />
                      ) : (
                        <PlayIcon className="w-5 h-5" />
                      )}
                    </button>
                  )}

                  {/* Hero mic button — gradient + pulse rings when recording */}
                  <button
                    onClick={recordReply}
                    disabled={isProcessing || isPlaying}
                    aria-label={isRecordingReply ? 'Stop recording' : 'Start recording'}
                    className={`pressable relative flex-1 h-14 rounded-2xl font-semibold flex items-center justify-center gap-2.5 transition-all text-base overflow-hidden ${
                      isRecordingReply
                        ? 'bg-red-500 text-white shadow-lg shadow-red-500/30'
                        : isProcessing || isPlaying
                          ? 'bg-white/[0.04] text-white/25 cursor-not-allowed'
                          : 'bg-brand-gradient text-white shadow-lg shadow-primary-500/35 hover:shadow-primary-500/50 hover:-translate-y-px'
                    }`}
                    style={
                      !isRecordingReply && !(isProcessing || isPlaying)
                        ? { background: `linear-gradient(135deg, ${accentColor.primary} 0%, #7C3AED 100%)` }
                        : undefined
                    }
                  >
                    {/* Pulse rings when recording */}
                    {isRecordingReply && (
                      <>
                        <span aria-hidden="true" className="absolute inset-0 rounded-2xl bg-red-500/50 motion-safe:animate-pulse-ring-recording" />
                        <span aria-hidden="true" className="absolute inset-0 rounded-2xl bg-red-400/30 motion-safe:animate-pulse-ring-recording" style={{ animationDelay: '0.5s' }} />
                      </>
                    )}
                    <span className="relative z-10 flex items-center gap-2">
                      {isRecordingReply ? (
                        <StopIcon className="w-5 h-5" />
                      ) : (
                        <MicIcon className="w-5 h-5" />
                      )}
                      {isRecordingReply ? t.stop : isPlaying ? t.listening : isProcessing ? t.processing : t.reply}
                    </span>
                  </button>

                  {/* End session button */}
                  <button
                    onClick={getAnalysis}
                    disabled={isRecordingReply}
                    aria-label={t.done}
                    className={`pressable w-14 h-14 rounded-2xl font-semibold flex items-center justify-center flex-shrink-0 border transition-all text-sm ${
                      isRecordingReply
                        ? 'bg-white/[0.04] text-white/20 border-white/[0.04] cursor-not-allowed'
                        : isProcessing || isPlaying
                          ? 'bg-amber-500/15 text-amber-300 border-amber-400/25 hover:bg-amber-500/25'
                          : 'bg-white/[0.08] text-white border-white/[0.08] hover:bg-white/[0.14] hover:border-white/[0.14]'
                    }`}
                  >
                    {t.done}
                  </button>
                </div>

                {/* Conversation timer */}
                <div className="flex items-center justify-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 motion-safe:animate-pulse" />
                  <p className="text-white/35 text-xs font-medium tabular-nums tracking-wide">
                    {formatTime(conversationTime)} / {formatTime(maxConversationTime)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========== ANALYSIS PHASE ========== */}
        {phase === 'analysis' && (
          <div className="motion-safe:animate-fade-up flex-1 flex flex-col items-center justify-center p-4 sm:p-8 gap-6">
            <TutorAvatar
              tutorId={tutorId as 'emma' | 'james' | 'charlotte' | 'oliver'}
              size="lg"
            />
            {/* Skeleton placeholders for content-to-come */}
            <div className="w-full max-w-xs space-y-3">
              <Skeleton shape="line" width="60%" height={20} className="mx-auto" />
              <Skeleton shape="line" width="85%" height={16} className="mx-auto" />
              <Skeleton shape="rect" height={80} />
              <Skeleton shape="rect" height={80} />
            </div>
            <div className="text-center">
              <h2 className="text-base font-semibold text-neutral-900 dark:text-white mb-1">
                {persona.name}{t.analyzing}
              </h2>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">{t.analyzingDesc}</p>
              <div className="flex gap-2 justify-center mt-4">
                <div className="loading-dot" />
                <div className="loading-dot" />
                <div className="loading-dot" />
              </div>
            </div>
          </div>
        )}

        {/* ========== REVIEW PHASE ========== */}
        {phase === 'review' && analysis && (
          <div className="motion-safe:animate-fade-up flex-1 flex flex-col p-4 sm:p-6 bg-neutral-50 dark:bg-dark-bg">
            {/* Phase header */}
            <div className="text-center mb-4 sm:mb-5">
              <div className="inline-flex items-center gap-1.5">
                <p className="text-xs font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">
                  {correctionLevel <= 2
                    ? (language === 'ko' ? '오늘의 표현' : "Today's Expressions")
                    : t.correction}
                  {' '}{safeReviewIndex + 1} / {analysis.corrections.length}
                </p>
                <AiBadge variant="neutral" />
              </div>
              {/* Progress pip track */}
              {analysis.corrections.length > 1 && (
                <div className="flex items-center justify-center gap-1 mt-2">
                  {analysis.corrections.map((_, i) => (
                    <div
                      key={i}
                      className={`rounded-full transition-all duration-300 ${
                        i < safeReviewIndex
                          ? 'w-2 h-2 bg-emerald-500'
                          : i === safeReviewIndex
                            ? 'w-3 h-3 bg-primary-500'
                            : 'w-2 h-2 bg-neutral-300 dark:bg-neutral-700'
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>

            {analysis.corrections.length > 0 ? (
              <div className="flex-1 flex flex-col justify-center">
                <div className="mb-4 sm:mb-5 motion-safe:animate-fade-up">
                  <CorrectionCard
                    original={analysis.corrections[safeReviewIndex].original}
                    intended={analysis.corrections[safeReviewIndex].intended}
                    corrected={analysis.corrections[safeReviewIndex].corrected}
                    explanation={analysis.corrections[safeReviewIndex].explanation}
                    category={analysis.corrections[safeReviewIndex].category}
                    isRepeated={repeatedCategories.has(analysis.corrections[safeReviewIndex].category)}
                    correctionIndex={safeReviewIndex}
                    correctionLevel={correctionLevel}
                    isPlaying={isPlaying}
                    onPlayCorrected={() => playTTS(analysis.corrections[safeReviewIndex].corrected, 0.85)}
                    onPlayExplanation={() => {
                      const c = analysis.corrections[safeReviewIndex];
                      playTTS(`You said: "${c.original}". A better way is: "${c.corrected}". ${c.explanation}`, 0.85);
                    }}
                    language={language}
                  />
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => playTTS(analysis.corrections[safeReviewIndex].corrected, 0.85)}
                    disabled={isPlaying || ttsLoading}
                    aria-label={language === 'ko' ? '올바른 표현 듣기' : 'Listen to corrected form'}
                    className="pressable w-12 h-12 sm:w-14 sm:h-14 bg-emerald-500/12 dark:bg-emerald-500/15 rounded-card flex items-center justify-center hover:bg-emerald-500/22 transition-colors flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isPlaying || ttsLoading ? (
                      <SpinnerIcon className="w-4 h-4 animate-spin text-emerald-500" />
                    ) : (
                      <PlayIcon className="w-6 h-6 text-emerald-500" />
                    )}
                  </button>
                  <button
                    onClick={nextReview}
                    className="pressable btn-primary flex-1 text-sm sm:text-base py-3 sm:py-3.5 rounded-2xl"
                  >
                    {currentReviewIndex < analysis.corrections.length - 1 ? t.nextCorrection : t.startShadowing}
                  </button>
                </div>
              </div>
            ) : (
              /* No corrections — perfect session */
              <div className="flex-1 flex flex-col items-center justify-center text-center motion-safe:animate-fade-up">
                <div className="w-16 h-16 bg-brand-gradient rounded-full flex items-center justify-center mb-4 shadow-float dark:shadow-float-dark motion-safe:animate-gentle-bounce">
                  <CheckIcon className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-display-2 text-neutral-900 dark:text-white mb-2">
                  {language === 'ko' ? '훌륭해요!' : 'Great job!'}
                </h3>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-6 max-w-xs">
                  {correctionLevel <= 2
                    ? (language === 'ko' ? '오늘은 아주 자연스럽게 대화했어요!' : 'You spoke very naturally today!')
                    : (language === 'ko' ? '주요 교정 사항이 없습니다.' : 'No major corrections needed.')}
                </p>
                <button
                  onClick={() => setPhase('summary')}
                  className="pressable btn-primary"
                >
                  {t.viewSummary}
                </button>
              </div>
            )}
          </div>
        )}

        {/* ========== SHADOWING PHASE ========== */}
        {phase === 'shadowing' && analysis && analysis.corrections.length > 0 && (
          <div className="motion-safe:animate-fade-up flex-1 flex flex-col p-4 sm:p-6">
            <div className="text-center mb-4 sm:mb-5">
              <p className="text-xs font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">
                {t.shadowing} {safeShadowingIndex + 1} / {analysis.corrections.length}
              </p>
            </div>

            <div className="flex-1 flex flex-col justify-center">
              {/* Card: sentence to shadow */}
              <div className="p-5 sm:p-7 mb-5 rounded-card-lg bg-white/80 dark:bg-white/[0.04] backdrop-blur-xl border border-black/[0.06] dark:border-white/[0.06] shadow-card dark:shadow-card-dark text-center">
                <p className="text-xs font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider mb-4">
                  {t.listenAndRepeat}
                </p>
                <p className="text-xl sm:text-2xl font-medium text-neutral-900 dark:text-white leading-relaxed mb-6">
                  {analysis.corrections[safeShadowingIndex].corrected}
                </p>

                {/* Play button — brand gradient, elevated */}
                <button
                  onClick={() => playTTS(analysis.corrections[safeShadowingIndex].corrected, 0.8)}
                  disabled={isPlaying || ttsLoading}
                  aria-label={language === 'ko' ? '문장 듣기' : 'Listen to sentence'}
                  className="pressable w-16 h-16 sm:w-20 sm:h-20 mx-auto bg-brand-gradient rounded-full flex items-center justify-center shadow-float dark:shadow-float-dark disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:shadow-card-hover"
                >
                  {ttsLoading ? (
                    <SpinnerIcon className="w-7 h-7 sm:w-8 sm:h-8 animate-spin text-white" />
                  ) : isPlaying ? (
                    <div className="flex items-center gap-1 h-7">
                      {[...Array(5)].map((_, i) => (<div key={i} className="voice-bar" />))}
                    </div>
                  ) : (
                    <PlayIcon className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
                  )}
                </button>

                <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-4">{t.practiceAloud}</p>
              </div>

              <button
                onClick={nextShadowing}
                className="pressable btn-primary w-full text-sm sm:text-base py-3.5 rounded-2xl"
              >
                {shadowingIndex < analysis.corrections.length - 1 ? t.nextSentence : t.viewSummary}
              </button>
            </div>
          </div>
        )}

        {/* ========== SUMMARY PHASE ========== */}
        {phase === 'summary' && (
          <div className="motion-safe:animate-fade-up flex-1 flex flex-col">
            {/* XP chip — celebration-adjacent with count-pop */}
            {earnedXP > 0 && (
              <div className="flex justify-center pt-3 motion-safe:animate-count-pop">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-50 dark:bg-violet-500/10 border border-violet-200 dark:border-violet-500/20 text-xs font-semibold text-violet-700 dark:text-violet-300">
                  +{earnedXP} XP
                </span>
              </div>
            )}
            <SummaryReport
              analysis={analysis}
              speechMetrics={speechMetrics}
              speakingEval={speakingEval}
              isLoadingEval={isLoadingEval}
              repeatedCategories={repeatedCategories}
              sessionVocab={sessionVocab}
              birthYear={birthYear}
              userName={userName}
              tutorId={tutorId}
              persona={persona}
              language={language}
              t={t}
              summaryRef={summaryRef}
              isSavingImage={isSavingImage}
              saveAsImage={saveAsImage}
              onBackHome={() => router.push('/')}
              onPracticeAgain={resetSession}
              conversationTime={conversationTime}
            />
          </div>
        )}
      </main>

      {/* Gamification: Level Up Modal */}
      <LevelUpModal
        isOpen={showLevelUp}
        level={levelUpData.newLevel}
        previousLevel={levelUpData.previousLevel}
        onClose={() => setShowLevelUp(false)}
      />

      {/* Gamification: Achievement Toast Queue */}
      {newAchievements.length > 0 && currentAchievementIndex < newAchievements.length && (
        <AchievementToast
          key={newAchievements[currentAchievementIndex].id}
          achievement={newAchievements[currentAchievementIndex]}
          language={language === 'ko' ? 'ko' : 'en'}
          onDismiss={() => setCurrentAchievementIndex(i => i + 1)}
        />
      )}

      {/* ── Exit Session Confirmation Modal ──────────────────────────────── */}
      {showExitConfirm && (
        <div
          className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="exit-dialog-title"
        >
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowExitConfirm(false)}
          />
          <div className="relative bg-white dark:bg-neutral-900 rounded-card-lg shadow-float dark:shadow-float-dark w-full max-w-xs overflow-hidden motion-safe:animate-ds-scale-in">
            <div className="p-6 text-center">
              <div className="w-14 h-14 mx-auto mb-4 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center">
                <svg className="w-7 h-7 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 id="exit-dialog-title" className="text-lg font-bold text-neutral-900 dark:text-white mb-2">
                {t.exitSessionTitle}
              </h3>
              <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-6">
                {t.exitSessionMessage}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowExitConfirm(false)}
                  className="pressable flex-1 py-2.5 px-4 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 font-medium text-sm hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
                >
                  {t.exitSessionCancel}
                </button>
                <button
                  onClick={() => {
                    setShowExitConfirm(false);
                    router.push('/');
                  }}
                  className="pressable flex-1 py-2.5 px-4 rounded-xl bg-red-500 text-white font-medium text-sm hover:bg-red-600 transition-colors"
                >
                  {t.exitSessionConfirm}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── User Info Modal ───────────────────────────────────────────────── */}
      {showUserInfoModal && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="user-info-title"
        >
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowUserInfoModal(false)}
          />

          <div className="relative bg-white dark:bg-neutral-900 rounded-card-lg shadow-float dark:shadow-float-dark w-full max-w-sm overflow-hidden motion-safe:animate-ds-scale-in">
            {/* Header */}
            <div className="bg-brand-gradient p-6 text-center">
              <div className="w-16 h-16 mx-auto mb-3 bg-white/20 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h3 id="user-info-title" className="text-xl font-bold text-white">
                {language === 'ko' ? '학습자 정보' : 'Learner Info'}
              </h3>
              <p className="text-white/75 text-sm mt-1">
                {language === 'ko' ? '나이에 맞는 평가를 위해 입력해주세요' : 'For age-appropriate evaluation'}
              </p>
            </div>

            {/* Form */}
            <div className="p-6 space-y-5">
              {/* English Name */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  {language === 'ko' ? '영문 이름' : 'English Name'}
                </label>
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder={language === 'ko' ? '예: Emma, James' : 'e.g. Emma, James'}
                  className="w-full px-4 py-3 rounded-xl border-2 border-neutral-200 dark:border-neutral-700 focus:border-primary-500 focus:outline-none transition-colors text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 bg-white dark:bg-neutral-800"
                />
              </div>

              {/* Birth Year — 2-Step Selector */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  {t.birthYear}
                </label>

                {selectedDecade === null ? (
                  <>
                    <p className="text-xs text-neutral-500 mb-2 text-center">{t.selectDecade}</p>
                    <div className="grid grid-cols-4 gap-2">
                      {[1950, 1960, 1970, 1980, 1990, 2000, 2010, 2020].map((decade) => (
                        <button
                          key={decade}
                          onClick={() => setSelectedDecade(decade)}
                          className={`pressable py-2.5 rounded-xl text-sm font-medium transition-all ${
                            birthYear !== null && birthYear >= decade && birthYear < decade + 10
                              ? 'bg-brand-gradient text-white shadow-card'
                              : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                          }`}
                        >
                          {decade}s
                        </button>
                      ))}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-2 mb-2">
                      <button
                        onClick={() => setSelectedDecade(null)}
                        className="pressable flex items-center gap-1 text-sm text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-300 font-medium"
                      >
                        <BackIcon className="w-4 h-4" />
                        {selectedDecade}s
                      </button>
                      <span className="text-xs text-neutral-500">{t.selectYear}</span>
                    </div>
                    <div className="grid grid-cols-5 gap-2">
                      {Array.from({ length: 10 }, (_, i) => selectedDecade + i)
                        .filter(year => year <= new Date().getFullYear())
                        .map((year) => (
                        <button
                          key={year}
                          onClick={() => setBirthYear(year)}
                          className={`pressable py-2.5 rounded-xl text-sm font-medium transition-all ${
                            birthYear === year
                              ? 'bg-brand-gradient text-white shadow-card'
                              : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                          }`}
                        >
                          {year}
                        </button>
                      ))}
                    </div>
                  </>
                )}

                <p className="text-xs text-neutral-500 mt-2 text-center">
                  {birthYear && `${language === 'ko' ? '만' : 'Age'} ${new Date().getFullYear() - (birthYear as number)}${language === 'ko' ? '세' : ' years old'}`}
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 pb-6 space-y-3">
              <button
                onClick={() => {
                  setShowUserInfoModal(false);
                  setPhase('mode-select');
                }}
                disabled={!birthYear}
                className={`pressable w-full py-4 rounded-xl font-semibold text-white transition-all ${
                  birthYear
                    ? 'bg-brand-gradient shadow-card hover:shadow-card-hover'
                    : 'bg-neutral-300 dark:bg-neutral-700 cursor-not-allowed'
                }`}
              >
                {language === 'ko' ? '시작하기' : 'Start Session'}
              </button>
              <button
                onClick={() => setShowUserInfoModal(false)}
                className="pressable w-full py-3 text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 text-sm transition-colors"
              >
                {language === 'ko' ? '취소' : 'Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function TalkPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-neutral-50 dark:bg-dark-bg">
        <Skeleton shape="circle" width={80} height={80} />
        <div className="space-y-2 w-48">
          <Skeleton shape="line" height={16} />
          <Skeleton shape="line" width="70%" height={12} className="mx-auto" />
        </div>
      </div>
    }>
      <TalkContent />
    </Suspense>
  );
}
