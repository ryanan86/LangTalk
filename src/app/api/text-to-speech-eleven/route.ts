import { NextRequest, NextResponse } from 'next/server';

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
  alloy: 'g5CIjZEefAph4nQFvHAz', // Ethan - young boy
};

export async function POST(request: NextRequest) {
  try {
    const { text, voice = 'shimmer' } = await request.json();

    if (!text) {
      return NextResponse.json({ error: 'No text provided' }, { status: 400 });
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
      return NextResponse.json({ error: 'TTS failed' }, { status: 500 });
    }

    const audioBuffer = await response.arrayBuffer();

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
