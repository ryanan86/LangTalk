import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { checkRateLimit, getRateLimitId, RATE_LIMITS } from '@/lib/rateLimit';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Fish Audio voice reference IDs (primary provider)
const FISH_AUDIO_VOICE_MAP: Record<string, string> = {
  shimmer: 'b545c585f631496c914815291da4e893', // Emma - Friendly Women
  echo: '802e3bc2b27e49c2995d23ef70e6ac89',    // James - Energetic Male
  fable: '2727e89d949a470fb3c8db8278306d36',    // Charlotte - Velvette (British female)
  onyx: 'b99f2c4a0012471cb32ab61152e7e48d',     // Oliver - British Narrator
  nova: 'f56b971895ed4a9d8aaf90e4c4d96a61',     // Alina - BLUEY (young girl)
  alloy: '12d3a04e3dca4e49a40ee52fea6e7c0e',    // Henry - Mackenzie Bluey (young boy)
};

async function generateWithFishAudio(text: string, voice: string): Promise<ArrayBuffer> {
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

  const response = await fetch('https://api.fish.audio/v1/tts', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'model': 's1',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Fish Audio error:', response.status, errorText);
    throw new Error(`Fish Audio TTS failed: ${response.status} - ${errorText}`);
  }

  return response.arrayBuffer();
}

async function generateWithOpenAI(text: string, voice: string): Promise<ArrayBuffer> {
  const mp3 = await openai.audio.speech.create({
    model: 'tts-1',
    voice: voice as 'nova' | 'onyx' | 'alloy' | 'echo' | 'fable' | 'shimmer',
    input: text,
    speed: 1.0,
  });

  return mp3.arrayBuffer();
}

export async function POST(request: NextRequest) {
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
    const allowedVoices = ['shimmer', 'echo', 'fable', 'onyx', 'nova', 'alloy'];
    if (!allowedVoices.includes(voice)) {
      return NextResponse.json({ error: 'Invalid voice' }, { status: 400 });
    }

    // TTS priority: Fish Audio -> OpenAI (fallback)
    let audioBuffer: ArrayBuffer;
    let provider = 'OpenAI';

    if (process.env.FISH_AUDIO_API_KEY?.trim()) {
      try {
        audioBuffer = await generateWithFishAudio(text, voice);
        provider = 'FishAudio';
      } catch (fishError) {
        console.error('Fish Audio failed, falling back to OpenAI:', fishError);
        audioBuffer = await generateWithOpenAI(text, voice);
      }
    } else {
      audioBuffer = await generateWithOpenAI(text, voice);
    }

    console.log(`TTS: voice=${voice}, provider=${provider}`);

    return new NextResponse(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.byteLength.toString(),
      },
    });
  } catch (error) {
    console.error('Text to speech error:', error);
    return NextResponse.json(
      { error: 'Failed to generate speech' },
      { status: 500 }
    );
  }
}
