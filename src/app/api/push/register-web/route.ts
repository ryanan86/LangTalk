import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { updateUserFields } from '@/lib/sheetHelper';

/**
 * POST /api/push/register-web
 * Save Web Push subscription for browser notifications
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ success: false, error: 'Not logged in' }, { status: 401 });
    }

    const { subscription } = await request.json();
    if (!subscription?.endpoint) {
      return NextResponse.json({ success: false, error: 'Invalid subscription' }, { status: 400 });
    }

    await updateUserFields(session.user.email, {
      profile: { webPushSubscription: JSON.stringify(subscription) },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Web push register error:', error);
    return NextResponse.json({ success: false, error: 'Failed to register' }, { status: 500 });
  }
}
