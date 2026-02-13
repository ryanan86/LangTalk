#!/usr/bin/env node
/**
 * Decision Injector - Stop Hook
 *
 * Claude Code Stop 훅으로 등록되어, 매 턴 종료 시 실행.
 * /tmp/claude-telegram-decisions/response.json을 확인하여
 * 텔레그램 유저의 응답을 Claude의 다음 턴에 주입.
 *
 * persistent-mode.cjs와 공존:
 * - 둘 다 block을 반환하면 Claude가 양쪽 reason을 모두 받음
 * - 유저 응답 + "계속 작업하라" 지시가 동시에 주입됨
 */

import { existsSync, readFileSync, writeFileSync, unlinkSync, appendFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

// 텔레그램 알림 전송
async function notifyTelegram(text) {
  try {
    const envPath = join(homedir(), '.claude', '.env');
    if (!existsSync(envPath)) return;
    const envContent = readFileSync(envPath, 'utf-8');
    let token = '', chatId = '';
    for (const line of envContent.split('\n')) {
      const m = line.match(/^(\w+)=["']?(.+?)["']?$/);
      if (m?.[1] === 'TELEGRAM_BOT_TOKEN') token = m[2];
      if (m?.[1] === 'TELEGRAM_CHAT_ID') chatId = m[2];
    }
    if (!token || !chatId) return;
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, disable_notification: true }),
    });
  } catch {}
}

const DECISIONS_DIR = '/tmp/claude-telegram-decisions';
const RESPONSE_FILE = join(DECISIONS_DIR, 'response.json');
const QUESTION_FILE = join(DECISIONS_DIR, 'question.json');
const HISTORY_FILE = join(DECISIONS_DIR, 'history.jsonl');

function readStdin(timeoutMs = 3000) {
  return new Promise((resolve) => {
    const chunks = [];
    let settled = false;

    const timeout = setTimeout(() => {
      if (!settled) {
        settled = true;
        process.stdin.removeAllListeners();
        process.stdin.destroy();
        resolve(Buffer.concat(chunks).toString('utf-8'));
      }
    }, timeoutMs);

    process.stdin.on('data', (chunk) => chunks.push(chunk));
    process.stdin.on('end', () => {
      if (!settled) {
        settled = true;
        clearTimeout(timeout);
        resolve(Buffer.concat(chunks).toString('utf-8'));
      }
    });
    process.stdin.on('error', () => {
      if (!settled) {
        settled = true;
        clearTimeout(timeout);
        resolve('');
      }
    });

    if (process.stdin.readableEnded) {
      if (!settled) {
        settled = true;
        clearTimeout(timeout);
        resolve(Buffer.concat(chunks).toString('utf-8'));
      }
    }
  });
}

async function main() {
  try {
    // stdin에서 hook 데이터 읽기
    const input = await readStdin();
    let data = {};
    try { data = JSON.parse(input); } catch {}

    const COMMAND_FILE = join(DECISIONS_DIR, 'command.json');

    // 1. 텔레그램 명령 주입 확인 (command.json)
    if (existsSync(COMMAND_FILE)) {
      let command;
      try {
        command = JSON.parse(readFileSync(COMMAND_FILE, 'utf-8'));
      } catch {
        try { unlinkSync(COMMAND_FILE); } catch {}
      }

      if (command?.prompt) {
        // 명령 파일 삭제 (한 번만 주입)
        try { unlinkSync(COMMAND_FILE); } catch {}

        // 히스토리 기록
        try {
          mkdirSync(DECISIONS_DIR, { recursive: true });
          appendFileSync(HISTORY_FILE, JSON.stringify({
            timestamp: new Date().toISOString(),
            type: 'command',
            prompt: command.prompt,
            from: 'telegram',
          }) + '\n');
        } catch {}

        const reason = [
          `[TELEGRAM COMMAND]`,
          `사용자가 텔레그램에서 다음 작업을 요청했습니다:`,
          ``,
          command.prompt,
          ``,
          `이 요청을 이 세션에서 바로 처리하세요. 처리 완료 후 반드시 텔레그램으로 결과를 보내주세요: node ${join(homedir(), 'Projects/langtalk/scripts/telegram-notify.mjs')} "처리결과"`,
        ].join('\n');

        // 텔레그램에 처리 시작 알림
        await notifyTelegram(`[처리 시작] ${command.prompt.substring(0, 200)}`);

        console.log(JSON.stringify({
          decision: 'block',
          reason,
        }));
        return;
      }
    }

    // 2. 질문 응답 주입 확인 (response.json)
    if (!existsSync(RESPONSE_FILE)) {
      console.log(JSON.stringify({ continue: true }));
      return;
    }

    // response.json 읽기
    let response;
    try {
      response = JSON.parse(readFileSync(RESPONSE_FILE, 'utf-8'));
    } catch {
      // 파싱 실패 시 파일 삭제 후 continue
      try { unlinkSync(RESPONSE_FILE); } catch {}
      console.log(JSON.stringify({ continue: true }));
      return;
    }

    // 유효한 응답인지 확인
    if (!response || !response.answer) {
      console.log(JSON.stringify({ continue: true }));
      return;
    }

    // question.json도 읽어서 히스토리에 기록
    let question = null;
    if (existsSync(QUESTION_FILE)) {
      try {
        question = JSON.parse(readFileSync(QUESTION_FILE, 'utf-8'));
      } catch {}
    }

    // 히스토리에 Q&A 쌍 기록
    const historyEntry = {
      timestamp: new Date().toISOString(),
      question_id: response.id || question?.id || 'unknown',
      question: question?.question || 'unknown',
      answer: response.answer,
      answered_at: response.timestamp || new Date().toISOString(),
    };

    try {
      mkdirSync(DECISIONS_DIR, { recursive: true });
      appendFileSync(HISTORY_FILE, JSON.stringify(historyEntry) + '\n');
    } catch {}

    // response.json 삭제 (한 번만 주입되도록)
    try { unlinkSync(RESPONSE_FILE); } catch {}

    // question.json도 삭제 (처리 완료)
    if (existsSync(QUESTION_FILE)) {
      try { unlinkSync(QUESTION_FILE); } catch {}
    }

    // Claude에게 유저 결정 주입
    const reason = [
      `[TELEGRAM USER DECISION]`,
      `질문: ${question?.question || '(알 수 없음)'}`,
      `유저 답변: ${response.answer}`,
      ``,
      `위 유저의 결정을 반영하여 작업을 계속하세요.`,
    ].join('\n');

    console.log(JSON.stringify({
      decision: 'block',
      reason,
    }));
  } catch (error) {
    // 에러 발생 시 안전하게 continue 반환
    console.error(`[decision-injector] Error: ${error.message}`);
    console.log(JSON.stringify({ continue: true }));
  }
}

main();
