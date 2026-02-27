import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { updateCorrectionAfterReview } from '@/lib/sheetHelper';
import { makeRid, nowMs, since } from '@/lib/perf';
import { correctionReviewBodySchema, parseBody } from '@/lib/apiSchemas';

// POST: Process review result and update correction
export async function POST(request: NextRequest) {
  const rid = makeRid('corr');
  const t0 = nowMs();

  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ success: false, error: 'Not logged in' }, { status: 401 });
    }

    const email = session.user.email;

    // Parse and validate request body
    const rawBody = await request.json();
    const parsed = parseBody(correctionReviewBodySchema, rawBody);
    if (!parsed.success) return parsed.response;
    const { correctionId, quality } = parsed.data;

    // If no Google Sheets credentials, return success for development
    if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
      console.log('No Google Sheets credentials, skipping review update');
      return NextResponse.json({ success: true, message: 'Development mode - not saved' });
    }

    if (!process.env.GOOGLE_SUBSCRIPTION_SHEET_ID) {
      console.log('No spreadsheet ID configured');
      return NextResponse.json({ success: true, message: 'No spreadsheet configured' });
    }

    // Update correction using optimized helper (SM-2 algorithm)
    const success = await updateCorrectionAfterReview(email, correctionId, quality);

    if (!success) {
      return NextResponse.json(
        { success: false, error: 'Correction not found or update failed' },
        { status: 404 }
      );
    }

    console.log(`[${rid}] OK ${since(t0)}ms`);
    return NextResponse.json({
      success: true,
      message: 'Review processed',
      correctionId,
      quality,
    });
  } catch (error) {
    console.error(`[${rid}] ERR ${since(t0)}ms`, error);
    console.error('Review processing error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process review' },
      { status: 500 }
    );
  }
}
