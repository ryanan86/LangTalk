// Debate Mode Type Definitions - v2 Redesign

// 5-stage debate flow
export type DebatePhase =
  | 'preparation'  // Topic reveal + team assignment + think time (3min)
  | 'opening'      // Opening statements (2min each)
  | 'rebuttal'     // Rebuttals & cross-examination (90s each, 2 rounds)
  | 'closing'      // Closing arguments (2min each)
  | 'analysis'     // AI judging + feedback generation
  | 'result';      // Score display + grammar feedback + key expressions

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
  avatar: string; // First letter or emoji-free identifier
}

export interface DebateTopic {
  id: string;
  category: DebateCategory;
  title: { en: string; ko: string };
  description: { en: string; ko: string };
  keyVocabulary?: string[]; // Helpful debate expressions shown during preparation
  proHints?: string[]; // Argument hints for pro team
  conHints?: string[]; // Argument hints for con team
}

export interface DebateMessage {
  role: 'user' | 'assistant';
  content: string;
  speakerId: string;
  speakerName: string;
  team: DebateTeam | 'moderator';
  phase: DebatePhase;
  roundIndex?: number; // Which round within the phase (for rebuttal)
}

// Scoring system: 5 criteria, each 0-20 points = 100 total per team
export interface DebateScore {
  clarity: number;        // Argument clarity & logic (0-20)
  evidence: number;       // Evidence & support quality (0-20)
  rebuttal: number;       // Effectiveness of rebuttals (0-20)
  responsiveness: number; // Responsiveness to opponent points (0-20)
  language: number;       // English proficiency & persuasion (0-20)
  total: number;          // Sum of all criteria (0-100)
}

export interface DebateAnalysis {
  // Winner determination
  winner: DebateTeam;
  proScore: DebateScore;
  conScore: DebateScore;
  judgmentReason: string; // Why this team won

  // User-specific feedback
  userPerformance: {
    strengths: string[];
    improvements: string[];
    grammarCorrections: GrammarCorrection[];
  };

  // Debate content summary
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

// Turn definition for structured debate flow
export interface DebateTurn {
  speakerId: string;
  phase: DebatePhase;
  roundIndex: number;    // 0-based round within phase
  timeLimitSec: number;  // Time limit for this turn
  label: string;         // Display label (e.g., "Opening Statement", "Rebuttal Round 1")
}

// Phase time configuration (in seconds)
export const PHASE_CONFIG = {
  preparation: {
    thinkTime: 180, // 3 minutes to prepare
  },
  opening: {
    timeLimitSec: 120, // 2 minutes per speaker
  },
  rebuttal: {
    timeLimitSec: 90, // 90 seconds per speaker
    rounds: 2,        // 2 rounds of rebuttals
  },
  closing: {
    timeLimitSec: 120, // 2 minutes per speaker
  },
} as const;

// Max turns per participant across the entire debate
export const MAX_TURNS_PER_PARTICIPANT = 4; // opening + rebuttal R1 + rebuttal R2 + closing

// Constants
export const MIN_SESSIONS_FOR_DEBATE = 5;

// Turn order type for managing speaking order
export interface TurnOrder {
  speakerId: string;
  isUser: boolean;
}
