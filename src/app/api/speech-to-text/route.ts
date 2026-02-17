import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { checkRateLimit, getRateLimitId, RATE_LIMITS } from '@/lib/rateLimit';

let _openai: OpenAI | null = null;
function getOpenAI() {
  if (!_openai) _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return _openai;
}

export async function POST(request: NextRequest) {
  try {
    // Auth check
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Authentication required', text: '' }, { status: 401 });
    }

    // Rate limit
    const rateLimitResult = checkRateLimit(getRateLimitId(session.user.email, request), RATE_LIMITS.audio);
    if (rateLimitResult) return rateLimitResult;

    // Check API key
    if (!process.env.OPENAI_API_KEY) {
      console.error('OPENAI_API_KEY is not set');
      return NextResponse.json({ error: 'API key not configured', text: '' }, { status: 503 });
    }

    const openai = getOpenAI();

    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;

    if (!audioFile) {
      console.error('No audio file in request');
      return NextResponse.json({ error: 'No audio file provided', text: '' }, { status: 400 });
    }

    if (audioFile.size < 100) {
      console.error('Audio file too small:', audioFile.size);
      return NextResponse.json({ error: 'Audio file is empty', text: '' }, { status: 400 });
    }

    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      prompt: 'This is an English conversation practice. The speaker may have a Korean accent.',
    });

    return NextResponse.json({ text: transcription.text || '' });
  } catch (error: unknown) {
    console.error('Speech to text error:', error);
    return NextResponse.json(
      { error: 'Speech recognition failed', text: '' },
      { status: 500 }
    );
  }
}
