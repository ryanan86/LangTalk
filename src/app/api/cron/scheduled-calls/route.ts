import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { sendPushNotification } from '@/lib/firebaseAdmin';
import webpush from 'web-push';

const tutorNames: Record<string, string> = {
  emma: 'Emma',
  james: 'James',
  charlotte: 'Charlotte',
  oliver: 'Oliver',
  alina: 'Alina',
  henry: 'Henry',
};

const ALL_TUTORS = Object.keys(tutorNames);

// Configure web-push with VAPID keys
if (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    'mailto:ryan@nuklabs.com',
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

/**
 * Send web push notification
 */
async function sendWebPush(
  subscriptionJson: string,
  title: string,
  body: string,
  data: Record<string, string>
): Promise<boolean> {
  try {
    const subscription = JSON.parse(subscriptionJson);
    await webpush.sendNotification(
      subscription,
      JSON.stringify({ title, body, ...data })
    );
    return true;
  } catch (error: unknown) {
    const pushError = error as { statusCode?: number };
    console.error('Web push send error:', error);
    // 410 Gone = subscription expired
    if (pushError.statusCode === 410 || pushError.statusCode === 404) {
      return false;
    }
    return false;
  }
}

/**
 * Helper: get current hour, minute, day in a given IANA timezone.
 * Falls back to Asia/Seoul if timezone is missing or invalid.
 */
function getUserLocalTime(now: Date, timezone?: string) {
  const tz = timezone || 'Asia/Seoul';
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hour: 'numeric',
      minute: 'numeric',
      weekday: 'short',
      hour12: false,
    });
    const parts = formatter.formatToParts(now);
    const hour = parseInt(parts.find(p => p.type === 'hour')?.value || '0');
    const minute = parseInt(parts.find(p => p.type === 'minute')?.value || '0');
    const dayMap: Record<string, number> = {
      Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
    };
    const dayStr = parts.find(p => p.type === 'weekday')?.value || 'Mon';
    const day = dayMap[dayStr] ?? 1;
    return { hour, minute, day };
  } catch {
    // Invalid timezone fallback to KST
    const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
    return {
      hour: kst.getUTCHours(),
      minute: kst.getUTCMinutes(),
      day: kst.getUTCDay(),
    };
  }
}

function getTimeSlot(hour: number, minute: number) {
  const roundedMinute = minute < 15 ? '00' : minute < 45 ? '30' : '00';
  const roundedHour = minute >= 45 ? (hour + 1) % 24 : hour;
  return `${String(roundedHour).padStart(2, '0')}:${roundedMinute}`;
}

/**
 * GET /api/cron/scheduled-calls
 * Vercel Cron triggers this every 30 minutes.
 * Finds users whose scheduled time matches now and sends push (FCM + Web Push).
 */
export async function GET(request: NextRequest) {
  // Verify cron secret to prevent unauthorized access
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
    return NextResponse.json({ error: 'No Google Sheets credentials' }, { status: 500 });
  }

  try {
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
      return NextResponse.json({ error: 'No spreadsheet ID' }, { status: 500 });
    }

    // Read Users sheet (A=email, B=subscription, C=profile, D=stats)
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Users!A:D',
    });

    const rows = response.data.values || [];
    const now = new Date();

    let sentFcm = 0;
    let sentWeb = 0;
    let skipped = 0;

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row[2]) continue; // no profile

      try {
        const profile = JSON.parse(row[2]);
        const schedule = profile.schedule;
        const fcmToken = profile.fcmToken;
        const webPushSub = profile.webPushSubscription;

        if (!schedule?.enabled) {
          skipped++;
          continue;
        }

        // Need at least one push channel
        if (!fcmToken && !webPushSub) {
          skipped++;
          continue;
        }

        // Get current time in user's timezone
        const userTime = getUserLocalTime(now, schedule.timezone);
        const currentSlot = getTimeSlot(userTime.hour, userTime.minute);

        // Check if current day is in schedule
        if (!schedule.days?.includes(userTime.day)) {
          skipped++;
          continue;
        }

        // Check if current time slot matches any scheduled time
        const matchesTime = schedule.times?.some((time: string) => {
          const [h, m] = time.split(':').map(Number);
          const scheduledSlot = getTimeSlot(h, m);
          return scheduledSlot === currentSlot;
        });

        if (!matchesTime) {
          skipped++;
          continue;
        }

        // Pick tutor
        const tutorId = schedule.preferredTutor === 'random'
          ? ALL_TUTORS[Math.floor(Math.random() * ALL_TUTORS.length)]
          : schedule.preferredTutor || ALL_TUTORS[Math.floor(Math.random() * ALL_TUTORS.length)];

        const tutorName = tutorNames[tutorId] || 'Emma';
        const title = `${tutorName} is calling you!`;
        const body = 'Time for your English practice session!';
        const pushData = { type: 'scheduled_call', tutorId, tutorName };

        // Send FCM push (native app)
        if (fcmToken) {
          const ok = await sendPushNotification(fcmToken, title, body, pushData);
          if (ok) sentFcm++;
        }

        // Send Web Push (browser)
        if (webPushSub) {
          const ok = await sendWebPush(webPushSub, title, body, pushData);
          if (ok) sentWeb++;
        }
      } catch {
        skipped++;
        continue;
      }
    }

    return NextResponse.json({
      success: true,
      utcTime: now.toISOString(),
      sentFcm,
      sentWeb,
      skipped,
    });
  } catch (error) {
    console.error('Scheduled calls cron error:', error);
    return NextResponse.json({ error: 'Cron job failed' }, { status: 500 });
  }
}
