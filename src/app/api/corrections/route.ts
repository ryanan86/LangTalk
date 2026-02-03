import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { getServerSession } from 'next-auth';
import { randomUUID } from 'crypto';

interface Correction {
  correctionId: string;
  email: string;
  original: string;
  corrected: string;
  explanation: string;
  category: string;
  difficulty: number;
  createdAt: string;
  nextReviewAt: string;
  interval: number;
  easeFactor: number;
  repetitions: number;
  lastReviewedAt: string;
  status: string;
}

// GET: Retrieve corrections for review (due today or earlier)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session?.user?.email) {
      return NextResponse.json({ corrections: [], error: 'Not logged in' });
    }

    const email = session.user.email;
    const searchParams = request.nextUrl.searchParams;
    const dueOnly = searchParams.get('due') !== 'false'; // Default: only due corrections
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    // If no Google Sheets credentials, return empty for development
    if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
      console.log('No Google Sheets credentials, returning empty corrections');
      return NextResponse.json({ corrections: [], count: 0, email });
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
      return NextResponse.json({ corrections: [], count: 0, email });
    }

    // Read the Corrections sheet
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Corrections!A:N',
    });

    const rows = response.data.values || [];
    const corrections: Correction[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 1; i < rows.length; i++) { // Skip header row
      const row = rows[i];
      const rowEmail = row[1]; // Email is in column B

      if (rowEmail?.toLowerCase() === email.toLowerCase()) {
        const nextReviewAt = row[8] ? new Date(row[8]) : new Date();
        const status = row[13] || 'active';

        // Skip if not due and dueOnly is true
        if (dueOnly && nextReviewAt > today) {
          continue;
        }

        // Skip archived/mastered if only getting due items
        if (dueOnly && status !== 'active') {
          continue;
        }

        corrections.push({
          correctionId: row[0] || '',
          email: row[1] || '',
          original: row[2] || '',
          corrected: row[3] || '',
          explanation: row[4] || '',
          category: row[5] || '',
          difficulty: parseInt(row[6] || '3', 10),
          createdAt: row[7] || '',
          nextReviewAt: row[8] || '',
          interval: parseInt(row[9] || '1', 10),
          easeFactor: parseFloat(row[10] || '2.5'),
          repetitions: parseInt(row[11] || '0', 10),
          lastReviewedAt: row[12] || '',
          status: row[13] || 'active',
        });
      }
    }

    // Sort by next review date (oldest first)
    corrections.sort((a, b) =>
      new Date(a.nextReviewAt).getTime() - new Date(b.nextReviewAt).getTime()
    );

    // Apply limit
    const limitedCorrections = corrections.slice(0, limit);

    return NextResponse.json({
      corrections: limitedCorrections,
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
    const session = await getServerSession();

    if (!session?.user?.email) {
      return NextResponse.json({ success: false, error: 'Not logged in' }, { status: 401 });
    }

    const email = session.user.email;

    // Parse request body - can be single correction or array
    const body = await request.json();
    const corrections = Array.isArray(body) ? body : [body];

    // If no Google Sheets credentials, return success for development
    if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
      console.log('No Google Sheets credentials, skipping corrections save');
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

    // Prepare rows to append
    const rows = corrections.map(c => [
      randomUUID(),                           // A: CorrectionId
      email,                              // B: Email
      c.original || '',                   // C: Original
      c.corrected || '',                  // D: Corrected
      c.explanation || '',                // E: Explanation
      c.category || 'general',            // F: Category
      c.difficulty || 3,                  // G: Difficulty (1-5)
      koreaTime,                          // H: CreatedAt
      nextReviewStr,                      // I: NextReviewAt
      1,                                  // J: Interval (days)
      2.5,                                // K: EaseFactor
      0,                                  // L: Repetitions
      '',                                 // M: LastReviewedAt
      'active',                           // N: Status
    ]);

    // Append new rows to Corrections sheet
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'Corrections!A:N',
      valueInputOption: 'RAW',
      requestBody: {
        values: rows,
      },
    });

    return NextResponse.json({
      success: true,
      message: `${corrections.length} correction(s) saved`,
      count: corrections.length,
    });
  } catch (error) {
    console.error('Corrections save error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save corrections' },
      { status: 500 }
    );
  }
}
