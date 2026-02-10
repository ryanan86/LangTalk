#!/usr/bin/env node

/**
 * TapTalk 튜터 인사말 음성 생성 스크립트
 *
 * 사용법: node scripts/generate-greetings.mjs
 *
 * Fish Audio S1: 전체 튜터 (primary)
 * OpenAI TTS: fallback
 *
 * 출력: public/audio/greetings/{name}-greeting.mp3
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { readFileSync, existsSync } from 'fs';
import { homedir } from 'os';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'audio', 'greetings');

// ~/.claude/.env 로드
function loadEnv() {
  const envPath = path.join(homedir(), '.claude', '.env');
  if (existsSync(envPath)) {
    const content = readFileSync(envPath, 'utf-8');
    for (const line of content.split('\n')) {
      const match = line.match(/^(\w+)=["']?(.+?)["']?$/);
      if (match && !process.env[match[1]]) {
        process.env[match[1]] = match[2];
      }
    }
  }
}
loadEnv();

const FISH_AUDIO_API_KEY = process.env.FISH_AUDIO_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Fish Audio voice reference IDs (앱 route.ts와 동일)
const FISH_AUDIO_VOICE_MAP = {
  shimmer: 'b545c585f631496c914815291da4e893', // Emma - Friendly Women
  echo: '802e3bc2b27e49c2995d23ef70e6ac89',    // James - Energetic Male
  fable: '2727e89d949a470fb3c8db8278306d36',    // Charlotte - Velvette (British female)
  onyx: 'b99f2c4a0012471cb32ab61152e7e48d',     // Oliver - British Narrator
  nova: 'f56b971895ed4a9d8aaf90e4c4d96a61',     // Alina - BLUEY (young girl)
  alloy: '12d3a04e3dca4e49a40ee52fea6e7c0e',    // Henry - Mackenzie Bluey (young boy)
};

// 튜터별 인사말 (캐릭터 성격 반영, 5~8초 분량)
const GREETINGS = [
  {
    name: 'emma',
    voice: 'shimmer',
    text: "Hey! I'm Emma! Oh my gosh, I'm so excited to practice English with you. We're gonna have so much fun, trust me!",
  },
  {
    name: 'james',
    voice: 'echo',
    text: "Yo, what's up! I'm James. We're just gonna hang out, have some chill conversations, no pressure at all. Let's do this!",
  },
  {
    name: 'charlotte',
    voice: 'fable',
    text: "Hello! I'm Charlotte. Lovely to meet you! We'll have a proper chat and I promise it won't be boring. Shall we get started?",
  },
  {
    name: 'oliver',
    voice: 'onyx',
    text: "Right then, I'm Oliver. Nice to meet you! We'll keep things casual, no fuss. Let's just have a good chat, yeah?",
  },
  {
    name: 'alina',
    voice: 'nova',
    text: "Hi hi! I'm Alina! This is gonna be so fun! I love talking and making new friends. Let's play and learn together!",
  },
  {
    name: 'henly',
    voice: 'alloy',
    text: "Hey! I'm Henly! Dude, talking in English is awesome! Let's be friends and have a super cool time together!",
  },
];

// Fish Audio TTS
async function generateWithFishAudio(text, voice) {
  const referenceId = FISH_AUDIO_VOICE_MAP[voice];
  const body = {
    text,
    format: 'mp3',
    mp3_bitrate: 128,
    normalize: true,
    latency: 'balanced',
  };
  if (referenceId) body.reference_id = referenceId;

  const response = await fetch('https://api.fish.audio/v1/tts', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${FISH_AUDIO_API_KEY}`,
      'Content-Type': 'application/json',
      'model': 's1',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Fish Audio error ${response.status}: ${errorText}`);
  }

  return Buffer.from(await response.arrayBuffer());
}

// OpenAI TTS (fallback)
async function generateWithOpenAI(text, voice) {
  const response = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'tts-1',
      voice,
      input: text,
      speed: 1.0,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI TTS error ${response.status}: ${errorText}`);
  }

  return Buffer.from(await response.arrayBuffer());
}

async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  console.log('TapTalk Tutor Greeting Audio Generator\n');
  console.log(`Output: ${OUTPUT_DIR}\n`);

  if (!FISH_AUDIO_API_KEY) {
    console.warn('FISH_AUDIO_API_KEY not found - using OpenAI only\n');
  }
  if (!OPENAI_API_KEY) {
    console.error('OPENAI_API_KEY required as fallback');
    process.exit(1);
  }

  for (const tutor of GREETINGS) {
    console.log(`[${tutor.name}] voice: ${tutor.voice}`);
    console.log(`  "${tutor.text}"`);

    try {
      let audioBuffer;
      if (FISH_AUDIO_API_KEY) {
        try {
          audioBuffer = await generateWithFishAudio(tutor.text, tutor.voice);
          console.log(`  -> Fish Audio OK`);
        } catch (err) {
          console.warn(`  -> Fish Audio failed, fallback to OpenAI: ${err.message}`);
          audioBuffer = await generateWithOpenAI(tutor.text, tutor.voice);
          console.log(`  -> OpenAI OK`);
        }
      } else {
        audioBuffer = await generateWithOpenAI(tutor.text, tutor.voice);
        console.log(`  -> OpenAI OK`);
      }

      const outputPath = path.join(OUTPUT_DIR, `${tutor.name}-greeting.mp3`);
      fs.writeFileSync(outputPath, audioBuffer);

      const sizeKB = (audioBuffer.length / 1024).toFixed(1);
      console.log(`  -> Saved (${sizeKB} KB)\n`);
    } catch (err) {
      console.error(`  -> FAILED: ${err.message}\n`);
    }

    // rate limit 방지
    await new Promise(r => setTimeout(r, 500));
  }

  console.log('Done! Check public/audio/greetings/');
}

main();
