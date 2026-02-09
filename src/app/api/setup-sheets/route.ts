/**
 * Setup API: Initialize optimized Google Sheets structure
 * Run once to create new sheets with proper headers
 */

import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { topicTemplates, templateToTopicRow } from '@/lib/debateTopicsV2';

// Only allow admin to run this
const ADMIN_EMAILS = ['ryan@nuklabs.com', 'taewoongan@gmail.com'];

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email || !ADMIN_EMAILS.includes(session.user.email)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action } = body; // 'create_sheets' | 'migrate_data' | 'seed_topics'

    if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
      return NextResponse.json({ error: 'Google credentials not configured' }, { status: 500 });
    }

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.GOOGLE_SUBSCRIPTION_SHEET_ID;

    if (!spreadsheetId) {
      return NextResponse.json({ error: 'Spreadsheet ID not configured' }, { status: 500 });
    }

    if (action === 'create_sheets') {
      // Create new sheets with headers
      const result = await createOptimizedSheets(sheets, spreadsheetId);
      return NextResponse.json(result);
    }

    if (action === 'migrate_data') {
      // Migrate existing data to new structure
      const result = await migrateExistingData(sheets, spreadsheetId);
      return NextResponse.json(result);
    }

    if (action === 'seed_topics') {
      // Seed debate topics
      const result = await seedDebateTopics(sheets, spreadsheetId);
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Setup error:', error);
    return NextResponse.json({ error: 'Setup failed', details: String(error) }, { status: 500 });
  }
}

/**
 * Create optimized sheet structure
 */
async function createOptimizedSheets(
  sheets: ReturnType<typeof google.sheets>,
  spreadsheetId: string
) {
  const results: string[] = [];

  // 1. Create Users sheet
  try {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [{
          addSheet: {
            properties: { title: 'Users' }
          }
        }]
      }
    });
    results.push('Created Users sheet');
  } catch (e: unknown) {
    if ((e as { message?: string }).message?.includes('already exists')) {
      results.push('Users sheet already exists');
    } else throw e;
  }

  // Add headers to Users
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: 'Users!A1:E1',
    valueInputOption: 'RAW',
    requestBody: {
      values: [['Email', 'Subscription', 'Profile', 'Stats', 'UpdatedAt']]
    }
  });
  results.push('Added Users headers');

  // 2. Create LearningData sheet
  try {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [{
          addSheet: {
            properties: { title: 'LearningData' }
          }
        }]
      }
    });
    results.push('Created LearningData sheet');
  } catch (e: unknown) {
    if ((e as { message?: string }).message?.includes('already exists')) {
      results.push('LearningData sheet already exists');
    } else throw e;
  }

  // Add headers to LearningData
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: 'LearningData!A1:F1',
    valueInputOption: 'RAW',
    requestBody: {
      values: [['Email', 'RecentSessions', 'Corrections', 'TopicsHistory', 'DebateHistory', 'UpdatedAt']]
    }
  });
  results.push('Added LearningData headers');

  // 3. Create DebateTopics sheet
  try {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [{
          addSheet: {
            properties: { title: 'DebateTopicsV2' }
          }
        }]
      }
    });
    results.push('Created DebateTopicsV2 sheet');
  } catch (e: unknown) {
    if ((e as { message?: string }).message?.includes('already exists')) {
      results.push('DebateTopicsV2 sheet already exists');
    } else throw e;
  }

  // Add headers to DebateTopics
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: 'DebateTopicsV2!A1:G1',
    valueInputOption: 'RAW',
    requestBody: {
      values: [['TopicId', 'AgeGroups', 'Category', 'TopicData', 'TrendScore', 'IsActive', 'CreatedAt']]
    }
  });
  results.push('Added DebateTopicsV2 headers');

  return { success: true, results };
}

/**
 * Migrate existing data from old sheets to new structure
 */
async function migrateExistingData(
  sheets: ReturnType<typeof google.sheets>,
  spreadsheetId: string
) {
  const results: string[] = [];
  const errors: string[] = [];

  try {
    // 1. Read existing Subscriptions data
    const subsResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Subscriptions!A:H',
    });
    const subsRows = subsResponse.data.values || [];

    // 2. Read existing UserProfiles data
    const profilesResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'UserProfiles!A:G',
    });
    const profilesRows = profilesResponse.data.values || [];

    // 3. Read existing LessonHistory data
    const lessonsResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'LessonHistory!A:I',
    });
    const lessonsRows = lessonsResponse.data.values || [];

    // 4. Read existing Corrections data
    const correctionsResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Corrections!A:N',
    });
    const correctionsRows = correctionsResponse.data.values || [];

    // Build user map
    const userMap = new Map<string, {
      email: string;
      subscription: Record<string, unknown>;
      profile: Record<string, unknown>;
      stats: Record<string, unknown>;
      sessions: Record<string, unknown>[];
      corrections: Record<string, unknown>[];
      topics: Map<string, { count: number; lastDiscussed: string }>;
    }>();

    // Process subscriptions (skip header)
    for (let i = 1; i < subsRows.length; i++) {
      const row = subsRows[i];
      const email = row[0]?.toLowerCase();
      if (!email) continue;

      if (!userMap.has(email)) {
        userMap.set(email, {
          email,
          subscription: {},
          profile: {},
          stats: {},
          sessions: [],
          corrections: [],
          topics: new Map(),
        });
      }

      const user = userMap.get(email)!;
      user.subscription = {
        status: row[2] || 'pending',
        expiryDate: row[1] || '',
        signupDate: row[4] || '',
        name: row[3] || '',
      };
      user.stats = {
        sessionCount: parseInt(row[5] || '0', 10),
        currentLevel: row[6] || '',
        levelDetails: row[7] ? JSON.parse(row[7]) : null,
        totalMinutes: 0,
        debateCount: 0,
        currentStreak: 0,
        longestStreak: 0,
      };
    }
    results.push(`Processed ${subsRows.length - 1} subscriptions`);

    // Process profiles (skip header)
    for (let i = 1; i < profilesRows.length; i++) {
      const row = profilesRows[i];
      const email = row[0]?.toLowerCase();
      if (!email) continue;

      if (!userMap.has(email)) {
        userMap.set(email, {
          email,
          subscription: {},
          profile: {},
          stats: {},
          sessions: [],
          corrections: [],
          topics: new Map(),
        });
      }

      const user = userMap.get(email)!;
      user.profile = {
        type: row[1] || 'adult_beginner',
        interests: row[2] ? JSON.parse(row[2]) : [],
        customContext: row[3] || '',
        preferredTopics: row[4] ? JSON.parse(row[4]) : [],
        nativeLanguage: 'ko',
      };
    }
    results.push(`Processed ${profilesRows.length - 1} profiles`);

    // Process lessons (skip header)
    for (let i = 1; i < lessonsRows.length; i++) {
      const row = lessonsRows[i];
      const email = row[0]?.toLowerCase();
      if (!email) continue;

      if (!userMap.has(email)) continue;

      const user = userMap.get(email)!;

      // Add to sessions (keep last 20)
      if (user.sessions.length < 20) {
        user.sessions.push({
          id: `session_${i}`,
          date: row[1] || '',
          type: 'tutoring',
          tutor: row[2] || '',
          duration: parseInt(row[3] || '0', 10),
          topics: row[4] ? [row[4]] : [],
          level: row[7] || '',
        });
      }

      // Update total minutes
      (user.stats as { totalMinutes: number }).totalMinutes += parseInt(row[3] || '0', 10);

      // Track topics
      if (row[4]) {
        const topicKey = row[4].toLowerCase();
        const existing = user.topics.get(topicKey);
        if (existing) {
          existing.count++;
          existing.lastDiscussed = row[1] || '';
        } else {
          user.topics.set(topicKey, { count: 1, lastDiscussed: row[1] || '' });
        }
      }
    }
    results.push(`Processed ${lessonsRows.length - 1} lessons`);

    // Process corrections (skip header)
    for (let i = 1; i < correctionsRows.length; i++) {
      const row = correctionsRows[i];
      const email = row[1]?.toLowerCase();
      if (!email) continue;

      if (!userMap.has(email)) continue;

      const user = userMap.get(email)!;

      // Add to corrections (keep active only, max 100)
      if (user.corrections.length < 100 && row[13] === 'active') {
        user.corrections.push({
          id: row[0] || `correction_${i}`,
          original: row[2] || '',
          corrected: row[3] || '',
          explanation: row[4] || '',
          category: row[5] || 'general',
          nextReviewAt: row[8] || '',
          interval: parseInt(row[9] || '1', 10),
          easeFactor: parseFloat(row[10] || '2.5'),
          repetitions: parseInt(row[11] || '0', 10),
          lastReviewedAt: row[12] || '',
          createdAt: row[7] || '',
          status: row[13] || 'active',
        });
      }
    }
    results.push(`Processed ${correctionsRows.length - 1} corrections`);

    // Write migrated data to new sheets
    const usersData: string[][] = [];
    const learningData: string[][] = [];

    Array.from(userMap.values()).forEach(user => {
      // Convert topics map to array
      const topicsHistory = Array.from(user.topics.entries()).map(([topic, data]) => ({
        topic,
        count: data.count,
        lastDiscussed: data.lastDiscussed,
      }));

      // Users row
      usersData.push([
        user.email,
        JSON.stringify(user.subscription),
        JSON.stringify(user.profile),
        JSON.stringify(user.stats),
        new Date().toISOString(),
      ]);

      // LearningData row
      learningData.push([
        user.email,
        JSON.stringify(user.sessions),
        JSON.stringify(user.corrections),
        JSON.stringify(topicsHistory),
        JSON.stringify([]), // empty debate history
        new Date().toISOString(),
      ]);
    });

    // Write to Users sheet
    if (usersData.length > 0) {
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: 'Users!A:E',
        valueInputOption: 'RAW',
        requestBody: { values: usersData },
      });
      results.push(`Migrated ${usersData.length} users to Users sheet`);
    }

    // Write to LearningData sheet
    if (learningData.length > 0) {
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: 'LearningData!A:F',
        valueInputOption: 'RAW',
        requestBody: { values: learningData },
      });
      results.push(`Migrated ${learningData.length} users to LearningData sheet`);
    }

    return { success: true, results, errors };
  } catch (error) {
    console.error('Migration error:', error);
    return { success: false, results, errors: [...errors, String(error)] };
  }
}

/**
 * Seed debate topics from templates
 */
async function seedDebateTopics(
  sheets: ReturnType<typeof google.sheets>,
  spreadsheetId: string
) {
  const results: string[] = [];

  try {
    // Convert all templates to topic rows
    const topicRows = topicTemplates.map(template => {
      const topic = templateToTopicRow(template);
      return [
        topic.topicId,
        JSON.stringify(topic.ageGroups),
        topic.category,
        JSON.stringify(topic.topicData),
        String(topic.trendScore),
        String(topic.isActive),
        topic.createdAt,
      ];
    });

    // Write to DebateTopicsV2 sheet
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'DebateTopicsV2!A:G',
      valueInputOption: 'RAW',
      requestBody: { values: topicRows },
    });

    results.push(`Seeded ${topicRows.length} debate topics`);

    return { success: true, results };
  } catch (error) {
    console.error('Seed topics error:', error);
    return { success: false, results, error: String(error) };
  }
}

// GET endpoint for status check
export async function GET() {
  return NextResponse.json({
    message: 'Sheet setup API',
    actions: ['create_sheets', 'migrate_data', 'seed_topics'],
    usage: 'POST with { action: "action_name" }',
  });
}
