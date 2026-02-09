import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { checkRateLimit, getRateLimitId, RATE_LIMITS } from '@/lib/rateLimit';
import { randomUUID } from 'crypto';
import {
  getLearningData,
  addCorrections,
  getDueCorrections,
} from '@/lib/sheetHelper';
import { CorrectionItem } from '@/lib/sheetTypes';

// GET: Retrieve corrections for review (due today or earlier)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ corrections: [], error: 'Not logged in' });
    }

    // Rate limit
    const rateLimitResult = checkRateLimit(getRateLimitId(session.user.email, request), RATE_LIMITS.light);
    if (rateLimitResult) return rateLimitResult;

    const email = session.user.email;
    const searchParams = request.nextUrl.searchParams;
    const dueOnly = searchParams.get('due') !== 'false'; // Default: only due corrections
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    // If no Google Sheets credentials, return empty for development
    if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
      console.log('No Google Sheets credentials, returning empty corrections');
      return NextResponse.json({ corrections: [], count: 0, email });
    }

    if (!process.env.GOOGLE_SUBSCRIPTION_SHEET_ID) {
      console.log('No spreadsheet ID configured');
      return NextResponse.json({ corrections: [], count: 0, email });
    }

    let corrections: CorrectionItem[];

    if (dueOnly) {
      // Get only corrections due for review
      corrections = await getDueCorrections(email);
    } else {
      // Get all corrections from learning data
      const learningData = await getLearningData(email);
      corrections = learningData?.corrections || [];
    }

    // Sort by next review date (oldest first)
    corrections.sort((a, b) =>
      new Date(a.nextReviewAt).getTime() - new Date(b.nextReviewAt).getTime()
    );

    // Apply limit
    const limitedCorrections = corrections.slice(0, limit);

    // Transform to legacy format for backward compatibility
    const formattedCorrections = limitedCorrections.map(c => ({
      correctionId: c.id,
      email,
      original: c.original,
      corrected: c.corrected,
      explanation: c.explanation,
      category: c.category,
      difficulty: 3, // Not stored in new format
      createdAt: c.createdAt,
      nextReviewAt: c.nextReviewAt,
      interval: c.interval,
      easeFactor: c.easeFactor,
      repetitions: c.repetitions,
      lastReviewedAt: c.lastReviewedAt || '',
      status: c.status,
    }));

    return NextResponse.json({
      corrections: formattedCorrections,
      count: corrections.length,
      email,
    });
  } catch (error) {
    console.error('Corrections retrieval error:', error);
    return NextResponse.json({ corrections: [], error: 'Failed to retrieve corrections' });
  }
}

// POST: Save new correction(s)
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

    // Parse request body - can be single correction or array
    const body = await request.json();
    const rawCorrections = Array.isArray(body) ? body : [body];

    // If no Google Sheets credentials, return success for development
    if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
      console.log('No Google Sheets credentials, skipping corrections save');
      return NextResponse.json({ success: true, message: 'Development mode - not saved' });
    }

    if (!process.env.GOOGLE_SUBSCRIPTION_SHEET_ID) {
      console.log('No spreadsheet ID configured');
      return NextResponse.json({ success: true, message: 'No spreadsheet configured' });
    }

    // Create timestamp in Korea timezone
    const now = new Date();
    const koreaTime = new Intl.DateTimeFormat('ko-KR', {
      timeZone: 'Asia/Seoul',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).format(now);

    // Calculate initial next review date (tomorrow)
    const nextReviewAt = new Date();
    nextReviewAt.setDate(nextReviewAt.getDate() + 1);
    const nextReviewStr = nextReviewAt.toISOString().split('T')[0];

    // Prepare correction items
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
      nextReviewAt: nextReviewStr,
      interval: 1,
      easeFactor: 2.5,
      repetitions: 0,
      createdAt: koreaTime,
      status: 'active' as const,
    }));

    // Add corrections using helper
    const success = await addCorrections(email, correctionItems);

    if (!success) {
      return NextResponse.json(
        { success: false, error: 'Failed to save corrections' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `${correctionItems.length} correction(s) saved`,
      count: correctionItems.length,
    });
  } catch (error) {
    console.error('Corrections save error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save corrections' },
      { status: 500 }
    );
  }
}
