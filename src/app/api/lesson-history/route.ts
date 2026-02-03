import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { getServerSession } from 'next-auth';

// GET: Retrieve lesson history for current user
export async function GET() {
  try {
    const session = await getServerSession();

    if (!session?.user?.email) {
      return NextResponse.json({ lessons: [], error: 'Not logged in' });
    }

    const email = session.user.email;

    // If no Google Sheets credentials, return empty for development
    if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
      console.log('No Google Sheets credentials, returning empty lesson history');
      return NextResponse.json({ lessons: [], email });
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
      return NextResponse.json({ lessons: [], email });
    }

    // Read the LessonHistory sheet
    // Format: A=Email, B=DateTime, C=Tutor, D=Duration, E=TopicSummary, F=FeedbackSummary, G=KeyCorrections, H=Level, I=LevelDetails
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'LessonHistory!A:I',
    });

    const rows = response.data.values || [];
    const lessons = [];

    for (let i = 1; i < rows.length; i++) { // Skip header row
      const row = rows[i];
      const rowEmail = row[0];

      if (rowEmail?.toLowerCase() === email.toLowerCase()) {
        lessons.push({
          dateTime: row[1] || '',
          tutor: row[2] || '',
          duration: parseInt(row[3] || '0', 10),
          topicSummary: row[4] || '',
          feedbackSummary: row[5] || '',
          keyCorrections: row[6] || '',
          level: row[7] || '',
          levelDetails: row[8] ? JSON.parse(row[8]) : null,
        });
      }
    }

    // Sort by date descending (most recent first)
    lessons.sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime());

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
    const session = await getServerSession();

    if (!session?.user?.email) {
      return NextResponse.json({ success: false, error: 'Not logged in' }, { status: 401 });
    }

    const email = session.user.email;

    // Parse request body
    const body = await request.json();
    const {
      tutor,
      duration,
      topicSummary,
      feedbackSummary,
      keyCorrections,
      level,
      levelDetails,
    } = body;

    // If no Google Sheets credentials, return success for development
    if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
      console.log('No Google Sheets credentials, skipping lesson history save');
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

    // Append new row to LessonHistory sheet
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'LessonHistory!A:I',
      valueInputOption: 'RAW',
      requestBody: {
        values: [[
          email,
          koreaTime,
          tutor || '',
          duration || 0,
          topicSummary || '',
          feedbackSummary || '',
          keyCorrections || '',
          level || '',
          levelDetails ? JSON.stringify(levelDetails) : '',
        ]],
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Lesson saved to history',
    });
  } catch (error) {
    console.error('Lesson history save error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save lesson history' },
      { status: 500 }
    );
  }
}
