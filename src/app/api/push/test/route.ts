import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getUserData } from '@/lib/sheetHelper';
import { sendPushNotification } from '@/lib/firebaseAdmin';
import webpush from 'web-push';

// Configure web-push
if (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    'mailto:ryan@nuklabs.com',
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

const ADMIN_EMAILS = ['ryan@nuklabs.com', 'taewoongan@gmail.com'];

/**
 * POST /api/push/test
 * Admin-only: send a test push notification to yourself
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email || !ADMIN_EMAILS.includes(session.user.email)) {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    }

    const { tutorId = 'emma' } = await request.json().catch(() => ({}));

    const tutorNames: Record<string, string> = {
      emma: 'Emma', james: 'James', charlotte: 'Charlotte',
      oliver: 'Oliver', alina: 'Alina', henry: 'Henry',
    };
    const tutorName = tutorNames[tutorId] || 'Emma';

    const userData = await getUserData(session.user.email);
    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const results: Record<string, string> = {};

    // Try FCM
    if (userData.profile.fcmToken) {
      const ok = await sendPushNotification(
        userData.profile.fcmToken,
        `${tutorName} is calling you!`,
        'Time for your English practice session!',
        { type: 'scheduled_call', tutorId, tutorName }
      );
      results.fcm = ok ? 'sent' : 'failed';
    } else {
      results.fcm = 'no_token';
    }

    // Try Web Push
    const webPushSub = userData.profile.webPushSubscription;
    if (webPushSub) {
      try {
        const subscription = JSON.parse(webPushSub);
        await webpush.sendNotification(
          subscription,
          JSON.stringify({
            title: `${tutorName} is calling you!`,
            body: 'Time for your English practice session!',
            type: 'scheduled_call',
            tutorId,
            tutorName,
          })
        );
        results.webPush = 'sent';
      } catch (err) {
        console.error('Test web push error:', err);
        results.webPush = 'failed';
      }
    } else {
      results.webPush = 'no_subscription';
    }

    return NextResponse.json({ success: true, results });
  } catch (error) {
    console.error('Push test error:', error);
    return NextResponse.json({ error: 'Test failed' }, { status: 500 });
  }
}
