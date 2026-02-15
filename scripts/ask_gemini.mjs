#!/usr/bin/env node
/**
 * Gemini API Bridge Script
 *
 * Claude Code가 Gemini에게 질문을 위임할 때 사용하는 브릿지 스크립트
 *
 * 사용법:
 *   node scripts/ask_gemini.mjs "질문 내용"
 *   node scripts/ask_gemini.mjs --file prompt.txt
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import { readFileSync, existsSync } from "fs";
import { homedir } from "os";
import { join } from "path";

// ~/.claude/.env 에서 환경변수 로드
function loadEnv() {
  const envPath = join(homedir(), ".claude", ".env");
  if (existsSync(envPath)) {
    const content = readFileSync(envPath, "utf-8");
    for (const line of content.split("\n")) {
      const match = line.match(/^(\w+)=["']?(.+?)["']?$/);
      if (match && !process.env[match[1]]) {
        process.env[match[1]] = match[2];
      }
    }
  }
}
loadEnv();

const API_KEY = process.env.GEMINI_API_KEY;

if (!API_KEY) {
  console.error("GEMINI_API_KEY 환경변수가 설정되지 않았습니다.");
  console.error("~/.zshrc에 다음을 추가하세요: export GEMINI_API_KEY='your-key'");
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(API_KEY);
const geminiModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

// 역할별 시스템 프롬프트
const ROLES = {
  researcher: `You are "젬팀장" (Team Lead Gem), the senior researcher for TapTalk, an AI English conversation practice app.
Your role: Latest tech research, documentation verification, frontend/backend trend analysis, library updates.
Tech stack: Next.js 14, TypeScript, Tailwind CSS, Vercel, Google Sheets as DB, Capacitor for mobile.
Respond in Korean unless asked otherwise. Be thorough but concise with citations when possible.`,

  meeting: `You are "젬팀장" (Team Lead Gem), a senior researcher and technical advisor in a TapTalk team meeting.
TapTalk: AI English conversation practice app for Korean learners.
Tech stack: Next.js 14, TypeScript, Tailwind CSS, Vercel, Google Sheets as DB, Fish Audio TTS, Deepgram STT, Capacitor for mobile.

Team meeting rules:
- Present your expert opinion with concrete reasoning
- If you disagree with a proposed approach, clearly state WHY with alternatives
- Do NOT just agree with others - provide counterarguments where appropriate
- Consider cost, implementation complexity, and user experience tradeoffs
- Respond in Korean`,

  ux: `You are "젬팀장" (Team Lead Gem), a UX/UI research specialist for TapTalk mobile app.
Your role: Research latest UI trends, mobile UX patterns, accessibility, and design system recommendations.
Focus on: mobile-first, Korean/international UX patterns, PWA/native considerations.
Respond in Korean unless asked otherwise.`,

  default: `You are "젬팀장" (Team Lead Gem), a versatile senior researcher for TapTalk, an AI English conversation practice app.
You help with tech research, documentation, trend analysis, and technical decisions.
Respond in Korean unless asked otherwise. Be concise and actionable.`,
};

async function askGemini(prompt, role) {
  try {
    const maxTokens = parseInt(process.env.MAX_TOKENS || "16384", 10);
    const systemPrompt = ROLES[role] || ROLES.default;
    const fullPrompt = `[Role Context]\n${systemPrompt}\n\n[Question]\n${prompt}`;
    const result = await geminiModel.generateContent({
      contents: [{ role: "user", parts: [{ text: fullPrompt }] }],
      generationConfig: { maxOutputTokens: maxTokens },
    });
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("Gemini API Error:", error.message);
    process.exit(1);
  }
}

// 인자 파싱
const args = process.argv.slice(2);

if (args.length === 0) {
  console.error(`사용법:
  node ask_gemini.mjs "질문 내용"
  node ask_gemini.mjs --role meeting "회의 안건"
  node ask_gemini.mjs --role researcher "리서치 질문"
  node ask_gemini.mjs --role ux "UX 관련 질문"
  node ask_gemini.mjs --file prompt.txt`);
  process.exit(1);
}

let role = "default";
let prompt;
const remaining = [];

for (let i = 0; i < args.length; i++) {
  if (args[i] === "--role" && args[i + 1]) {
    role = args[++i];
  } else if (args[i] === "--file" && args[i + 1]) {
    const filePath = args[++i];
    prompt = readFileSync(filePath, "utf-8");
  } else {
    remaining.push(args[i]);
  }
}

if (!prompt) {
  prompt = remaining.join(" ");
}

if (!prompt.trim()) {
  console.error("질문 내용을 입력해주세요.");
  process.exit(1);
}

console.log(`=== 젬팀장 (gemini-2.5-flash, role: ${role}) ===\n`);
const answer = await askGemini(prompt, role);
console.log(answer);
