import admin from 'firebase-admin';

// Initialize Firebase Admin SDK (singleton)
if (!admin.apps.length) {
  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

  if (serviceAccountKey) {
    try {
      const serviceAccount = JSON.parse(serviceAccountKey);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    } catch (e) {
      if (process.env.NODE_ENV !== 'production' || process.env.NEXT_PHASE !== 'phase-production-build') {
        console.error('Firebase Admin initialization error:', e);
      }
    }
  } else if (process.env.NODE_ENV !== 'production' || process.env.NEXT_PHASE !== 'phase-production-build') {
    console.warn('FIREBASE_SERVICE_ACCOUNT_KEY not set, push notifications disabled');
  }
}

export default admin;

/**
 * Send a push notification via FCM
 */
export async function sendPushNotification(
  fcmToken: string,
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<boolean> {
  if (!admin.apps.length) {
    console.warn('Firebase Admin not initialized');
    return false;
  }

  try {
    await admin.messaging().send({
      token: fcmToken,
      notification: {
        title,
        body,
      },
      data: data || {},
      android: {
        priority: 'high',
        notification: {
          channelId: 'scheduled_calls',
          priority: 'max',
          defaultVibrateTimings: true,
          defaultSound: true,
        },
      },
    });
    return true;
  } catch (error: unknown) {
    const firebaseError = error as { code?: string };
    console.error('FCM send error:', error);
    // Token is invalid/expired - should be cleaned up
    if (firebaseError.code === 'messaging/registration-token-not-registered') {
      return false;
    }
    return false;
  }
}
