import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { getServerSession } from 'next-auth';

const ADMIN_EMAILS = ['ryan@nuklabs.com', 'taewoongan@gmail.com'];

function getAuth() {
  return new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
}

// GET: List all users
export async function GET() {
  try {
    const session = await getServerSession();

    if (!session?.user?.email || !ADMIN_EMAILS.includes(session.user.email)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
      return NextResponse.json({ error: 'Google credentials not configured' }, { status: 500 });
    }

    const auth = getAuth();
    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.GOOGLE_SUBSCRIPTION_SHEET_ID;

    if (!spreadsheetId) {
      return NextResponse.json({ error: 'Spreadsheet ID not configured' }, { status: 500 });
    }

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Users!A:E',
    });

    const rows = response.data.values || [];
    const users = [];

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row[0]) continue;

      try {
        users.push({
          email: row[0],
          subscription: row[1] ? JSON.parse(row[1]) : { status: 'pending' },
          profile: row[2] ? JSON.parse(row[2]) : { type: '', interests: [] },
          stats: row[3] ? JSON.parse(row[3]) : { sessionCount: 0, totalMinutes: 0, debateCount: 0 },
          updatedAt: row[4] || '',
          rowIndex: i + 1,
        });
      } catch (e) {
        console.error(`Error parsing row ${i}:`, e);
      }
    }

    // Sort by signup date descending
    users.sort((a, b) => {
      const dateA = a.subscription.signupDate || '';
      const dateB = b.subscription.signupDate || '';
      return dateB.localeCompare(dateA);
    });

    return NextResponse.json({ users });
  } catch (error) {
    console.error('Admin users GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}

// POST: Update user status
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session?.user?.email || !ADMIN_EMAILS.includes(session.user.email)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { email, status: newStatus } = body;

    if (!email || !newStatus) {
      return NextResponse.json({ error: 'Missing email or status' }, { status: 400 });
    }

    if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
      return NextResponse.json({ error: 'Google credentials not configured' }, { status: 500 });
    }

    const auth = getAuth();
    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.GOOGLE_SUBSCRIPTION_SHEET_ID;

    if (!spreadsheetId) {
      return NextResponse.json({ error: 'Spreadsheet ID not configured' }, { status: 500 });
    }

    // Find user row
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Users!A:E',
    });

    const rows = response.data.values || [];
    let rowIndex = -1;
    let currentSubscription = { status: 'pending', expiryDate: '', signupDate: '', name: '', plan: 'free' };

    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0]?.toLowerCase() === email.toLowerCase()) {
        rowIndex = i + 1;
        if (rows[i][1]) {
          try {
            currentSubscription = JSON.parse(rows[i][1]);
          } catch (e) {
            console.error('Error parsing subscription:', e);
          }
        }
        break;
      }
    }

    if (rowIndex === -1) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Update subscription status
    const updatedSubscription = {
      ...currentSubscription,
      status: newStatus,
    };

    // If activating, set expiry date to 1 year from now
    if (newStatus === 'active' && !currentSubscription.expiryDate) {
      const expiryDate = new Date();
      expiryDate.setFullYear(expiryDate.getFullYear() + 1);
      updatedSubscription.expiryDate = expiryDate.toISOString().split('T')[0];
    }

    // Update timestamp
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

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `Users!B${rowIndex}:E${rowIndex}`,
      valueInputOption: 'RAW',
      requestBody: {
        values: [[
          JSON.stringify(updatedSubscription),
          rows[rowIndex - 1][2] || '{}', // Keep profile
          rows[rowIndex - 1][3] || '{}', // Keep stats
          koreaTime,
        ]],
      },
    });

    return NextResponse.json({
      success: true,
      email,
      newStatus,
      expiryDate: updatedSubscription.expiryDate,
    });
  } catch (error) {
    console.error('Admin users POST error:', error);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}
