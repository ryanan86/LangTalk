import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { getServerSession } from 'next-auth';

export async function POST() {
  try {
    const session = await getServerSession();

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Not logged in' }, { status: 401 });
    }

    const email = session.user.email;
    const name = session.user.name || '';

    // Check if Google Sheets credentials are configured
    if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
      return NextResponse.json({ error: 'Google Sheets not configured' }, { status: 500 });
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
      return NextResponse.json({ error: 'Spreadsheet ID not configured' }, { status: 500 });
    }

    // First, check if email already exists
    const existingData = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Subscriptions!A:C',
    });

    const rows = existingData.data.values || [];
    const emailExists = rows.some(row => row[0]?.toLowerCase() === email.toLowerCase());

    if (emailExists) {
      return NextResponse.json({
        error: 'Already signed up',
        message: '이미 베타 신청이 완료되었습니다.'
      }, { status: 400 });
    }

    // Add new row
    const signupDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'Subscriptions!A:D',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[email, '', 'pending', name, signupDate]],
      },
    });

    return NextResponse.json({
      success: true,
      message: '베타 신청이 완료되었습니다. 승인 후 이용 가능합니다.'
    });
  } catch (error) {
    console.error('Beta signup error:', error);
    return NextResponse.json(
      { error: 'Failed to submit beta signup' },
      { status: 500 }
    );
  }
}
