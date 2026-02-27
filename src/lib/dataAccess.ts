/**
 * Data Access Abstraction Layer
 *
 * Domain-typed interfaces for all data operations in LangTalk.
 * The Google Sheets implementation is the current backend; when the app
 * migrates to a real database, only `createSheetsDataAccess` (and the
 * singleton exported at the bottom) need to change.
 */

import type {
  UserRow,
  LearningDataRow,
  SubscriptionData,
  ProfileData,
  StatsData,
  SessionSummary,
  CorrectionItem,
  VocabBookItem,
  DebateTopicRow,
  DebateCategory,
} from './sheetTypes';

// ----------------------------------------------------------------
// Re-export domain types so consumers can import from one place
// ----------------------------------------------------------------
export type {
  UserRow,
  LearningDataRow,
  SubscriptionData,
  ProfileData,
  StatsData,
  SessionSummary,
  CorrectionItem,
  VocabBookItem,
  DebateTopicRow,
  DebateCategory,
};

// ----------------------------------------------------------------
// Repository interfaces
// ----------------------------------------------------------------

export interface UserRepository {
  /** Return the user row, or null if not found. */
  getUser(email: string): Promise<UserRow | null>;

  /** Create or overwrite the entire user row. */
  saveUser(user: UserRow): Promise<boolean>;

  /**
   * Merge partial field updates into the existing user row.
   * Does NOT create the user if missing – callers that need to
   * create new users should use `saveUser` directly.
   */
  updateUser(
    email: string,
    updates: {
      subscription?: Partial<SubscriptionData>;
      profile?: Partial<ProfileData>;
      stats?: Partial<StatsData>;
    }
  ): Promise<boolean>;
}

export interface LessonRepository {
  /** Add a completed session to the user's recent-sessions list. */
  addLesson(email: string, session: SessionSummary): Promise<boolean>;

  /** Return all learning data for the user (sessions, corrections, vocab, …). */
  getLearningData(email: string): Promise<LearningDataRow | null>;

  /** Return the most recent sessions (capped by the underlying storage limit). */
  getRecentLessons(email: string): Promise<SessionSummary[]>;
}

export interface CorrectionRepository {
  /** Append new correction items for the user. */
  addCorrections(email: string, corrections: CorrectionItem[]): Promise<boolean>;

  /** Return all active corrections for the user. */
  getCorrections(email: string): Promise<CorrectionItem[]>;

  /** Return corrections whose next-review date is today or earlier. */
  getDueCorrections(email: string): Promise<CorrectionItem[]>;

  /**
   * Apply an SM-2 quality rating (0-5) to a correction and persist the
   * updated spaced-repetition state.
   */
  reviewCorrection(
    email: string,
    correctionId: string,
    quality: number
  ): Promise<boolean>;
}

export interface VocabRepository {
  /** Merge new vocab items into the user's vocab book. */
  addVocabItems(email: string, items: VocabBookItem[]): Promise<boolean>;

  /** Return all vocab items for the user. */
  getVocabItems(email: string): Promise<VocabBookItem[]>;
}

export interface SubscriptionRepository {
  /** Return subscription data for the user, or null if not found. */
  getSubscription(email: string): Promise<SubscriptionData | null>;

  /** Persist updated subscription fields for the user. */
  updateSubscription(
    email: string,
    update: Partial<SubscriptionData>
  ): Promise<boolean>;
}

export interface DebateTopicRepository {
  /** Return active debate topics appropriate for the user. */
  getTopicsForUser(
    email: string,
    category?: DebateCategory
  ): Promise<DebateTopicRow[]>;
}

// ----------------------------------------------------------------
// Aggregate DataAccess interface
// ----------------------------------------------------------------

export interface DataAccess {
  users: UserRepository;
  lessons: LessonRepository;
  corrections: CorrectionRepository;
  vocab: VocabRepository;
  subscriptions: SubscriptionRepository;
  debateTopics: DebateTopicRepository;
}

// ----------------------------------------------------------------
// Singleton – change this one line when migrating to a real DB
// ----------------------------------------------------------------

import { createSheetsDataAccess } from './dataAccess-sheets';

export const db: DataAccess = createSheetsDataAccess();
