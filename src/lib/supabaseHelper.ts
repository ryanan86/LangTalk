/**
 * Supabase Data Helper
 * Drop-in replacement for sheetHelper — same function signatures
 */

import { getSupabase } from './supabase';
import {
  UserRow,
  LearningDataRow,
  DebateTopicRow,
  SubscriptionData,
  ProfileData,
  StatsData,
  SessionSummary,
  CorrectionItem,
  AgeGroup,
  DebateCategory,
  MAX_RECENT_SESSIONS,
  MAX_ACTIVE_CORRECTIONS,
  MAX_TOPICS_HISTORY,
  MAX_DEBATE_HISTORY,
  GRADE_TO_AGE_GROUP,
} from './sheetTypes';

// ============================================
// Helpers
// ============================================

function getKoreaTime(): string {
  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(new Date());
}

function getDefaultSubscription(): SubscriptionData {
  return {
    status: 'pending',
    expiryDate: '',
    signupDate: getKoreaTime(),
    name: '',
    plan: 'free',
  };
}

function getDefaultProfile(): ProfileData {
  return {
    type: 'adult_beginner',
    interests: [],
    nativeLanguage: 'ko',
  };
}

function getDefaultStats(): StatsData {
  return {
    sessionCount: 0,
    totalMinutes: 0,
    debateCount: 0,
    currentStreak: 0,
    longestStreak: 0,
    xp: 0,
    level: 1,
    achievements: [],
    tutorsUsed: [],
    perfectSessions: 0,
    dailyChallengeStreak: 0,
    weeklyXp: [0, 0, 0, 0, 0, 0, 0],
  };
}

// ============================================
// User Data Operations
// ============================================

/**
 * Get user data by email (single query)
 */
export async function getUserData(email: string): Promise<UserRow | null> {
  const sb = getSupabase();

  try {
    const { data, error } = await sb
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase())
      .maybeSingle();

    if (error) {
      console.error('getUserData error:', error);
      return null;
    }
    if (!data) return null;

    return {
      email: data.email,
      subscription: data.subscription || getDefaultSubscription(),
      profile: data.profile || getDefaultProfile(),
      stats: data.stats || getDefaultStats(),
      updatedAt: data.updated_at || '',
    };
  } catch (error) {
    console.error('getUserData error:', error);
    return null;
  }
}

/**
 * Create or update user data
 */
export async function saveUserData(userData: UserRow): Promise<boolean> {
  const sb = getSupabase();

  try {
    const { error } = await sb
      .from('users')
      .upsert({
        email: userData.email.toLowerCase(),
        subscription: userData.subscription,
        profile: userData.profile,
        stats: userData.stats,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'email' });

    if (error) {
      console.error('saveUserData error:', error);
      return false;
    }
    return true;
  } catch (error) {
    console.error('saveUserData error:', error);
    return false;
  }
}

/**
 * Update specific fields in user data
 */
export async function updateUserFields(
  email: string,
  updates: {
    subscription?: Partial<SubscriptionData>;
    profile?: Partial<ProfileData>;
    stats?: Partial<StatsData>;
  }
): Promise<boolean> {
  const user = await getUserData(email);
  if (!user) {
    console.warn(`updateUserFields: user not found or error for ${email}, skipping update`);
    return false;
  }

  const filterUndefined = <T extends Record<string, unknown>>(obj?: Partial<T>): Partial<T> => {
    if (!obj) return {} as Partial<T>;
    return Object.fromEntries(
      Object.entries(obj).filter(([, v]) => v !== undefined)
    ) as Partial<T>;
  };

  const updatedUser: UserRow = {
    ...user,
    subscription: { ...user.subscription, ...filterUndefined(updates.subscription) },
    profile: { ...user.profile, ...filterUndefined(updates.profile) },
    stats: { ...user.stats, ...filterUndefined(updates.stats) },
    updatedAt: getKoreaTime(),
  };

  return saveUserData(updatedUser);
}

// ============================================
// Session Count Operations (merged from Subscriptions sheet)
// ============================================

/**
 * Get session count data (replaces direct Google Sheets API in session-count/route.ts)
 */
export async function getSessionCount(email: string): Promise<{
  sessionCount: number;
  evaluatedGrade: string | null;
  levelDetails: Record<string, number> | null;
} | null> {
  const sb = getSupabase();

  try {
    const { data, error } = await sb
      .from('users')
      .select('session_count, evaluated_grade, level_details')
      .eq('email', email.toLowerCase())
      .maybeSingle();

    if (error) {
      console.error('getSessionCount error:', error);
      return null;
    }
    if (!data) return null;

    return {
      sessionCount: data.session_count ?? 0,
      evaluatedGrade: data.evaluated_grade ?? null,
      levelDetails: data.level_details ?? null,
    };
  } catch (error) {
    console.error('getSessionCount error:', error);
    return null;
  }
}

/**
 * Increment session count and optionally update grade/level
 */
export async function incrementSessionCount(
  email: string,
  evaluatedGrade?: string | null,
  levelDetails?: Record<string, number> | null,
): Promise<{ newCount: number; evaluatedGrade: string | null } | null> {
  const sb = getSupabase();

  try {
    // Read current
    const { data: current, error: readErr } = await sb
      .from('users')
      .select('session_count, evaluated_grade')
      .eq('email', email.toLowerCase())
      .maybeSingle();

    if (readErr || !current) {
      console.error('incrementSessionCount read error:', readErr);
      return null;
    }

    const newCount = (current.session_count ?? 0) + 1;
    const gradeToStore = evaluatedGrade || current.evaluated_grade || null;

    const updatePayload: Record<string, unknown> = {
      session_count: newCount,
      evaluated_grade: gradeToStore,
    };
    if (levelDetails) {
      updatePayload.level_details = levelDetails;
    }

    const { error: updateErr } = await sb
      .from('users')
      .update(updatePayload)
      .eq('email', email.toLowerCase());

    if (updateErr) {
      console.error('incrementSessionCount update error:', updateErr);
      return null;
    }

    return { newCount, evaluatedGrade: gradeToStore };
  } catch (error) {
    console.error('incrementSessionCount error:', error);
    return null;
  }
}

// ============================================
// Learning Data Operations
// ============================================

/**
 * Get learning data by email
 */
export async function getLearningData(email: string): Promise<LearningDataRow | null> {
  const sb = getSupabase();

  try {
    const { data, error } = await sb
      .from('learning_data')
      .select('*')
      .eq('email', email.toLowerCase())
      .maybeSingle();

    if (error) {
      console.error('getLearningData error:', error);
      return null;
    }
    if (!data) return null;

    return {
      email: data.email,
      recentSessions: data.recent_sessions || [],
      corrections: data.corrections || [],
      topicsHistory: data.topics_history || [],
      debateHistory: data.debate_history || [],
      vocabBook: data.vocab_book || [],
      updatedAt: data.updated_at || '',
    };
  } catch (error) {
    console.error('getLearningData error:', error);
    return null;
  }
}

/**
 * Save learning data
 */
export async function saveLearningData(data: LearningDataRow): Promise<boolean> {
  const sb = getSupabase();

  try {
    // Trim arrays to max limits
    const trimmed = {
      email: data.email.toLowerCase(),
      recent_sessions: data.recentSessions.slice(0, MAX_RECENT_SESSIONS),
      corrections: data.corrections
        .filter(c => c.status === 'active')
        .slice(0, MAX_ACTIVE_CORRECTIONS),
      topics_history: data.topicsHistory.slice(0, MAX_TOPICS_HISTORY),
      debate_history: data.debateHistory.slice(0, MAX_DEBATE_HISTORY),
      vocab_book: (data.vocabBook || []).slice(0, 1000),
      updated_at: new Date().toISOString(),
    };

    const { error } = await sb
      .from('learning_data')
      .upsert(trimmed, { onConflict: 'email' });

    if (error) {
      console.error('saveLearningData error:', error);
      return false;
    }
    return true;
  } catch (error) {
    console.error('saveLearningData error:', error);
    return false;
  }
}

/**
 * Add a new session to learning data
 */
export async function addSession(email: string, session: SessionSummary): Promise<boolean> {
  let data = await getLearningData(email);
  if (!data) {
    data = {
      email,
      recentSessions: [],
      corrections: [],
      topicsHistory: [],
      debateHistory: [],
      vocabBook: [],
      updatedAt: getKoreaTime(),
    };
  }

  // Add new session at the beginning
  data.recentSessions.unshift(session);

  // Update topics history
  for (const topic of session.topics) {
    const existing = data.topicsHistory.find(t => t.topic.toLowerCase() === topic.toLowerCase());
    if (existing) {
      existing.count++;
      existing.lastDiscussed = session.date;
    } else {
      data.topicsHistory.push({
        topic,
        count: 1,
        lastDiscussed: session.date,
      });
    }
  }

  data.topicsHistory.sort((a, b) => b.count - a.count);

  return saveLearningData(data);
}

/**
 * Add corrections from a session
 */
export async function addCorrections(email: string, corrections: CorrectionItem[]): Promise<boolean> {
  let data = await getLearningData(email);
  if (!data) {
    data = {
      email,
      recentSessions: [],
      corrections: [],
      topicsHistory: [],
      debateHistory: [],
      vocabBook: [],
      updatedAt: getKoreaTime(),
    };
  }

  data.corrections.push(...corrections);
  data.corrections.sort((a, b) =>
    new Date(a.nextReviewAt).getTime() - new Date(b.nextReviewAt).getTime()
  );

  return saveLearningData(data);
}

/**
 * Get corrections due for review
 */
export async function getDueCorrections(email: string): Promise<CorrectionItem[]> {
  const data = await getLearningData(email);
  if (!data) return [];

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return data.corrections.filter(c => {
    if (c.status !== 'active') return false;
    const nextReview = new Date(c.nextReviewAt);
    return nextReview <= today;
  });
}

/**
 * Update correction after review (SM-2 algorithm)
 */
export async function updateCorrectionAfterReview(
  email: string,
  correctionId: string,
  quality: number
): Promise<boolean> {
  const data = await getLearningData(email);
  if (!data) return false;

  const correction = data.corrections.find(c => c.id === correctionId);
  if (!correction) return false;

  // SM-2 algorithm
  if (quality < 3) {
    correction.repetitions = 0;
    correction.interval = 1;
  } else {
    correction.repetitions++;
    if (correction.repetitions === 1) {
      correction.interval = 1;
    } else if (correction.repetitions === 2) {
      correction.interval = 6;
    } else {
      correction.interval = Math.round(correction.interval * correction.easeFactor);
    }

    correction.easeFactor = Math.max(1.3,
      correction.easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
    );
  }

  const nextReview = new Date();
  nextReview.setDate(nextReview.getDate() + correction.interval);
  correction.nextReviewAt = nextReview.toISOString().split('T')[0];
  correction.lastReviewedAt = getKoreaTime();

  if (correction.interval > 30) {
    correction.status = 'mastered';
  }

  return saveLearningData(data);
}

// ============================================
// Debate Topics Operations
// ============================================

/**
 * Get debate topics suitable for user
 */
export async function getDebateTopicsForUser(
  email: string,
  category?: DebateCategory
): Promise<DebateTopicRow[]> {
  const sb = getSupabase();

  try {
    const user = await getUserData(email);
    const ageGroup = user?.profile?.grade
      ? GRADE_TO_AGE_GROUP[user.profile.grade]
      : (user?.profile?.type?.includes('adult') ? 'adult' : 'middle');

    let query = sb
      .from('debate_topics')
      .select('*')
      .eq('is_active', true);

    if (category) {
      query = query.eq('category', category);
    }

    const { data, error } = await query.order('trend_score', { ascending: false });

    if (error) {
      console.error('getDebateTopicsForUser error:', error);
      return [];
    }

    // Filter by age group in JS (JSONB array contains check)
    const topics: DebateTopicRow[] = (data || [])
      .filter(row => {
        const groups: AgeGroup[] = row.age_groups || [];
        return groups.includes(ageGroup as AgeGroup);
      })
      .map(row => ({
        topicId: row.topic_id,
        ageGroups: row.age_groups || [],
        category: row.category as DebateCategory,
        topicData: row.topic_data || {},
        trendScore: row.trend_score ?? 0,
        isActive: row.is_active ?? true,
        createdAt: row.created_at || '',
        generatedFrom: row.generated_from,
      }));

    return topics;
  } catch (error) {
    console.error('getDebateTopicsForUser error:', error);
    return [];
  }
}

/**
 * Generate personalized topic suggestions from user's history
 */
export async function generatePersonalizedTopics(email: string): Promise<string[]> {
  const learningData = await getLearningData(email);
  const userData = await getUserData(email);

  if (!learningData || !userData) return [];

  const topTopics = learningData.topicsHistory
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)
    .map(t => t.topic);

  const interests = userData.profile.interests || [];

  return Array.from(new Set([...topTopics, ...interests]));
}

// ============================================
// Utility: Get all user data in one call
// ============================================

export async function getAllUserData(email: string): Promise<{
  user: UserRow | null;
  learningData: LearningDataRow | null;
}> {
  const [user, learningData] = await Promise.all([
    getUserData(email),
    getLearningData(email),
  ]);

  return { user, learningData };
}
