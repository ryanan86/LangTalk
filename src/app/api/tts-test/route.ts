import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getServerSession } from 'next-auth';

const ADMIN_EMAILS = ['ryan@nuklabs.com', 'taewoongan@gmail.com'];

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// OpenAI voice mapping
const OPENAI_VOICES: Record<string, 'alloy' | 'echo' | 'fable' | 'nova' | 'onyx' | 'shimmer'> = {
  emma: 'shimmer',
  james: 'echo',
  charlotte: 'fable',
  oliver: 'onyx',
  alina: 'nova',
  henly: 'alloy',
};

// ElevenLabs voice mapping
const ELEVENLABS_VOICES: Record<string, string> = {
  emma: 'EXAVITQu4vr4xnSDxMaL',      // Rachel
  james: 'pNInz6obpgDQGcFmaJgB',      // Adam
  charlotte: 'ThT5KcBeYPX3keUQqHPh',  // Dorothy
  oliver: 'JBFqnCBsd6RMkjVDRZzb',     // George
  alina: 'jBpfuIE2acCO8z3wKNLl',      // Gigi (kid)
  henly: 'TX3LPaxmHKxFdv7VOQHJ',      // Liam (kid)
};

const KID_TUTORS = ['alina', 'henly'];

async function generateWithOpenAI(text: string, tutorId: string): Promise<ArrayBuffer> {
  const voice = OPENAI_VOICES[tutorId] || 'shimmer';
  const isKid = KID_TUTORS.includes(tutorId);

  const mp3 = await openai.audio.speech.create({
    model: 'tts-1',
    voice,
    input: text,
    speed: isKid ? 1.2 : 1.0,
  });

  return mp3.arrayBuffer();
}

async function generateWithElevenLabs(text: string, tutorId: string): Promise<ArrayBuffer> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    throw new Error('ElevenLabs API key not configured');
  }

  const voiceId = ELEVENLABS_VOICES[tutorId] || ELEVENLABS_VOICES.emma;

  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: {
      'Accept': 'audio/mpeg',
      'Content-Type': 'application/json',
      'xi-api-key': apiKey,
    },
    body: JSON.stringify({
      text,
      model_id: 'eleven_turbo_v2_5',
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
        style: 0.5,
        use_speaker_boost: true,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`ElevenLabs TTS failed: ${response.status} - ${errorText}`);
  }

  return response.arrayBuffer();
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session?.user?.email || !ADMIN_EMAILS.includes(session.user.email)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { text, tutorId, provider } = await request.json();

    if (!text || !tutorId || !provider) {
      return NextResponse.json({ error: 'Missing text, tutorId, or provider' }, { status: 400 });
    }

    let audioBuffer: ArrayBuffer;

    if (provider === 'openai') {
      audioBuffer = await generateWithOpenAI(text, tutorId);
    } else if (provider === 'elevenlabs') {
      audioBuffer = await generateWithElevenLabs(text, tutorId);
    } else {
      return NextResponse.json({ error: 'Invalid provider' }, { status: 400 });
    }

    return new NextResponse(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.byteLength.toString(),
      },
    });
  } catch (error) {
    console.error('TTS test error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate speech' },
      { status: 500 }
    );
  }
}
