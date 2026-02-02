import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { getServerSession } from 'next-auth';
import { MIN_SESSIONS_FOR_DEBATE } from '@/lib/debateTypes';

// GET: Retrieve current session count
export async function GET() {
  try {
    const session = await getServerSession();

    if (!session?.user?.email) {
      return NextResponse.json({ sessionCount: 0, canDebate: false, reason: 'Not logged in' });
    }

    const email = session.user.email;

    // If no Google Sheets credentials, return default for development
    if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
      console.log('No Google Sheets credentials, returning default session count');
      return NextResponse.json({ sessionCount: 5, canDebate: true, email });
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
      return NextResponse.json({ sessionCount: 5, canDebate: true, email });
    }

    // Read the subscription sheet
    // Expected format: Column A = Email, B = Expiry, C = Status, D = Name, E = SignupDate, F = SessionCount
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Subscriptions!A:F',
    });

    const rows = response.data.values || [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowEmail = row[0];

      if (rowEmail?.toLowerCase() === email.toLowerCase()) {
        const sessionCount = parseInt(row[5] || '0', 10);
        return NextResponse.json({
          sessionCount,
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
    return NextResponse.json({ sessionCount: 0, canDebate: false, error: 'Failed to retrieve session count' });
  }
}

// POST: Increment session count
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function POST(_request: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session?.user?.email) {
      return NextResponse.json({ success: false, error: 'Not logged in' }, { status: 401 });
    }

    const email = session.user.email;

    // If no Google Sheets credentials, return success for development
    if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
      console.log('No Google Sheets credentials, skipping session count increment');
      return NextResponse.json({ success: true, newCount: 5 });
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
      return NextResponse.json({ success: true, newCount: 1 });
    }

    // Read the subscription sheet to find the user
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Subscriptions!A:F',
    });

    const rows = response.data.values || [];
    let rowIndex = -1;
    let currentCount = 0;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowEmail = row[0];

      if (rowEmail?.toLowerCase() === email.toLowerCase()) {
        rowIndex = i + 1; // Sheets uses 1-based indexing
        currentCount = parseInt(row[5] || '0', 10);
        break;
      }
    }

    if (rowIndex === -1) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    // Increment the session count
    const newCount = currentCount + 1;

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `Subscriptions!F${rowIndex}`,
      valueInputOption: 'RAW',
      requestBody: {
        values: [[newCount]],
      },
    });

    return NextResponse.json({
      success: true,
      newCount,
      canDebate: newCount >= MIN_SESSIONS_FOR_DEBATE,
    });
  } catch (error) {
    console.error('Session count increment error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to increment session count' },
      { status: 500 }
    );
  }
}
