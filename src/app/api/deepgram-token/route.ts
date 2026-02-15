import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// Returns Deepgram API key for authenticated users (browser WebSocket STT)
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const key = process.env.DEEPGRAM_API_KEY;
    if (!key) {
      return NextResponse.json({ error: 'Deepgram not configured' }, { status: 503 });
    }

    return NextResponse.json({ key });
  } catch (error) {
    console.error('Deepgram token error:', error);
    return NextResponse.json({ error: 'Failed to get token' }, { status: 500 });
  }
}
