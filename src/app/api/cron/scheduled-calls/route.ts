import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { sendPushNotification } from '@/lib/firebaseAdmin';

const tutorNames: Record<string, string> = {
  emma: 'Emma',
  james: 'James',
  charlotte: 'Charlotte',
  oliver: 'Oliver',
  alina: 'Alina',
  henry: 'Henry',
};

const ALL_TUTORS = Object.keys(tutorNames);

/**
 * GET /api/cron/scheduled-calls
 * Vercel Cron triggers this every 30 minutes.
 * Finds users whose scheduled time matches now and sends FCM push.
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

    // Get current time in KST (UTC+9)
    const kstHour = (now.getUTCHours() + 9) % 24;
    const kstMinute = now.getUTCMinutes();
    const kstDay = new Date(now.getTime() + 9 * 60 * 60 * 1000).getDay(); // 0=Sun

    // Round to nearest 30-min slot: "09:00" or "09:30"
    const roundedMinute = kstMinute < 15 ? '00' : kstMinute < 45 ? '30' : '00';
    const roundedHour = kstMinute >= 45 ? (kstHour + 1) % 24 : kstHour;
    const currentSlot = `${String(roundedHour).padStart(2, '0')}:${roundedMinute}`;

    let sent = 0;
    let skipped = 0;

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row[2]) continue; // no profile

      try {
        const profile = JSON.parse(row[2]);
        const schedule = profile.schedule;
        const fcmToken = profile.fcmToken;

        if (!schedule?.enabled || !fcmToken) {
          skipped++;
          continue;
        }

        // Check if current day is in schedule
        if (!schedule.days?.includes(kstDay)) {
          skipped++;
          continue;
        }

        // Check if current time slot matches any scheduled time
        const matchesTime = schedule.times?.some((time: string) => {
          // Match if within the same 30-min window
          const [h, m] = time.split(':').map(Number);
          const scheduledSlotMinute = m < 15 ? '00' : m < 45 ? '30' : '00';
          const scheduledSlotHour = m >= 45 ? (h + 1) % 24 : h;
          const scheduledSlot = `${String(scheduledSlotHour).padStart(2, '0')}:${scheduledSlotMinute}`;
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

        // Send push notification
        const success = await sendPushNotification(
          fcmToken,
          `${tutorName} is calling you!`,
          "Time for your English practice session!",
          {
            type: 'scheduled_call',
            tutorId,
            tutorName,
          }
        );

        if (success) sent++;
        else skipped++;
      } catch {
        skipped++;
        continue;
      }
    }

    return NextResponse.json({
      success: true,
      currentSlot,
      kstDay,
      sent,
      skipped,
    });
  } catch (error) {
    console.error('Scheduled calls cron error:', error);
    return NextResponse.json({ error: 'Cron job failed' }, { status: 500 });
  }
}
