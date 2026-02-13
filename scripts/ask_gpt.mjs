#!/usr/bin/env node
/**
 * ChatGPT API Bridge Script (v2)
 *
 * Claude Code가 ChatGPT(오팀장)에게 질문을 위임할 때 사용하는 브릿지 스크립트
 *
 * 사용법:
 *   node scripts/ask_gpt.mjs "질문 내용"                    # gpt-4o-mini (기본, 빠르고 저렴)
 *   node scripts/ask_gpt.mjs --model gpt-4o "질문 내용"     # gpt-4o (고품질 분석)
 *   node scripts/ask_gpt.mjs --model o3-mini "질문 내용"    # o3-mini (추론/전략)
 *   node scripts/ask_gpt.mjs --model o1 "질문 내용"         # o1 (깊은 추론)
 *   node scripts/ask_gpt.mjs --role strategist "질문 내용"  # 전략가 역할
 *   node scripts/ask_gpt.mjs --role reviewer "질문 내용"    # 코드 리뷰어 역할
 *   node scripts/ask_gpt.mjs --role ux "질문 내용"          # UX 설계자 역할
 *   node scripts/ask_gpt.mjs --file prompt.txt              # 파일에서 프롬프트 읽기
 *
 * 모델 가이드:
 *   gpt-4o-mini  - 빠른 응답, 간단한 질문, 비용 최소 (기본)
 *   gpt-4o       - 고품질 분석, 복잡한 코드 리뷰, 기획
 *   o3-mini      - 추론 특화, 전략/아키텍처 결정, 비용 효율적 추론
 *   o1           - 최고 수준 추론, 복잡한 문제 해결
 */

import OpenAI from "openai";
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

const API_KEY = process.env.OPENAI_API_KEY;

if (!API_KEY) {
  console.error("OPENAI_API_KEY 환경변수가 설정되지 않았습니다.");
  console.error("~/.zshrc에 다음을 추가하세요: export OPENAI_API_KEY='your-key'");
  process.exit(1);
}

const openai = new OpenAI({ apiKey: API_KEY });

// 역할별 시스템 프롬프트
const ROLES = {
  strategist: `You are "오팀장" (Team Lead Oh), a senior product strategist and planner for TapTalk, an AI English conversation practice app.
Your role: UX planning, business logic design, feature prioritization, edge case analysis.
Respond in Korean unless asked otherwise. Be concise, actionable, and data-driven.
Always consider: user retention, learning effectiveness, and mobile-first experience.`,

  reviewer: `You are "오팀장" (Team Lead Oh), a senior code reviewer for TapTalk (Next.js 14, TypeScript, Tailwind CSS).
Your role: Find bugs, suggest improvements, identify anti-patterns, and ensure code quality.
Focus on: performance, security, maintainability, and TypeScript best practices.
Respond in Korean unless asked otherwise.`,

  ux: `You are "오팀장" (Team Lead Oh), a UX/UI design specialist for TapTalk mobile app.
Your role: Design user flows, suggest UI improvements, optimize conversion and engagement.
Focus on: mobile-first design, accessibility, Korean/international UX patterns, PWA/native app considerations.
Respond in Korean unless asked otherwise.`,

  architect: `You are "오팀장" (Team Lead Oh), a senior software architect for TapTalk.
Your role: System design, API architecture, scalability planning, technology decisions.
Tech stack: Next.js 14, TypeScript, Vercel, Google Sheets as DB, Capacitor for mobile.
Respond in Korean unless asked otherwise.`,

  default: `You are "오팀장" (Team Lead Oh), a versatile senior engineer and strategist for TapTalk, an AI English conversation practice app.
You help with planning, code review, UX design, and technical decisions.
Respond in Korean unless asked otherwise. Be concise and actionable.`,
};

// o1/o3 모델은 system role 대신 user message에 역할 포함
const REASONING_MODELS = ["o1", "o1-mini", "o1-preview", "o3-mini"];

function isReasoningModel(model) {
  return REASONING_MODELS.some((m) => model.startsWith(m));
}

async function askGPT(prompt, model, role) {
  try {
    const systemPrompt = ROLES[role] || ROLES.default;
    const maxTokens = parseInt(process.env.MAX_TOKENS || "4096", 10);

    let messages;
    const params = { model };

    if (isReasoningModel(model)) {
      // Reasoning models: no system message, include role in user prompt
      messages = [
        {
          role: "user",
          content: `[Role Context]\n${systemPrompt}\n\n[Question]\n${prompt}`,
        },
      ];
      params.max_completion_tokens = maxTokens;
    } else {
      // Standard models: use system message
      messages = [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
      ];
      params.max_tokens = maxTokens;
    }

    params.messages = messages;
    const response = await openai.chat.completions.create(params);

    const usage = response.usage;
    if (usage) {
      const costInfo = estimateCost(model, usage.prompt_tokens, usage.completion_tokens);
      console.error(
        `[Token Usage] input: ${usage.prompt_tokens}, output: ${usage.completion_tokens}, estimated cost: $${costInfo}`
      );
    }

    return response.choices[0].message.content;
  } catch (error) {
    console.error("ChatGPT API Error:", error.message);
    process.exit(1);
  }
}

// 대략적 비용 추정 (USD)
function estimateCost(model, inputTokens, outputTokens) {
  const rates = {
    "gpt-4o-mini": { input: 0.15, output: 0.6 },
    "gpt-4o": { input: 2.5, output: 10 },
    "o3-mini": { input: 1.1, output: 4.4 },
    "o1": { input: 15, output: 60 },
    "o1-mini": { input: 3, output: 12 },
  };
  const rate = rates[model] || rates["gpt-4o-mini"];
  const cost = (inputTokens / 1_000_000) * rate.input + (outputTokens / 1_000_000) * rate.output;
  return cost.toFixed(4);
}

// 인자 파싱
const args = process.argv.slice(2);

if (args.length === 0) {
  console.error(`사용법:
  node ask_gpt.mjs "질문 내용"
  node ask_gpt.mjs --model gpt-4o "복잡한 분석 질문"
  node ask_gpt.mjs --model o3-mini "전략/추론 질문"
  node ask_gpt.mjs --role strategist "기획 질문"
  node ask_gpt.mjs --role reviewer "코드 리뷰 요청"
  node ask_gpt.mjs --role ux "UX 설계 질문"
  node ask_gpt.mjs --role architect "아키텍처 질문"
  node ask_gpt.mjs --file prompt.txt`);
  process.exit(1);
}

let model = "gpt-4o-mini";
let role = "default";
let prompt;
const remaining = [];

for (let i = 0; i < args.length; i++) {
  if (args[i] === "--model" && args[i + 1]) {
    model = args[++i];
  } else if (args[i] === "--role" && args[i + 1]) {
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

console.log(`=== 오팀장 (${model}, role: ${role}) ===\n`);
const answer = await askGPT(prompt, model, role);
console.log(answer);
