import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;

    if (!audioFile) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
    }

    console.log('\n=== Audio File Info ===');
    console.log('File name:', audioFile.name);
    console.log('File size:', audioFile.size, 'bytes');
    console.log('File type:', audioFile.type);
    console.log('========================\n');

    if (audioFile.size < 1000) {
      console.log('WARNING: Audio file is very small, might be empty');
    }

    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      // Auto-detect language for better recognition
      prompt: 'This is an English conversation practice. The speaker may have a Korean accent.',
    });

    console.log('\n=== STT Result ===');
    console.log('User said:', transcription.text);
    console.log('==================\n');

    return NextResponse.json({ text: transcription.text });
  } catch (error) {
    console.error('Speech to text error:', error);
    return NextResponse.json(
      { error: 'Failed to transcribe audio' },
      { status: 500 }
    );
  }
}
