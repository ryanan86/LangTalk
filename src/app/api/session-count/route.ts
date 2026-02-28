import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { checkRateLimit, getRateLimitId, RATE_LIMITS } from '@/lib/rateLimit';
import { MIN_SESSIONS_FOR_DEBATE } from '@/lib/debateTypes';
import { calculateXP, checkLevelUp, checkAchievements } from '@/lib/gamification';
import type { GamificationState } from '@/lib/gamification';
import { getUserData, updateUserFields } from '@/lib/sheetHelper';

// GET: Retrieve current session count
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ sessionCount: 0, canDebate: false, reason: 'Not logged in' }, { status: 401 });
    }

    // Rate limit
    const rateLimitResult = checkRateLimit(getRateLimitId(session.user.email, request), RATE_LIMITS.light);
    if (rateLimitResult) return rateLimitResult;

    const email = session.user.email;

    // Require Google Sheets credentials
    if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
      console.error('No Google Sheets credentials configured');
      return NextResponse.json({ error: 'Service unavailable: missing credentials' }, { status: 503 });
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
      console.error('No spreadsheet ID configured');
      return NextResponse.json({ error: 'Service unavailable: missing spreadsheet ID' }, { status: 503 });
    }

    // Read the subscription sheet
    // Expected format: Column A = Email, B = Expiry, C = Status, D = Name, E = SignupDate, F = SessionCount, G = Level, H = LevelDetails
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Subscriptions!A:H',
    });

    const rows = response.data.values || [];

    for (let i = 1; i < rows.length; i++) { // Skip header row
      const row = rows[i];
      const rowEmail = row[0];

      if (rowEmail?.toLowerCase() === email.toLowerCase()) {
        const sessionCount = parseInt(row[5] || '0', 10);
        const evaluatedGrade = row[6] || null;
        let levelDetails = null;
        try {
          if (row[7]) levelDetails = JSON.parse(row[7]);
        } catch { /* ignore parsing errors */ }

        return NextResponse.json({
          sessionCount,
          evaluatedGrade,
          levelDetails,
          canDebate: sessionCount >= MIN_SESSIONS_FOR_DEBATE,
          email,
        });
      }
    }

    // User not found
    return NextResponse.json({
      sessionCount: 0,
      canDebate: false,
      email,
    });
  } catch (error) {
    console.error('Session count retrieval error:', error);
    return NextResponse.json({ sessionCount: 0, canDebate: false, error: 'Failed to retrieve session count' }, { status: 500 });
  }
}

// POST: Increment session count and update evaluated level
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ success: false, error: 'Not logged in' }, { status: 401 });
    }

    // Rate limit
    const rateLimitResult = checkRateLimit(getRateLimitId(session.user.email, request), RATE_LIMITS.light);
    if (rateLimitResult) return rateLimitResult;

    const email = session.user.email;

    // Parse request body once for all downstream use
    let evaluatedGrade: string | null = null;
    let levelDetails: { grammar: number; vocabulary: number; fluency: number; comprehension: number } | null = null;
    let tutorId: string | undefined;
    let correctionsCount: number | undefined;
    try {
      const body = await request.json();
      evaluatedGrade = body.evaluatedGrade || null;
      levelDetails = body.levelDetails || null;
      tutorId = body.tutorId;
      correctionsCount = body.correctionsCount;
    } catch {
      // No body provided, just increment session count
    }

    // Require Google Sheets credentials
    if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
      console.error('No Google Sheets credentials configured');
      return NextResponse.json({ error: 'Service unavailable: missing credentials' }, { status: 503 });
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
      console.error('No spreadsheet ID configured');
      return NextResponse.json({ error: 'Service unavailable: missing spreadsheet ID' }, { status: 503 });
    }

    // Read the subscription sheet to find the user
    // Expected format: A=Email, B=Expiry, C=Status, D=Name, E=SignupDate, F=SessionCount, G=Level, H=LevelDetails
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Subscriptions!A:H',
    });

    const rows = response.data.values || [];
    let rowIndex = -1;
    let currentCount = 0;
    let currentLevel = '';

    for (let i = 1; i < rows.length; i++) { // Skip header row
      const row = rows[i];
      const rowEmail = row[0];

      if (rowEmail?.toLowerCase() === email.toLowerCase()) {
        rowIndex = i + 1; // Sheets uses 1-based indexing
        currentCount = parseInt(row[5] || '0', 10);
        currentLevel = row[6] || '';
        break;
      }
    }

    if (rowIndex === -1) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    // Increment the session count
    const newCount = currentCount + 1;

    // Determine the level to store (use new evaluated grade or keep current)
    const levelToStore = evaluatedGrade || currentLevel;
    const levelDetailsToStore = levelDetails ? JSON.stringify(levelDetails) : '';

    // Update session count and level
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `Subscriptions!F${rowIndex}:H${rowIndex}`,
      valueInputOption: 'RAW',
      requestBody: {
        values: [[newCount, levelToStore, levelDetailsToStore]],
      },
    });

    // === Gamification: Update XP, streak, achievements ===
    let xpEarned = 0;
    let newAchievements: string[] = [];
    let newLevel = 0;
    let leveledUp = false;

    try {
      const userData = await getUserData(email);
      const stats = userData?.stats || {
        sessionCount: 0, totalMinutes: 0, debateCount: 0,
        currentStreak: 0, longestStreak: 0,
        xp: 0, level: 1, achievements: [], tutorsUsed: [],
        perfectSessions: 0, dailyChallengeStreak: 0,
        weeklyXp: [0, 0, 0, 0, 0, 0, 0],
      };

      // Calculate XP for this session
      xpEarned += calculateXP('session_complete');
      if (newCount === 1) xpEarned += calculateXP('first_session');

      // No corrections bonus
      if (correctionsCount === 0) {
        xpEarned += calculateXP('no_corrections');
      }

      // Streak bonus
      const streakDays = stats.currentStreak + 1;
      xpEarned += calculateXP('streak_bonus', { streakDays });

      // Check level up
      const totalXP = (stats.xp || 0) + xpEarned;
      const levelCheck = checkLevelUp(stats.xp || 0, xpEarned);
      newLevel = levelCheck.newLevel;
      leveledUp = levelCheck.leveled;

      // Update tutors used
      const tutorsUsed = [...(stats.tutorsUsed || [])];
      if (tutorId && !tutorsUsed.includes(tutorId)) {
        tutorsUsed.push(tutorId);
      }

      // Update weekly XP (shift and add today's XP)
      const weeklyXp = [...(stats.weeklyXp || [0, 0, 0, 0, 0, 0, 0])];
      weeklyXp[new Date().getDay()] = (weeklyXp[new Date().getDay()] || 0) + xpEarned;

      // Check achievements
      const gamificationState: GamificationState = {
        totalXP,
        level: newLevel,
        xpForNextLevel: 0,
        currentLevelXP: 0,
        streakDays,
        sessionsCompleted: newCount,
        reviewsCompleted: 0,
        debatesCompleted: stats.debateCount || 0,
        perfectSessions: (stats.perfectSessions || 0) + (correctionsCount === 0 ? 1 : 0),
        tutorsUsed,
        unlockedAchievements: stats.achievements || [],
        xpHistory: [],
      };

      const unlockedAchievements = checkAchievements(gamificationState);
      newAchievements = unlockedAchievements.map(a => a.id);

      // Save to user data
      await updateUserFields(email, {
        stats: {
          sessionCount: newCount,
          xp: totalXP,
          level: newLevel,
          currentStreak: streakDays,
          longestStreak: Math.max(stats.longestStreak || 0, streakDays),
          achievements: [...(stats.achievements || []), ...newAchievements],
          tutorsUsed,
          perfectSessions: gamificationState.perfectSessions,
          weeklyXp,
        },
      });
    } catch (gamError) {
      console.error('Gamification update error (non-blocking):', gamError);
    }

    return NextResponse.json({
      success: true,
      newCount,
      evaluatedGrade: levelToStore,
      canDebate: newCount >= MIN_SESSIONS_FOR_DEBATE,
      xpEarned,
      newLevel,
      leveledUp,
      newAchievements,
    });
  } catch (error) {
    console.error('Session count increment error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to increment session count' },
      { status: 500 }
    );
  }
}
