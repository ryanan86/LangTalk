import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { checkRateLimit, getRateLimitId, RATE_LIMITS } from '@/lib/rateLimit';
import { randomUUID } from 'crypto';
import {
  getLearningData,
  addSession,
  addCorrections,
  updateUserFields,
} from '@/lib/sheetHelper';
import { SessionSummary, CorrectionItem } from '@/lib/sheetTypes';
import { makeRid, nowMs, since } from '@/lib/perf';
import { lessonHistoryBodySchema, parseBody } from '@/lib/apiSchemas';

// GET: Retrieve lesson history for current user
export async function GET(request: Request) {
  const rid = makeRid('lhst');
  const t0 = nowMs();

  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ lessons: [], error: 'Not logged in' }, { status: 401 });
    }

    // Rate limit
    const rateLimitResult = checkRateLimit(getRateLimitId(session.user.email, request), RATE_LIMITS.light);
    if (rateLimitResult) return rateLimitResult;

    const email = session.user.email;

    // If no Google Sheets credentials, return empty for development
    if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
      console.log('No Google Sheets credentials, returning empty lesson history');
      return NextResponse.json({ lessons: [], email });
    }

    if (!process.env.GOOGLE_SUBSCRIPTION_SHEET_ID) {
      console.log('No spreadsheet ID configured');
      return NextResponse.json({ lessons: [], email });
    }

    // Get learning data using optimized helper
    const learningData = await getLearningData(email);

    if (!learningData) {
      return NextResponse.json({
        lessons: [],
        email,
        total: 0,
      });
    }

    // Transform sessions for client display
    const lessons = learningData.recentSessions.map(s => ({
      dateTime: s.date,
      tutor: s.tutor || '',
      duration: s.duration,
      topicSummary: s.topics.join(', '),
      feedbackSummary: s.feedbackSummary || '',
      keyCorrections: s.keyCorrections || '',
      level: s.level || '',
      levelDetails: null,
      language: s.language || '',
    }));

    console.log(`[${rid}] OK ${since(t0)}ms`);
    return NextResponse.json({
      lessons,
      email,
      total: lessons.length,
    });
  } catch (error) {
    console.error(`[${rid}] ERR ${since(t0)}ms`, error);
    console.error('Lesson history retrieval error:', error);
    return NextResponse.json({ lessons: [], error: 'Failed to retrieve lesson history' });
  }
}

// POST: Save a new lesson to history
export async function POST(request: NextRequest) {
  const rid = makeRid('lhst');
  const t0 = nowMs();

  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ success: false, error: 'Not logged in' }, { status: 401 });
    }

    // Rate limit
    const rateLimitResult = checkRateLimit(getRateLimitId(session.user.email, request), RATE_LIMITS.light);
    if (rateLimitResult) return rateLimitResult;

    const email = session.user.email;

    // Parse and validate request body
    const rawBody = await request.json();
    const parsed = parseBody(lessonHistoryBodySchema, rawBody);
    if (!parsed.success) return parsed.response;
    const {
      tutor,
      duration,
      topicSummary,
      feedbackSummary,
      keyCorrections,
      level,
      levelDetails,
      corrections: rawCorrections,
      language: sessionLanguage,
    } = parsed.data;

    // If no Google Sheets credentials, return success for development
    if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
      console.log('No Google Sheets credentials, skipping lesson history save');
      return NextResponse.json({ success: true, message: 'Development mode - not saved' });
    }

    if (!process.env.GOOGLE_SUBSCRIPTION_SHEET_ID) {
      console.log('No spreadsheet ID configured');
      return NextResponse.json({ success: true, message: 'No spreadsheet configured' });
    }

    // Create session summary
    const sessionId = `session_${Date.now()}`;
    const now = new Date();
    // Store date in ISO format for locale-independent display on client
    const isoDate = now.toISOString();

    const sessionSummary: SessionSummary = {
      id: sessionId,
      date: isoDate,
      type: 'tutoring',
      tutor: tutor || '',
      duration: duration || 0,
      topics: topicSummary ? [topicSummary] : [],
      level: level || '',
      feedbackSummary: feedbackSummary || '',
      keyCorrections: keyCorrections || '',
      language: sessionLanguage || 'en',
    };

    // Add session to learning data
    await addSession(email, sessionSummary);

    // If there are individual corrections, add them
    if (rawCorrections && Array.isArray(rawCorrections) && rawCorrections.length > 0) {
      const nextReview = new Date();
      nextReview.setDate(nextReview.getDate() + 1);

      const correctionItems: CorrectionItem[] = rawCorrections.map((c: {
        original?: string;
        corrected?: string;
        explanation?: string;
        category?: string;
      }) => ({
        id: randomUUID(),
        original: c.original || '',
        corrected: c.corrected || '',
        explanation: c.explanation || '',
        category: (c.category as CorrectionItem['category']) || 'grammar',
        nextReviewAt: nextReview.toISOString().split('T')[0],
        interval: 1,
        easeFactor: 2.5,
        repetitions: 0,
        createdAt: isoDate,
        fromSession: sessionId,
        status: 'active',
      }));

      await addCorrections(email, correctionItems);
    }

    // Update user stats (sessionCount is handled by /api/session-count)
    const statsUpdate: Record<string, unknown> = {
      lastSessionAt: isoDate,
    };
    if (level) statsUpdate.currentLevel = level;
    if (levelDetails) statsUpdate.levelDetails = levelDetails;

    await updateUserFields(email, {
      stats: statsUpdate as Partial<import('@/lib/sheetTypes').StatsData>,
    });

    console.log(`[${rid}] OK ${since(t0)}ms`);
    return NextResponse.json({
      success: true,
      message: 'Lesson saved to history',
      sessionId,
    });
  } catch (error) {
    console.error(`[${rid}] ERR ${since(t0)}ms`, error);
    console.error('Lesson history save error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save lesson history' },
      { status: 500 }
    );
  }
}
