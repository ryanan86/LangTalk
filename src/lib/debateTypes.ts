// Debate Mode Type Definitions

export type DebatePhase =
  | 'topic'      // Topic reveal
  | 'team'       // Team assignment
  | 'opening'    // Opening statements
  | 'debate'     // Main debate
  | 'closing'    // Closing arguments
  | 'analysis'   // Feedback & analysis
  | 'summary';   // Final summary

export type DebateTeam = 'pro' | 'con';

export type DebateCategory =
  | 'daily'
  | 'school'
  | 'technology'
  | 'society'
  | 'environment'
  | 'culture'
  | 'sports'
  | 'ethics'
  // Legacy categories for backward compatibility
  | 'social'
  | 'politics'
  | 'international';

export interface DebateParticipant {
  id: string;
  name: string;
  team: DebateTeam | 'moderator';
  isUser: boolean;
  voice: string;
  gradient: string;
}

export interface DebateTopic {
  id: string;
  category: DebateCategory;
  title: { en: string; ko: string };
  description: { en: string; ko: string };
}

export interface DebateMessage {
  role: 'user' | 'assistant';
  content: string;
  speakerId: string;
  speakerName: string;
  team: DebateTeam | 'moderator';
  phase: DebatePhase;
}

export interface DebateAnalysis {
  userPerformance: {
    strengths: string[];
    improvements: string[];
    grammarCorrections: GrammarCorrection[];
  };
  debateSummary: {
    proPoints: string[];
    conPoints: string[];
    keyMoments: string[];
  };
  expressionsToLearn: string[];
  overallFeedback: string;
}

export interface GrammarCorrection {
  original: string;
  corrected: string;
  explanation: string;
}

export interface DebateState {
  phase: DebatePhase;
  topic: DebateTopic | null;
  userTeam: DebateTeam | null;
  participants: DebateParticipant[];
  messages: DebateMessage[];
  currentSpeakerIndex: number;
  turnCount: number;
  userTurnCount: number;
  analysis: DebateAnalysis | null;
}

// Turn order type for managing speaking order
export interface TurnOrder {
  speakerId: string;
  isUser: boolean;
}

// Constants
export const MIN_SESSIONS_FOR_DEBATE = 5;
export const MIN_DEBATE_TURNS = 8;
export const MAX_DEBATE_TURNS = 12;
export const MIN_USER_TURNS = 3;
