'use client';

import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { personas } from '@/lib/personas';
import { useLanguage } from '@/lib/i18n';
import TutorAvatar, { TutorAvatarLarge } from '@/components/TutorAvatar';
import {
  SpeechMetrics,
  calculateSpeechMetrics,
  getAgeGroup,
  calculateAdaptiveDifficulty,
} from '@/lib/speechMetrics';
import html2canvas from 'html2canvas';
import TapTalkLogo from '@/components/TapTalkLogo';
// import { useLipSync } from '@/hooks/useLipSync';
import AnalysisReview from '@/components/AnalysisReview';

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
  const aiFinishedSpeakingTimeRef = useRef<number>(0);
  const userSpeakingTimeRef = useRef<number>(0);

  // Auto-play voice feedback flag
  const [hasPlayedReviewIntro, setHasPlayedReviewIntro] = useState(false);
  const [lastPlayedReviewIndex, setLastPlayedReviewIndex] = useState(-1);

  // Streaming state
  const [streamingText, setStreamingText] = useState('');
  const [showTranscript, setShowTranscript] = useState(false);

  // AbortController for cancelling AI response
  const abortControllerRef = useRef<AbortController | null>(null);
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

  // Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioQueueRef = useRef<string[]>([]);
  const isPlayingQueueRef = useRef(false);
  const processedSentencesRef = useRef<Set<string>>(new Set());
  const audioCacheRef = useRef<Map<string, Promise<Blob>>>(new Map());
  const fillerAudioRef = useRef<HTMLAudioElement | null>(null);
  const summaryRef = useRef<HTMLDivElement>(null);

  // Deepgram streaming STT refs
  const deepgramSocketRef = useRef<WebSocket | null>(null);
  const realtimeTranscriptRef = useRef<string>('');
  const deepgramKeyRef = useRef<string | null>(null);
  const [isSavingImage, setIsSavingImage] = useState(false);

  // Speaking Evaluation state (algorithmic grade-level analysis)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [speakingEval, setSpeakingEval] = useState<any>(null);
  const [isLoadingEval, setIsLoadingEval] = useState(false);
  const [repeatedCategories, setRepeatedCategories] = useState<Set<string>>(new Set());

  // Save summary as single merged image (mobile browsers block rapid sequential downloads)
  const saveAsImage = async () => {
    if (!summaryRef.current) return;

    setIsSavingImage(true);
    try {
      await document.fonts.ready;

      const isDark = document.documentElement.classList.contains('dark');
      const bgColor = isDark ? '#1a1a1a' : '#f5f5f5';
      const sections = summaryRef.current.querySelectorAll<HTMLElement>('[data-report-section]');
      const date = new Date().toISOString().split('T')[0];
      const scale = 3;
      const gap = 24 * scale; // spacing between sections

      // Capture all sections first
      const canvases: HTMLCanvasElement[] = [];
      for (let i = 0; i < sections.length; i++) {
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

  // Check if session is actively in progress (not ready or summary)
  const isSessionActive = phase !== 'ready' && phase !== 'summary';

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

  // Fetch previous session data for adaptive difficulty
  useEffect(() => {
    fetch('/api/session-count')
      .then(res => res.json())
      .then(data => {
        if (data.evaluatedGrade) setPreviousGrade(data.evaluatedGrade);
        if (data.levelDetails) setPreviousLevelDetails(data.levelDetails);
      })
      .catch(() => { /* ignore */ });
  }, []);

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
  // IMPORTANT: API calls are chained sequentially to avoid race conditions on shared
  // Google Sheets rows (LearningData and Users). Previously, parallel fire-and-forget
  // calls caused data loss (last-write-wins on the same row).
  useEffect(() => {
    if (phase === 'summary') {
      const saveSessionData = async () => {
        try {
          // Step 1: Increment session count first (updates Users + Subscriptions sheets)
          // Must complete before lesson-history to avoid overwriting sessionCount
          const countBody: { evaluatedGrade?: string; levelDetails?: LevelDetails } = {};
          if (analysis?.evaluatedGrade) {
            countBody.evaluatedGrade = analysis.evaluatedGrade;
          }
          if (analysis?.levelDetails) {
            countBody.levelDetails = analysis.levelDetails;
          }

          const countRes = await fetch('/api/session-count', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(countBody),
          });
          const countData = await countRes.json();
          if (countData.success) {
            console.log('Session count incremented:', countData.newCount, 'Level:', countData.evaluatedGrade);
          }

          // Step 2: Save lesson history WITH corrections in a single call
          // This avoids the race condition where addSession and addCorrections
          // would read-modify-write the same LearningData row concurrently
          const userMessages = messages.filter(m => m.role === 'user');
          const topicSummary = userMessages.length > 0
            ? userMessages.slice(0, 3).map(m => m.content.slice(0, 50)).join(' / ')
            : 'Free conversation';

          const feedbackSummary = analysis
            ? `${analysis.overallLevel}. ${analysis.encouragement.slice(0, 100)}`
            : '';

          const keyCorrections = analysis?.corrections
            ?.slice(0, 5)
            .map(c => `${c.original} -> ${c.corrected}`)
            .join('; ') || '';

          // Prepare corrections to include in the same request
          let correctionsToSave;
          if (analysis?.corrections && analysis.corrections.length > 0) {
            const ageGroup = birthYear ? getAgeGroup(birthYear) : null;
            const adaptiveDifficulty = ageGroup
              ? calculateAdaptiveDifficulty(ageGroup, previousGrade, previousLevelDetails, speechMetrics)
              : null;
            const correctionDifficulty = adaptiveDifficulty?.difficulty ?? 3;

            correctionsToSave = analysis.corrections.map(c => ({
              original: c.original,
              corrected: c.corrected,
              explanation: c.explanation,
              category: c.category || 'general',
              difficulty: correctionDifficulty,
            }));
          }

          const historyRes = await fetch('/api/lesson-history', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              tutor: tutorId,
              duration: Math.floor(conversationTime / 60),
              topicSummary,
              feedbackSummary,
              keyCorrections,
              level: analysis?.evaluatedGrade || '',
              levelDetails: analysis?.levelDetails || null,
              corrections: correctionsToSave,
            }),
          });
          const historyData = await historyRes.json();
          if (historyData.success) {
            console.log('Lesson history saved' + (correctionsToSave ? ` with ${correctionsToSave.length} corrections` : ''));
          }
        } catch (err) {
          console.error('Failed to save session data:', err);
        }
      };

      saveSessionData();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, analysis, messages, tutorId, conversationTime, birthYear, previousGrade, previousLevelDetails, speechMetrics]);

  // Auto-play voice feedback for review phase
  useEffect(() => {
    if (phase === 'review' && analysis && analysis.corrections.length > 0 && !isPlaying) {
      // Play intro message when first entering review phase
      if (!hasPlayedReviewIntro) {
        const correction = analysis.corrections[0];
        const introMessage = `Let me help you improve. You said: "${correction.original}". A better way to say this is: "${correction.corrected}".`;
        playTTS(introMessage);
        setHasPlayedReviewIntro(true);
        setLastPlayedReviewIndex(0);
      }
      // Play correction explanation when index changes
      else if (currentReviewIndex !== lastPlayedReviewIndex) {
        const correction = analysis.corrections[currentReviewIndex];
        const feedbackMessage = `You said: "${correction.original}". Try saying: "${correction.corrected}".`;
        playTTS(feedbackMessage);
        setLastPlayedReviewIndex(currentReviewIndex);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, analysis, currentReviewIndex, hasPlayedReviewIntro, lastPlayedReviewIndex, isPlaying]);

  // Detect repeated mistake categories when entering review or summary phase
  useEffect(() => {
    if ((phase === 'review' || phase === 'summary') && analysis?.corrections?.length) {
      fetch('/api/corrections?due=false&limit=100')
        .then(res => res.json())
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
        .then(res => res.json())
        .then(data => {
          if (data.success && data.evaluation) {
            setSpeakingEval(data.evaluation);
          }
        })
        .catch(err => console.error('Speaking evaluation error:', err))
        .finally(() => setIsLoadingEval(false));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, messages, birthYear, language]);

  // Auto-play summary feedback
  useEffect(() => {
    if (phase === 'summary' && analysis) {
      // Small delay to let the UI render first
      const timer = setTimeout(() => {
        const summaryMessage = analysis.encouragement;
        playTTS(summaryMessage);
      }, 800);
      return () => clearTimeout(timer);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // Pre-cache filler audio when interview starts
  useEffect(() => {
    if (phase === 'interview' && persona) {
      // filler pre-caching disabled - contextual filler approach planned
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, persona]);

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

  const initialRecordingStoppedRef = useRef(false);

  const startRecording = async () => {
    initialRecordingStoppedRef.current = false;
    try {
      // Start mic and Deepgram connection in parallel
      const [stream] = await Promise.all([
        navigator.mediaDevices.getUserMedia({ audio: true }),
        connectDeepgram(),
      ]);

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
          sendToDeepgram(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        if (initialRecordingStoppedRef.current) return;
        initialRecordingStoppedRef.current = true;
        stream.getTracks().forEach(track => track.stop());

        // Close Deepgram and grab transcript
        closeDeepgram();
        const dgTranscript = realtimeTranscriptRef.current.trim();

        if (dgTranscript) {
          // Deepgram success - skip Whisper entirely
          await processAudioWithText(dgTranscript, true);
        } else {
          // Fallback to Whisper
          const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
          await processAudio(audioBlob, true);
        }
      };

      mediaRecorder.start(250); // 250ms chunks for real-time streaming
      setPhase('recording');
      setTimeLeft(0);
    } catch (error) {
      console.error('Microphone error:', error);
      alert(language === 'ko' ? '마이크 접근을 허용해주세요.' : 'Please allow microphone access.');
    }
  };

  const stopRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (!recorder) return;

    // Immediately transition to interview phase with processing state
    // so user gets instant visual feedback
    setPhase('interview');
    setIsProcessing(true);

    try {
      if (recorder.state === 'recording' || recorder.state === 'paused') {
        recorder.stop();
      }
    } catch (e) {
      console.log('Error stopping recorder:', e);
    }

    // Fallback: if onstop doesn't fire within 2 seconds (Android bug),
    // force stop tracks and proceed
    setTimeout(() => {
      if (!initialRecordingStoppedRef.current && phase === 'recording') {
        console.warn('onstop did not fire, forcing fallback');
        initialRecordingStoppedRef.current = true;
        // Stop all media tracks
        try {
          recorder.stream?.getTracks().forEach(track => track.stop());
        } catch { /* ignore */ }
        // Close Deepgram
        closeDeepgram();
        const dgTranscript = realtimeTranscriptRef.current.trim();

        if (dgTranscript) {
          processAudioWithText(dgTranscript, true);
        } else {
          const mimeType = recorder.mimeType || 'audio/webm';
          const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
          processAudio(audioBlob, true);
        }
      }
    }, 2000);
  }, [phase]);

  const recordReply = async () => {
    if (isRecordingReply) {
      stopRecording();
      setIsRecordingReply(false);
      return;
    }

    // Calculate response time (time since AI finished speaking)
    if (aiFinishedSpeakingTimeRef.current > 0) {
      const responseTime = (Date.now() - aiFinishedSpeakingTimeRef.current) / 1000;
      responseTimesRef.current.push(responseTime);
    }

    // Track user speaking start time
    const speakingStartTime = Date.now();

    try {
      // Start mic and Deepgram connection in parallel
      const [stream] = await Promise.all([
        navigator.mediaDevices.getUserMedia({ audio: true }),
        connectDeepgram(),
      ]);

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
          sendToDeepgram(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        setIsRecordingReply(false);
        // Track user speaking time
        const speakingDuration = (Date.now() - speakingStartTime) / 1000;
        userSpeakingTimeRef.current += speakingDuration;

        stream.getTracks().forEach(track => track.stop());

        // Close Deepgram and grab transcript
        closeDeepgram();
        const dgTranscript = realtimeTranscriptRef.current.trim();

        if (dgTranscript) {
          await processAudioWithText(dgTranscript, false);
        } else {
          const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
          await processAudio(audioBlob, false);
        }
      };

      mediaRecorder.start(250); // 250ms chunks for real-time streaming
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
      if (isInitial && !isEndingSessionRef.current) {
        setPhase('interview');
      }
    } finally {
      if (!isEndingSessionRef.current) {
        setIsProcessing(false);
      }
    }
  };

  // ========== Deepgram Streaming STT ==========

  const connectDeepgram = async (): Promise<void> => {
    try {
      // Fetch API key if not cached
      if (!deepgramKeyRef.current) {
        const res = await fetch('/api/deepgram-token');
        if (!res.ok) return;
        const { key } = await res.json();
        if (!key) return;
        deepgramKeyRef.current = key;
      }

      realtimeTranscriptRef.current = '';
      const apiKey = deepgramKeyRef.current!;

      const socket = new WebSocket(
        'wss://api.deepgram.com/v1/listen?model=nova-2&language=en&smart_format=true&punctuate=true&interim_results=false&endpointing=300',
        ['token', apiKey]
      );

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'Results' && data.is_final) {
            const transcript = data.channel?.alternatives?.[0]?.transcript;
            if (transcript) {
              realtimeTranscriptRef.current += (realtimeTranscriptRef.current ? ' ' : '') + transcript;
            }
          }
        } catch { /* ignore parse errors */ }
      };

      socket.onerror = () => {
        console.warn('Deepgram WebSocket error - will fallback to Whisper');
      };

      deepgramSocketRef.current = socket;

      // Wait for connection to open (max 3 seconds)
      await new Promise<void>((resolve) => {
        const timeout = setTimeout(resolve, 3000);
        socket.onopen = () => {
          clearTimeout(timeout);
          resolve();
        };
      });
    } catch {
      console.warn('Deepgram connection failed - will use Whisper fallback');
    }
  };

  const closeDeepgram = () => {
    const socket = deepgramSocketRef.current;
    if (socket) {
      try {
        if (socket.readyState === WebSocket.OPEN) {
          // Send close signal to Deepgram
          socket.send(JSON.stringify({ type: 'CloseStream' }));
        }
        socket.close();
      } catch { /* ignore */ }
      deepgramSocketRef.current = null;
    }
  };

  const sendToDeepgram = (data: Blob) => {
    const socket = deepgramSocketRef.current;
    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(data);
    }
  };

  const processAudioWithText = async (text: string, isInitial: boolean) => {
    setIsProcessing(true);
    try {
      if (text.trim()) {
        const userMessage: Message = { role: 'user', content: text };
        const newMessages = [...messages, userMessage];
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

  // ========== AI Functions ==========

  const getAIResponse = async (currentMessages: Message[]) => {
    setIsProcessing(true);

    // Reset streaming state
    setStreamingText('');
    setShowTranscript(false); // Hide text by default for listening practice
    audioQueueRef.current = [];
    processedSentencesRef.current.clear();
    audioCacheRef.current.clear();

    // Create AbortController for this request
    const controller = new AbortController();
    abortControllerRef.current = controller;

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
          stream: true,
        }),
        signal: controller.signal,
      });

      // Check if response is streaming (SSE)
      const contentType = response.headers.get('content-type');

      if (contentType?.includes('text/event-stream')) {
        // Process streaming response
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let fullResponse = '';
        let textBuffer = '';

        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });

            // Process SSE events
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6);

                if (data === '[DONE]') {
                  // Stream complete - add any remaining text
                  if (textBuffer.trim()) {
                    queueTTS(textBuffer.trim());
                  }
                  continue;
                }

                try {
                  const parsed = JSON.parse(data);
                  if (parsed.text) {
                    fullResponse += parsed.text;
                    textBuffer += parsed.text;
                    setStreamingText(fullResponse);

                    // Extract and queue complete sentences
                    const { sentences, remaining } = extractCompleteSentences(textBuffer);
                    for (const sentence of sentences) {
                      queueTTS(sentence);
                    }
                    textBuffer = remaining;
                  }
                } catch {
                  // Ignore parse errors
                }
              }
            }
          }
        }

        // Add completed message to conversation
        if (fullResponse) {
          const assistantMessage: Message = { role: 'assistant', content: fullResponse };
          setMessages(prev => [...prev, assistantMessage]);
        }

        // Wait for all audio to finish playing (max 30 seconds)
        const audioWaitStart = Date.now();
        while (isPlayingQueueRef.current || audioQueueRef.current.length > 0) {
          await new Promise(resolve => setTimeout(resolve, 100));
          if (Date.now() - audioWaitStart > 30000) {
            console.warn('Audio queue wait timeout - forcing continue');
            audioQueueRef.current = [];
            isPlayingQueueRef.current = false;
            setIsPlaying(false);
            break;
          }
        }

        setStreamingText('');
      } else {
        // Fallback to non-streaming response
        const data = await response.json();

        if (data.message) {
          const assistantMessage: Message = { role: 'assistant', content: data.message };
          setMessages(prev => [...prev, assistantMessage]);
          await playTTS(data.message);
        }
      }
    } catch (error) {
      if (!isEndingSessionRef.current) {
        console.error('AI response error:', error);
      }
    } finally {
      // Don't override isProcessing if session is ending (getAnalysis sets its own state)
      if (!isEndingSessionRef.current) {
        setIsProcessing(false);
      }
    }
  };

  const getAnalysis = async () => {
    // Prevent race conditions with concurrent async operations
    isEndingSessionRef.current = true;

    // Abort any in-progress AI response
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    // Stop any playing audio immediately
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    audioQueueRef.current = [];
    isPlayingQueueRef.current = false;
    setIsPlaying(false);
    setIsProcessing(false);
    setStreamingText('');

    setPhase('analysis');
    setIsProcessing(true);

    // Calculate speech metrics from user messages
    const userMessages = messages.filter(m => m.role === 'user').map(m => m.content);
    const totalSpeakingTime = userSpeakingTimeRef.current > 0
      ? userSpeakingTimeRef.current
      : conversationTime * 0.4; // Estimate 40% of conversation time is user speaking

    // Pre-calculate speech metrics for adaptive difficulty
    const preMetrics = calculateSpeechMetrics(
      userMessages,
      totalSpeakingTime,
      responseTimesRef.current,
      0
    );

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: messages,
          tutorId,
          mode: 'analysis',
          language: language,
          birthYear: birthYear,
          userName: userName,
          previousGrade: previousGrade,
          previousLevelDetails: previousLevelDetails,
          speechMetrics: {
            avgSentenceLength: preMetrics.avgSentenceLength,
            vocabularyDiversity: preMetrics.vocabularyDiversity,
            complexSentenceRatio: preMetrics.complexSentenceRatio,
            wordsPerMinute: preMetrics.wordsPerMinute,
          },
        }),
      });
      const data = await response.json();

      if (data.analysis) {
        // Calculate metrics with grammar error count from AI analysis
        const grammarErrors = data.analysis.corrections?.length || 0;
        const metrics = calculateSpeechMetrics(
          userMessages,
          totalSpeakingTime,
          responseTimesRef.current,
          grammarErrors
        );
        setSpeechMetrics(metrics);

        setAnalysis(data.analysis);
        // If there are corrections, go to review; otherwise go to summary
        if (data.analysis.corrections && data.analysis.corrections.length > 0) {
          setPhase('review');
        } else {
          setPhase('summary');
        }
      } else if (data.parseError) {
        // Analysis JSON parsing failed on server - retry once
        console.warn('Analysis parse error, retrying...');
        try {
          const retryResponse = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              messages: messages,
              tutorId,
              mode: 'analysis',
              language: language,
              birthYear: birthYear,
              userName: userName,
              previousGrade: previousGrade,
              previousLevelDetails: previousLevelDetails,
              speechMetrics: {
                avgSentenceLength: preMetrics.avgSentenceLength,
                vocabularyDiversity: preMetrics.vocabularyDiversity,
                complexSentenceRatio: preMetrics.complexSentenceRatio,
                wordsPerMinute: preMetrics.wordsPerMinute,
              },
            }),
          });
          const retryData = await retryResponse.json();

          if (retryData.analysis) {
            const grammarErrors = retryData.analysis.corrections?.length || 0;
            const metrics = calculateSpeechMetrics(
              userMessages,
              totalSpeakingTime,
              responseTimesRef.current,
              grammarErrors
            );
            setSpeechMetrics(metrics);
            setAnalysis(retryData.analysis);
            if (retryData.analysis.corrections && retryData.analysis.corrections.length > 0) {
              setPhase('review');
            } else {
              setPhase('summary');
            }
          } else {
            // Retry also failed - go to summary with basic metrics
            const metrics = calculateSpeechMetrics(userMessages, totalSpeakingTime, responseTimesRef.current, 0);
            setSpeechMetrics(metrics);
            setPhase('summary');
          }
        } catch {
          const metrics = calculateSpeechMetrics(userMessages, totalSpeakingTime, responseTimesRef.current, 0);
          setSpeechMetrics(metrics);
          setPhase('summary');
        }
      } else {
        console.error('Analysis parsing failed');
        // Still calculate basic metrics even if AI analysis fails
        const metrics = calculateSpeechMetrics(
          userMessages,
          totalSpeakingTime,
          responseTimesRef.current,
          0
        );
        setSpeechMetrics(metrics);
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

  const playTTS = async (text: string, speed?: number) => {
    setIsPlaying(true);
    stopFiller();
    try {
      const response = await fetch('/api/text-to-speech', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voice: persona.voice, ...(speed && { speed }) }),
      });

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);

      if (audioRef.current) {
        const audio = audioRef.current;

        // Wait for audio to be fully loaded before playing
        await new Promise<void>((resolve, reject) => {
          const onCanPlay = () => {
            audio.removeEventListener('canplaythrough', onCanPlay);
            audio.removeEventListener('error', onError);
            resolve();
          };
          const onError = () => {
            audio.removeEventListener('canplaythrough', onCanPlay);
            audio.removeEventListener('error', onError);
            reject(new Error('Audio load failed'));
          };

          audio.addEventListener('canplaythrough', onCanPlay, { once: true });
          audio.addEventListener('error', onError, { once: true });
          audio.preload = 'auto';
          audio.src = audioUrl;
          audio.load();
        });

        await audio.play();
      }
    } catch (error) {
      console.error('TTS error:', error);
    } finally {
      setIsPlaying(false);
    }
  };

  // ========== Streaming TTS Queue Functions ==========

  // Extract complete sentences from text buffer
  const extractCompleteSentences = (text: string): { sentences: string[]; remaining: string } => {
    // Match sentences ending with . ! or ? followed by space or end
    const sentencePattern = /[^.!?]*[.!?]+(?:\s|$)/g;
    const matches = text.match(sentencePattern) || [];
    const sentences = matches.map(s => s.trim()).filter(s => s.length > 0);

    // Find remaining text after last complete sentence
    let remaining = text;
    for (const sentence of sentences) {
      const idx = remaining.indexOf(sentence);
      if (idx !== -1) {
        remaining = remaining.slice(idx + sentence.length);
      }
    }

    return { sentences, remaining: remaining.trim() };
  };

  // Play next audio in queue
  const playNextInQueue = async () => {
    if (audioQueueRef.current.length === 0) {
      isPlayingQueueRef.current = false;
      setIsPlaying(false);
      // Clear audio cache when done
      audioCacheRef.current.clear();
      // Track when AI finished speaking for response time measurement
      aiFinishedSpeakingTimeRef.current = Date.now();
      return;
    }

    isPlayingQueueRef.current = true;
    setIsPlaying(true);
    // Stop filler audio when real TTS starts
    stopFiller();

    const sentence = audioQueueRef.current.shift()!;

    // Prefetch next sentence while playing current one
    if (audioQueueRef.current.length > 0) {
      prefetchAudio(audioQueueRef.current[0]);
    }

    try {
      // Use cached audio or fetch if not available
      const audioBlob = await prefetchAudio(sentence);
      const audioUrl = URL.createObjectURL(audioBlob);

      if (audioRef.current) {
        const audio = audioRef.current;

        await new Promise<void>((resolve, reject) => {
          const onCanPlay = () => {
            audio.removeEventListener('canplaythrough', onCanPlay);
            audio.removeEventListener('error', onError);
            resolve();
          };
          const onError = () => {
            audio.removeEventListener('canplaythrough', onCanPlay);
            audio.removeEventListener('error', onError);
            reject(new Error('Audio load failed'));
          };

          audio.addEventListener('canplaythrough', onCanPlay, { once: true });
          audio.addEventListener('error', onError, { once: true });
          audio.preload = 'auto';
          audio.src = audioUrl;
          audio.load();
        });

        await new Promise<void>((resolve) => {
          const playTimeout = setTimeout(() => {
            console.warn('Audio play timeout - skipping sentence');
            audio.pause();
            resolve();
          }, 15000); // 15초 타임아웃

          audio.onended = () => {
            clearTimeout(playTimeout);
            resolve();
          };
          audio.onerror = () => {
            clearTimeout(playTimeout);
            console.warn('Audio play error - skipping');
            resolve();
          };

          audio.play().catch((err) => {
            clearTimeout(playTimeout);
            console.warn('Audio play() rejected:', err);
            resolve();
          });
        });

        // Revoke URL to free memory
        URL.revokeObjectURL(audioUrl);
      }
    } catch (error) {
      console.error('TTS queue error:', error);
    }

    // Play next in queue
    playNextInQueue();
  };

  // Stop filler audio if still playing
  const stopFiller = () => {
    if (fillerAudioRef.current) {
      fillerAudioRef.current.onended = null;
      fillerAudioRef.current.pause();
      fillerAudioRef.current.currentTime = 0;
    }
  };

  // Prefetch audio for a sentence
  const prefetchAudio = (sentence: string): Promise<Blob> => {
    if (audioCacheRef.current.has(sentence)) {
      return audioCacheRef.current.get(sentence)!;
    }

    const promise = fetch('/api/text-to-speech', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: sentence, voice: persona.voice }),
    }).then(res => res.blob());

    audioCacheRef.current.set(sentence, promise);
    return promise;
  };

  // Add sentence to TTS queue
  const queueTTS = (sentence: string) => {
    // Skip if already processed
    if (processedSentencesRef.current.has(sentence)) {
      return;
    }
    processedSentencesRef.current.add(sentence);

    // Start prefetching audio immediately
    prefetchAudio(sentence);

    audioQueueRef.current.push(sentence);

    if (!isPlayingQueueRef.current) {
      playNextInQueue();
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
    setPhase('ready');
  };

  if (!persona) {
    return <div className="min-h-screen flex items-center justify-center">Invalid tutor</div>;
  }

  // Dynamic theme based on phase
  const isDarkPhase = phase === 'interview' || phase === 'recording';

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-500 ${
      isDarkPhase ? 'bg-neutral-950' : 'bg-neutral-50 dark:bg-dark-bg'
    }`}>
      <audio ref={audioRef} onEnded={() => setIsPlaying(false)} />
      <audio ref={fillerAudioRef} />

      {/* Header - Premium Glass Effect */}
      <header style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }} className={`px-4 sm:px-6 pb-2 sm:pb-3 sticky top-0 z-50 transition-colors duration-500 ${
        isDarkPhase
          ? 'bg-neutral-950/80 backdrop-blur-xl border-b border-white/5'
          : 'bg-white/80 dark:bg-dark-surface/80 backdrop-blur-md border-b border-neutral-200 dark:border-neutral-800'
      }`}>
        <div className="max-w-2xl mx-auto flex justify-between items-center">
          <button
            onClick={handleBackClick}
            className={`p-2 rounded-xl transition-colors ${
              isDarkPhase ? 'text-white/60 hover:text-white hover:bg-white/5' : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-white'
            }`}
          >
            <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <div className="flex items-center gap-2">
            <div>
              <h2 className={`font-semibold text-sm sm:text-base ${isDarkPhase ? 'text-white' : 'text-neutral-900'}`}>
                {persona.name}
              </h2>
              <p className={`text-xs ${isDarkPhase ? 'text-white/50' : 'text-neutral-500 dark:text-neutral-400'}`}>{getPhaseText()}</p>
            </div>
          </div>

          {phase === 'interview' && (
            <button
              onClick={getAnalysis}
              className="text-xs sm:text-sm text-primary-400 font-semibold hover:text-primary-300 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
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
        <div className="max-w-2xl mx-auto">
          <div className="flex gap-1.5">
            {['recording', 'interview', 'review', 'shadowing', 'summary'].map((step, idx) => (
              <div
                key={step}
                className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                  ['ready', 'recording', 'interview', 'analysis', 'review', 'shadowing', 'summary'].indexOf(phase) > idx
                    ? 'bg-primary-500'
                    : isDarkPhase ? 'bg-white/10' : 'bg-neutral-200 dark:bg-neutral-700'
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
          <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8 pb-32 sm:pb-8 text-center" style={{ paddingBottom: 'max(8rem, calc(2rem + env(safe-area-inset-bottom)))' }}>
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

        {/* ========== RECORDING PHASE - Dark Premium UI ========== */}
        {phase === 'recording' && (
          <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8 relative">
            {/* Ambient Glow */}
            <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[300px] h-[300px] rounded-full bg-primary-500/10 blur-3xl" />

            <div className="relative mb-8 sm:mb-10 z-10">
              {/* Timer Ring */}
              <div className="relative">
                <svg className="w-36 h-36 sm:w-44 sm:h-44 timer-circle" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="45" stroke="rgba(255,255,255,0.1)" />
                  <circle
                    cx="50" cy="50" r="45"
                    stroke={timeLeft >= 30 ? '#22C55E' : '#7C3AED'}
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
                  className="w-1 bg-primary-400 rounded-full animate-pulse"
                  style={{
                    height: `${h * 8}px`,
                    animationDelay: `${i * 0.05}s`,
                    animationDuration: '0.6s'
                  }}
                />
              ))}
            </div>

            {timeLeft < 30 ? (
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
          <>
            {/* Ambient Background Glow */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div
                className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[400px] h-[400px] rounded-full opacity-20"
                style={{
                  background: `radial-gradient(circle, ${
                    isRecordingReply ? 'rgba(239,68,68,0.4)' :
                    isPlaying ? 'rgba(124,58,237,0.4)' :
                    'rgba(124,58,237,0.2)'
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

              <div className="text-center mt-6 mb-8">
                {/* Show transcript toggle button when AI is speaking */}
                {(streamingText || isPlaying) && (
                  <div className="mb-4 px-4">
                    {showTranscript ? (
                      <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-4 border border-white/10 max-w-sm mx-auto">
                        <p className="text-white/90 text-sm sm:text-base leading-relaxed">
                          {streamingText || messages[messages.length - 1]?.content}
                          {streamingText && <span className="inline-block w-1.5 h-4 bg-primary-400 ml-0.5 animate-pulse" />}
                        </p>
                        <button
                          onClick={() => setShowTranscript(false)}
                          className="mt-3 text-xs text-white/40 hover:text-white/60 transition-colors"
                        >
                          {language === 'ko' ? '텍스트 숨기기' : 'Hide text'}
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setShowTranscript(true)}
                        className="text-xs text-white/40 hover:text-white/60 flex items-center gap-1.5 mx-auto transition-colors"
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
                  <p className="text-white/70 font-medium text-sm sm:text-base">{persona.name}{t.speaking}</p>
                )}
                {isProcessing && !isPlaying && !streamingText && (
                  <div className="flex flex-col items-center">
                    <div className="flex gap-2 mb-3">
                      {[1,2,3].map(i => (
                        <div key={i} className="w-2 h-2 bg-primary-400 rounded-full animate-pulse" style={{ animationDelay: `${i * 0.15}s` }} />
                      ))}
                    </div>
                    <p className="text-white/50 text-sm sm:text-base">{t.thinking}</p>
                  </div>
                )}
                {isRecordingReply && (
                  <div className="flex flex-col items-center">
                    <div className="flex items-center gap-1 h-10 mb-3">
                      {[1,2,3,4,5].map((i) => (
                        <div
                          key={i}
                          className="w-1 bg-red-500 rounded-full animate-pulse"
                          style={{
                            height: `${12 + Math.random() * 20}px`,
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
                  <p className="text-white/40 text-sm sm:text-base">{t.tapToSpeak}</p>
                )}
              </div>

              <div ref={messagesEndRef} className="hidden" />
            </div>

            {/* Bottom Control Panel - Premium Glass */}
            <div className="p-4 sm:p-6 bg-neutral-900/80 backdrop-blur-xl border-t border-white/5">
              <div className="max-w-md mx-auto">
                <div className="flex gap-3">
                  {/* Main Record Button */}
                  <button
                    onClick={recordReply}
                    disabled={isProcessing || isPlaying}
                    className={`flex-1 py-4 rounded-2xl font-semibold flex items-center justify-center gap-2.5 transition-all text-base ${
                      isRecordingReply
                        ? 'bg-red-500 text-white shadow-lg shadow-red-500/30 recording-active'
                        : isProcessing || isPlaying
                          ? 'bg-white/5 text-white/30 cursor-not-allowed'
                          : 'bg-primary-600 text-white hover:bg-primary-500 shadow-lg shadow-primary-500/20 hover:shadow-primary-500/30 hover:-translate-y-0.5'
                    }`}
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
                        ? 'bg-white/5 text-white/30 border-white/5 cursor-not-allowed'
                        : isProcessing || isPlaying
                          ? 'bg-amber-500/20 text-amber-300 border-amber-400/30 hover:bg-amber-500/30'
                          : 'bg-white/10 text-white hover:bg-white/15 border-white/10'
                    }`}
                  >
                    {t.done}
                  </button>
                </div>

                {/* Timer */}
                <div className="flex items-center justify-center gap-2 mt-4">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  <p className="text-white/40 text-sm font-medium tracking-wide">
                    {formatTime(conversationTime)} / {formatTime(maxConversationTime)}
                  </p>
                </div>
              </div>
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
          <div className="flex-1 flex flex-col p-4 sm:p-6">
            <div className="text-center mb-4 sm:mb-6">
              <span className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400">{t.correction} {currentReviewIndex + 1} {t.of} {analysis.corrections.length}</span>
            </div>

            {analysis.corrections.length > 0 ? (
              <div className="flex-1 flex flex-col justify-center">
                <div className={`p-4 sm:p-6 mb-4 sm:mb-6 rounded-2xl ${
                  repeatedCategories.has(analysis.corrections[currentReviewIndex].category)
                    ? 'bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-400 dark:border-amber-500/50 shadow-lg'
                    : 'card-premium'
                }`}>
                  {/* Repeated Pattern Warning */}
                  {repeatedCategories.has(analysis.corrections[currentReviewIndex].category) && (
                    <div className="flex items-center gap-2 mb-4 px-3 py-2 bg-amber-100 dark:bg-amber-500/20 rounded-lg">
                      <svg className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      <span className="text-xs font-medium text-amber-700 dark:text-amber-300">
                        {language === 'ko'
                          ? `반복되는 실수 패턴 - 이전 세션에서도 "${analysis.corrections[currentReviewIndex].category}" 관련 교정이 있었습니다`
                          : `Recurring pattern - you had "${analysis.corrections[currentReviewIndex].category}" corrections in previous sessions too`}
                      </span>
                    </div>
                  )}

                  {/* Original */}
                  <div className="mb-4 sm:mb-6">
                    <span className="text-xs font-medium text-red-500 dark:text-red-400 uppercase tracking-wider">{t.whatYouSaid}</span>
                    <p className="text-base sm:text-lg text-red-700 dark:text-red-300 mt-2 pl-3 border-l-2 border-red-300 dark:border-red-500">
                      {analysis.corrections[currentReviewIndex].original}
                    </p>
                  </div>

                  {/* Intended */}
                  <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-neutral-50 dark:bg-neutral-800 rounded-xl">
                    <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">{t.whatYouMeant}</span>
                    <p className="text-neutral-700 dark:text-neutral-200 mt-2 text-sm sm:text-base">
                      {analysis.corrections[currentReviewIndex].intended}
                    </p>
                  </div>

                  {/* Corrected */}
                  <div className="mb-4 sm:mb-6">
                    <span className="text-xs font-medium text-green-600 dark:text-green-400 uppercase tracking-wider">{t.correctWay}</span>
                    <div className="flex items-center gap-2 sm:gap-3 mt-2">
                      <p className="text-base sm:text-lg text-green-700 dark:text-green-300 font-medium flex-1">
                        {analysis.corrections[currentReviewIndex].corrected}
                      </p>
                      <button
                        onClick={() => playTTS(analysis.corrections[currentReviewIndex].corrected, 0.85)}
                        disabled={isPlaying}
                        className="w-10 h-10 sm:w-12 sm:h-12 bg-green-100 dark:bg-green-500/20 rounded-xl flex items-center justify-center hover:bg-green-200 dark:hover:bg-green-500/30 transition-colors flex-shrink-0"
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
                  <div className="p-3 sm:p-4 bg-primary-50 dark:bg-primary-500/10 rounded-xl">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <span className="text-xs font-medium text-primary-600 dark:text-primary-400 uppercase tracking-wider">{t.why}</span>
                        <p className="text-primary-900 dark:text-primary-200 mt-2 text-xs sm:text-sm">
                          {analysis.corrections[currentReviewIndex].explanation}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                            repeatedCategories.has(analysis.corrections[currentReviewIndex].category)
                              ? 'bg-amber-200 dark:bg-amber-500/30 text-amber-700 dark:text-amber-300'
                              : 'bg-primary-100 dark:bg-primary-500/20 text-primary-700 dark:text-primary-300'
                          }`}>
                            {analysis.corrections[currentReviewIndex].category}
                          </span>
                          {repeatedCategories.has(analysis.corrections[currentReviewIndex].category) && (
                            <span className="inline-block px-2 py-0.5 bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 text-[10px] font-bold rounded-full uppercase tracking-wider">
                              {language === 'ko' ? '습관 주의' : 'Habit Alert'}
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          const correction = analysis.corrections[currentReviewIndex];
                          playTTS(`You said: "${correction.original}". A better way is: "${correction.corrected}". ${correction.explanation}`, 0.85);
                        }}
                        disabled={isPlaying}
                        className="w-9 h-9 bg-primary-100 dark:bg-primary-500/20 rounded-lg flex items-center justify-center hover:bg-primary-200 transition-colors flex-shrink-0"
                        title={language === 'ko' ? '설명 듣기' : 'Listen to explanation'}
                      >
                        {isPlaying ? (
                          <div className="w-3 h-3 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <svg className="w-4 h-4 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => playTTS(analysis.corrections[currentReviewIndex].corrected, 0.85)}
                    disabled={isPlaying}
                    className="w-12 h-12 sm:w-14 sm:h-14 bg-green-100 dark:bg-green-500/20 rounded-xl flex items-center justify-center hover:bg-green-200 dark:hover:bg-green-500/30 transition-colors flex-shrink-0"
                  >
                    {isPlaying ? (
                      <div className="w-4 h-4 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 24 24">
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
                <p className="text-neutral-600 dark:text-neutral-300 mb-6 text-sm sm:text-base">{language === 'ko' ? '주요 교정 사항이 없습니다.' : 'No major corrections needed.'}</p>
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
                <p className="text-xl sm:text-2xl font-medium text-neutral-900 dark:text-white dark:text-white mb-4 sm:mb-6">
                  {analysis.corrections[shadowingIndex].corrected}
                </p>

                <button
                  onClick={() => playTTS(analysis.corrections[shadowingIndex].corrected, 0.8)}
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
            {/* Save as Image Button */}
            <div className="flex justify-end mb-4">
              <button
                onClick={saveAsImage}
                disabled={isSavingImage}
                className="flex items-center gap-2 px-3 py-2 text-sm bg-white dark:bg-dark-surface border border-neutral-200 dark:border-neutral-700 rounded-xl hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors disabled:opacity-50"
              >
                {isSavingImage ? (
                  <div className="w-4 h-4 border-2 border-neutral-400 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg className="w-4 h-4 text-neutral-600 dark:text-neutral-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                )}
                {language === 'ko' ? '이미지 저장' : 'Save Image'}
              </button>
            </div>

            {/* Report Content - for image capture */}
            <div ref={summaryRef} className="rounded-2xl overflow-hidden">
              {/* Section: Header + Tutor */}
              <div data-report-section className="bg-neutral-50 dark:bg-[#1a1a1a] p-4">
                <div className="flex items-center justify-between text-xs mb-4 pb-3 border-b border-neutral-200 dark:border-neutral-700">
                  <div className="flex items-center gap-2">
                    <TapTalkLogo size="sm" theme="light" iconOnly />
                    <span className="font-semibold text-neutral-800 dark:text-neutral-200">{userName || 'Student'}</span>
                    {birthYear && (
                      <span className="text-neutral-500 dark:text-neutral-400">
                        ({language === 'ko' ? '만' : 'Age'} {new Date().getFullYear() - birthYear}{language === 'ko' ? '세' : ''})
                      </span>
                    )}
                  </div>
                  <span className="text-neutral-500 dark:text-neutral-400">{new Date().toLocaleDateString()}</span>
                </div>

                <div className="text-center">
                  <div className="flex justify-center mb-4">
                    <TutorAvatar
                      tutorId={tutorId as 'emma' | 'james' | 'charlotte' | 'oliver'}
                      size="lg"
                    />
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold text-neutral-900 dark:text-white">{t.sessionComplete}</h2>
                </div>
              </div>

              {/* AnalysisReview renders its own data-report-sections */}
              {speechMetrics && (
                <AnalysisReview speechMetrics={speechMetrics} language={language} />
              )}

            {analysis && (
              <>
                {/* Section 2: Assessments */}
                <div data-report-section className="bg-neutral-50 dark:bg-dark-surface px-4 py-4">
                {/* AI Evaluated Level */}
                {analysis.evaluatedGrade && analysis.levelDetails && (
                  <div className="card-premium p-4 sm:p-6 mb-4 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-500/10 dark:to-purple-500/10">
                    <h3 className="font-semibold text-neutral-900 dark:text-white mb-3 flex items-center gap-2 text-sm sm:text-base">
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
                        <p className="text-lg font-bold text-neutral-900 dark:text-white">
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
                        <div key={item.label} className="bg-white/60 dark:bg-white/5 rounded-lg p-2">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-xs text-neutral-600 dark:text-neutral-300">{item.label}</span>
                            <span className="text-xs font-bold text-neutral-900 dark:text-white">{item.value}</span>
                          </div>
                          <div className="h-1.5 bg-neutral-200 rounded-full overflow-hidden">
                            <div className={`h-full ${item.color} rounded-full`} style={{ width: `${item.value}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>

                    {analysis.levelDetails.summary && (
                      <p className="mt-3 text-xs sm:text-sm text-neutral-600 dark:text-neutral-300 italic">{analysis.levelDetails.summary}</p>
                    )}
                  </div>
                )}

                {/* Speaking Evaluation - Grade Level & Test Scores */}
                {(isLoadingEval || speakingEval) && (
                  <div className="card-premium p-4 sm:p-6 mb-4 bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-500/10 dark:to-blue-500/10">
                    <h3 className="font-semibold text-neutral-900 dark:text-white mb-3 flex items-center gap-2 text-sm sm:text-base">
                      <span className="w-5 h-5 sm:w-6 sm:h-6 bg-blue-100 rounded-full flex items-center justify-center">
                        <svg className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </span>
                      {language === 'ko' ? '영어 능숙도 분석' : 'English Proficiency Analysis'}
                    </h3>

                    {isLoadingEval ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        <span className="ml-3 text-sm text-neutral-600 dark:text-neutral-300">
                          {language === 'ko' ? 'Speaking 분석 중...' : 'Analyzing speaking metrics...'}
                        </span>
                      </div>
                    ) : speakingEval && (
                      <>
                        {/* Primary Grade Level */}
                        <div className="flex items-center gap-4 mb-4 p-3 bg-white/80 dark:bg-white/5 rounded-xl">
                          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                            <span className="text-white font-bold text-lg">{speakingEval.gradeLevel?.grade}</span>
                          </div>
                          <div className="flex-1">
                            <p className="text-lg font-bold text-neutral-900 dark:text-white">{speakingEval.gradeLevel?.usGrade}</p>
                            <p className="text-xs text-neutral-500">{speakingEval.gradeLevel?.ukYear}</p>
                            <span className={`inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-medium ${
                              speakingEval.gradeLevel?.confidence === 'high' ? 'bg-green-100 text-green-700' :
                              speakingEval.gradeLevel?.confidence === 'medium' ? 'bg-amber-100 text-amber-700' :
                              'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300'
                            }`}>
                              {language === 'ko' ? '신뢰도' : 'Confidence'}: {speakingEval.gradeLevel?.confidence}
                            </span>
                          </div>
                        </div>

                        <p className="text-[10px] text-neutral-500 dark:text-neutral-400 mb-3 italic">
                          {language === 'ko'
                            ? '* 영어 원어민 학년 기준으로 측정됩니다. ESL 학습자에게는 참고 지표로 활용하세요.'
                            : '* Measured against native English speaker grade levels. Use as a reference benchmark.'}
                        </p>

                        {/* Test Score Equivalents */}
                        {speakingEval.testScores && (
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
                            {/* IELTS */}
                            <div className="bg-white/80 dark:bg-white/5 rounded-lg p-2 text-center">
                              <p className="text-[10px] text-neutral-500">IELTS Speaking</p>
                              <p className="text-lg font-bold text-red-600">{speakingEval.testScores.ielts?.band}</p>
                              <p className="text-[9px] text-neutral-400">/9.0</p>
                            </div>
                            {/* TOEFL */}
                            <div className="bg-white/80 dark:bg-white/5 rounded-lg p-2 text-center">
                              <p className="text-[10px] text-neutral-500">TOEFL Speaking</p>
                              <p className="text-lg font-bold text-blue-600">{speakingEval.testScores.toefl?.score}</p>
                              <p className="text-[9px] text-neutral-400">/30</p>
                            </div>
                            {/* TOEIC */}
                            <div className="bg-white/80 dark:bg-white/5 rounded-lg p-2 text-center">
                              <p className="text-[10px] text-neutral-500">TOEIC Speaking</p>
                              <p className="text-lg font-bold text-amber-600">{speakingEval.testScores.toeic?.score}</p>
                              <p className="text-[9px] text-neutral-400">/200 (Lv.{speakingEval.testScores.toeic?.level})</p>
                            </div>
                            {/* CEFR */}
                            <div className="bg-white/80 dark:bg-white/5 rounded-lg p-2 text-center">
                              <p className="text-[10px] text-neutral-500">CEFR</p>
                              <p className="text-lg font-bold text-purple-600">{speakingEval.testScores.cefr?.level}</p>
                            </div>
                          </div>
                        )}

                        {/* Metrics Breakdown */}
                        {speakingEval.metrics && (
                          <div className="bg-white/60 dark:bg-white/5 rounded-lg p-3 mb-3">
                            <p className="text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                              {language === 'ko' ? '측정 지표' : 'Measured Metrics'}
                            </p>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div className="flex justify-between">
                                <span className="text-neutral-500">{language === 'ko' ? '평균 응답 길이' : 'Avg words/turn'}</span>
                                <span className="font-medium">{speakingEval.metrics.avgWordsPerTurn}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-neutral-500">{language === 'ko' ? '어휘 다양성' : 'Lexical diversity'}</span>
                                <span className="font-medium">{Math.round(speakingEval.metrics.vocabulary?.lexicalDiversity * 100)}%</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-neutral-500">{language === 'ko' ? '학술 어휘' : 'Academic vocab'}</span>
                                <span className="font-medium">{speakingEval.metrics.vocabulary?.tier2Percentage}%</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-neutral-500">{language === 'ko' ? '복문 비율' : 'Complex sentences'}</span>
                                <span className="font-medium">{speakingEval.metrics.sentenceComplexity?.complexRatio}%</span>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Age Comparison */}
                        {speakingEval.comparison?.expectedForAge && (
                          <div className="bg-white/60 dark:bg-white/5 rounded-lg p-3 mb-3">
                            <p className="text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                              {language === 'ko' ? '나이 대비 수준' : 'Performance vs Age'}
                            </p>
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                speakingEval.comparison.performanceVsExpected === 'above' ? 'bg-green-100 text-green-700' :
                                speakingEval.comparison.performanceVsExpected === 'at' ? 'bg-blue-100 text-blue-700' :
                                'bg-amber-100 text-amber-700'
                              }`}>
                                {speakingEval.comparison.performanceVsExpected === 'above'
                                  ? (language === 'ko' ? '기대치 이상' : 'Above Expected')
                                  : speakingEval.comparison.performanceVsExpected === 'at'
                                  ? (language === 'ko' ? '기대치 수준' : 'At Expected Level')
                                  : (language === 'ko' ? '기대치 미만' : 'Below Expected')}
                              </span>
                              <span className="text-xs text-neutral-600 dark:text-neutral-300">
                                {language === 'ko'
                                  ? `기대 학년: ${speakingEval.comparison.expectedForAge}`
                                  : `Expected: Grade ${speakingEval.comparison.expectedForAge}`}
                                {speakingEval.comparison.gradeGap !== 0 && (
                                  <span className={speakingEval.comparison.gradeGap > 0 ? 'text-green-600' : 'text-amber-600'}>
                                    {' '}({speakingEval.comparison.gradeGap > 0 ? '+' : ''}{speakingEval.comparison.gradeGap})
                                  </span>
                                )}
                              </span>
                            </div>
                          </div>
                        )}

                        {/* Feedback */}
                        {speakingEval.feedback && (
                          <>
                            {/* Strengths */}
                            {speakingEval.feedback.strengths?.length > 0 && (
                              <div className="bg-green-50/50 dark:bg-green-500/10 rounded-lg p-3 mb-2">
                                <p className="text-xs font-medium text-green-800 dark:text-green-300 mb-1">
                                  {language === 'ko' ? '강점' : 'Strengths'}
                                </p>
                                <ul className="space-y-0.5">
                                  {speakingEval.feedback.strengths.slice(0, 3).map((s: string, i: number) => (
                                    <li key={i} className="text-xs text-green-700 dark:text-green-400 flex items-start gap-1">
                                      <span>✓</span> {s}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {/* Next Steps */}
                            {speakingEval.feedback.nextSteps?.length > 0 && (
                              <div className="bg-blue-50/50 dark:bg-blue-500/10 rounded-lg p-3">
                                <p className="text-xs font-medium text-blue-800 dark:text-blue-300 mb-1">
                                  {language === 'ko' ? '다음 단계' : 'Next Steps'}
                                </p>
                                <ul className="space-y-0.5">
                                  {speakingEval.feedback.nextSteps.slice(0, 3).map((s: string, i: number) => (
                                    <li key={i} className="text-xs text-blue-700 dark:text-blue-400 flex items-start gap-1">
                                      <span>→</span> {s}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {/* Improvement Guide (개선 로드맵) */}
                            {speakingEval.improvementGuide?.length > 0 && (
                              <div className="mt-3 border border-amber-200 dark:border-amber-500/20 rounded-lg overflow-hidden">
                                <div className="bg-amber-50 dark:bg-amber-500/10 px-3 py-2 border-b border-amber-200 dark:border-amber-500/20">
                                  <p className="text-xs font-semibold text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                                    <svg className="w-3.5 h-3.5 inline-block" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 6v16l7-4 8 4 7-4V2l-7 4-8-4-7 4z"/><path d="M8 2v16"/><path d="M16 6v16"/></svg>
                                    {language === 'ko' ? '개선 로드맵 — 이렇게 연습하세요' : 'Improvement Roadmap — How to Practice'}
                                  </p>
                                </div>
                                <div className="divide-y divide-amber-100 dark:divide-amber-500/10">
                                  {speakingEval.improvementGuide.map((item: {
                                    area: string; icon: string; currentLevel: string; targetLevel: string;
                                    priority: string; tips: string[]; examplePhrases: string[]; miniChallenge: string;
                                  }, idx: number) => (
                                    <div key={idx} className="p-3">
                                      <div className="flex items-center justify-between mb-1.5">
                                        <span className="text-xs font-semibold text-amber-900 dark:text-amber-300 flex items-center gap-1">
                                          {item.icon === 'book' ? (
                                            <svg className="w-3 h-3 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
                                          ) : item.icon === 'link' ? (
                                            <svg className="w-3 h-3 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                                          ) : item.icon === 'shuffle' ? (
                                            <svg className="w-3 h-3 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/><line x1="4" y1="4" x2="9" y2="9"/></svg>
                                          ) : item.icon === 'pencil' ? (
                                            <svg className="w-3 h-3 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                                          ) : item.icon === 'ruler' ? (
                                            <svg className="w-3 h-3 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21.3 15.3a2.4 2.4 0 0 1 0 3.4l-2.6 2.6a2.4 2.4 0 0 1-3.4 0L2.7 8.7a2.41 2.41 0 0 1 0-3.4l2.6-2.6a2.41 2.41 0 0 1 3.4 0z"/><line x1="14.5" y1="12.5" x2="11.5" y2="9.5"/></svg>
                                          ) : (
                                            <svg className="w-3 h-3 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/></svg>
                                          )} {item.area}
                                        </span>
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                                          item.priority === 'high' ? 'bg-red-100 dark:bg-red-500/15 text-red-700 dark:text-red-400' :
                                          item.priority === 'medium' ? 'bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400' :
                                          'bg-gray-100 dark:bg-neutral-700 text-gray-600 dark:text-neutral-300'
                                        }`}>
                                          {item.priority === 'high' ? (language === 'ko' ? '우선' : 'Priority') :
                                           item.priority === 'medium' ? (language === 'ko' ? '권장' : 'Recommended') :
                                           (language === 'ko' ? '참고' : 'Optional')}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-2 mb-2">
                                        <span className="text-[10px] text-gray-500 dark:text-neutral-400 bg-gray-50 dark:bg-neutral-700 px-1.5 py-0.5 rounded">
                                          {item.currentLevel}
                                        </span>
                                        <span className="text-[10px] text-gray-400 dark:text-neutral-500">→</span>
                                        <span className="text-[10px] text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-500/10 px-1.5 py-0.5 rounded font-medium">
                                          {item.targetLevel}
                                        </span>
                                      </div>
                                      <ul className="space-y-0.5 mb-2">
                                        {item.tips.map((tip: string, ti: number) => (
                                          <li key={ti} className="text-[11px] text-amber-800 dark:text-amber-300 flex items-start gap-1">
                                            <span className="text-amber-400 mt-0.5">•</span> {tip}
                                          </li>
                                        ))}
                                      </ul>
                                      {item.examplePhrases.length > 0 && (
                                        <div className="bg-white/60 dark:bg-white/5 rounded p-2 mb-2">
                                          <p className="text-[10px] font-medium text-gray-500 dark:text-neutral-400 mb-1">
                                            {language === 'ko' ? '연습 표현' : 'Practice Phrases'}
                                          </p>
                                          {item.examplePhrases.slice(0, 2).map((phrase: string, pi: number) => (
                                            <p key={pi} className="text-[11px] text-gray-700 dark:text-neutral-300 italic">{phrase}</p>
                                          ))}
                                        </div>
                                      )}
                                      <div className="bg-amber-100/50 dark:bg-amber-500/10 rounded px-2 py-1.5">
                                        <p className="text-[11px] text-amber-900 dark:text-amber-300 font-medium flex items-center gap-1">
                                          <svg className="w-3 h-3 inline-block flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg> {item.miniChallenge}
                                        </p>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </>
                        )}
                      </>
                    )}
                  </div>
                )}
                </div>

                {/* Section 3: Feedback */}
                <div data-report-section className="bg-neutral-50 dark:bg-dark-surface px-4 pb-4">
                {/* Strengths */}
                <div className="card-premium p-4 sm:p-6 mb-4">
                  <h3 className="font-semibold text-neutral-900 dark:text-white mb-3 flex items-center gap-2 text-sm sm:text-base">
                    <span className="w-5 h-5 sm:w-6 sm:h-6 bg-green-100 rounded-full flex items-center justify-center">
                      <svg className="w-3 h-3 sm:w-4 sm:h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </span>
                    {t.whatYouDidWell}
                  </h3>
                  <ul className="space-y-2">
                    {analysis.strengths.map((strength, idx) => (
                      <li key={idx} className="text-neutral-700 dark:text-neutral-300 text-xs sm:text-sm flex items-start gap-2">
                        <span className="text-green-500 mt-0.5">•</span>
                        {strength}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Error Patterns */}
                {analysis.patterns.length > 0 && (
                  <div className="card-premium p-4 sm:p-6 mb-4">
                    <h3 className="font-semibold text-neutral-900 dark:text-white mb-3 flex items-center gap-2 text-sm sm:text-base">
                      <span className="w-5 h-5 sm:w-6 sm:h-6 bg-amber-100 rounded-full flex items-center justify-center">
                        <svg className="w-3 h-3 sm:w-4 sm:h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                      </span>
                      {t.areasToFocus}
                    </h3>
                    <div className="space-y-3">
                      {analysis.patterns.map((pattern, idx) => {
                        const lower = pattern.type.toLowerCase();
                        const patternCategory = (lower.includes('vocab') || lower.includes('word choice') || lower.includes('collocation'))
                          ? 'vocabulary'
                          : (lower.includes('pronunc'))
                          ? 'pronunciation'
                          : 'grammar';
                        const isRepeated = repeatedCategories.has(patternCategory);
                        return (
                        <div key={idx} className={`p-3 bg-amber-50 dark:bg-amber-500/10 rounded-xl ${isRepeated ? 'border-2 border-amber-400' : ''}`}>
                          {isRepeated && (
                            <div className="flex items-center gap-2 mb-2 px-2 py-1.5 bg-amber-100 dark:bg-amber-500/20 rounded-lg">
                              <svg className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                              <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wider">Recurring Pattern</span>
                            </div>
                          )}
                          <div className="flex justify-between items-center mb-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-amber-900 dark:text-amber-300 text-sm">{pattern.type}</span>
                              {isRepeated && (
                                <span className="px-2 py-0.5 bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 text-[10px] font-bold rounded-full uppercase tracking-wider">Habit Alert</span>
                              )}
                            </div>
                            <span className="text-xs bg-amber-200 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 px-2 py-0.5 rounded-full">{pattern.count}x</span>
                          </div>
                          <p className="text-xs sm:text-sm text-amber-700 dark:text-amber-400">{pattern.tip}</p>
                        </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Encouragement */}
                <div className="card-premium p-4 sm:p-6 bg-gradient-to-br from-primary-50 to-white dark:from-primary-500/10 dark:to-dark-surface">
                  <p className="text-primary-900 dark:text-white italic text-sm sm:text-base">&ldquo;{analysis.encouragement}&rdquo;</p>
                  <p className="text-xs sm:text-sm text-primary-600 dark:text-primary-400 mt-2">— {persona.name}</p>
                </div>
                </div>
              </>
            )}
            </div>
            {/* End of Report Content */}

            <div className="flex gap-3 sm:gap-4 mt-6">
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

      {/* Exit Session Confirmation Modal */}
      {showExitConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
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
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  {language === 'ko' ? '영문 이름' : 'English Name'}
                </label>
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder={language === 'ko' ? '예: Emma, James' : 'e.g. Emma, James'}
                  className="w-full px-4 py-3 rounded-xl border-2 border-neutral-200 focus:border-indigo-500 focus:ring-0 transition-colors text-neutral-900 placeholder-neutral-400"
                />
              </div>

              {/* Birth Year - 2-Step Selector */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
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
                  {birthYear && `${language === 'ko' ? '만' : 'Age'} ${new Date().getFullYear() - birthYear}${language === 'ko' ? '세' : ' years old'}`}
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 pb-6 space-y-3">
              <button
                onClick={() => {
                  setShowUserInfoModal(false);
                  startRecording();
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
