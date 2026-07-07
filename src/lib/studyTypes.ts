/**
 * Study Mode — 3-month structured learning program ("언어 마스터 OS")
 *
 * Shared type contract between backend (plan generation, session APIs) and
 * frontend (setup wizard, daily session player, progress dashboard).
 * Stored inside the existing user JSONB rows: profile.study + stats.study
 * (no DB migration needed, same pattern as profile.memory).
 */

// ============================================
// Program setup & plan
// ============================================

export type StudyGoal = 'travel' | 'business' | 'relocation' | 'exam' | 'daily-conversation';
export type DailyMinutes = 15 | 30 | 60 | 90;

export interface StudyProfile {
  goal: StudyGoal;
  goalDetail?: string;          // free-form: "발리 이주 준비", "해외 바이어 미팅"
  selfLevel: 'beginner' | 'intermediate' | 'advanced';
  assessedCEFR?: string;        // from diagnostic conversation, e.g. "B1"
  dailyMinutes: DailyMinutes;
  studyDaysPerWeek: number;     // 3-7
  startDate: string;            // YYYY-MM-DD
}

export interface StudyWeek {
  week: number;                 // 1-12
  theme: string;                // "자기소개와 스몰토크", "여행: 공항과 호텔"
  themeEn: string;
  patternIds: string[];         // pattern ids for this week (from studyPatterns data)
  vocabTier: 1 | 2 | 3;         // which core-vocab tier this week draws from
  immersionMission: string;     // weekly immersion mission (Korean instructions)
  weeklyTestTopic: string;      // topic for day-7 speaking test
}

export interface StudyPlan {
  profile: StudyProfile;
  weeks: StudyWeek[];           // 12 entries
  createdAt: string;
}

// ============================================
// Daily session
// ============================================

export type StudyBlockType =
  | 'warmup'      // recall yesterday, free chat 1-2 min
  | 'vocab'       // core vocab sprint (SRS-backed)
  | 'pattern'     // grammar pattern drill: make sentences aloud
  | 'shadowing'   // listen & repeat, STT word-match scoring
  | 'realtalk'    // guided conversation using today's pattern+vocab
  | 'wrapup';     // summary, corrections saved, tomorrow preview

export interface StudyBlockSpec {
  type: StudyBlockType;
  minutes: number;              // allocated time for the block
  title: string;                // Korean UI label
}

/** Returns time-budgeted block sequence for a daily-minutes setting. */
export function buildBlockSequence(dailyMinutes: DailyMinutes): StudyBlockSpec[] {
  const m = dailyMinutes;
  return [
    { type: 'warmup', minutes: Math.max(1, Math.round(m * 0.1)), title: '워밍업 대화' },
    { type: 'vocab', minutes: Math.max(2, Math.round(m * 0.2)), title: '핵심 어휘 스프린트' },
    { type: 'pattern', minutes: Math.max(2, Math.round(m * 0.2)), title: '패턴 드릴' },
    { type: 'shadowing', minutes: Math.max(2, Math.round(m * 0.2)), title: '쉐도잉' },
    { type: 'realtalk', minutes: Math.max(3, Math.round(m * 0.25)), title: '실전 대화' },
    { type: 'wrapup', minutes: Math.max(1, Math.round(m * 0.05)), title: '마무리 정리' },
  ];
}

export interface StudyDayResult {
  date: string;                 // YYYY-MM-DD
  week: number;
  day: number;                  // 1-7 within week
  blocksCompleted: StudyBlockType[];
  spokenSentences: number;      // counted user utterances across blocks
  newWordsLearned: number;
  shadowingAccuracy?: number;   // 0-100 average for the day
  minutes: number;              // actual minutes spent
  isWeeklyTest?: boolean;
  weeklyTestScore?: number;     // 0-100
}

// ============================================
// Progress (stats.study)
// ============================================

export interface StudyStats {
  totalDaysCompleted: number;
  currentStreak: number;
  longestStreak: number;
  totalSpokenSentences: number;
  totalWordsLearned: number;
  patternsMastered: string[];   // pattern ids passed in drills/tests
  weeklyTestScores: { week: number; score: number; date: string }[];
  monthlyAssessments: { month: number; cefr: string; date: string; summary?: string }[];
  shadowingHistory: { date: string; accuracy: number }[];  // last 30 entries
  recentDays: StudyDayResult[]; // last 14 day results
  lastStudyDate?: string;
  /**
   * Set when a completed day crosses a program month boundary (end of weeks 4/8/12).
   * Signals the next session's realtalk block to run a CEFR reassessment. Cleared
   * once the assessment result is saved. Additive/optional — safe to omit.
   */
  pendingMonthlyAssessment?: number; // 1 | 2 | 3 (program month)
}

export const MAX_SHADOWING_HISTORY = 30;
export const MAX_RECENT_DAYS = 14;

// ============================================
// Content library types (src/data/*)
// ============================================

export interface GrammarPattern {
  id: string;                   // "p001"
  pattern: string;              // "I've been ~ing"
  meaningKo: string;            // "~해오고 있다 (과거부터 지금까지 계속)"
  level: 'A2' | 'B1' | 'B2';
  examples: string[];           // 2-3 natural example sentences
  drillPrompt: string;          // Korean instruction: what to say using this pattern
  category: 'tense' | 'modal' | 'connector' | 'expression' | 'question' | 'condition';
}

export interface CoreVocabItem {
  word: string;
  ko: string;                   // Korean meaning (concise)
  example: string;              // one natural conversational example
  tier: 1 | 2 | 3;              // frequency tier: 1 = most frequent
}

// ============================================
// API payloads
// ============================================

export interface GeneratePlanRequest {
  profile: StudyProfile;
  interests?: string[];         // from existing profile.interests
}

export interface GeneratePlanResponse {
  plan: StudyPlan;
}

export interface SaveDayResultRequest {
  result: StudyDayResult;
  /**
   * Optional monthly CEFR reassessment outcome, appended to stats.study.monthlyAssessments
   * and clears stats.study.pendingMonthlyAssessment. Additive — omit for normal days.
   */
  monthlyAssessment?: { month: number; cefr: string; date: string; summary?: string };
}

/** Map a CEFR grade string to the wizard's coarse self-level. Beginner covers A1/A2. */
export function cefrToSelfLevel(cefr: string | null | undefined): StudyProfile['selfLevel'] | null {
  if (!cefr) return null;
  const c = cefr.trim().toUpperCase();
  if (c.startsWith('PRE-A1') || c === 'A1' || c === 'A2') return 'beginner';
  if (c === 'B1') return 'intermediate';
  if (c === 'B2' || c === 'C1' || c === 'C2') return 'advanced';
  return null;
}

/** Compute today's (week, day) position from plan start date and completed days. */
export function currentPosition(plan: StudyPlan, completedCount: number): { week: number; day: number } {
  const daysPerWeek = plan.profile.studyDaysPerWeek;
  const week = Math.min(12, Math.floor(completedCount / daysPerWeek) + 1);
  const day = (completedCount % daysPerWeek) + 1;
  return { week, day };
}
