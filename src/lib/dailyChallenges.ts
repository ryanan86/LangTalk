// ============================================================
// TapTalk Daily Challenge System
// ============================================================

export type ChallengeType =
  | 'speaking_duration'
  | 'new_words'
  | 'specific_tutor'
  | 'debate'
  | 'review'
  | 'no_pause'
  | 'new_topic'
  | 'vocabulary_use'
  | 'shadowing_complete'
  | 'correction_streak'
  | 'long_session'
  | 'multi_session';

export interface DailyChallenge {
  id: string;
  dayOfWeek: number; // 0 = Sunday, 6 = Saturday
  title: { ko: string; en: string };
  description: { ko: string; en: string };
  xpReward: number;
  type: ChallengeType;
  difficulty?: 'easy' | 'normal' | 'hard';
}

export interface DailyQuestSet {
  date: string; // YYYY-MM-DD
  quests: DailyChallenge[];
  totalXP: number;
}

// ---------------------
// 7 Daily Challenges (one per day of week) — kept for backward compat
// ---------------------

const DAILY_CHALLENGES: DailyChallenge[] = [
  {
    id: 'challenge_sunday',
    dayOfWeek: 0,
    title: { ko: '2분간 말하기', en: 'Speak for 2 Minutes' },
    description: {
      ko: '프리토크에서 2분 이상 연속으로 말해보세요',
      en: 'Speak continuously for 2 minutes during free talk',
    },
    xpReward: 40,
    type: 'speaking_duration',
    difficulty: 'normal',
  },
  {
    id: 'challenge_monday',
    dayOfWeek: 1,
    title: { ko: '새로운 단어 3개 사용', en: 'Use 3 New Words' },
    description: {
      ko: '세션 중 이전에 사용하지 않은 단어 3개를 사용하세요',
      en: 'Use 3 words you haven\'t used before in a session',
    },
    xpReward: 40,
    type: 'new_words',
    difficulty: 'normal',
  },
  {
    id: 'challenge_tuesday',
    dayOfWeek: 2,
    title: { ko: '영국식 튜터와 연습', en: 'Practice with a British Tutor' },
    description: {
      ko: 'Charlotte 또는 Oliver와 세션을 완료하세요',
      en: 'Complete a session with Charlotte or Oliver',
    },
    xpReward: 40,
    type: 'specific_tutor',
    difficulty: 'normal',
  },
  {
    id: 'challenge_wednesday',
    dayOfWeek: 3,
    title: { ko: '디베이트 한 판', en: 'Complete a Debate Round' },
    description: {
      ko: '디베이트 모드에서 토론을 완료하세요',
      en: 'Finish a full debate in debate mode',
    },
    xpReward: 40,
    type: 'debate',
    difficulty: 'normal',
  },
  {
    id: 'challenge_thursday',
    dayOfWeek: 4,
    title: { ko: '교정 10개 복습', en: 'Review 10 Corrections' },
    description: {
      ko: '복습 페이지에서 교정 10개를 복습하세요',
      en: 'Review 10 corrections on the review page',
    },
    xpReward: 40,
    type: 'review',
    difficulty: 'normal',
  },
  {
    id: 'challenge_friday',
    dayOfWeek: 5,
    title: { ko: '멈춤 없이 녹음', en: 'Record Without Pausing' },
    description: {
      ko: '프리토크에서 멈춤 없이 30초 이상 말해보세요',
      en: 'Speak for 30+ seconds without pausing during free talk',
    },
    xpReward: 40,
    type: 'no_pause',
    difficulty: 'normal',
  },
  {
    id: 'challenge_saturday',
    dayOfWeek: 6,
    title: { ko: '새로운 주제 도전', en: 'Try a New Topic' },
    description: {
      ko: '이전에 다루지 않은 새로운 주제로 대화하세요',
      en: 'Start a conversation about a topic you haven\'t tried before',
    },
    xpReward: 40,
    type: 'new_topic',
    difficulty: 'normal',
  },
];

// ---------------------
// Quest pool: 12 challenges categorized by difficulty
// easy (4): 20XP, normal (4): 40XP, hard (4): 80XP
// ---------------------

const QUEST_POOL: DailyChallenge[] = [
  // --- Easy (20 XP each) ---
  {
    id: 'quest_review',
    dayOfWeek: -1,
    title: { ko: '교정 복습하기', en: 'Review Corrections' },
    description: {
      ko: '복습 페이지에서 교정 5개를 복습하세요',
      en: 'Review 5 corrections on the review page',
    },
    xpReward: 20,
    type: 'review',
    difficulty: 'easy',
  },
  {
    id: 'quest_specific_tutor',
    dayOfWeek: -1,
    title: { ko: '좋아하는 튜터와 대화', en: 'Chat with a Tutor' },
    description: {
      ko: '어떤 튜터와든 세션을 시작하세요',
      en: 'Start a session with any tutor',
    },
    xpReward: 20,
    type: 'specific_tutor',
    difficulty: 'easy',
  },
  {
    id: 'quest_new_topic',
    dayOfWeek: -1,
    title: { ko: '새 주제로 대화', en: 'Try a New Topic' },
    description: {
      ko: '새로운 주제로 대화를 시작하세요',
      en: 'Start a conversation on a new topic',
    },
    xpReward: 20,
    type: 'new_topic',
    difficulty: 'easy',
  },
  {
    id: 'quest_vocabulary_use',
    dayOfWeek: -1,
    title: { ko: '단어장 단어 사용', en: 'Use Vocab Book Words' },
    description: {
      ko: '단어장에서 저장한 단어 3개를 세션에서 사용하세요',
      en: 'Use 3 words from your vocabulary book in a session',
    },
    xpReward: 20,
    type: 'vocabulary_use',
    difficulty: 'easy',
  },

  // --- Normal (40 XP each) ---
  {
    id: 'quest_speaking_duration',
    dayOfWeek: -1,
    title: { ko: '2분간 말하기', en: 'Speak for 2 Minutes' },
    description: {
      ko: '프리토크에서 2분 이상 연속으로 말해보세요',
      en: 'Speak continuously for 2 minutes during free talk',
    },
    xpReward: 40,
    type: 'speaking_duration',
    difficulty: 'normal',
  },
  {
    id: 'quest_new_words',
    dayOfWeek: -1,
    title: { ko: '새로운 단어 3개 사용', en: 'Use 3 New Words' },
    description: {
      ko: '세션 중 이전에 사용하지 않은 단어 3개를 사용하세요',
      en: 'Use 3 words you haven\'t used before in a session',
    },
    xpReward: 40,
    type: 'new_words',
    difficulty: 'normal',
  },
  {
    id: 'quest_shadowing_complete',
    dayOfWeek: -1,
    title: { ko: '셰도잉 연습 완료', en: 'Complete Shadowing Practice' },
    description: {
      ko: '셰도잉 연습을 한 번 완료하세요',
      en: 'Complete one shadowing practice session',
    },
    xpReward: 40,
    type: 'shadowing_complete',
    difficulty: 'normal',
  },
  {
    id: 'quest_correction_streak',
    dayOfWeek: -1,
    title: { ko: '연속 3개 정답', en: '3-Correction Streak' },
    description: {
      ko: '복습에서 연속 3개 교정을 맞히세요',
      en: 'Get 3 corrections correct in a row during review',
    },
    xpReward: 40,
    type: 'correction_streak',
    difficulty: 'normal',
  },

  // --- Hard (80 XP each) ---
  {
    id: 'quest_debate',
    dayOfWeek: -1,
    title: { ko: '디베이트 완주', en: 'Complete a Full Debate' },
    description: {
      ko: '디베이트 모드에서 토론을 끝까지 완료하세요',
      en: 'Finish a full debate in debate mode',
    },
    xpReward: 80,
    type: 'debate',
    difficulty: 'hard',
  },
  {
    id: 'quest_no_pause',
    dayOfWeek: -1,
    title: { ko: '30초 무멈춤 도전', en: '30s No-Pause Challenge' },
    description: {
      ko: '30초 이상 멈춤 없이 말하세요',
      en: 'Speak for 30+ seconds without pausing',
    },
    xpReward: 80,
    type: 'no_pause',
    difficulty: 'hard',
  },
  {
    id: 'quest_long_session',
    dayOfWeek: -1,
    title: { ko: '5분 이상 대화', en: '5-Minute Conversation' },
    description: {
      ko: '5분 이상 대화 세션을 완료하세요',
      en: 'Complete a conversation session of 5+ minutes',
    },
    xpReward: 80,
    type: 'long_session',
    difficulty: 'hard',
  },
  {
    id: 'quest_multi_session',
    dayOfWeek: -1,
    title: { ko: '하루 2세션 완료', en: 'Complete 2 Sessions Today' },
    description: {
      ko: '오늘 2개 이상의 세션을 완료하세요',
      en: 'Complete 2 or more sessions today',
    },
    xpReward: 80,
    type: 'multi_session',
    difficulty: 'hard',
  },
];

// ---------------------
// Functions
// ---------------------

/**
 * Date-based seeded pseudo-random number generator.
 * Same date always produces the same sequence.
 */
function dateSeededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

/**
 * Get today's 3 quests: 1 easy (20XP), 1 normal (40XP), 1 hard (80XP) = 140XP total.
 * Same date always returns the same quests.
 */
export function getTodayQuests(): DailyQuestSet {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10); // YYYY-MM-DD
  // Numeric seed from date: YYYYMMDD
  const seed = parseInt(dateStr.replace(/-/g, ''), 10);
  const rand = dateSeededRandom(seed);

  const easyPool = QUEST_POOL.filter(q => q.difficulty === 'easy');
  const normalPool = QUEST_POOL.filter(q => q.difficulty === 'normal');
  const hardPool = QUEST_POOL.filter(q => q.difficulty === 'hard');

  const easyQuest = easyPool[Math.floor(rand() * easyPool.length)];
  const normalQuest = normalPool[Math.floor(rand() * normalPool.length)];
  const hardQuest = hardPool[Math.floor(rand() * hardPool.length)];

  const quests = [easyQuest, normalQuest, hardQuest];
  const totalXP = quests.reduce((sum, q) => sum + q.xpReward, 0);

  return { date: dateStr, quests, totalXP };
}

/**
 * Get today's challenge based on the day of the week.
 * @deprecated Use getTodayQuests() for the new 3-quest system.
 */
export function getTodayChallenge(): DailyChallenge {
  const today = new Date().getDay(); // 0 = Sunday
  return DAILY_CHALLENGES[today];
}

/**
 * Get a challenge by its day of week (0-6).
 */
export function getChallengeByDay(dayOfWeek: number): DailyChallenge {
  return DAILY_CHALLENGES[dayOfWeek];
}

/**
 * Check if a specific challenge is complete based on event data.
 * This is a simplified check -- real implementation would check
 * session data, review counts, etc.
 */
export function isChallengeComplete(
  challenge: DailyChallenge,
  context: {
    speakingDurationSeconds?: number;
    newWordsUsed?: number;
    tutorId?: string;
    debateCompleted?: boolean;
    reviewsCompleted?: number;
    longestStreakSeconds?: number;
    isNewTopic?: boolean;
  }
): boolean {
  switch (challenge.type) {
    case 'speaking_duration':
      return (context.speakingDurationSeconds ?? 0) >= 120;
    case 'new_words':
      return (context.newWordsUsed ?? 0) >= 3;
    case 'specific_tutor':
      return context.tutorId === 'charlotte' || context.tutorId === 'oliver';
    case 'debate':
      return context.debateCompleted === true;
    case 'review':
      return (context.reviewsCompleted ?? 0) >= 10;
    case 'no_pause':
      return (context.longestStreakSeconds ?? 0) >= 30;
    case 'new_topic':
      return context.isNewTopic === true;
    default:
      return false;
  }
}

/**
 * Get all challenges (for display purposes).
 */
export function getAllChallenges(): DailyChallenge[] {
  return DAILY_CHALLENGES;
}
