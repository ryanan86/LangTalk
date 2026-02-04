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

// GET: List all users with learning data
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

    // Fetch both Users and LearningData in parallel
    const [usersResponse, learningResponse] = await Promise.all([
      sheets.spreadsheets.values.get({
        spreadsheetId,
        range: 'Users!A:E',
      }),
      sheets.spreadsheets.values.get({
        spreadsheetId,
        range: 'LearningData!A:F',
      }),
    ]);

    const userRows = usersResponse.data.values || [];
    const learningRows = learningResponse.data.values || [];

    // Build learning data map
    const learningMap = new Map<string, {
      recentSessions: unknown[];
      corrections: unknown[];
      topicsHistory: unknown[];
      debateHistory: unknown[];
    }>();

    for (let i = 1; i < learningRows.length; i++) {
      const row = learningRows[i];
      if (!row[0]) continue;
      try {
        learningMap.set(row[0].toLowerCase(), {
          recentSessions: row[1] ? JSON.parse(row[1]) : [],
          corrections: row[2] ? JSON.parse(row[2]) : [],
          topicsHistory: row[3] ? JSON.parse(row[3]) : [],
          debateHistory: row[4] ? JSON.parse(row[4]) : [],
        });
      } catch (e) {
        console.error(`Error parsing learning row ${i}:`, e);
      }
    }

    const users = [];

    for (let i = 1; i < userRows.length; i++) {
      const row = userRows[i];
      if (!row[0]) continue;

      try {
        const email = row[0];
        const learning = learningMap.get(email.toLowerCase());

        users.push({
          email,
          subscription: row[1] ? JSON.parse(row[1]) : { status: 'pending' },
          profile: row[2] ? JSON.parse(row[2]) : { type: '', interests: [] },
          stats: row[3] ? JSON.parse(row[3]) : { sessionCount: 0, totalMinutes: 0, debateCount: 0 },
          updatedAt: row[4] || '',
          rowIndex: i + 1,
          // Learning data
          recentSessions: learning?.recentSessions || [],
          corrections: learning?.corrections || [],
          topicsHistory: learning?.topicsHistory || [],
          debateHistory: learning?.debateHistory || [],
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
    const { email, status: newStatus, expiryDate: customExpiryDate } = body;

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

    // Use custom expiry date if provided, otherwise set default for new activations
    if (customExpiryDate) {
      updatedSubscription.expiryDate = customExpiryDate;
    } else if (newStatus === 'active' && !currentSubscription.expiryDate) {
      // 기본값: 다음달 말일
      const expiryDate = new Date();
      expiryDate.setMonth(expiryDate.getMonth() + 2);
      expiryDate.setDate(0); // 이전달 마지막 날
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
