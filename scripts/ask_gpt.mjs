#!/usr/bin/env node
/**
 * ChatGPT API Bridge Script
 *
 * Claude Code가 ChatGPT에게 질문을 위임할 때 사용하는 브릿지 스크립트
 *
 * 사용법:
 *   node scripts/ask_gpt.mjs "질문 내용"
 *   node scripts/ask_gpt.mjs --file prompt.txt
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

async function askGPT(prompt) {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "user", content: prompt }
      ],
      max_tokens: 2048,
    });
    return response.choices[0].message.content;
  } catch (error) {
    console.error("ChatGPT API Error:", error.message);
    process.exit(1);
  }
}

// 메인 실행
const args = process.argv.slice(2);

if (args.length === 0) {
  console.error("사용법: node ask_gpt.mjs \"질문 내용\"");
  process.exit(1);
}

let prompt;

if (args[0] === "--file" && args[1]) {
  const fs = await import("fs");
  prompt = fs.readFileSync(args[1], "utf-8");
} else {
  prompt = args.join(" ");
}

console.log("=== ChatGPT 응답 ===\n");
const answer = await askGPT(prompt);
console.log(answer);
