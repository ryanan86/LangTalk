/**
 * Optimized Google Sheets Data Types
 * JSON-based structure for efficient storage and retrieval
 */

// ============================================
// Sheet 1: Users - Core user data (1 row per user)
// ============================================

export interface SubscriptionData {
  status: 'active' | 'pending' | 'expired' | 'inactive';
  expiryDate: string;
  signupDate: string;
  name: string;
  plan?: 'free' | 'beta' | 'premium';
}

export interface ProfileData {
  // Basic info
  type: 'student_elementary' | 'student_middle' | 'student_high' | 'university' | 'adult_beginner' | 'adult_intermediate' | 'adult_advanced' | 'business';
  age?: number;
  grade?: string; // "초1", "중2", "고3", etc.

  // Personalization
  interests: string[]; // ["게임", "유튜브", "축구", "음악"]
  customContext?: string; // Free-form description
  preferredTopics?: string[]; // AI-generated preferred topics

  // Settings
  nativeLanguage: 'ko' | 'en' | 'other';
  preferredTutors?: string[]; // ["emma", "oliver"]
  difficultyPreference?: 'easy' | 'medium' | 'hard' | 'adaptive';

  // Push Notifications
  fcmToken?: string;
  webPushSubscription?: string; // JSON-stringified PushSubscription

  // Scheduled call settings
  schedule?: {
    enabled: boolean;
    times: string[];   // ["09:00", "19:00"] in user's local timezone
    days: number[];    // [1,2,3,4,5] (0=Sun, 6=Sat)
    preferredTutor?: string; // "emma" | "random"
    timezone?: string; // IANA timezone e.g. "Asia/Seoul", "Asia/Jakarta"
  };
}

export interface StatsData {
  // Session stats
  sessionCount: number;
  totalMinutes: number;
  lastSessionAt?: string;

  // Level assessment
  currentLevel?: string; // "Intermediate", "5-6", etc.
  levelDetails?: {
    grammar: number;
    vocabulary: number;
    fluency: number;
    comprehension: number;
  };

  // Debate stats
  debateCount: number;
  debateWins?: number;

  // Streak
  currentStreak: number;
  longestStreak: number;
  lastActiveDate?: string;

  // Gamification
  xp: number;                    // Cumulative XP
  level: number;                 // Level 1-50
  achievements: string[];        // Achievement ID array
  tutorsUsed: string[];          // Tutors the user has practiced with
  perfectSessions: number;       // Sessions with 0 corrections
  dailyChallengeStreak: number;
  dailyChallengeLastDate?: string;
  weeklyXp: number[];            // Last 7 days XP [Sun..Sat]
}

export interface UserRow {
  email: string;
  subscription: SubscriptionData;
  profile: ProfileData;
  stats: StatsData;
  updatedAt: string;
}

// ============================================
// Sheet 2: LearningData - Learning history (1 row per user)
// ============================================

export interface SessionSummary {
  id: string;
  date: string;
  type: 'tutoring' | 'debate';
  tutor?: string;
  duration: number; // minutes
  topics: string[]; // Topics discussed
  level?: string;
  score?: number;
  feedbackSummary?: string;
  keyCorrections?: string;
  language?: string; // 'en' | 'ko' etc. - language at time of session
}

export interface CorrectionItem {
  id: string;
  original: string;
  corrected: string;
  explanation: string;
  category: 'grammar' | 'vocabulary' | 'sentence-structure' | 'pronunciation' | 'other';

  // SM-2 algorithm data
  nextReviewAt: string;
  interval: number; // days
  easeFactor: number;
  repetitions: number;
  lastReviewedAt?: string;

  // Metadata
  createdAt: string;
  fromSession?: string; // session id
  status: 'active' | 'mastered' | 'archived';
}

export interface TopicHistory {
  topic: string;
  category?: string;
  count: number; // times discussed
  lastDiscussed: string;
  sentiment?: 'positive' | 'neutral' | 'negative'; // User's engagement
}

export interface DebateHistoryItem {
  id: string;
  date: string;
  topicId: string;
  topicTitle: string;
  category: string;
  userTeam: 'pro' | 'con';
  result: 'win' | 'lose' | 'draw';
  score?: number;
  feedback?: string;
}

export interface VocabBookItem {
  id: string;
  term: string;
  sourceSentence?: string;
  sourceSessionId?: string;
  sourceDate: string; // YYYY-MM-DD
  difficulty: 1 | 2 | 3 | 4 | 5;
  proficiency: number; // 0-100
  nextReviewAt: string; // YYYY-MM-DD
  reviewCount: number;
  status: 'active' | 'mastered' | 'archived';
}

export interface LearningDataRow {
  email: string;
  // Keep last 20 sessions (older ones summarized in stats)
  recentSessions: SessionSummary[];
  // Keep active corrections (max 100, archive mastered)
  corrections: CorrectionItem[];
  // Topics for personalization
  topicsHistory: TopicHistory[];
  // Debate history
  debateHistory: DebateHistoryItem[];
  // Vocabulary notebook generated from sessions
  vocabBook: VocabBookItem[];
  updatedAt: string;
}

// ============================================
// Sheet 3: DebateTopics - Dynamic topics
// ============================================

export type AgeGroup = 'elementary_low' | 'elementary_high' | 'middle' | 'high' | 'university' | 'adult';
export type DebateCategory = 'daily' | 'school' | 'technology' | 'society' | 'environment' | 'culture' | 'sports' | 'ethics';

export interface DebateTopicData {
  title: {
    ko: string;
    en: string;
  };
  description: {
    ko: string;
    en: string;
  };
  // Suggested arguments for AI to use
  proArguments?: string[];
  conArguments?: string[];
  // Related vocabulary for learning
  keyVocabulary?: string[];
  // Difficulty 1-5
  difficulty: number;
}

export interface DebateTopicRow {
  topicId: string;
  ageGroups: AgeGroup[]; // Which age groups this topic is suitable for
  category: DebateCategory;
  topicData: DebateTopicData;
  trendScore: number; // Higher = more trending/relevant
  isActive: boolean;
  createdAt: string;
  // For personalized topics generated from conversations
  generatedFrom?: string; // user email if personalized
}

// ============================================
// Helper types for API responses
// ============================================

export interface UserDataResponse {
  user: UserRow | null;
  learningData: LearningDataRow | null;
  error?: string;
}

export interface DebateTopicsResponse {
  topics: DebateTopicRow[];
  personalized: DebateTopicRow[]; // Topics generated from user's conversations
  trending: DebateTopicRow[]; // Current trending topics
}

// ============================================
// Constants
// ============================================

export const MAX_RECENT_SESSIONS = 20;
export const MAX_ACTIVE_CORRECTIONS = 100;
export const MAX_TOPICS_HISTORY = 50;
export const MAX_DEBATE_HISTORY = 30;

// Age group mapping for Korean grades
export const GRADE_TO_AGE_GROUP: Record<string, AgeGroup> = {
  '초1': 'elementary_low',
  '초2': 'elementary_low',
  '초3': 'elementary_low',
  '초4': 'elementary_high',
  '초5': 'elementary_high',
  '초6': 'elementary_high',
  '중1': 'middle',
  '중2': 'middle',
  '중3': 'middle',
  '고1': 'high',
  '고2': 'high',
  '고3': 'high',
  '대학생': 'university',
  '성인': 'adult',
};

// Category labels
export const CATEGORY_LABELS: Record<DebateCategory, { ko: string; en: string }> = {
  daily: { ko: '일상', en: 'Daily Life' },
  school: { ko: '학교', en: 'School' },
  technology: { ko: '기술', en: 'Technology' },
  society: { ko: '사회', en: 'Society' },
  environment: { ko: '환경', en: 'Environment' },
  culture: { ko: '문화', en: 'Culture' },
  sports: { ko: '스포츠', en: 'Sports' },
  ethics: { ko: '윤리', en: 'Ethics' },
};
