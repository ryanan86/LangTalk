import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// Admin email to notify
const ADMIN_EMAIL = 'ryan@nuklabs.com';

export async function POST() {
  try {
    const session = await getServerSession(authOptions);

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

    // Check if email already exists in new Users sheet
    const existingData = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Users!A:B',
    });

    const rows = existingData.data.values || [];
    const emailExists = rows.slice(1).some(row => row[0]?.toLowerCase() === email.toLowerCase());

    if (emailExists) {
      return NextResponse.json({
        error: 'Already signed up',
        message: '이미 서비스 이용 신청이 완료되었습니다.'
      }, { status: 400 });
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

    // Prepare data for new Users sheet structure
    const subscription = {
      status: 'pending',
      expiryDate: '',
      signupDate: koreaTime,
      name: name,
      plan: 'free',
    };

    const profile = {
      type: 'adult_beginner',
      interests: [],
      nativeLanguage: 'ko',
    };

    const stats = {
      sessionCount: 0,
      totalMinutes: 0,
      debateCount: 0,
      currentStreak: 0,
      longestStreak: 0,
    };

    // Add to new Users sheet
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'Users!A:E',
      valueInputOption: 'RAW',
      requestBody: {
        values: [[
          email,
          JSON.stringify(subscription),
          JSON.stringify(profile),
          JSON.stringify(stats),
          koreaTime,
        ]],
      },
    });

    // Also create empty LearningData row
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'LearningData!A:F',
      valueInputOption: 'RAW',
      requestBody: {
        values: [[
          email,
          JSON.stringify([]), // recentSessions
          JSON.stringify([]), // corrections
          JSON.stringify([]), // topicsHistory
          JSON.stringify([]), // debateHistory
          koreaTime,
        ]],
      },
    });

    // Send notification email to admin (if configured)
    await sendAdminNotification(email, name, koreaTime);

    return NextResponse.json({
      success: true,
      message: '서비스 이용 신청이 완료되었습니다. 승인 후 이용 가능합니다.'
    });
  } catch (error) {
    console.error('Beta signup error:', error);
    return NextResponse.json(
      { error: 'Failed to submit beta signup' },
      { status: 500 }
    );
  }
}

// Send notification to admin
async function sendAdminNotification(userEmail: string, userName: string, signupTime: string) {
  // Option 1: Telegram (if TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID are configured)
  if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID) {
    try {
      const escapedEmail = userEmail.replace(/[<>&]/g, '');
      const escapedName = (userName || '(없음)').replace(/[<>&]/g, '');

      const message = `[새 서비스 신청]\n\n이메일: ${escapedEmail}\n이름: ${escapedName}\n시간: ${signupTime}\n\nhttps://taptalk.xyz/admin/users`;

      const res = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: process.env.TELEGRAM_CHAT_ID,
          text: message,
          disable_web_page_preview: true,
        }),
      });

      const result = await res.json();
      if (!result.ok) {
        console.error('Telegram API error:', result.description);
      } else {
        console.log('Admin notification sent via Telegram');
      }
    } catch (e) {
      console.error('Failed to send Telegram notification:', e);
    }
    return;
  }

  // Option 2: Use Resend (if RESEND_API_KEY is configured)
  if (process.env.RESEND_API_KEY) {
    try {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'TapTalk <noreply@taptalk.xyz>',
          to: ADMIN_EMAIL,
          subject: `[TapTalk] 새 서비스 신청: ${userEmail}`,
          html: `
            <h2>새로운 서비스 신청이 들어왔습니다!</h2>
            <p><strong>이메일:</strong> ${userEmail}</p>
            <p><strong>이름:</strong> ${userName || '(없음)'}</p>
            <p><strong>신청 시간:</strong> ${signupTime}</p>
            <br/>
            <p><a href="https://taptalk.xyz/admin/users">관리자 페이지에서 승인하기</a></p>
          `,
        }),
      });
      console.log('Admin notification sent via Resend');
    } catch (e) {
      console.error('Failed to send Resend notification:', e);
    }
    return;
  }

  // Option 3: Use Slack webhook (if SLACK_WEBHOOK_URL is configured)
  if (process.env.SLACK_WEBHOOK_URL) {
    try {
      await fetch(process.env.SLACK_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `🆕 새 서비스 신청!\n이메일: ${userEmail}\n이름: ${userName || '(없음)'}\n시간: ${signupTime}\n<https://taptalk.xyz/admin/users|승인하러 가기>`,
        }),
      });
      console.log('Admin notification sent via Slack');
    } catch (e) {
      console.error('Failed to send Slack notification:', e);
    }
    return;
  }

  // No notification service configured
  console.log('No notification service configured. New signup:', userEmail);
}
