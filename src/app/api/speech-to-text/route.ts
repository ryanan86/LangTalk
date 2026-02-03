import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export async function POST(request: NextRequest) {
  try {
    // Check API key
    if (!process.env.OPENAI_API_KEY) {
      console.error('OPENAI_API_KEY is not set');
      return NextResponse.json({ error: 'API key not configured', text: '' }, { status: 500 });
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;

    if (!audioFile) {
      console.error('No audio file in request');
      return NextResponse.json({ error: 'No audio file provided', text: '' }, { status: 400 });
    }

    console.log('\n=== Audio File Info ===');
    console.log('File name:', audioFile.name);
    console.log('File size:', audioFile.size, 'bytes');
    console.log('File type:', audioFile.type);
    console.log('========================\n');

    if (audioFile.size < 100) {
      console.error('Audio file too small:', audioFile.size);
      return NextResponse.json({ error: 'Audio file is empty', text: '' }, { status: 400 });
    }

    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      prompt: 'This is an English conversation practice. The speaker may have a Korean accent.',
    });

    console.log('\n=== STT Result ===');
    console.log('User said:', transcription.text);
    console.log('==================\n');

    return NextResponse.json({ text: transcription.text || '' });
  } catch (error: unknown) {
    console.error('Speech to text error:', error);

    // More detailed error response
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorDetails = error instanceof Error && 'status' in error ? (error as { status?: number }).status : undefined;

    console.error('Error message:', errorMessage);
    console.error('Error status:', errorDetails);

    return NextResponse.json(
      { error: errorMessage, text: '' },
      { status: errorDetails || 500 }
    );
  }
}
