/**
 * Speech Coaching Types
 * Types for the speech/presentation coaching feature
 */

export interface SpeechSession {
  id: string;
  userId: string;
  tutorId: string;
  sessionNumber: number;
  transcript: string;
  duration: number; // seconds
  analysis: SpeechAnalysis;
  focusAreas: string[];
  previousSessionId?: string;
  createdAt: string;
}

export interface SpeechAnalysis {
  overallScore: number; // 0-100
  delivery: DeliveryMetrics;
  grammar: GrammarAnalysis;
  pronunciation: PronunciationAnalysis;
  content: ContentAnalysis;
  strengths: string[];
  improvements: string[];
  focusForNextSession: string;
  comparisonWithPrevious?: SessionComparison;
  encouragement: string;
}

export interface DeliveryMetrics {
  wordsPerMinute: number;
  fillerWords: { word: string; count: number }[];
  pauseQuality: 'good' | 'too-many' | 'too-few';
  pacing: 'too-fast' | 'good' | 'too-slow';
}

export interface GrammarAnalysis {
  corrections: GrammarCorrection[];
  accuracy: number; // 0-100
}

export interface GrammarCorrection {
  original: string;
  corrected: string;
  explanation: string;
}

export interface PronunciationAnalysis {
  issues: PronunciationIssue[];
  clarity: number; // 0-100
}

export interface PronunciationIssue {
  word: string;
  suggestion: string;
  severity: 'minor' | 'major';
}

export interface ContentAnalysis {
  structure: string;
  coherence: number; // 0-100
  vocabulary: string; // CEFR level
}

export interface SessionComparison {
  improved: string[];
  stillNeedsWork: string[];
  overallProgress: string;
}

// API request/response types
export interface SpeechAnalyzeRequest {
  transcript: string;
  tutorId: string;
  duration: number;
  sessionNumber: number;
  previousAnalysis?: SpeechAnalysis;
  focusAreas?: string[];
  language?: string;
}

export interface SpeechSessionSaveRequest {
  tutorId: string;
  sessionNumber: number;
  transcript: string;
  duration: number;
  analysis: SpeechAnalysis;
  focusAreas: string[];
  previousSessionId?: string;
}
