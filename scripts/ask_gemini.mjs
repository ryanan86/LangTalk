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
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

async function askGemini(prompt) {
  try {
    const maxTokens = parseInt(process.env.MAX_TOKENS || "2048", 10);
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: maxTokens },
    });
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("Gemini API Error:", error.message);
    process.exit(1);
  }
}

// 메인 실행
const args = process.argv.slice(2);

if (args.length === 0) {
  console.error("사용법: node ask_gemini.mjs \"질문 내용\"");
  process.exit(1);
}

let prompt;

if (args[0] === "--file" && args[1]) {
  // 파일에서 프롬프트 읽기
  const fs = await import("fs");
  prompt = fs.readFileSync(args[1], "utf-8");
} else {
  // 직접 프롬프트
  prompt = args.join(" ");
}

console.log("=== Gemini 응답 ===\n");
const answer = await askGemini(prompt);
console.log(answer);
