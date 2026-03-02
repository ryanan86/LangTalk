/**
 * Migration script: Google Sheets -> Supabase PostgreSQL
 *
 * Reads all data from Google Sheets and upserts into Supabase tables.
 * Safe to run multiple times (idempotent via upsert).
 *
 * Run: npx tsx scripts/migrate-sheets-to-supabase.ts
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env.local from project root
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';

// ============================================
// Types
// ============================================

interface SheetUserRow {
  email: string;
  subscription: Record<string, unknown>;
  profile: Record<string, unknown>;
  stats: Record<string, unknown>;
  updatedAt: string;
}

interface SheetLearningDataRow {
  email: string;
  recentSessions: unknown[];
  corrections: unknown[];
  topicsHistory: unknown[];
  debateHistory: unknown[];
  updatedAt: string;
  vocabBook: unknown[];
}

interface SheetDebateTopicRow {
  topicId: string;
  ageGroups: unknown[];
  category: string;
  topicData: Record<string, unknown>;
  trendScore: number;
  isActive: boolean;
  createdAt: string;
}

interface SheetSubscriptionRow {
  email: string;
  expiry: string;
  status: string;
  name: string;
  signupDate: string;
  sessionCount: number;
  evaluatedGrade: string;
  levelDetails: Record<string, unknown> | null;
}

// ============================================
// Helpers
// ============================================

function safeJsonParse<T>(raw: string | undefined, fallback: T): T {
  if (!raw || raw.trim() === '') return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function safeNumber(raw: string | undefined, fallback = 0): number {
  if (!raw || raw.trim() === '') return fallback;
  const n = Number(raw);
  return isNaN(n) ? fallback : n;
}

function safeBoolean(raw: string | undefined, fallback = false): boolean {
  if (!raw || raw.trim() === '') return fallback;
  return raw.toLowerCase() === 'true' || raw === '1';
}

/**
 * Convert Korean date format "2026. 03. 01. 03:21:08" to ISO 8601
 */
function toISOTimestamp(raw: string): string {
  if (!raw || raw.trim() === '') return new Date().toISOString();
  // Try direct ISO parse first
  const direct = new Date(raw);
  if (!isNaN(direct.getTime())) return direct.toISOString();
  // Korean format: "2026. 03. 01. 03:21:08"
  const match = raw.match(/(\d{4})\.\s*(\d{2})\.\s*(\d{2})\.\s*(\d{2}):(\d{2}):(\d{2})/);
  if (match) {
    const [, y, m, d, h, min, s] = match;
    return new Date(`${y}-${m}-${d}T${h}:${min}:${s}+09:00`).toISOString();
  }
  return new Date().toISOString();
}

// ============================================
// Google Sheets auth & helpers
// ============================================

function getSheets() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
  return google.sheets({ version: 'v4', auth });
}

async function getSheetRows(
  sheets: ReturnType<typeof google.sheets>,
  spreadsheetId: string,
  range: string,
): Promise<string[][]> {
  const response = await sheets.spreadsheets.values.get({ spreadsheetId, range });
  const rows = response.data.values ?? [];
  // Skip header row (index 0)
  return rows.slice(1) as string[][];
}

// ============================================
// Sheet readers
// ============================================

async function readUsersSheet(
  sheets: ReturnType<typeof google.sheets>,
  spreadsheetId: string,
): Promise<SheetUserRow[]> {
  const rows = await getSheetRows(sheets, spreadsheetId, 'Users!A:E');
  console.log(`  Users sheet: ${rows.length} data rows`);

  return rows
    .filter(row => row[0]?.trim())
    .map(row => ({
      email: row[0].trim().toLowerCase(),
      subscription: safeJsonParse<Record<string, unknown>>(row[1], {}),
      profile: safeJsonParse<Record<string, unknown>>(row[2], {}),
      stats: safeJsonParse<Record<string, unknown>>(row[3], {}),
      updatedAt: row[4] ?? '',
    }));
}

async function readLearningDataSheet(
  sheets: ReturnType<typeof google.sheets>,
  spreadsheetId: string,
): Promise<SheetLearningDataRow[]> {
  // Columns: email, recentSessions, corrections, topicsHistory, debateHistory, updatedAt, vocabBook
  const rows = await getSheetRows(sheets, spreadsheetId, 'LearningData!A:G');
  console.log(`  LearningData sheet: ${rows.length} data rows`);

  return rows
    .filter(row => row[0]?.trim())
    .map(row => ({
      email: row[0].trim().toLowerCase(),
      recentSessions: safeJsonParse<unknown[]>(row[1], []),
      corrections: safeJsonParse<unknown[]>(row[2], []),
      topicsHistory: safeJsonParse<unknown[]>(row[3], []),
      debateHistory: safeJsonParse<unknown[]>(row[4], []),
      updatedAt: row[5] ?? '',
      vocabBook: safeJsonParse<unknown[]>(row[6], []),
    }));
}

async function readDebateTopicsSheet(
  sheets: ReturnType<typeof google.sheets>,
  spreadsheetId: string,
): Promise<SheetDebateTopicRow[]> {
  // Columns: topicId, ageGroups, category, topicData, trendScore, isActive, createdAt
  const rows = await getSheetRows(sheets, spreadsheetId, 'DebateTopics!A:G');
  console.log(`  DebateTopics sheet: ${rows.length} data rows`);

  return rows
    .filter(row => row[0]?.trim())
    .map(row => ({
      topicId: row[0].trim(),
      ageGroups: safeJsonParse<unknown[]>(row[1], []),
      category: row[2] ?? '',
      topicData: safeJsonParse<Record<string, unknown>>(row[3], {}),
      trendScore: safeNumber(row[4], 0),
      isActive: safeBoolean(row[5], true),
      createdAt: row[6] ?? '',
    }));
}

async function readSubscriptionsSheet(
  sheets: ReturnType<typeof google.sheets>,
  spreadsheetId: string,
): Promise<SheetSubscriptionRow[]> {
  // Columns: email, expiry, status, name, signupDate, sessionCount, evaluatedGrade, levelDetails
  const rows = await getSheetRows(sheets, spreadsheetId, 'Subscriptions!A:H');
  console.log(`  Subscriptions sheet: ${rows.length} data rows`);

  return rows
    .filter(row => row[0]?.trim())
    .map(row => ({
      email: row[0].trim().toLowerCase(),
      expiry: row[1] ?? '',
      status: row[2] ?? '',
      name: row[3] ?? '',
      signupDate: row[4] ?? '',
      sessionCount: safeNumber(row[5], 0),
      evaluatedGrade: row[6] ?? '',
      levelDetails: safeJsonParse<Record<string, unknown> | null>(row[7], null),
    }));
}

// ============================================
// Supabase upsert helpers
// ============================================

const BATCH_SIZE = 50;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function upsertBatched(
  supabase: any,
  table: string,
  rows: Record<string, unknown>[],
  conflictColumn: string,
): Promise<void> {
  let inserted = 0;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const { error } = await supabase
      .from(table)
      .upsert(batch, { onConflict: conflictColumn });
    if (error) {
      throw new Error(`Upsert error on table "${table}" (batch ${i / BATCH_SIZE + 1}): ${error.message}`);
    }
    inserted += batch.length;
    process.stdout.write(`\r  [${table}] upserted ${inserted}/${rows.length}`);
  }
  console.log(); // newline after progress
}

// ============================================
// Validation: compare row counts
// ============================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function validateCounts(
  supabase: any,
  table: string,
  expectedCount: number,
): Promise<void> {
  const { count, error } = await supabase
    .from(table)
    .select('*', { count: 'exact', head: true });
  if (error) {
    console.warn(`  [WARN] Could not count ${table}: ${error.message}`);
    return;
  }
  const actual = count ?? 0;
  const status = actual >= expectedCount ? 'OK' : 'MISMATCH';
  console.log(
    `  [${status}] ${table}: sheet=${expectedCount}, supabase=${actual}`,
  );
}

// ============================================
// Main migration
// ============================================

async function migrate() {
  // Validate env
  const required = [
    'GOOGLE_SERVICE_ACCOUNT_EMAIL',
    'GOOGLE_PRIVATE_KEY',
    'GOOGLE_SUBSCRIPTION_SHEET_ID',
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
  ];
  const missing = required.filter(k => !process.env[k]);
  if (missing.length > 0) {
    console.error('Missing required environment variables:', missing.join(', '));
    process.exit(1);
  }

  const spreadsheetId = process.env.GOOGLE_SUBSCRIPTION_SHEET_ID!;
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
  const sheets = getSheets();

  // ---- Step 1: Read all sheets ----
  console.log('\n=== Reading Google Sheets ===');
  const [usersRows, learningRows, subscriptionRows] = await Promise.all([
    readUsersSheet(sheets, spreadsheetId),
    readLearningDataSheet(sheets, spreadsheetId),
    readSubscriptionsSheet(sheets, spreadsheetId),
  ]);

  // DebateTopics sheet may not exist — read it separately with error handling
  let debateRows: SheetDebateTopicRow[] = [];
  try {
    debateRows = await readDebateTopicsSheet(sheets, spreadsheetId);
  } catch (err) {
    console.warn('  DebateTopics sheet not found or unreadable, skipping. Error:', (err as Error).message);
  }

  // ---- Step 2: Build subscription lookup (email -> sub row) ----
  const subscriptionMap = new Map<string, SheetSubscriptionRow>();
  for (const sub of subscriptionRows) {
    subscriptionMap.set(sub.email, sub);
  }

  // ---- Step 3: Merge users + subscriptions -> users table ----
  console.log('\n=== Upserting users ===');
  const usersPayload = usersRows.map(u => {
    const sub = subscriptionMap.get(u.email);
    return {
      email: u.email,
      subscription: u.subscription,
      profile: u.profile,
      stats: u.stats,
      // Merge fields from Subscriptions sheet (override if present)
      session_count: sub ? sub.sessionCount : (u.stats?.sessionCount as number | undefined) ?? 0,
      evaluated_grade: sub?.evaluatedGrade ?? null,
      level_details: sub?.levelDetails ?? (u.stats?.levelDetails as Record<string, unknown> | undefined) ?? null,
      updated_at: toISOTimestamp(u.updatedAt),
    };
  });

  // Also add any subscription rows that have no matching Users row
  for (const [email, sub] of Array.from(subscriptionMap.entries())) {
    if (!usersRows.find(u => u.email === email)) {
      usersPayload.push({
        email,
        subscription: {
          status: sub.status,
          expiryDate: sub.expiry,
          signupDate: sub.signupDate,
          name: sub.name,
        },
        profile: {},
        stats: {},
        session_count: sub.sessionCount,
        evaluated_grade: sub.evaluatedGrade,
        level_details: sub.levelDetails,
        updated_at: new Date().toISOString(),
      });
    }
  }

  await upsertBatched(supabase, 'users', usersPayload as Record<string, unknown>[], 'email');
  console.log(`  Total users upserted: ${usersPayload.length}`);

  // ---- Step 4: Upsert learning_data (deduplicate by email — keep latest) ----
  console.log('\n=== Upserting learning_data ===');
  const learningByEmail = new Map<string, SheetLearningDataRow>();
  for (const r of learningRows) {
    learningByEmail.set(r.email, r); // last one wins (latest row)
  }
  const learningPayload = Array.from(learningByEmail.values()).map(r => ({
    email: r.email,
    recent_sessions: r.recentSessions,
    corrections: r.corrections,
    topics_history: r.topicsHistory,
    debate_history: r.debateHistory,
    vocab_book: r.vocabBook,
    updated_at: toISOTimestamp(r.updatedAt),
  }));
  await upsertBatched(supabase, 'learning_data', learningPayload as Record<string, unknown>[], 'email');
  console.log(`  Total learning_data upserted: ${learningPayload.length}`);

  // ---- Step 5: Upsert debate_topics ----
  console.log('\n=== Upserting debate_topics ===');
  const debatePayload = debateRows.map(r => ({
    topic_id: r.topicId,
    age_groups: r.ageGroups,
    category: r.category,
    topic_data: r.topicData,
    trend_score: r.trendScore,
    is_active: r.isActive,
    created_at: r.createdAt || new Date().toISOString(),
    generated_from: null,
  }));
  await upsertBatched(supabase, 'debate_topics', debatePayload as Record<string, unknown>[], 'topic_id');
  console.log(`  Total debate_topics upserted: ${debatePayload.length}`);

  // ---- Step 6: Final validation ----
  console.log('\n=== Validation: row count comparison ===');
  await validateCounts(supabase, 'users', usersPayload.length);
  await validateCounts(supabase, 'learning_data', learningPayload.length);
  await validateCounts(supabase, 'debate_topics', debatePayload.length);

  console.log('\n=== Migration complete ===\n');
}

migrate().catch(err => {
  console.error('\nMigration failed:', err);
  process.exit(1);
});
