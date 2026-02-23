import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { checkRateLimit, getRateLimitId, RATE_LIMITS } from '@/lib/rateLimit';
import { makeRid, nowMs, since } from '@/lib/perf';

// ElevenLabs voice IDs - these are pre-made voices
const VOICE_MAP: Record<string, string> = {
  // American voices
  shimmer: 'EXAVITQu4vr4xnSDxMaL', // Rachel - warm American female
  echo: 'pNInz6obpgDQGcFmaJgB', // Adam - friendly American male
  // British voices
  fable: 'ThT5KcBeYPX3keUQqHPh', // Dorothy - British female
  onyx: 'VR6AewLTigWG4xSOukaG', // Arnold - British male
  // Kid voices
  nova: 'jBpfuIE2acCO8z3wKNLl', // Gigi - young girl, childish tone
  alloy: 'TX3LPaxmHKxFdv7VOQHJ', // Liam - young boy, brighter tone
};

export async function POST(request: NextRequest) {
  const rid = makeRid('tts11');
  const t0 = nowMs();

  try {
    // Auth check
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Rate limit
    const rateLimitResult = checkRateLimit(getRateLimitId(session.user.email, request), RATE_LIMITS.audio);
    if (rateLimitResult) return rateLimitResult;

    const { text, voice = 'shimmer' } = await request.json();

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'No text provided' }, { status: 400 });
    }
    if (text.length > 5000) {
      return NextResponse.json({ error: 'Text too long (max 5000 characters)' }, { status: 400 });
    }

    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'ElevenLabs API key not configured' }, { status: 500 });
    }

    const voiceId = VOICE_MAP[voice] || VOICE_MAP.shimmer;

    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': apiKey,
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_turbo_v2_5', // Fast, high-quality model
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.5,
          use_speaker_boost: true,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('ElevenLabs error:', error);
      console.error(`[${rid}] ERR ${since(t0)}ms`);
      return NextResponse.json({ error: 'TTS failed' }, { status: 500 });
    }

    const audioBuffer = await response.arrayBuffer();

    console.log(`[${rid}] OK ${since(t0)}ms`);
    return new NextResponse(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.byteLength.toString(),
      },
    });
  } catch (error) {
    console.error(`[${rid}] ERR ${since(t0)}ms`, error);
    console.error('Text to speech error:', error);
    return NextResponse.json(
      { error: 'Failed to generate speech' },
      { status: 500 }
    );
  }
}
