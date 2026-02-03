import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { getServerSession } from 'next-auth';

// GET: Retrieve user profile
export async function GET() {
  try {
    const session = await getServerSession();

    if (!session?.user?.email) {
      return NextResponse.json({ profile: null, error: 'Not logged in' });
    }

    const email = session.user.email;

    // If no Google Sheets credentials, return empty for development
    if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
      console.log('No Google Sheets credentials, returning empty profile');
      return NextResponse.json({ profile: null, email });
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
      return NextResponse.json({ profile: null, email });
    }

    // Read the UserProfiles sheet
    // Format: A=Email, B=ProfileType, C=Interests, D=CustomContext, E=PreferredTopics, F=CreatedAt, G=UpdatedAt
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'UserProfiles!A:G',
    });

    const rows = response.data.values || [];

    for (let i = 1; i < rows.length; i++) { // Skip header row
      const row = rows[i];
      const rowEmail = row[0];

      if (rowEmail?.toLowerCase() === email.toLowerCase()) {
        return NextResponse.json({
          profile: {
            email: row[0] || '',
            profileType: row[1] || '',
            interests: row[2] ? JSON.parse(row[2]) : [],
            customContext: row[3] || '',
            preferredTopics: row[4] ? JSON.parse(row[4]) : [],
            createdAt: row[5] || '',
            updatedAt: row[6] || '',
          },
          email,
        });
      }
    }

    // No profile found
    return NextResponse.json({ profile: null, email });
  } catch (error) {
    console.error('User profile retrieval error:', error);
    return NextResponse.json({ profile: null, error: 'Failed to retrieve profile' });
  }
}

// POST: Create or update user profile
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session?.user?.email) {
      return NextResponse.json({ success: false, error: 'Not logged in' }, { status: 401 });
    }

    const email = session.user.email;

    // Parse request body
    const body = await request.json();
    const { profileType, interests, customContext, preferredTopics } = body;

    // If no Google Sheets credentials, return success for development
    if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
      console.log('No Google Sheets credentials, skipping profile save');
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

    // Check if profile already exists
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'UserProfiles!A:G',
    });

    const rows = response.data.values || [];
    let existingRowIndex = -1;

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (row[0]?.toLowerCase() === email.toLowerCase()) {
        existingRowIndex = i + 1; // 1-indexed for Sheets API
        break;
      }
    }

    const profileData = [
      email,
      profileType || '',
      JSON.stringify(interests || []),
      customContext || '',
      JSON.stringify(preferredTopics || []),
      existingRowIndex === -1 ? koreaTime : rows[existingRowIndex - 1]?.[5] || koreaTime, // CreatedAt
      koreaTime, // UpdatedAt
    ];

    if (existingRowIndex !== -1) {
      // Update existing row
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `UserProfiles!A${existingRowIndex}:G${existingRowIndex}`,
        valueInputOption: 'RAW',
        requestBody: {
          values: [profileData],
        },
      });
    } else {
      // Append new row
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: 'UserProfiles!A:G',
        valueInputOption: 'RAW',
        requestBody: {
          values: [profileData],
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: existingRowIndex !== -1 ? 'Profile updated' : 'Profile created',
      profile: {
        email,
        profileType,
        interests,
        customContext,
        preferredTopics,
      },
    });
  } catch (error) {
    console.error('User profile save error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save profile' },
      { status: 500 }
    );
  }
}
