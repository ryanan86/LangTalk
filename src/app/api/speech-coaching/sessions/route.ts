import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getSpeechSessions, saveSpeechSession } from '@/lib/dataHelper';
import { speechSessionSaveSchema, parseBody } from '@/lib/apiSchemas';

export const preferredRegion = 'icn1';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const sessions = await getSpeechSessions(session.user.email);
    return NextResponse.json({ sessions });
  } catch (e) {
    console.error('GET speech sessions error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const rawBody = await request.json();
    const parsed = parseBody(speechSessionSaveSchema, rawBody);
    if (!parsed.success) return parsed.response;

    const result = await saveSpeechSession(session.user.email, parsed.data);
    if (!result) {
      return NextResponse.json({ error: 'Failed to save session' }, { status: 500 });
    }

    return NextResponse.json({ id: result.id });
  } catch (e) {
    console.error('POST speech session error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
