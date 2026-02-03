import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { getServerSession } from 'next-auth';
import { calculateSM2, getCorrectionStatus } from '@/lib/spacedRepetition';

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

    // If no Google Sheets credentials, return success for development
    if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
      console.log('No Google Sheets credentials, skipping review update');
      return NextResponse.json({ success: true, message: 'Development mode - not saved' });
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
      console.log('No spreadsheet ID configured');
      return NextResponse.json({ success: true, message: 'No spreadsheet configured' });
    }

    // Find the correction row
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Corrections!A:N',
    });

    const rows = response.data.values || [];
    let rowIndex = -1;
    let currentData: {
      interval: number;
      easeFactor: number;
      repetitions: number;
    } | null = null;

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (row[0] === correctionId && row[1]?.toLowerCase() === email.toLowerCase()) {
        rowIndex = i + 1; // 1-indexed for Sheets API
        currentData = {
          interval: parseInt(row[9] || '1', 10),
          easeFactor: parseFloat(row[10] || '2.5'),
          repetitions: parseInt(row[11] || '0', 10),
        };
        break;
      }
    }

    if (rowIndex === -1 || !currentData) {
      return NextResponse.json(
        { success: false, error: 'Correction not found' },
        { status: 404 }
      );
    }

    // Calculate new values using SM-2 algorithm
    const sm2Result = calculateSM2(
      quality,
      currentData.repetitions,
      currentData.easeFactor,
      currentData.interval
    );

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

    // Determine status
    const newStatus = getCorrectionStatus(
      sm2Result.repetitions,
      sm2Result.easeFactor,
      sm2Result.interval
    );

    // Update the row (columns I-N: NextReviewAt, Interval, EaseFactor, Repetitions, LastReviewedAt, Status)
    const nextReviewStr = sm2Result.nextReviewAt.toISOString().split('T')[0];

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `Corrections!I${rowIndex}:N${rowIndex}`,
      valueInputOption: 'RAW',
      requestBody: {
        values: [[
          nextReviewStr,                    // I: NextReviewAt
          sm2Result.interval,               // J: Interval
          sm2Result.easeFactor.toFixed(2),  // K: EaseFactor
          sm2Result.repetitions,            // L: Repetitions
          koreaTime,                        // M: LastReviewedAt
          newStatus,                        // N: Status
        ]],
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Review processed',
      result: {
        correctionId,
        quality,
        newInterval: sm2Result.interval,
        newEaseFactor: sm2Result.easeFactor,
        newRepetitions: sm2Result.repetitions,
        nextReviewAt: nextReviewStr,
        status: newStatus,
      },
    });
  } catch (error) {
    console.error('Review processing error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process review' },
      { status: 500 }
    );
  }
}
