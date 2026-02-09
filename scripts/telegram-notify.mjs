#!/usr/bin/env node
/**
 * Claude Code 훅에서 호출되어 텔레그램으로 메시지 전송
 *
 * 사용: node telegram-notify.mjs "메시지"
 * 환경변수: TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID
 */

import { readFileSync, existsSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

// ~/.claude/.env 로드
function loadEnv() {
  const envPath = join(homedir(), '.claude', '.env');
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

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

async function sendMessage(text) {
  if (!TELEGRAM_TOKEN || !CHAT_ID) {
    console.error('TELEGRAM_BOT_TOKEN 또는 TELEGRAM_CHAT_ID 누락');
    return;
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text: text.substring(0, 4000),
        parse_mode: 'Markdown',
        disable_notification: true,
      }),
    });

    if (!response.ok) {
      console.error('Telegram 전송 실패:', await response.text());
    }
  } catch (e) {
    console.error('Telegram 전송 에러:', e.message);
  }
}

// stdin에서 훅 데이터 읽기
let input = '';
process.stdin.on('data', (chunk) => {
  input += chunk;
});

process.stdin.on('end', async () => {
  try {
    const data = JSON.parse(input);

    // 도구 호출 정보 포맷팅
    let message = '';

    if (data.tool_name) {
      const emoji = {
        'Read': '📖',
        'Write': '✍️',
        'Edit': '✏️',
        'Bash': '💻',
        'Grep': '🔍',
        'Glob': '📁',
        'Task': '🤖',
        'WebFetch': '🌐',
        'WebSearch': '🔎',
      }[data.tool_name] || '🔧';

      message = `${emoji} *${data.tool_name}*`;

      if (data.tool_input?.file_path) {
        message += `\n\`${data.tool_input.file_path.split('/').slice(-2).join('/')}\``;
      }
      if (data.tool_input?.command) {
        message += `\n\`${data.tool_input.command.substring(0, 100)}\``;
      }
      if (data.tool_input?.pattern) {
        message += `\n패턴: \`${data.tool_input.pattern}\``;
      }
    }

    if (message) {
      await sendMessage(message);
    }
  } catch (e) {
    // JSON 파싱 실패시 일반 텍스트로 처리
    if (input.trim()) {
      await sendMessage(input.trim().substring(0, 500));
    }
  }
});

// 명령줄 인자로 직접 메시지 전송
if (process.argv[2]) {
  sendMessage(process.argv.slice(2).join(' '));
}
