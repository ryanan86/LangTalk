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
  | 'new_topic';

export interface DailyChallenge {
  id: string;
  dayOfWeek: number; // 0 = Sunday, 6 = Saturday
  title: { ko: string; en: string };
  description: { ko: string; en: string };
  xpReward: number;
  type: ChallengeType;
}

// ---------------------
// 7 Daily Challenges (one per day of week)
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
  },
];

// ---------------------
// Functions
// ---------------------

/**
 * Get today's challenge based on the day of the week.
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
