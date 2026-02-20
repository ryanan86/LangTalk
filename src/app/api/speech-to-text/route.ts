import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { checkRateLimit, getRateLimitId, RATE_LIMITS } from '@/lib/rateLimit';
import { makeRid, nowMs, since, withTimeoutAbort } from '@/lib/perf';

let _openai: OpenAI | null = null;
function getOpenAI() {
  if (!_openai) {
    if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY is not configured');
    _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return _openai;
}

export async function POST(request: NextRequest) {
  const rid = makeRid('stt');
  const t0 = nowMs();
  const timings: Record<string, number> = {};

  try {
    // Auth check
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Authentication required', text: '' }, { status: 401 });
    }

    // Rate limit
    const rateLimitResult = checkRateLimit(getRateLimitId(session.user.email, request), RATE_LIMITS.audio);
    if (rateLimitResult) return rateLimitResult;

    // Ensure API key exists
    if (!process.env.OPENAI_API_KEY) {
      timings['total.ms'] = since(t0);
      return NextResponse.json({ error: 'API key not configured', text: '', meta: { rid, timings } }, { status: 503 });
    }

    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;

    if (!audioFile) {
      console.error('No audio file in request');
      return NextResponse.json({ error: 'No audio file provided', text: '' }, { status: 400 });
    }

    timings['audio.bytes'] = audioFile.size;

    if (audioFile.size < 100) {
      console.error('Audio file too small:', audioFile.size);
      return NextResponse.json({ error: 'Audio file is empty', text: '' }, { status: 400 });
    }

    const transcription = await withTimeoutAbort(
      (signal) =>
        getOpenAI().audio.transcriptions.create({
          file: audioFile,
          model: 'whisper-1',
          prompt: 'This is an English conversation practice. The speaker may have a Korean accent.',
        }, { signal }),
      15000,
      'openai.stt',
      timings
    );

    timings['total.ms'] = since(t0);
    return NextResponse.json({ text: transcription.text || '', meta: { rid, timings } });
  } catch (error: unknown) {
    console.error('Speech to text error:', error);
    timings['total.ms'] = since(t0);
    return NextResponse.json(
      { error: 'Speech recognition failed', text: '', meta: { rid, timings } },
      { status: 500 }
    );
  }
}
