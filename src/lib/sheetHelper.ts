/**
 * Optimized Google Sheets Helper
 * JSON-based data management for efficiency
 */

import { google } from 'googleapis';
import {
  UserRow,
  LearningDataRow,
  DebateTopicRow,
  SubscriptionData,
  ProfileData,
  StatsData,
  SessionSummary,
  CorrectionItem,
  TopicHistory,
  DebateHistoryItem,
  AgeGroup,
  DebateCategory,
  MAX_RECENT_SESSIONS,
  MAX_ACTIVE_CORRECTIONS,
  MAX_TOPICS_HISTORY,
  MAX_DEBATE_HISTORY,
  GRADE_TO_AGE_GROUP,
} from './sheetTypes';

// ============================================
// Google Sheets Auth
// ============================================

function getAuth() {
  return new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
}

function getSheets() {
  const auth = getAuth();
  return google.sheets({ version: 'v4', auth });
}

function getSpreadsheetId() {
  return process.env.GOOGLE_SUBSCRIPTION_SHEET_ID;
}

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

// ============================================
// User Data Operations
// ============================================

/**
 * Get user data by email (single API call)
 */
export async function getUserData(email: string): Promise<UserRow | null> {
  const sheets = getSheets();
  const spreadsheetId = getSpreadsheetId();
  if (!spreadsheetId) return null;

  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Users!A:E',
    });

    const rows = response.data.values || [];
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (row[0]?.toLowerCase() === email.toLowerCase()) {
        return {
          email: row[0],
          subscription: row[1] ? JSON.parse(row[1]) : getDefaultSubscription(),
          profile: row[2] ? JSON.parse(row[2]) : getDefaultProfile(),
          stats: row[3] ? JSON.parse(row[3]) : getDefaultStats(),
          updatedAt: row[4] || '',
        };
      }
    }
    return null;
  } catch (error) {
    console.error('getUserData error:', error);
    return null;
  }
}

/**
 * Create or update user data
 */
export async function saveUserData(userData: UserRow): Promise<boolean> {
  const sheets = getSheets();
  const spreadsheetId = getSpreadsheetId();
  if (!spreadsheetId) return false;

  try {
    // Check if user exists
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Users!A:E',
    });

    const rows = response.data.values || [];
    let existingRowIndex = -1;

    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0]?.toLowerCase() === userData.email.toLowerCase()) {
        existingRowIndex = i + 1;
        break;
      }
    }

    const rowData = [
      userData.email,
      JSON.stringify(userData.subscription),
      JSON.stringify(userData.profile),
      JSON.stringify(userData.stats),
      getKoreaTime(),
    ];

    if (existingRowIndex !== -1) {
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `Users!A${existingRowIndex}:E${existingRowIndex}`,
        valueInputOption: 'RAW',
        requestBody: { values: [rowData] },
      });
    } else {
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: 'Users!A:E',
        valueInputOption: 'RAW',
        requestBody: { values: [rowData] },
      });
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
    // Create new user with defaults
    const newUser: UserRow = {
      email,
      subscription: { ...getDefaultSubscription(), ...updates.subscription },
      profile: { ...getDefaultProfile(), ...updates.profile },
      stats: { ...getDefaultStats(), ...updates.stats },
      updatedAt: getKoreaTime(),
    };
    return saveUserData(newUser);
  }

  // Merge updates
  const updatedUser: UserRow = {
    ...user,
    subscription: { ...user.subscription, ...updates.subscription },
    profile: { ...user.profile, ...updates.profile },
    stats: { ...user.stats, ...updates.stats },
    updatedAt: getKoreaTime(),
  };

  return saveUserData(updatedUser);
}

// ============================================
// Learning Data Operations
// ============================================

/**
 * Get learning data by email
 */
export async function getLearningData(email: string): Promise<LearningDataRow | null> {
  const sheets = getSheets();
  const spreadsheetId = getSpreadsheetId();
  if (!spreadsheetId) return null;

  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'LearningData!A:F',
    });

    const rows = response.data.values || [];
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (row[0]?.toLowerCase() === email.toLowerCase()) {
        return {
          email: row[0],
          recentSessions: row[1] ? JSON.parse(row[1]) : [],
          corrections: row[2] ? JSON.parse(row[2]) : [],
          topicsHistory: row[3] ? JSON.parse(row[3]) : [],
          debateHistory: row[4] ? JSON.parse(row[4]) : [],
          updatedAt: row[5] || '',
        };
      }
    }
    return null;
  } catch (error) {
    console.error('getLearningData error:', error);
    return null;
  }
}

/**
 * Save learning data
 */
export async function saveLearningData(data: LearningDataRow): Promise<boolean> {
  const sheets = getSheets();
  const spreadsheetId = getSpreadsheetId();
  if (!spreadsheetId) return false;

  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'LearningData!A:F',
    });

    const rows = response.data.values || [];
    let existingRowIndex = -1;

    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0]?.toLowerCase() === data.email.toLowerCase()) {
        existingRowIndex = i + 1;
        break;
      }
    }

    // Trim arrays to max limits
    const trimmedData: LearningDataRow = {
      ...data,
      recentSessions: data.recentSessions.slice(0, MAX_RECENT_SESSIONS),
      corrections: data.corrections
        .filter(c => c.status === 'active')
        .slice(0, MAX_ACTIVE_CORRECTIONS),
      topicsHistory: data.topicsHistory.slice(0, MAX_TOPICS_HISTORY),
      debateHistory: data.debateHistory.slice(0, MAX_DEBATE_HISTORY),
      updatedAt: getKoreaTime(),
    };

    const rowData = [
      trimmedData.email,
      JSON.stringify(trimmedData.recentSessions),
      JSON.stringify(trimmedData.corrections),
      JSON.stringify(trimmedData.topicsHistory),
      JSON.stringify(trimmedData.debateHistory),
      trimmedData.updatedAt,
    ];

    if (existingRowIndex !== -1) {
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `LearningData!A${existingRowIndex}:F${existingRowIndex}`,
        valueInputOption: 'RAW',
        requestBody: { values: [rowData] },
      });
    } else {
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: 'LearningData!A:F',
        valueInputOption: 'RAW',
        requestBody: { values: [rowData] },
      });
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
      updatedAt: getKoreaTime(),
    };
  }

  // Add new session at the beginning
  data.recentSessions.unshift(session);

  // Update topics history
  for (const topic of session.topics) {
    const existingTopic = data.topicsHistory.find(t => t.topic.toLowerCase() === topic.toLowerCase());
    if (existingTopic) {
      existingTopic.count++;
      existingTopic.lastDiscussed = session.date;
    } else {
      data.topicsHistory.push({
        topic,
        count: 1,
        lastDiscussed: session.date,
      });
    }
  }

  // Sort topics by count (most discussed first)
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
      updatedAt: getKoreaTime(),
    };
  }

  // Add new corrections
  data.corrections.push(...corrections);

  // Sort by next review date
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
  quality: number // 0-5 rating
): Promise<boolean> {
  const data = await getLearningData(email);
  if (!data) return false;

  const correction = data.corrections.find(c => c.id === correctionId);
  if (!correction) return false;

  // SM-2 algorithm
  if (quality < 3) {
    // Failed - reset
    correction.repetitions = 0;
    correction.interval = 1;
  } else {
    // Success
    correction.repetitions++;
    if (correction.repetitions === 1) {
      correction.interval = 1;
    } else if (correction.repetitions === 2) {
      correction.interval = 6;
    } else {
      correction.interval = Math.round(correction.interval * correction.easeFactor);
    }

    // Update ease factor
    correction.easeFactor = Math.max(1.3,
      correction.easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
    );
  }

  // Set next review date
  const nextReview = new Date();
  nextReview.setDate(nextReview.getDate() + correction.interval);
  correction.nextReviewAt = nextReview.toISOString().split('T')[0];
  correction.lastReviewedAt = getKoreaTime();

  // Mark as mastered if interval > 30 days
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
  const sheets = getSheets();
  const spreadsheetId = getSpreadsheetId();
  if (!spreadsheetId) return [];

  try {
    // Get user profile to determine age group
    const user = await getUserData(email);
    const ageGroup = user?.profile?.grade
      ? GRADE_TO_AGE_GROUP[user.profile.grade]
      : (user?.profile?.type?.includes('adult') ? 'adult' : 'middle');

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'DebateTopics!A:G',
    });

    const rows = response.data.values || [];
    const topics: DebateTopicRow[] = [];

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row[0]) continue;

      const topic: DebateTopicRow = {
        topicId: row[0],
        ageGroups: row[1] ? JSON.parse(row[1]) : [],
        category: row[2] as DebateCategory,
        topicData: row[3] ? JSON.parse(row[3]) : {},
        trendScore: parseFloat(row[4] || '0'),
        isActive: row[5] !== 'false',
        createdAt: row[6] || '',
      };

      // Filter by age group
      if (!topic.ageGroups.includes(ageGroup as AgeGroup)) continue;

      // Filter by category if specified
      if (category && topic.category !== category) continue;

      // Only active topics
      if (!topic.isActive) continue;

      topics.push(topic);
    }

    // Sort by trend score
    topics.sort((a, b) => b.trendScore - a.trendScore);

    return topics;
  } catch (error) {
    console.error('getDebateTopicsForUser error:', error);
    return [];
  }
}

/**
 * Generate personalized topic from user's conversation history
 */
export async function generatePersonalizedTopics(email: string): Promise<string[]> {
  const learningData = await getLearningData(email);
  const userData = await getUserData(email);

  if (!learningData || !userData) return [];

  // Get user's frequently discussed topics
  const topTopics = learningData.topicsHistory
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)
    .map(t => t.topic);

  // Get user's interests
  const interests = userData.profile.interests || [];

  // Combine for topic suggestions
  return [...new Set([...topTopics, ...interests])];
}

// ============================================
// Default Values
// ============================================

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
  };
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
