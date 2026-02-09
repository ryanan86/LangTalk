// ============================================================
// TapTalk Gamification System - Core XP/Level/Achievement Logic
// ============================================================

// ---------------------
// Types
// ---------------------

export type XPEventType =
  | 'session_complete'
  | 'first_session'
  | 'no_corrections'
  | 'streak_bonus'
  | 'review_complete'
  | 'debate_complete'
  | 'daily_challenge';

export interface XPEvent {
  type: XPEventType;
  xp: number;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export interface Achievement {
  id: string;
  name: { ko: string; en: string };
  description: { ko: string; en: string };
  icon: string; // SVG path data (d attribute)
  condition: {
    type: 'streak' | 'sessions' | 'debate' | 'perfect' | 'reviews' | 'tutors' | 'level';
    value: number;
  };
}

export interface GamificationState {
  totalXP: number;
  level: number;
  xpForNextLevel: number;
  currentLevelXP: number;
  streakDays: number;
  sessionsCompleted: number;
  reviewsCompleted: number;
  debatesCompleted: number;
  perfectSessions: number;
  tutorsUsed: string[];
  unlockedAchievements: string[];
  xpHistory: XPEvent[];
}

// ---------------------
// XP Table
// ---------------------

const XP_TABLE: Record<XPEventType, number> = {
  session_complete: 50,
  first_session: 100,
  no_corrections: 30,
  streak_bonus: 10, // multiplied by dayCount
  review_complete: 20,
  debate_complete: 75,
  daily_challenge: 40,
};

// ---------------------
// Achievements (12 total)
// ---------------------

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first_lesson',
    name: { ko: '첫 수업', en: 'First Lesson' },
    description: { ko: '첫 번째 세션을 완료하세요', en: 'Complete your first session' },
    icon: 'M12 14l9-5-9-5-9 5 9 5z M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z',
    condition: { type: 'sessions', value: 1 },
  },
  {
    id: 'streak_7',
    name: { ko: '일주일 연속', en: '7-Day Streak' },
    description: { ko: '7일 연속 학습하세요', en: 'Practice for 7 days in a row' },
    icon: 'M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z',
    condition: { type: 'streak', value: 7 },
  },
  {
    id: 'streak_30',
    name: { ko: '한 달 연속', en: '30-Day Streak' },
    description: { ko: '30일 연속 학습하세요', en: 'Practice for 30 days in a row' },
    icon: 'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5',
    condition: { type: 'streak', value: 30 },
  },
  {
    id: 'sessions_10',
    name: { ko: '10회 달성', en: '10 Sessions' },
    description: { ko: '세션 10회를 완료하세요', en: 'Complete 10 sessions' },
    icon: 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z',
    condition: { type: 'sessions', value: 10 },
  },
  {
    id: 'sessions_50',
    name: { ko: '50회 달성', en: '50 Sessions' },
    description: { ko: '세션 50회를 완료하세요', en: 'Complete 50 sessions' },
    icon: 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z',
    condition: { type: 'sessions', value: 50 },
  },
  {
    id: 'sessions_100',
    name: { ko: '100회 달성', en: '100 Sessions' },
    description: { ko: '세션 100회를 완료하세요', en: 'Complete 100 sessions' },
    icon: 'M5 3h14l-1.5 6H6.5L5 3zM7 13h10v2a5 5 0 01-10 0v-2zM9 21h6M12 17v4',
    condition: { type: 'sessions', value: 100 },
  },
  {
    id: 'debate_first',
    name: { ko: '첫 토론', en: 'First Debate' },
    description: { ko: '첫 번째 디베이트를 완료하세요', en: 'Complete your first debate' },
    icon: 'M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z',
    condition: { type: 'debate', value: 1 },
  },
  {
    id: 'perfect_session',
    name: { ko: '완벽한 세션', en: 'Perfect Session' },
    description: { ko: '교정 없이 세션을 완료하세요', en: 'Complete a session with no corrections' },
    icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
    condition: { type: 'perfect', value: 1 },
  },
  {
    id: 'review_master',
    name: { ko: '복습의 달인', en: 'Review Master' },
    description: { ko: '복습 50회를 완료하세요', en: 'Complete 50 reviews' },
    icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253',
    condition: { type: 'reviews', value: 50 },
  },
  {
    id: 'all_tutors',
    name: { ko: '모든 튜터 경험', en: 'Met All Tutors' },
    description: { ko: '6명의 튜터 모두와 대화하세요', en: 'Practice with all 6 tutors' },
    icon: 'M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    condition: { type: 'tutors', value: 6 },
  },
  {
    id: 'level_10',
    name: { ko: '레벨 10 달성', en: 'Level 10' },
    description: { ko: '레벨 10에 도달하세요', en: 'Reach level 10' },
    icon: 'M13 10V3L4 14h7v7l9-11h-7z',
    condition: { type: 'level', value: 10 },
  },
  {
    id: 'level_25',
    name: { ko: '레벨 25 달성', en: 'Level 25' },
    description: { ko: '레벨 25에 도달하세요', en: 'Reach level 25' },
    icon: 'M5 3l3.5 7L12 6l3.5 4L19 3v13H5V3z',
    condition: { type: 'level', value: 25 },
  },
];

// ---------------------
// Level Calculation
// ---------------------

const MAX_LEVEL = 50;

/**
 * Calculate level from total XP.
 * Formula: level = floor(sqrt(xp / 100)) + 1, max 50
 */
export function calculateLevel(xp: number): number {
  const level = Math.floor(Math.sqrt(xp / 100)) + 1;
  return Math.min(level, MAX_LEVEL);
}

/**
 * Calculate XP needed for a given level.
 * Formula: (level^2) * 100
 */
export function xpForLevel(level: number): number {
  return level * level * 100;
}

/**
 * Calculate XP needed to reach the next level from the current one.
 */
export function xpForNextLevel(currentLevel: number): number {
  if (currentLevel >= MAX_LEVEL) return 0;
  return xpForLevel(currentLevel);
}

/**
 * Calculate XP progress within the current level (how far toward next level).
 */
export function currentLevelProgress(totalXP: number): {
  currentLevelXP: number;
  xpNeeded: number;
  progress: number;
} {
  const level = calculateLevel(totalXP);
  if (level >= MAX_LEVEL) {
    return { currentLevelXP: totalXP, xpNeeded: 0, progress: 1 };
  }
  const previousLevelTotalXP = xpForLevel(level - 1);
  const nextLevelTotalXP = xpForLevel(level);
  const currentLevelXP = totalXP - previousLevelTotalXP;
  const xpNeeded = nextLevelTotalXP - previousLevelTotalXP;
  const progress = xpNeeded > 0 ? currentLevelXP / xpNeeded : 1;
  return { currentLevelXP, xpNeeded, progress: Math.min(progress, 1) };
}

// ---------------------
// XP Calculation
// ---------------------

/**
 * Calculate XP for a given event type.
 * For streak_bonus, pass streakDays in metadata.
 */
export function calculateXP(
  eventType: XPEventType,
  metadata?: { streakDays?: number }
): number {
  if (eventType === 'streak_bonus') {
    const days = metadata?.streakDays ?? 1;
    return days * XP_TABLE.streak_bonus;
  }
  return XP_TABLE[eventType];
}

/**
 * Get the streak bonus XP for the given number of consecutive days.
 */
export function getStreakBonus(dayCount: number): number {
  return dayCount * XP_TABLE.streak_bonus;
}

// ---------------------
// Level Up Check
// ---------------------

/**
 * Check if adding xpGained to totalXP triggers a level up.
 * Returns the new level if leveled up, or null otherwise.
 */
export function checkLevelUp(
  totalXP: number,
  xpGained: number
): { leveled: boolean; previousLevel: number; newLevel: number } {
  const previousLevel = calculateLevel(totalXP);
  const newLevel = calculateLevel(totalXP + xpGained);
  return {
    leveled: newLevel > previousLevel,
    previousLevel,
    newLevel,
  };
}

// ---------------------
// Achievement Checking
// ---------------------

/**
 * Check which new achievements have been unlocked given the current state.
 * Returns an array of newly unlocked Achievement objects.
 */
export function checkAchievements(state: GamificationState): Achievement[] {
  const newlyUnlocked: Achievement[] = [];

  for (const achievement of ACHIEVEMENTS) {
    // Skip already unlocked
    if (state.unlockedAchievements.includes(achievement.id)) continue;

    let unlocked = false;
    const { type, value } = achievement.condition;

    switch (type) {
      case 'streak':
        unlocked = state.streakDays >= value;
        break;
      case 'sessions':
        unlocked = state.sessionsCompleted >= value;
        break;
      case 'debate':
        unlocked = state.debatesCompleted >= value;
        break;
      case 'perfect':
        unlocked = state.perfectSessions >= value;
        break;
      case 'reviews':
        unlocked = state.reviewsCompleted >= value;
        break;
      case 'tutors':
        unlocked = state.tutorsUsed.length >= value;
        break;
      case 'level':
        unlocked = state.level >= value;
        break;
    }

    if (unlocked) {
      newlyUnlocked.push(achievement);
    }
  }

  return newlyUnlocked;
}

// ---------------------
// Default State Factory
// ---------------------

export function createDefaultGamificationState(): GamificationState {
  return {
    totalXP: 0,
    level: 1,
    xpForNextLevel: xpForLevel(1),
    currentLevelXP: 0,
    streakDays: 0,
    sessionsCompleted: 0,
    reviewsCompleted: 0,
    debatesCompleted: 0,
    perfectSessions: 0,
    tutorsUsed: [],
    unlockedAchievements: [],
    xpHistory: [],
  };
}
