import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ElevenLabs voice IDs
const ELEVENLABS_VOICE_MAP: Record<string, string> = {
  shimmer: 'EXAVITQu4vr4xnSDxMaL', // Rachel - warm American female
  echo: 'pNInz6obpgDQGcFmaJgB', // Adam - friendly American male
  fable: 'ThT5KcBeYPX3keUQqHPh', // Dorothy - British female
  onyx: 'JBFqnCBsd6RMkjVDRZzb', // George - British male, warm friendly voice
  nova: 'jBpfuIE2acCO8z3wKNLl', // Gigi - young girl, childish tone
  alloy: 'TX3LPaxmHKxFdv7VOQHJ', // Liam - young boy, brighter tone
};

// Kid voices that need higher speed in OpenAI fallback
const KID_VOICES = new Set(['nova', 'alloy']);

// Hybrid TTS strategy: voices that should use ElevenLabs
// Emma (shimmer), James (echo), Alina (nova), Henly (alloy) → ElevenLabs
// Charlotte (fable), Oliver (onyx) → OpenAI
const ELEVENLABS_PREFERRED_VOICES = new Set(['shimmer', 'echo', 'nova', 'alloy']);

async function generateWithElevenLabs(text: string, voice: string): Promise<ArrayBuffer> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    throw new Error('ElevenLabs API key not configured');
  }

  const voiceId = ELEVENLABS_VOICE_MAP[voice] || ELEVENLABS_VOICE_MAP.shimmer;
  const isKidVoice = KID_VOICES.has(voice);

  // Kid voices: higher stability for slower, more measured speech
  // Adult voices: standard settings
  const voiceSettings = isKidVoice
    ? {
        stability: 0.75,        // Higher = more consistent, slower pacing
        similarity_boost: 0.6,  // Slightly lower for more natural kid speech
        style: 0.3,             // Lower style for clearer pronunciation
        use_speaker_boost: true,
      }
    : {
        stability: 0.5,
        similarity_boost: 0.75,
        style: 0.5,
        use_speaker_boost: true,
      };

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
      voice_settings: voiceSettings,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('ElevenLabs error:', response.status, errorText);
    throw new Error(`ElevenLabs TTS failed: ${response.status} - ${errorText}`);
  }

  return response.arrayBuffer();
}

async function generateWithOpenAI(text: string, voice: string): Promise<ArrayBuffer> {
  const mp3 = await openai.audio.speech.create({
    model: 'tts-1', // Use tts-1 for faster response (tts-1-hd is slower)
    voice: voice as 'nova' | 'onyx' | 'alloy' | 'echo' | 'fable' | 'shimmer',
    input: text,
    speed: 1.0, // Normal speed for all voices
  });

  return mp3.arrayBuffer();
}

export async function POST(request: NextRequest) {
  try {
    const { text, voice = 'shimmer' } = await request.json();

    if (!text) {
      return NextResponse.json({ error: 'No text provided' }, { status: 400 });
    }

    // Hybrid TTS strategy:
    // - Emma (shimmer), James (echo), Alina (nova), Henly (alloy) → ElevenLabs
    // - Charlotte (fable), Oliver (onyx) → OpenAI
    const elevenLabsKey = process.env.ELEVENLABS_API_KEY;
    const hasElevenLabsKey = !!elevenLabsKey && elevenLabsKey.trim().length > 0;
    const shouldUseElevenLabs = hasElevenLabsKey && ELEVENLABS_PREFERRED_VOICES.has(voice);

    console.log(`TTS: voice=${voice}, provider=${shouldUseElevenLabs ? 'ElevenLabs' : 'OpenAI'}`);

    let audioBuffer: ArrayBuffer;

    if (shouldUseElevenLabs) {
      try {
        audioBuffer = await generateWithElevenLabs(text, voice);
      } catch (elevenLabsError) {
        console.error('ElevenLabs failed, falling back to OpenAI:', elevenLabsError);
        audioBuffer = await generateWithOpenAI(text, voice);
      }
    } else {
      audioBuffer = await generateWithOpenAI(text, voice);
    }

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
