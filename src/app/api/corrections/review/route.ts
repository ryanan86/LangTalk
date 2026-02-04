import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { updateCorrectionAfterReview } from '@/lib/sheetHelper';

// POST: Process review result and update correction
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session?.user?.email) {
      return NextResponse.json({ success: false, error: 'Not logged in' }, { status: 401 });
    }

    const email = session.user.email;

    // Parse request body
    const body = await request.json();
    const { correctionId, quality } = body; // quality: 0-5

    if (!correctionId || quality === undefined) {
      return NextResponse.json(
        { success: false, error: 'Missing correctionId or quality' },
        { status: 400 }
      );
    }

    // Validate quality range
    if (quality < 0 || quality > 5) {
      return NextResponse.json(
        { success: false, error: 'Quality must be between 0 and 5' },
        { status: 400 }
      );
    }

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

    return NextResponse.json({
      success: true,
      message: 'Review processed',
      correctionId,
      quality,
    });
  } catch (error) {
    console.error('Review processing error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process review' },
      { status: 500 }
    );
  }
}
