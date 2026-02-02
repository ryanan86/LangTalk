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
    // Expected format: Column A = Email, Column B = Expiry Date (YYYY-MM-DD), Column C = Status (active/inactive)
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Subscriptions!A:C',
    });

    const rows = response.data.values || [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const row of rows) {
      const [rowEmail, expiryDate, status] = row;

      if (rowEmail?.toLowerCase() === email.toLowerCase()) {
        // Check if status is active
        if (status?.toLowerCase() !== 'active') {
          return NextResponse.json({
            subscribed: false,
            reason: 'Subscription is not active',
            email
          });
        }

        // Check expiry date
        if (expiryDate) {
          const expiry = new Date(expiryDate);
          if (expiry < today) {
            return NextResponse.json({
              subscribed: false,
              reason: 'Subscription has expired',
              expiryDate,
              email
            });
          }
        }

        return NextResponse.json({
          subscribed: true,
          expiryDate,
          email
        });
      }
    }

    return NextResponse.json({
      subscribed: false,
      reason: 'Email not found in subscription list',
      email
    });
  } catch (error) {
    console.error('Subscription check error:', error);
    // In case of error, allow access (fail-open for better UX during development)
    return NextResponse.json({ subscribed: true, error: 'Check failed, allowing access' });
  }
}
