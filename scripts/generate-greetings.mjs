#!/usr/bin/env node

/**
 * TapTalk 튜터 인사말 음성 생성 스크립트
 *
 * 사용법: node scripts/generate-greetings.mjs
 *
 * ElevenLabs: Emma, James, Alina, Henly (앱과 동일한 하이브리드 전략)
 * OpenAI TTS: Charlotte, Oliver
 *
 * 출력: public/audio/greetings/{name}-greeting.mp3
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import https from 'https';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'audio', 'greetings');

// API Keys
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// ElevenLabs Voice IDs (앱과 동일)
const ELEVENLABS_VOICE_MAP = {
  shimmer: 'EXAVITQu4vr4xnSDxMaL', // Emma
  echo: 'pNInz6obpgDQGcFmaJgB',    // James
  nova: 'jBpfuIE2acCO8z3wKNLl',     // Alina (kid)
  alloy: 'TX3LPaxmHKxFdv7VOQHJ',   // Henly (kid)
};

// ElevenLabs 선호 음성 (앱과 동일한 하이브리드 전략)
const ELEVENLABS_PREFERRED = new Set(['shimmer', 'echo', 'nova', 'alloy']);
const KID_VOICES = new Set(['nova', 'alloy']);

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

// ElevenLabs TTS
async function generateWithElevenLabs(text, voice) {
  const voiceId = ELEVENLABS_VOICE_MAP[voice];
  const isKid = KID_VOICES.has(voice);

  const voiceSettings = isKid
    ? { stability: 0.75, similarity_boost: 0.6, style: 0.3, use_speaker_boost: true }
    : { stability: 0.5, similarity_boost: 0.75, style: 0.5, use_speaker_boost: true };

  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: {
      'Accept': 'audio/mpeg',
      'Content-Type': 'application/json',
      'xi-api-key': ELEVENLABS_API_KEY,
    },
    body: JSON.stringify({
      text,
      model_id: 'eleven_turbo_v2_5',
      voice_settings: voiceSettings,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`ElevenLabs error ${response.status}: ${errorText}`);
  }

  return Buffer.from(await response.arrayBuffer());
}

// OpenAI TTS
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
  // 출력 디렉토리 생성
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  console.log('🎤 TapTalk 튜터 인사말 음성 생성 시작\n');
  console.log(`📂 출력: ${OUTPUT_DIR}\n`);

  if (!ELEVENLABS_API_KEY) {
    console.warn('⚠️  ELEVENLABS_API_KEY 없음 — 전부 OpenAI로 생성합니다\n');
  }
  if (!OPENAI_API_KEY) {
    console.error('❌ OPENAI_API_KEY 필수!');
    process.exit(1);
  }

  for (const tutor of GREETINGS) {
    const useElevenLabs = ELEVENLABS_API_KEY && ELEVENLABS_PREFERRED.has(tutor.voice);
    const provider = useElevenLabs ? 'ElevenLabs' : 'OpenAI';

    console.log(`🔊 ${tutor.name} (${provider}, voice: ${tutor.voice})`);
    console.log(`   "${tutor.text}"`);

    try {
      let audioBuffer;
      if (useElevenLabs) {
        try {
          audioBuffer = await generateWithElevenLabs(tutor.text, tutor.voice);
        } catch (err) {
          console.warn(`   ⚠️ ElevenLabs 실패, OpenAI로 폴백: ${err.message}`);
          audioBuffer = await generateWithOpenAI(tutor.text, tutor.voice);
        }
      } else {
        audioBuffer = await generateWithOpenAI(tutor.text, tutor.voice);
      }

      const outputPath = path.join(OUTPUT_DIR, `${tutor.name}-greeting.mp3`);
      fs.writeFileSync(outputPath, audioBuffer);

      const sizeKB = (audioBuffer.length / 1024).toFixed(1);
      console.log(`   ✅ 저장 완료 (${sizeKB} KB)\n`);
    } catch (err) {
      console.error(`   ❌ 실패: ${err.message}\n`);
    }
  }

  console.log('🎉 완료! public/audio/greetings/ 에서 확인하세요.');
}

main();
