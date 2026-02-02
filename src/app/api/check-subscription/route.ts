import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { getServerSession } from 'next-auth';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session?.user?.email) {
      return NextResponse.json({ subscribed: false, reason: 'Not logged in' });
    }

    const email = session.user.email;

    // If no Google Sheets credentials, allow all (for development)
    if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
      console.log('No Google Sheets credentials, allowing access for development');
      return NextResponse.json({ subscribed: true, email });
    }

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    const spreadsheetId = process.env.GOOGLE_SUBSCRIPTION_SHEET_ID;
    if (!spreadsheetId) {
      console.log('No spreadsheet ID configured, allowing access');
      return NextResponse.json({ subscribed: true, email });
    }

    // Read the subscription sheet
    // Expected format: Column A = Email, Column B = Expiry Date (YYYY-MM-DD), Column C = Status (active/inactive),
    // Column D = Name, Column E = SignupDate, Column F = SessionCount, Column G = Level, Column H = LevelDetails
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Subscriptions!A:H',
    });

    const rows = response.data.values || [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const row of rows) {
      const [rowEmail, expiryDate, status, , , sessionCountStr, evaluatedGrade, levelDetailsStr] = row;

      if (rowEmail?.toLowerCase() === email.toLowerCase()) {
        const statusLower = status?.toLowerCase() || '';
        const sessionCount = parseInt(sessionCountStr || '0', 10);
        let levelDetails = null;
        try {
          if (levelDetailsStr) levelDetails = JSON.parse(levelDetailsStr);
        } catch { /* ignore parsing errors */ }

        // Check if status is pending (waiting for approval)
        if (statusLower === 'pending') {
          return NextResponse.json({
            subscribed: false,
            status: 'pending',
            reason: '베타 신청이 검토 중입니다.',
            sessionCount,
            evaluatedGrade: evaluatedGrade || null,
            levelDetails,
            email
          });
        }

        // Check if status is active
        if (statusLower !== 'active') {
          return NextResponse.json({
            subscribed: false,
            status: statusLower || 'inactive',
            reason: '구독이 활성화되지 않았습니다.',
            sessionCount,
            evaluatedGrade: evaluatedGrade || null,
            levelDetails,
            email
          });
        }

        // Check expiry date
        if (expiryDate) {
          const expiry = new Date(expiryDate);
          if (expiry < today) {
            return NextResponse.json({
              subscribed: false,
              status: 'expired',
              reason: '구독 기간이 만료되었습니다.',
              expiryDate,
              sessionCount,
              evaluatedGrade: evaluatedGrade || null,
              levelDetails,
              email
            });
          }
        }

        return NextResponse.json({
          subscribed: true,
          status: 'active',
          expiryDate,
          sessionCount,
          evaluatedGrade: evaluatedGrade || null,
          levelDetails,
          email
        });
      }
    }

    return NextResponse.json({
      subscribed: false,
      status: 'not_found',
      reason: '베타 신청이 필요합니다.',
      sessionCount: 0,
      email
    });
  } catch (error) {
    console.error('Subscription check error:', error);
    // In case of error, allow access (fail-open for better UX during development)
    return NextResponse.json({ subscribed: true, error: 'Check failed, allowing access' });
  }
}
