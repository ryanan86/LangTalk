'use client';

import { useCallback } from 'react';
import {
  SpeechMetrics,
  calculateSpeechMetrics,
} from '@/lib/speechMetrics';

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

type Phase = 'ready' | 'mode-select' | 'topic-select' | 'warmup' | 'tutor-intro'
           | 'recording' | 'interview' | 'analysis' | 'review' | 'shadowing' | 'summary';

interface UseAnalysisPhaseOptions {
  /** Refs */
  isEndingSessionRef: React.MutableRefObject<boolean>;
  abortControllerRef: React.MutableRefObject<AbortController | null>;
  audioRef: React.MutableRefObject<HTMLAudioElement | null>;
  audioQueueRef: React.MutableRefObject<string[]>;
  isPlayingQueueRef: React.MutableRefObject<boolean>;
  userSpeakingTimeRef: React.MutableRefObject<number>;
  responseTimesRef: React.MutableRefObject<number[]>;
  /** State values (read at call time via getter) */
  getMessages: () => Message[];
  getConversationTime: () => number;
  /** Config */
  tutorId: string;
  language: string;
  birthYear: number | null;
  userName: string;
  previousGrade: string | null;
  previousLevelDetails: { grammar: number; vocabulary: number; fluency: number; comprehension: number } | null;
  /** State setters */
  setIsPlaying: (v: boolean) => void;
  setIsProcessing: (v: boolean) => void;
  setStreamingText: (v: string) => void;
  setPhase: (phase: Phase) => void;
  setSpeechMetrics: (metrics: SpeechMetrics | null) => void;
  setAnalysis: (analysis: Analysis | null) => void;
}

interface UseAnalysisPhaseReturn {
  getAnalysis: () => Promise<void>;
}

export function useAnalysisPhase({
  isEndingSessionRef,
  abortControllerRef,
  audioRef,
  audioQueueRef,
  isPlayingQueueRef,
  userSpeakingTimeRef,
  responseTimesRef,
  getMessages,
  getConversationTime,
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
}: UseAnalysisPhaseOptions): UseAnalysisPhaseReturn {

  const getAnalysis = useCallback(async () => {
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
    const messages = getMessages();
    const conversationTime = getConversationTime();
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

    const requestBody = {
      messages,
      tutorId,
      mode: 'analysis',
      language,
      birthYear,
      userName,
      previousGrade,
      previousLevelDetails,
      speechMetrics: {
        avgSentenceLength: preMetrics.avgSentenceLength,
        vocabularyDiversity: preMetrics.vocabularyDiversity,
        complexSentenceRatio: preMetrics.complexSentenceRatio,
        wordsPerMinute: preMetrics.wordsPerMinute,
      },
    };

    const processAnalysisResult = (analysisData: Analysis) => {
      const grammarErrors = analysisData.corrections?.length || 0;
      const metrics = calculateSpeechMetrics(
        userMessages,
        totalSpeakingTime,
        responseTimesRef.current,
        grammarErrors
      );
      setSpeechMetrics(metrics);
      setAnalysis(analysisData);
      if (analysisData.corrections && analysisData.corrections.length > 0) {
        setPhase('review');
      } else {
        setPhase('summary');
      }
    };

    const fallbackToSummary = () => {
      const metrics = calculateSpeechMetrics(userMessages, totalSpeakingTime, responseTimesRef.current, 0);
      setSpeechMetrics(metrics);
      setPhase('summary');
    };

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });
      const data = await response.json();

      if (data.analysis) {
        processAnalysisResult(data.analysis);
      } else if (data.parseError) {
        // Analysis JSON parsing failed on server - retry once
        console.warn('Analysis parse error, retrying...');
        try {
          const retryResponse = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody),
          });
          const retryData = await retryResponse.json();

          if (retryData.analysis) {
            processAnalysisResult(retryData.analysis);
          } else {
            // Retry also failed - go to summary with basic metrics
            fallbackToSummary();
          }
        } catch {
          fallbackToSummary();
        }
      } else {
        console.error('Analysis parsing failed');
        // Still calculate basic metrics even if AI analysis fails
        fallbackToSummary();
      }
    } catch (error) {
      console.error('Analysis error:', error);
      setPhase('summary');
    } finally {
      setIsProcessing(false);
    }
  }, [
    isEndingSessionRef,
    abortControllerRef,
    audioRef,
    audioQueueRef,
    isPlayingQueueRef,
    userSpeakingTimeRef,
    responseTimesRef,
    getMessages,
    getConversationTime,
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
  ]);

  return { getAnalysis };
}
