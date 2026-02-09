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

// GET: Retrieve lesson history for current user
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ lessons: [], error: 'Not logged in' });
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

    // Transform sessions to legacy format for backward compatibility
    const lessons = learningData.recentSessions.map(s => ({
      dateTime: s.date,
      tutor: s.tutor || '',
      duration: s.duration,
      topicSummary: s.topics.join(', '),
      feedbackSummary: '', // Not stored in new format
      keyCorrections: '', // Corrections are stored separately now
      level: s.level || '',
      levelDetails: null,
    }));

    return NextResponse.json({
      lessons,
      email,
      total: lessons.length,
    });
  } catch (error) {
    console.error('Lesson history retrieval error:', error);
    return NextResponse.json({ lessons: [], error: 'Failed to retrieve lesson history' });
  }
}

// POST: Save a new lesson to history
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

    // Parse request body
    const body = await request.json();
    const {
      tutor,
      duration,
      topicSummary,
      // feedbackSummary, // Not used in new format
      // keyCorrections, // Corrections are stored separately now
      level,
      levelDetails,
      corrections: rawCorrections, // Array of correction objects
    } = body;

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
    const koreaDate = new Intl.DateTimeFormat('ko-KR', {
      timeZone: 'Asia/Seoul',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).format(now);

    const sessionSummary: SessionSummary = {
      id: sessionId,
      date: koreaDate,
      type: 'tutoring',
      tutor: tutor || '',
      duration: duration || 0,
      topics: topicSummary ? [topicSummary] : [],
      level: level || '',
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
        createdAt: koreaDate,
        fromSession: sessionId,
        status: 'active',
      }));

      await addCorrections(email, correctionItems);
    }

    // Update user stats
    await updateUserFields(email, {
      stats: {
        sessionCount: undefined, // Will be incremented
        lastSessionAt: koreaDate,
        currentLevel: level || undefined,
        levelDetails: levelDetails || undefined,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Lesson saved to history',
      sessionId,
    });
  } catch (error) {
    console.error('Lesson history save error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save lesson history' },
      { status: 500 }
    );
  }
}
