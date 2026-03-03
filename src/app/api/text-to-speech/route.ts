import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { checkRateLimit, getRateLimitId, RATE_LIMITS } from '@/lib/rateLimit';
import { makeRid, nowMs, since, withTimeoutAbort } from '@/lib/perf';
import { recordSuccess, recordFailure, shouldCircuitBreak } from '@/lib/ttsHealth';

export const preferredRegion = 'icn1'; // Seoul — closest to Korean users

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

const FISH_AUDIO_TIMEOUT_MS = 8000; // lowered — 'low' latency mode is much faster

// Independent OpenAI fallback voices — closest match to each Fish Audio persona
const OPENAI_FALLBACK_VOICE_MAP: Record<string, string> = {
  shimmer: 'shimmer', // Emma — warm adult female (best match)
  echo: 'echo',       // James — calm male
  fable: 'nova',      // Charlotte — Fish Audio is British female, OpenAI fable is male → use nova (warm female)
  onyx: 'onyx',       // Oliver — deep authoritative male (good match)
  nova: 'shimmer',    // Alina — young girl → shimmer is warmest remaining female
  alloy: 'alloy',     // Henry — neutral, no boyish voice available
};

/**
 * Generate TTS with Fish Audio.
 * Returns a ReadableStream for streaming to client, or ArrayBuffer for buffered mode.
 */
async function generateWithFishAudio(
  text: string,
  voice: string,
  speed?: number,
  timings?: Record<string, number>,
  streaming?: boolean,
): Promise<ReadableStream<Uint8Array> | ArrayBuffer> {
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
  const timeout = setTimeout(() => ac.abort(new Error(`Fish Audio timeout after ${FISH_AUDIO_TIMEOUT_MS}ms`)), FISH_AUDIO_TIMEOUT_MS);

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

    if (timings) timings['fish.ttfb.ms'] = since(t0);

    // Streaming mode: pipe response body directly to client
    if (streaming && response.body) {
      clearTimeout(timeout);
      return response.body;
    }

    // Buffered mode: collect full audio
    const buf = await response.arrayBuffer();
    if (timings) timings['fish.tts.ms'] = since(t0);
    return buf;
  } finally {
    clearTimeout(timeout);
  }
}

async function generateWithOpenAI(text: string, voice: string, timings?: Record<string, number>): Promise<ArrayBuffer> {
  const openaiVoice = OPENAI_FALLBACK_VOICE_MAP[voice] ?? voice;
  const mp3 = await withTimeoutAbort(
    (signal) =>
      getOpenAI().audio.speech.create({
        model: 'tts-1-hd',
        voice: openaiVoice as 'nova' | 'onyx' | 'alloy' | 'echo' | 'fable' | 'shimmer',
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

    // Check streaming support (client signals via Accept header or query param)
    const wantsStream = request.headers.get('X-TTS-Stream') === '1';

    // TTS priority: Fish Audio -> OpenAI (fallback) with circuit breaker
    let provider = 'OpenAI';
    let circuitBroken = false;

    timings['text.chars'] = text.length;

    const fishKeyAvailable = !!process.env.FISH_AUDIO_API_KEY?.trim();
    const fishCircuitOpen = shouldCircuitBreak('FishAudio');
    if (fishCircuitOpen) circuitBroken = true;

    if (fishKeyAvailable && !fishCircuitOpen) {
      const fishT0 = nowMs();
      try {
        const result = await generateWithFishAudio(text, voice, validSpeed, timings, wantsStream);
        provider = 'FishAudio';
        recordSuccess('FishAudio', since(fishT0));

        // Streaming: pipe Fish Audio ReadableStream directly to client
        if (result instanceof ReadableStream) {
          const metaJson = JSON.stringify({ rid, provider, circuitBroken, timings });
          return new NextResponse(result as unknown as BodyInit, {
            headers: {
              'Content-Type': 'audio/mpeg',
              'X-TapTalk-Meta': metaJson,
              'X-TTS-Streaming': '1',
            },
          });
        }

        // Buffered: return full audio
        timings['total.ms'] = since(t0);
        const metaJson = JSON.stringify({ rid, provider, circuitBroken, timings });
        return new NextResponse(result, {
          headers: {
            'Content-Type': 'audio/mpeg',
            'Content-Length': result.byteLength.toString(),
            'X-TapTalk-Meta': metaJson,
          },
        });
      } catch (fishError) {
        recordFailure('FishAudio');
        console.error('Fish Audio failed, falling back to OpenAI:', fishError);
        const openaiT0 = nowMs();
        const audioBuffer = await generateWithOpenAI(text, voice, timings);
        recordSuccess('OpenAI', since(openaiT0));

        timings['total.ms'] = since(t0);
        const metaJson = JSON.stringify({ rid, provider: 'OpenAI', circuitBroken, timings });
        return new NextResponse(audioBuffer, {
          headers: {
            'Content-Type': 'audio/mpeg',
            'Content-Length': audioBuffer.byteLength.toString(),
            'X-TapTalk-Meta': metaJson,
          },
        });
      }
    } else {
      const openaiT0 = nowMs();
      try {
        const audioBuffer = await generateWithOpenAI(text, voice, timings);
        recordSuccess('OpenAI', since(openaiT0));

        timings['total.ms'] = since(t0);
        const metaJson = JSON.stringify({ rid, provider, circuitBroken, timings });
        return new NextResponse(audioBuffer, {
          headers: {
            'Content-Type': 'audio/mpeg',
            'Content-Length': audioBuffer.byteLength.toString(),
            'X-TapTalk-Meta': metaJson,
          },
        });
      } catch (openaiError) {
        recordFailure('OpenAI');
        throw openaiError;
      }
    }
  } catch (error) {
    console.error('Text to speech error:', error);
    timings['total.ms'] = since(t0);
    return NextResponse.json(
      { error: 'Failed to generate speech', meta: { rid, timings } },
      { status: 500 }
    );
  }
}
