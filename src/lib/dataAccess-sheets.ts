/**
 * Google Sheets implementation of the DataAccess interfaces.
 *
 * This is a thin adapter: every method delegates to the existing
 * sheetHelper functions.  No sheet-level logic lives here.
 */

import {
  getUserData,
  saveUserData,
  updateUserFields,
  getLearningData,
  saveLearningData,
  addSession,
  addCorrections as sheetAddCorrections,
  getDueCorrections as sheetGetDueCorrections,
  updateCorrectionAfterReview,
  getDebateTopicsForUser,
} from './sheetHelper';

import type {
  DataAccess,
  UserRepository,
  LessonRepository,
  CorrectionRepository,
  VocabRepository,
  SubscriptionRepository,
  DebateTopicRepository,
} from './dataAccess';

import type {
  UserRow,
  SessionSummary,
  CorrectionItem,
  VocabBookItem,
  SubscriptionData,
  ProfileData,
  StatsData,
  DebateCategory,
} from './sheetTypes';

// ----------------------------------------------------------------
// UserRepository
// ----------------------------------------------------------------

const users: UserRepository = {
  async getUser(email: string): Promise<UserRow | null> {
    return getUserData(email);
  },

  async saveUser(user: UserRow): Promise<boolean> {
    return saveUserData(user);
  },

  async updateUser(
    email: string,
    updates: {
      subscription?: Partial<SubscriptionData>;
      profile?: Partial<ProfileData>;
      stats?: Partial<StatsData>;
    }
  ): Promise<boolean> {
    return updateUserFields(email, updates);
  },
};

// ----------------------------------------------------------------
// LessonRepository
// ----------------------------------------------------------------

const lessons: LessonRepository = {
  async addLesson(email: string, session: SessionSummary): Promise<boolean> {
    return addSession(email, session);
  },

  async getLearningData(email: string) {
    return getLearningData(email);
  },

  async getRecentLessons(email: string): Promise<SessionSummary[]> {
    const data = await getLearningData(email);
    return data?.recentSessions ?? [];
  },
};

// ----------------------------------------------------------------
// CorrectionRepository
// ----------------------------------------------------------------

const corrections: CorrectionRepository = {
  async addCorrections(
    email: string,
    items: CorrectionItem[]
  ): Promise<boolean> {
    return sheetAddCorrections(email, items);
  },

  async getCorrections(email: string): Promise<CorrectionItem[]> {
    const data = await getLearningData(email);
    return data?.corrections ?? [];
  },

  async getDueCorrections(email: string): Promise<CorrectionItem[]> {
    return sheetGetDueCorrections(email);
  },

  async reviewCorrection(
    email: string,
    correctionId: string,
    quality: number
  ): Promise<boolean> {
    return updateCorrectionAfterReview(email, correctionId, quality);
  },
};

// ----------------------------------------------------------------
// VocabRepository
// ----------------------------------------------------------------

const vocab: VocabRepository = {
  async addVocabItems(
    email: string,
    items: VocabBookItem[]
  ): Promise<boolean> {
    const data = await getLearningData(email);
    if (!data) return false;

    // Merge: update existing terms or append new ones
    const termMap = new Map(data.vocabBook.map((i) => [i.term, i]));
    for (const item of items) {
      const prev = termMap.get(item.term);
      if (prev) {
        prev.reviewCount = (prev.reviewCount || 0) + 1;
        prev.proficiency = Math.min(100, (prev.proficiency || 0) + 5);
        prev.nextReviewAt = item.nextReviewAt;
      } else {
        termMap.set(item.term, item);
      }
    }

    data.vocabBook = Array.from(termMap.values());
    return saveLearningData(data);
  },

  async getVocabItems(email: string): Promise<VocabBookItem[]> {
    const data = await getLearningData(email);
    return data?.vocabBook ?? [];
  },
};

// ----------------------------------------------------------------
// SubscriptionRepository
// ----------------------------------------------------------------

const subscriptions: SubscriptionRepository = {
  async getSubscription(email: string): Promise<SubscriptionData | null> {
    const user = await getUserData(email);
    return user?.subscription ?? null;
  },

  async updateSubscription(
    email: string,
    update: Partial<SubscriptionData>
  ): Promise<boolean> {
    return updateUserFields(email, { subscription: update });
  },
};

// ----------------------------------------------------------------
// DebateTopicRepository
// ----------------------------------------------------------------

const debateTopics: DebateTopicRepository = {
  async getTopicsForUser(email: string, category?: DebateCategory) {
    return getDebateTopicsForUser(email, category);
  },
};

// ----------------------------------------------------------------
// Factory
// ----------------------------------------------------------------

export function createSheetsDataAccess(): DataAccess {
  return { users, lessons, corrections, vocab, subscriptions, debateTopics };
}
