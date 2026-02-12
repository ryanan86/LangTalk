import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { updateUserFields } from '@/lib/sheetHelper';

/**
 * POST /api/push/register
 * Save FCM token for push notifications
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ success: false, error: 'Not logged in' }, { status: 401 });
    }

    const { fcmToken } = await request.json();
    if (!fcmToken || typeof fcmToken !== 'string') {
      return NextResponse.json({ success: false, error: 'Invalid FCM token' }, { status: 400 });
    }

    await updateUserFields(session.user.email, {
      profile: { fcmToken },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Push register error:', error);
    return NextResponse.json({ success: false, error: 'Failed to register token' }, { status: 500 });
  }
}
