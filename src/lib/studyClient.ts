/**
 * Study Mode — frontend client helpers.
 *
 * Pure/deterministic helpers shared by the setup wizard, dashboard, and session
 * player. Keeps all study-specific business logic out of the React components so
 * it can be reasoned about (and unit-tested) in isolation.
 *
 * NOTE (contract assumption): there is no dedicated GET endpoint spec'd for
 * reading an existing plan + stats, but the dashboard needs both. We assume the
 * backend exposes `GET /api/study/plan` → { plan: StudyPlan | null, stats: StudyStats | null }
 * as the natural REST complement to the POST on the same route. If the backend
 * chooses a different shape, only `fetchStudyState()` below needs to change.
 */

import type {
  StudyGoal,
  StudyPlan,
  StudyStats,
  StudyProfile,
  StudyBlockType,
  CoreVocabItem,
  GrammarPattern,
  StudyDayResult,
} from '@/lib/studyTypes';
import { currentPosition } from '@/lib/studyTypes';

// ============================================
// Goal metadata (Korean UI)
// ============================================

export interface GoalMeta {
  goal: StudyGoal;
  title: string;
  description: string;
  detailPlaceholder: string;
}

export const STUDY_GOALS: GoalMeta[] = [
  {
    goal: 'travel',
    title: '여행 영어',
    description: '공항, 호텔, 식당에서 막힘없이',
    detailPlaceholder: '예: 다음 달 유럽 배낭여행 준비',
  },
  {
    goal: 'business',
    title: '비즈니스 영어',
    description: '미팅, 이메일, 협상에서 자신감 있게',
    detailPlaceholder: '예: 해외 바이어 화상 미팅',
  },
  {
    goal: 'relocation',
    title: '이주 · 정착',
    description: '해외 생활에 필요한 실전 회화',
    detailPlaceholder: '예: 발리 이주 준비, 국제학교 상담',
  },
  {
    goal: 'exam',
    title: '시험 · 자격',
    description: '스피킹 시험과 인터뷰 대비',
    detailPlaceholder: '예: OPIc IH 목표, 화상 면접',
  },
  {
    goal: 'daily-conversation',
    title: '일상 회화',
    description: '자연스러운 데일리 스몰토크',
    detailPlaceholder: '예: 외국인 친구와 편하게 대화',
  },
];

export function goalTitle(goal: StudyGoal): string {
  return STUDY_GOALS.find((g) => g.goal === goal)?.title ?? '스터디';
}

export const LEVEL_META: { value: StudyProfile['selfLevel']; title: string; description: string }[] = [
  { value: 'beginner', title: '초급', description: '간단한 문장 위주, 자주 막혀요' },
  { value: 'intermediate', title: '중급', description: '어느 정도 대화는 되지만 부정확해요' },
  { value: 'advanced', title: '고급', description: '유창하지만 더 정교해지고 싶어요' },
];

export const DAILY_MINUTES_OPTIONS: { value: 15 | 30 | 60 | 90; title: string; description: string }[] = [
  { value: 15, title: '15분', description: '가볍게 매일 습관 만들기' },
  { value: 30, title: '30분', description: '균형 잡힌 표준 코스' },
  { value: 60, title: '60분', description: '집중 몰입 학습' },
  { value: 90, title: '90분', description: '최대 몰입, 빠른 성장' },
];

// ============================================
// Plan-generation progress messages (~10s)
// ============================================

export const PLAN_GENERATION_MESSAGES: string[] = [
  '목표를 분석하고 있어요...',
  '12주 커리큘럼을 설계하는 중이에요...',
  '주차별 테마를 배치하고 있어요...',
  '핵심 패턴과 어휘를 매칭하는 중이에요...',
  '몰입 미션을 구성하고 있어요...',
  '나만의 학습 플랜을 마무리하는 중이에요...',
];

// ============================================
// Date helpers (local YYYY-MM-DD)
// ============================================

export function localDateString(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function isToday(dateStr: string): boolean {
  return dateStr === localDateString();
}

// ============================================
// Block labels & metadata
// ============================================

export const BLOCK_LABELS: Record<StudyBlockType, string> = {
  warmup: '워밍업 대화',
  vocab: '핵심 어휘 스프린트',
  pattern: '패턴 드릴',
  shadowing: '쉐도잉',
  realtalk: '실전 대화',
  wrapup: '마무리 정리',
};

/** Blocks that run a voice conversation via /api/chat mode:'study'. */
export const CONVERSATION_BLOCKS: StudyBlockType[] = ['warmup', 'realtalk', 'wrapup'];

// ============================================
// Deterministic daily content selection
// ============================================

/**
 * Pick today's core-vocab words deterministically.
 * - filter CORE_VOCAB by this week's vocabTier
 * - slice by day index so each day advances through the tier
 * - N = block minutes, clamped to [4, 10]
 * - mix in 2-3 review words drawn from earlier days of the same tier
 */
export function selectDailyVocab(
  vocab: CoreVocabItem[],
  vocabTier: 1 | 2 | 3,
  dayIndexAbsolute: number, // 0-based across the whole program (week*daysPerWeek + day-1)
  blockMinutes: number
): { newWords: CoreVocabItem[]; reviewWords: CoreVocabItem[] } {
  const pool = vocab.filter((v) => v.tier === vocabTier);
  if (pool.length === 0) return { newWords: [], reviewWords: [] };

  const n = Math.max(4, Math.min(10, blockMinutes));
  const start = (dayIndexAbsolute * n) % pool.length;

  const newWords: CoreVocabItem[] = [];
  for (let i = 0; i < n; i++) {
    newWords.push(pool[(start + i) % pool.length]);
  }

  // Review words: pull from earlier in the pool (words already introduced).
  const reviewWords: CoreVocabItem[] = [];
  if (start > 0) {
    const reviewCount = Math.min(3, start);
    for (let i = 1; i <= reviewCount; i++) {
      const idx = (start - i + pool.length) % pool.length;
      reviewWords.push(pool[idx]);
    }
  }

  return { newWords, reviewWords };
}

/**
 * Pick today's grammar pattern(s) — 1-2 patterns per day, advancing by day index.
 */
export function selectDailyPatterns(
  patterns: GrammarPattern[],
  weekPatternIds: string[],
  dayWithinWeek: number, // 1-based
  daysPerWeek: number
): GrammarPattern[] {
  const weekPatterns = weekPatternIds
    .map((id) => patterns.find((p) => p.id === id))
    .filter((p): p is GrammarPattern => Boolean(p));

  if (weekPatterns.length === 0) return [];

  // Distribute the week's patterns across its days. 1-2 per day.
  const perDay = Math.max(1, Math.ceil(weekPatterns.length / Math.max(1, daysPerWeek)));
  const startIdx = ((dayWithinWeek - 1) * perDay) % weekPatterns.length;

  const picked: GrammarPattern[] = [];
  const count = Math.min(2, perDay);
  for (let i = 0; i < count; i++) {
    picked.push(weekPatterns[(startIdx + i) % weekPatterns.length]);
  }
  // De-dupe in case wrap-around repeats.
  return picked.filter((p, i, arr) => arr.findIndex((x) => x.id === p.id) === i);
}

/**
 * Build the shadowing sentence set for the day (3-5 sentences) from today's
 * pattern examples + vocab examples.
 */
export function buildShadowingSentences(
  patterns: GrammarPattern[],
  vocab: CoreVocabItem[]
): string[] {
  const fromPatterns = patterns.flatMap((p) => p.examples);
  const fromVocab = vocab.map((v) => v.example);
  const combined: string[] = [];
  const seen = new Set<string>();
  // Interleave pattern then vocab examples for variety.
  const max = Math.max(fromPatterns.length, fromVocab.length);
  for (let i = 0; i < max; i++) {
    if (fromPatterns[i] && !seen.has(fromPatterns[i])) {
      seen.add(fromPatterns[i]);
      combined.push(fromPatterns[i]);
    }
    if (fromVocab[i] && !seen.has(fromVocab[i])) {
      seen.add(fromVocab[i]);
      combined.push(fromVocab[i]);
    }
  }
  return combined.slice(0, Math.max(3, Math.min(5, combined.length)));
}

// ============================================
// Weekly test scoring (simple heuristic)
// ============================================

/** Clamp helper. */
function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

/**
 * Weekly speaking-test score heuristic. Base on how much the learner spoke
 * plus their shadowing accuracy for the day. Deliberately simple.
 */
export function weeklyTestScore(spokenSentences: number, shadowingAccuracy: number | undefined): number {
  const speakingComponent = clamp(spokenSentences * 8, 0, 60); // up to 60 pts for ~8 utterances
  const accuracyComponent = ((shadowingAccuracy ?? 60) / 100) * 40; // up to 40 pts
  return Math.round(clamp(speakingComponent + accuracyComponent, 0, 100));
}

// ============================================
// XP calculation for a completed day
// ============================================

export function dayXP(result: StudyDayResult): number {
  let xp = 40; // base for completing a day
  xp += result.spokenSentences * 3;
  xp += result.newWordsLearned * 2;
  if (result.shadowingAccuracy) xp += Math.round(result.shadowingAccuracy / 4);
  if (result.isWeeklyTest && result.weeklyTestScore) xp += Math.round(result.weeklyTestScore / 2);
  return xp;
}

// ============================================
// Simple STT word-match check (vocab block)
// ============================================

/** Returns true if the target word (or its stem) appears in the transcript. */
export function transcriptContainsWord(transcript: string, word: string): boolean {
  const normalizedTranscript = ` ${transcript.toLowerCase().replace(/[^a-z0-9\s]/g, ' ')} `;
  const w = word.toLowerCase().trim();
  if (!w) return false;
  // exact token
  if (normalizedTranscript.includes(` ${w} `)) return true;
  // stem match (drop trailing s/ed/ing) for basic inflection tolerance
  const stem = w.replace(/(ing|ed|s)$/, '');
  if (stem.length >= 3 && normalizedTranscript.includes(` ${stem}`)) return true;
  return false;
}

// ============================================
// Study state fetching
// ============================================

export interface StudyState {
  plan: StudyPlan | null;
  stats: StudyStats | null;
}

/** Read the persisted plan + stats. See contract assumption in the file header. */
export async function fetchStudyState(signal?: AbortSignal): Promise<StudyState> {
  const res = await fetch('/api/study/plan', { signal });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return {
    plan: (data.plan as StudyPlan) ?? null,
    stats: (data.stats as StudyStats) ?? null,
  };
}

/** Whether today's session is already completed. */
export function isTodayCompleted(stats: StudyStats | null): boolean {
  if (!stats?.recentDays?.length) return false;
  return stats.recentDays.some((d) => isToday(d.date));
}

/** Convenience: today's (week, day) position given plan + stats. */
export function positionFromState(plan: StudyPlan, stats: StudyStats | null): { week: number; day: number } {
  return currentPosition(plan, stats?.totalDaysCompleted ?? 0);
}
