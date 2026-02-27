import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { checkRateLimit, getRateLimitId, RATE_LIMITS } from '@/lib/rateLimit';
import { makeRid, nowMs, since, withTimeoutAbort } from '@/lib/perf';
import { recordSuccess, recordFailure, shouldCircuitBreak } from '@/lib/ttsHealth';

let _openai: OpenAI | null = null;
function getOpenAI() {
  if (!_openai) {
    if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY is not configured');
    _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return _openai;
}

// Fish Audio voice reference IDs (primary provider)
const FISH_AUDIO_VOICE_MAP: Record<string, string> = {
  shimmer: 'b545c585f631496c914815291da4e893', // Emma - Friendly Women
  echo: '802e3bc2b27e49c2995d23ef70e6ac89',    // James - Energetic Male
  fable: '2727e89d949a470fb3c8db8278306d36',    // Charlotte - Velvette (British female)
  onyx: 'b99f2c4a0012471cb32ab61152e7e48d',     // Oliver - British Narrator
  nova: 'f56b971895ed4a9d8aaf90e4c4d96a61',     // Alina - BLUEY (young girl)
  alloy: '12d3a04e3dca4e49a40ee52fea6e7c0e',    // Henry - Mackenzie Bluey (young boy)
};

const FISH_AUDIO_TIMEOUT_MS = 5000;

async function generateWithFishAudio(text: string, voice: string, speed?: number, timings?: Record<string, number>): Promise<ArrayBuffer> {
  const apiKey = process.env.FISH_AUDIO_API_KEY;
  if (!apiKey) {
    throw new Error('Fish Audio API key not configured');
  }

  const referenceId = FISH_AUDIO_VOICE_MAP[voice];
  const body: Record<string, unknown> = {
    text,
    format: 'mp3',
    mp3_bitrate: 128,
    normalize: true,
    latency: 'normal',
  };
  if (referenceId) {
    body.reference_id = referenceId;
  }

  // Fish Audio prosody speed control (0.5 ~ 2.0, default 1.0)
  if (speed && speed >= 0.5 && speed <= 2.0) {
    body.prosody = { speed };
  }

  const t0 = nowMs();
  const ac = new AbortController();
  const timeout = setTimeout(() => ac.abort(new Error('Fish Audio timeout after 5s')), FISH_AUDIO_TIMEOUT_MS);

  try {
    const response = await fetch('https://api.fish.audio/v1/tts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'model': 's1',
      },
      body: JSON.stringify(body),
      signal: ac.signal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Fish Audio error:', response.status, errorText);
      throw new Error(`Fish Audio TTS failed: ${response.status} - ${errorText}`);
    }

    const buf = await response.arrayBuffer();
    if (timings) timings['fish.tts.ms'] = since(t0);
    return buf;
  } finally {
    clearTimeout(timeout);
  }
}

async function generateWithOpenAI(text: string, voice: string, timings?: Record<string, number>): Promise<ArrayBuffer> {
  const mp3 = await withTimeoutAbort(
    (signal) =>
      getOpenAI().audio.speech.create({
        model: 'tts-1',
        voice: voice as 'nova' | 'onyx' | 'alloy' | 'echo' | 'fable' | 'shimmer',
        input: text,
        speed: 1.0,
      }, { signal }),
    15000,
    'openai.tts',
    timings
  );

  return mp3.arrayBuffer();
}

export async function POST(request: NextRequest) {
  const rid = makeRid('tts');
  const t0 = nowMs();
  const timings: Record<string, number> = {};

  try {
    // Auth check
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Rate limit
    const rateLimitResult = checkRateLimit(getRateLimitId(session.user.email, request), RATE_LIMITS.audio);
    if (rateLimitResult) return rateLimitResult;

    const { text, voice = 'shimmer', speed } = await request.json();

    if (!text || typeof text !== 'string') {
      timings['total.ms'] = since(t0);
      return NextResponse.json({ error: 'No text provided', meta: { rid, timings } }, { status: 400 });
    }
    if (text.length > 5000) {
      timings['total.ms'] = since(t0);
      return NextResponse.json({ error: 'Text too long (max 5000 characters)', meta: { rid, timings } }, { status: 400 });
    }
    const allowedVoices = ['shimmer', 'echo', 'fable', 'onyx', 'nova', 'alloy'];
    if (!allowedVoices.includes(voice)) {
      timings['total.ms'] = since(t0);
      return NextResponse.json({ error: 'Invalid voice', meta: { rid, timings } }, { status: 400 });
    }

    // Validate speed parameter (0.5 ~ 2.0)
    const validSpeed = typeof speed === 'number' && speed >= 0.5 && speed <= 2.0 ? speed : undefined;

    // TTS priority: Fish Audio -> OpenAI (fallback) with circuit breaker
    let audioBuffer: ArrayBuffer;
    let provider = 'OpenAI';
    let circuitBroken = false;

    timings['text.chars'] = text.length;

    const fishKeyAvailable = !!process.env.FISH_AUDIO_API_KEY?.trim();
    const fishCircuitOpen = shouldCircuitBreak('FishAudio');
    if (fishCircuitOpen) circuitBroken = true;

    if (fishKeyAvailable && !fishCircuitOpen) {
      const fishT0 = nowMs();
      try {
        audioBuffer = await generateWithFishAudio(text, voice, validSpeed, timings);
        provider = 'FishAudio';
        recordSuccess('FishAudio', since(fishT0));
      } catch (fishError) {
        recordFailure('FishAudio');
        console.error('Fish Audio failed, falling back to OpenAI:', fishError);
        const openaiT0 = nowMs();
        audioBuffer = await generateWithOpenAI(text, voice, timings);
        recordSuccess('OpenAI', since(openaiT0));
      }
    } else {
      const openaiT0 = nowMs();
      try {
        audioBuffer = await generateWithOpenAI(text, voice, timings);
        recordSuccess('OpenAI', since(openaiT0));
      } catch (openaiError) {
        recordFailure('OpenAI');
        throw openaiError;
      }
    }

    timings['total.ms'] = since(t0);
    const metaJson = JSON.stringify({ rid, provider, circuitBroken, timings });

    return new NextResponse(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.byteLength.toString(),
        'X-TapTalk-Meta': metaJson,
      },
    });
  } catch (error) {
    console.error('Text to speech error:', error);
    timings['total.ms'] = since(t0);
    return NextResponse.json(
      { error: 'Failed to generate speech', meta: { rid, timings } },
      { status: 500 }
    );
  }
}
