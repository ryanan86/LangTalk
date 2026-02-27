import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getMetrics } from '@/lib/ttsHealth';

const ADMIN_EMAILS = ['taewoongan@gmail.com'];

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email || !ADMIN_EMAILS.includes(session.user.email)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const metrics = getMetrics();

    return NextResponse.json({
      providers: metrics,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('TTS health endpoint error:', error);
    return NextResponse.json({ error: 'Failed to fetch TTS health' }, { status: 500 });
  }
}
