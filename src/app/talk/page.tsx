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
    streamingText, setStreamingText,
    playTTS, extractCompleteSentences, queueTTS,
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

      {/* Header - Premium Glass Effect */}
      <header style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }} className={`px-4 sm:px-6 pb-2 sm:pb-3 sticky top-0 z-50 transition-colors duration-500 ${
        isDarkPhase
          ? 'dark:bg-neutral-950/80 bg-white/90 backdrop-blur-xl border-b dark:border-white/5 border-black/[0.05]'
          : 'bg-white/80 dark:bg-dark-surface/80 backdrop-blur-md border-b border-neutral-200 dark:border-neutral-800'
      }`}>
        <div className="max-w-3xl mx-auto flex justify-between items-center">
          <button
            onClick={handleBackClick}
            aria-label="Go back"
            className={`p-2 rounded-xl transition-colors ${
              isDarkPhase ? 'dark:text-white/60 text-zinc-600 dark:hover:text-white hover:text-zinc-900 dark:hover:bg-white/5 hover:bg-black/[0.03]' : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-white'
            }`}
          >
            <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <div className="flex items-center gap-2">
            <div
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: accentColor.primary }}
            />
            <div>
              <h2 className={`font-semibold text-sm sm:text-base ${isDarkPhase ? 'dark:text-white text-zinc-900' : 'text-neutral-900'}`}>
                {persona.name}
              </h2>
              <p className={`text-xs ${isDarkPhase ? 'dark:text-white/50 text-zinc-400' : 'text-neutral-500 dark:text-neutral-400'}`}>{getPhaseText()}</p>
            </div>
          </div>

          {phase === 'interview' && (
            <button
              onClick={getAnalysis}
              className="text-xs sm:text-sm text-primary-400 font-semibold hover:text-primary-300 px-3 py-1.5 rounded-lg dark:bg-white/5 bg-black/[0.03] dark:hover:bg-white/10 hover:bg-black/[0.06] transition-colors"
            >
              {t.done}
            </button>
          )}
          {phase !== 'interview' && <div className="w-12 sm:w-20" />}
        </div>
      </header>

      {/* Progress Bar - Adaptive Theme */}
      <div className={`px-4 sm:px-6 py-3 transition-colors duration-500 ${
        isDarkPhase ? 'bg-neutral-950' : 'bg-white dark:bg-dark-surface border-b border-neutral-100 dark:border-neutral-800'
      }`}>
        <div className="max-w-3xl mx-auto">
          <div className="flex gap-1.5">
            {['start', 'conversation', 'review', 'shadowing', 'summary'].map((step, idx) => {
              const phaseOrder = ['ready', 'mode-select', 'topic-select', 'warmup', 'tutor-intro', 'recording', 'interview', 'analysis', 'review', 'shadowing', 'summary'];
              const currentIdx = phaseOrder.indexOf(phase);
              // Map progress bar segments to phase ranges
              const stepThresholds = [4, 6, 7, 8, 9]; // tutor-intro, interview, analysis, review, shadowing
              const filled = currentIdx >= stepThresholds[idx];
              return (
                <div
                  key={step}
                  className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                    filled
                      ? ''
                      : isDarkPhase ? 'bg-white/10' : 'bg-neutral-200 dark:bg-neutral-700'
                  }`}
                  style={filled ? { backgroundColor: accentColor.primary } : undefined}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main id="main-content" className="flex-1 flex flex-col max-w-3xl mx-auto w-full">

        {/* ========== READY PHASE ========== */}
        {phase === 'ready' && (
          <div className="motion-safe:animate-fade-in flex-1 flex flex-col items-center justify-center p-4 sm:p-8 pb-32 sm:pb-8 text-center" style={{ paddingBottom: 'max(8rem, calc(2rem + env(safe-area-inset-bottom)))' }}>
            <div className="mb-4 sm:mb-6 animate-bounce-soft">
              <TutorAvatar
                tutorId={tutorId as 'emma' | 'james' | 'charlotte' | 'oliver'}
                size="xl"
                showName
              />
            </div>

            <h2 className="text-xl sm:text-2xl font-bold text-neutral-900 dark:text-white mb-2">
              {t.readyToStart.replace('{name}', persona.name)}
            </h2>
            <p className="text-sm sm:text-base text-neutral-600 dark:text-neutral-300 mb-6 sm:mb-8 max-w-md px-4">
              {t.readyDescription}
            </p>

            <div className="bg-primary-50 dark:bg-primary-500/10 rounded-2xl p-4 sm:p-6 mb-6 sm:mb-8 max-w-md w-full mx-4">
              <h3 className="font-semibold text-primary-900 dark:text-primary-200 mb-3 text-sm sm:text-base">{t.sessionFlow}</h3>
              <div className="space-y-2 text-xs sm:text-sm text-primary-700 dark:text-primary-300">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 sm:w-6 sm:h-6 bg-primary-200 dark:bg-primary-500/30 rounded-full flex items-center justify-center text-xs font-bold">1</span>
                  <span>{t.flowStep1}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 sm:w-6 sm:h-6 bg-primary-200 dark:bg-primary-500/30 rounded-full flex items-center justify-center text-xs font-bold">2</span>
                  <span>{t.flowStep2}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 sm:w-6 sm:h-6 bg-primary-200 dark:bg-primary-500/30 rounded-full flex items-center justify-center text-xs font-bold">3</span>
                  <span>{t.flowStep3}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 sm:w-6 sm:h-6 bg-primary-200 dark:bg-primary-500/30 rounded-full flex items-center justify-center text-xs font-bold">4</span>
                  <span>{t.flowStep4}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 sm:w-6 sm:h-6 bg-primary-200 dark:bg-primary-500/30 rounded-full flex items-center justify-center text-xs font-bold">5</span>
                  <span>{t.flowStep5}</span>
                </div>
              </div>
            </div>

            <button onClick={() => { setSelectedDecade(null); setShowUserInfoModal(true); }} className="btn-primary flex items-center gap-2 sm:gap-3 text-base sm:text-lg px-6 sm:px-8 py-3 sm:py-4">
              <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
              {t.startFreeTalk}
            </button>
          </div>
        )}

        {/* ========== MODE SELECT PHASE ========== */}
        {phase === 'mode-select' && (
          <div className="motion-safe:animate-slide-up flex-1 flex flex-col">
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
          <div className="motion-safe:animate-slide-up flex-1 flex flex-col">
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
          />
        )}

        {/* ========== TUTOR INTRO PHASE ========== */}
        {phase === 'tutor-intro' && (
          <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8 relative">
            <div
              className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[300px] h-[300px] rounded-full blur-3xl"
              style={{ backgroundColor: accentColor.glow }}
            />
            <div className="relative z-10 text-center">
              <TutorAvatarLarge
                tutorId={tutorId as 'emma' | 'james' | 'charlotte' | 'oliver'}
                speaking={true}
                mouthOpen={0}
                status="speaking"
              />
              <p className="text-white/80 mt-6 mb-2 text-base sm:text-lg font-medium">
                {language === 'ko'
                  ? `${persona.name}님이 말을 걸고 있어요...`
                  : `${persona.name} is starting the conversation...`}
              </p>
              <p className="text-white/40 text-xs sm:text-sm">
                {language === 'ko' ? '잠시 기다려주세요' : 'Please wait a moment'}
              </p>
              <div className="flex gap-2 justify-center mt-4">
                <div className="loading-dot" />
                <div className="loading-dot" />
                <div className="loading-dot" />
              </div>
            </div>
          </div>
        )}

        {/* ========== RECORDING PHASE - Dark Premium UI ========== */}
        {phase === 'recording' && (
          <div className="motion-safe:animate-scale-in flex-1 flex flex-col items-center justify-center p-4 sm:p-8 relative">
            {/* Ambient Glow */}
            <div
              className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[300px] h-[300px] rounded-full blur-3xl"
              style={{ backgroundColor: accentColor.glow }}
            />

            <div className="relative mb-8 sm:mb-10 z-10">
              {/* Timer Ring */}
              <div className="relative">
                <svg className="w-36 h-36 sm:w-44 sm:h-44 timer-circle" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="45" stroke="rgba(255,255,255,0.1)" />
                  <circle
                    cx="50" cy="50" r="45"
                    stroke={timeLeft >= 30 ? '#22C55E' : accentColor.primary}
                    strokeDasharray={`${Math.min(timeLeft / 30, 1) * 283} 283`}
                    className="transition-all duration-300"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className={`text-4xl sm:text-5xl font-bold ${timeLeft >= 30 ? 'text-green-400' : 'text-white'}`}>
                    {formatTime(timeLeft)}
                  </span>
                </div>
              </div>
            </div>

            {/* Voice Visualizer */}
            <div className="flex items-center justify-center gap-1.5 h-12 mb-6 relative z-10">
              {[1,2,3,4,5,4,3,2,1].map((h, i) => (
                <div
                  key={i}
                  className="w-1 rounded-full animate-pulse"
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
              <>
                <p className="text-white/80 mb-2 text-base sm:text-lg font-medium relative z-10">
                  {language === 'ko' ? selectedTopic.titleKo : selectedTopic.titleEn}
                </p>
                <p className="text-sm sm:text-base mb-2 relative z-10 font-mono" style={{ color: accentColor.primary }}>
                  &ldquo;{selectedTopic.starterHint}&rdquo;
                </p>
                <p className="text-white/40 text-xs sm:text-sm mb-8 relative z-10">
                  {language === 'ko' ? '이 힌트로 시작해보세요!' : 'Try starting with this hint!'}
                </p>
              </>
            ) : timeLeft < 30 ? (
              <>
                <p className="text-white/80 mb-2 text-base sm:text-lg font-medium relative z-10">{t.speakFreely}</p>
                <p className="text-white/40 text-xs sm:text-sm mb-8 relative z-10">{t.keepGoing30}</p>
              </>
            ) : (
              <>
                <p className="text-green-400 mb-2 text-base sm:text-lg font-semibold relative z-10">{t.greatKeepGoing}</p>
                <p className="text-white/40 text-xs sm:text-sm mb-8 relative z-10">{t.moreYouShare}</p>
              </>
            )}

            <button
              onClick={() => stopRecording()}
              className="relative z-10 px-8 py-4 rounded-2xl font-semibold transition-all bg-green-500 text-white hover:bg-green-400 shadow-lg shadow-green-500/30 hover:shadow-green-500/40 hover:-translate-y-0.5 text-base"
            >
              {t.doneSpeaking} ({formatTime(timeLeft)})
            </button>
          </div>
        )}

        {/* ========== INTERVIEW PHASE - Premium Dark UI ========== */}
        {phase === 'interview' && (
          <div className="motion-safe:animate-scale-in flex-1 flex flex-col">
            {/* Ambient Background Glow */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div
                className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[400px] h-[400px] rounded-full opacity-20"
                style={{
                  background: `radial-gradient(circle, ${
                    isRecordingReply ? 'rgba(239,68,68,0.4)' :
                    isPlaying ? accentColor.glow.replace('0.2)', '0.4)') :
                    accentColor.glow
                  } 0%, transparent 70%)`,
                  transition: 'background 0.5s ease',
                }}
              />
            </div>

            <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8 relative z-10">
              {/* Tutor Avatar with Status */}
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

              <div className="text-center mt-6 mb-8" aria-live="polite" aria-atomic="true">
                {/* Show transcript toggle button when AI is speaking */}
                {(streamingText || isPlaying) && (
                  <div className="mb-4 px-4">
                    {showTranscript ? (
                      <div className="dark:bg-white/5 bg-black/[0.03] backdrop-blur-xl rounded-2xl p-4 border dark:border-white/10 border-black/[0.08] max-w-sm mx-auto">
                        <p className="dark:text-white/90 text-zinc-900 text-sm sm:text-base leading-relaxed">
                          {streamingText || messages[messages.length - 1]?.content}
                          {streamingText && <span className="inline-block w-1.5 h-4 ml-0.5 animate-pulse" style={{ backgroundColor: accentColor.primary }} />}
                        </p>
                        <button
                          onClick={() => setShowTranscript(false)}
                          className="mt-3 text-xs dark:text-white/40 text-zinc-400 dark:hover:text-white/60 hover:text-zinc-600 transition-colors"
                        >
                          {language === 'ko' ? '텍스트 숨기기' : 'Hide text'}
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setShowTranscript(true)}
                        className="text-xs dark:text-white/40 text-zinc-400 dark:hover:text-white/60 hover:text-zinc-600 flex items-center gap-1.5 mx-auto transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        {language === 'ko' ? '텍스트 보기' : 'Show text'}
                      </button>
                    )}
                  </div>
                )}

                {isPlaying && (
                  <p className="dark:text-white/70 text-zinc-600 font-medium text-sm sm:text-base">{persona.name}{t.speaking}</p>
                )}
                {isProcessing && !isPlaying && !streamingText && (
                  <div className="flex flex-col items-center">
                    <div className="flex gap-2 mb-3">
                      {[1,2,3].map(i => (
                        <div key={i} className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: accentColor.primary, animationDelay: `${i * 0.15}s` }} />
                      ))}
                    </div>
                    <p className="dark:text-white/50 text-zinc-400 text-sm sm:text-base">{t.thinking}</p>
                  </div>
                )}
                {isRecordingReply && (
                  <div className="flex flex-col items-center">
                    <div className="flex items-center gap-1 h-10 mb-3">
                      {[1,2,3,4,5].map((i, idx) => (
                        <div
                          key={i}
                          className="w-1 bg-red-500 rounded-full animate-pulse"
                          style={{
                            height: `${recordingBarHeights[idx]}px`,
                            animationDelay: `${i * 0.1}s`,
                            animationDuration: '0.4s'
                          }}
                        />
                      ))}
                    </div>
                    <p className="text-red-400 font-medium text-sm sm:text-base">{t.recordingVoice}</p>
                  </div>
                )}
                {!isPlaying && !isProcessing && !isRecordingReply && !streamingText && (
                  <p className="dark:text-white/40 text-zinc-400 text-sm sm:text-base">{t.tapToSpeak}</p>
                )}
              </div>

              <div ref={messagesEndRef} className="hidden" />
            </div>

            {/* Bottom Control Panel - Premium Glass */}
            <div className="p-4 sm:p-6 dark:bg-neutral-900/80 bg-neutral-100/90 backdrop-blur-xl border-t dark:border-white/5 border-black/[0.05]">
              <div className="max-w-lg mx-auto">
                <div className="flex gap-3">
                  {/* Main Record Button */}
                  <button
                    onClick={recordReply}
                    disabled={isProcessing || isPlaying}
                    aria-label={isRecordingReply ? 'Stop recording' : 'Start recording'}
                    className={`flex-1 py-4 rounded-2xl font-semibold flex items-center justify-center gap-2.5 transition-all text-base ${
                      isRecordingReply
                        ? 'bg-red-500 text-white shadow-lg shadow-red-500/30 recording-active'
                        : isProcessing || isPlaying
                          ? 'dark:bg-white/5 bg-black/[0.03] dark:text-white/30 text-zinc-400 cursor-not-allowed'
                          : 'text-white shadow-lg hover:-translate-y-0.5'
                    }`}
                    style={
                      !isRecordingReply && !(isProcessing || isPlaying)
                        ? {
                            backgroundColor: accentColor.primary,
                            boxShadow: `0 10px 15px -3px ${accentColor.glow}, 0 4px 6px -4px ${accentColor.glow}`,
                          }
                        : undefined
                    }
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                    {isRecordingReply ? t.stop : isPlaying ? t.listening : isProcessing ? t.processing : t.reply}
                  </button>

                  {/* Done Button - always clickable except during recording */}
                  <button
                    onClick={getAnalysis}
                    disabled={isRecordingReply}
                    className={`px-6 py-4 rounded-2xl font-semibold border transition-all text-base ${
                      isRecordingReply
                        ? 'dark:bg-white/5 bg-black/[0.03] dark:text-white/30 text-zinc-400 dark:border-white/5 border-black/[0.05] cursor-not-allowed'
                        : isProcessing || isPlaying
                          ? 'bg-amber-500/20 text-amber-300 border-amber-400/30 hover:bg-amber-500/30'
                          : 'dark:bg-white/10 bg-black/[0.06] dark:text-white text-zinc-900 dark:hover:bg-white/15 hover:bg-black/[0.08] dark:border-white/10 border-black/[0.08]'
                    }`}
                  >
                    {t.done}
                  </button>
                </div>

                {/* Timer */}
                <div className="flex items-center justify-center gap-2 mt-4">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  <p className="dark:text-white/40 text-zinc-400 text-sm font-medium tracking-wide">
                    {formatTime(conversationTime)} / {formatTime(maxConversationTime)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========== ANALYSIS PHASE ========== */}
        {phase === 'analysis' && (
          <div className="motion-safe:animate-fade-in-up flex-1 flex flex-col items-center justify-center p-4 sm:p-8">
            <TutorAvatar
              tutorId={tutorId as 'emma' | 'james' | 'charlotte' | 'oliver'}
              size="lg"
            />
            <h2 className="text-lg sm:text-xl font-bold text-neutral-900 dark:text-white mb-2 text-center mt-4">{persona.name}{t.analyzing}</h2>
            <p className="text-neutral-500 dark:text-neutral-400 mb-6 text-sm sm:text-base text-center">{t.analyzingDesc}</p>
            <div className="flex gap-2">
              <div className="loading-dot" />
              <div className="loading-dot" />
              <div className="loading-dot" />
            </div>
          </div>
        )}

        {/* ========== REVIEW PHASE ========== */}
        {phase === 'review' && analysis && (
          <div className="motion-safe:animate-slide-up flex-1 flex flex-col p-4 sm:p-6 dark:bg-[#020617] bg-neutral-50">
            <div className="text-center mb-4 sm:mb-6">
              <span className="text-xs sm:text-sm dark:text-slate-500 text-zinc-400">
                {correctionLevel <= 2
                  ? (language === 'ko' ? '오늘의 표현' : "Today's Expressions")
                  : t.correction}{' '}
                {safeReviewIndex + 1} {t.of} {analysis.corrections.length}
              </span>
            </div>

            {analysis.corrections.length > 0 ? (
              <div className="flex-1 flex flex-col justify-center">
                <div className="mb-4 sm:mb-6">
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
                    disabled={isPlaying}
                    className="w-12 h-12 sm:w-14 sm:h-14 bg-emerald-500/15 rounded-xl flex items-center justify-center hover:bg-emerald-500/25 transition-colors flex-shrink-0"
                    aria-label={language === 'ko' ? '올바른 표현 듣기' : 'Listen to corrected form'}
                  >
                    {isPlaying ? (
                      <div className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <svg className="w-6 h-6 text-emerald-400" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    )}
                  </button>
                  <button onClick={nextReview} className="btn-primary flex-1 text-sm sm:text-base py-3 sm:py-4">
                    {currentReviewIndex < analysis.corrections.length - 1 ? t.nextCorrection : t.startShadowing}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center">
                <div className="w-14 h-14 sm:w-16 sm:h-16 bg-green-100 dark:bg-green-500/20 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-7 h-7 sm:w-8 sm:h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-neutral-900 dark:text-white mb-2">{language === 'ko' ? '훌륭해요!' : 'Great job!'}</h3>
                <p className="text-neutral-600 dark:text-neutral-300 mb-6 text-sm sm:text-base">
                  {correctionLevel <= 2
                    ? (language === 'ko' ? '오늘은 아주 자연스럽게 대화했어요!' : 'You spoke very naturally today!')
                    : (language === 'ko' ? '주요 교정 사항이 없습니다.' : 'No major corrections needed.')}
                </p>
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
              <span className="text-xs sm:text-sm text-neutral-500">{t.shadowing} {safeShadowingIndex + 1} {t.of} {analysis.corrections.length}</span>
            </div>

            <div className="flex-1 flex flex-col justify-center">
              <div className="card-premium p-4 sm:p-6 mb-4 sm:mb-6 text-center">
                <p className="text-xs sm:text-sm text-neutral-500 mb-3 sm:mb-4">{t.listenAndRepeat}</p>
                <p className="text-xl sm:text-2xl font-medium text-neutral-900 dark:text-white dark:text-white mb-4 sm:mb-6">
                  {analysis.corrections[safeShadowingIndex].corrected}
                </p>

                <button
                  onClick={() => playTTS(analysis.corrections[safeShadowingIndex].corrected, 0.8)}
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
          <div className="motion-safe:animate-fade-in flex-1 flex flex-col">
            {earnedXP > 0 && (
              <div className="flex justify-center pt-3">
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

      {/* Exit Session Confirmation Modal */}
      {showExitConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowExitConfirm(false)}
          />
          <div className="relative bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl w-full max-w-xs overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 text-center">
              <div className="w-14 h-14 mx-auto mb-4 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center">
                <svg className="w-7 h-7 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-neutral-900 dark:text-white mb-2">
                {t.exitSessionTitle}
              </h3>
              <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-6">
                {t.exitSessionMessage}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowExitConfirm(false)}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 font-medium text-sm hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
                >
                  {t.exitSessionCancel}
                </button>
                <button
                  onClick={() => {
                    setShowExitConfirm(false);
                    router.push('/');
                  }}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-red-500 text-white font-medium text-sm hover:bg-red-600 transition-colors"
                >
                  {t.exitSessionConfirm}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* User Info Modal - Birth Year & Name */}
      {showUserInfoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowUserInfoModal(false)}
          />

          {/* Modal */}
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200">
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-6 text-center">
              <div className="w-16 h-16 mx-auto mb-3 bg-white/20 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white">
                {language === 'ko' ? '학습자 정보' : 'Learner Info'}
              </h3>
              <p className="text-white/80 text-sm mt-1">
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
                  className="w-full px-4 py-3 rounded-xl border-2 border-neutral-200 dark:border-neutral-700 focus:border-indigo-500 focus:ring-0 transition-colors text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 dark:bg-neutral-800"
                />
              </div>

              {/* Birth Year - 2-Step Selector */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  {t.birthYear}
                </label>

                {selectedDecade === null ? (
                  /* Step 1: Decade Selection */
                  <>
                    <p className="text-xs text-neutral-500 mb-2 text-center">
                      {t.selectDecade}
                    </p>
                    <div className="grid grid-cols-4 gap-2">
                      {[1950, 1960, 1970, 1980, 1990, 2000, 2010, 2020].map((decade) => (
                        <button
                          key={decade}
                          onClick={() => setSelectedDecade(decade)}
                          className={`py-2.5 rounded-xl text-sm font-medium transition-all ${
                            birthYear !== null && birthYear >= decade && birthYear < decade + 10
                              ? 'bg-indigo-500 text-white shadow-lg scale-105'
                              : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                          }`}
                        >
                          {decade}s
                        </button>
                      ))}
                    </div>
                  </>
                ) : (
                  /* Step 2: Year Selection within Decade */
                  <>
                    <div className="flex items-center gap-2 mb-2">
                      <button
                        onClick={() => setSelectedDecade(null)}
                        className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-800 font-medium"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        {selectedDecade}s
                      </button>
                      <span className="text-xs text-neutral-500">
                        {t.selectYear}
                      </span>
                    </div>
                    <div className="grid grid-cols-5 gap-2">
                      {Array.from({ length: 10 }, (_, i) => selectedDecade + i)
                        .filter(year => year <= new Date().getFullYear())
                        .map((year) => (
                        <button
                          key={year}
                          onClick={() => setBirthYear(year)}
                          className={`py-2.5 rounded-xl text-sm font-medium transition-all ${
                            birthYear === year
                              ? 'bg-indigo-500 text-white shadow-lg scale-105'
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
                className={`w-full py-4 rounded-xl font-semibold text-white transition-all ${
                  birthYear
                    ? 'bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 shadow-lg'
                    : 'bg-neutral-300 cursor-not-allowed'
                }`}
              >
                {language === 'ko' ? '시작하기' : 'Start Session'}
              </button>
              <button
                onClick={() => setShowUserInfoModal(false)}
                className="w-full py-3 text-neutral-500 hover:text-neutral-700 text-sm"
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
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-dark-bg">
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
