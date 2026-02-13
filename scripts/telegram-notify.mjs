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

const TG_MAX = 4096;

async function sendOnce(text) {
  const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: CHAT_ID,
      text,
      disable_notification: true,
    }),
  });
  if (!response.ok) {
    console.error('Telegram 전송 실패:', await response.text());
  }
}

async function sendMessage(text) {
  if (!TELEGRAM_TOKEN || !CHAT_ID) {
    console.error('TELEGRAM_BOT_TOKEN 또는 TELEGRAM_CHAT_ID 누락');
    return;
  }

  try {
    if (text.length <= TG_MAX) {
      await sendOnce(text);
      return;
    }

    // 긴 메시지 분할: 줄바꿈 기준으로 자름
    const chunks = [];
    let remaining = text;
    while (remaining.length > 0) {
      if (remaining.length <= TG_MAX) {
        chunks.push(remaining);
        break;
      }
      // 줄바꿈 기준으로 최대한 자르기
      let cut = remaining.lastIndexOf('\n', TG_MAX);
      if (cut < TG_MAX * 0.3) {
        // 줄바꿈이 너무 앞에 있으면 공백 기준
        cut = remaining.lastIndexOf(' ', TG_MAX);
      }
      if (cut < TG_MAX * 0.3) {
        // 그래도 없으면 강제 자르기
        cut = TG_MAX;
      }
      chunks.push(remaining.substring(0, cut));
      remaining = remaining.substring(cut).trimStart();
    }

    for (let i = 0; i < chunks.length; i++) {
      const header = chunks.length > 1 ? `[${i + 1}/${chunks.length}] ` : '';
      await sendOnce(header + chunks[i]);
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
      // MCP 에이전트 대화만 중계, 일반 도구 실행은 무시
      const isMCP = data.tool_name.startsWith('mcp__');

      if (isMCP) {
        // MCP 에이전트 대화 내용 중계
        let mcpAgent = null;
        if (data.tool_name.includes('mcp__x__')) mcpAgent = 'Codex';
        else if (data.tool_name.includes('mcp__g__')) mcpAgent = 'Gemini';
        else mcpAgent = data.tool_name.replace('mcp__', '');

        const role = data.tool_input?.agent_role || '';
        let prompt = data.tool_input?.prompt || data.tool_input?.question || '';
        if (!prompt && data.tool_input?.prompt_file) {
          const pf = data.tool_input.prompt_file;
          prompt = `(file: ${pf.split('/').pop()})`;
        }

        const roleLabel = role ? ` (${role})` : '';
        message = `[${mcpAgent}${roleLabel}]`;
        if (prompt) {
          message += ` Q: ${prompt}`;
        }

        // 응답
        const resp = data.tool_response;
        if (resp) {
          let answer = '';
          if (typeof resp === 'string') answer = resp;
          else if (resp.content) answer = typeof resp.content === 'string' ? resp.content : JSON.stringify(resp.content);
          else if (resp.result) answer = typeof resp.result === 'string' ? resp.result : JSON.stringify(resp.result);
          else if (resp.text) answer = resp.text;
          else if (resp.answer) answer = resp.answer;
          if (answer) {
            message += `\nA: ${answer}`;
          }
        }

      } else if (data.tool_name === 'Bash' && data.tool_input?.command) {
        // Bash 중 에이전트 호출만 중계 (ask_gemini, ask_gpt)
        const cmd = data.tool_input.command;
        if (cmd.includes('ask_gemini')) {
          let q = cmd.match(/ask_gemini\.mjs\s+"([^"]+)"/)?.[1] || '';
          if (!q && cmd.includes('--file')) {
            const filePath = cmd.match(/--file\s+(\S+)/)?.[1] || '';
            q = filePath ? `(file: ${filePath.split('/').pop()})` : '(file prompt)';
          }
          if (!q) q = '(prompt)';
          message = `[Gemini] Q: ${q}`;
          const stdout = data.tool_response?.stdout || '';
          if (stdout) {
            const cleaned = stdout.replace(/^===.*===\s*\n?/, '').trim();
            if (cleaned) message += `\nA: ${cleaned}`;
          }
        } else if (cmd.includes('ask_gpt')) {
          let q = cmd.match(/ask_gpt\.mjs\s+"([^"]+)"/)?.[1] || '';
          if (!q && cmd.includes('--file')) {
            const filePath = cmd.match(/--file\s+(\S+)/)?.[1] || '';
            q = filePath ? `(file: ${filePath.split('/').pop()})` : '(file prompt)';
          }
          if (!q) q = '(prompt)';
          message = `[GPT] Q: ${q}`;
          const stdout = data.tool_response?.stdout || '';
          if (stdout) {
            const cleaned = stdout.replace(/^===.*===\s*\n?/, '').trim();
            if (cleaned) message += `\nA: ${cleaned}`;
          }
        } else if (cmd.includes('git commit') || cmd.includes('git push') || cmd.includes('npm run build')) {
          // git/build 명령 중계
          const shortCmd = cmd.substring(0, 120);
          const stdout = data.tool_response?.stdout || '';
          const firstLine = stdout.split('\n')[0]?.substring(0, 100) || '';
          message = `[Bash] ${shortCmd}`;
          if (firstLine) message += `\n> ${firstLine}`;
        }
        // 그 외 Bash 명령은 무시

      } else if (data.tool_name === 'Task') {
        // 에이전트 위임 결과 중계
        const agentType = data.tool_input?.subagent_type || 'agent';
        const desc = data.tool_input?.description || '';
        const resp = data.tool_response;

        // 에이전트 이름 정리 (oh-my-claudecode: 접두사 제거)
        const agentName = agentType.replace('oh-my-claudecode:', '');

        let output = '';
        if (typeof resp === 'string') {
          output = resp;
        } else if (resp?.output) {
          output = typeof resp.output === 'string' ? resp.output : JSON.stringify(resp.output);
        } else if (resp?.result) {
          output = typeof resp.result === 'string' ? resp.result : JSON.stringify(resp.result);
        }

        // 요약: 첫 500자만
        const summary = output.length > 500 ? output.substring(0, 500) + '...' : output;
        message = `[Agent: ${agentName}] ${desc}`;
        if (summary) {
          message += `\n${summary}`;
        }

      } else if (data.tool_name === 'WebSearch') {
        // 리서치 결과만 간단히
        const query = data.tool_input?.query || '';
        message = `[Search] ${query.substring(0, 100)}`;

      } else if (data.tool_name === 'Edit') {
        // 파일 수정 알림 (경로 + 변경 요약)
        const filePath = data.tool_input?.file_path || '';
        const fileName = filePath.split('/').pop() || filePath;
        const oldStr = (data.tool_input?.old_string || '').trim();
        const newStr = (data.tool_input?.new_string || '').trim();
        message = `[Edit] ${fileName}`;
        if (oldStr || newStr) {
          const oldPreview = oldStr.split('\n')[0].substring(0, 80);
          const newPreview = newStr.split('\n')[0].substring(0, 80);
          if (oldPreview && newPreview) {
            message += `\n- ${oldPreview}\n+ ${newPreview}`;
          } else if (newPreview) {
            message += `\n+ ${newPreview}`;
          }
        }

      } else if (data.tool_name === 'Write') {
        // 파일 생성 알림 (경로 + 첫 줄)
        const filePath = data.tool_input?.file_path || '';
        const fileName = filePath.split('/').pop() || filePath;
        const content = (data.tool_input?.content || '').trim();
        const firstLine = content.split('\n')[0].substring(0, 80);
        message = `[Write] ${fileName}`;
        if (firstLine) message += `\n${firstLine}`;

      }
      // Read, Glob, Grep 등 읽기 전용 도구는 무시
    }

    if (message) {
      await sendMessage(message);
    }
  } catch (e) {
    // JSON 파싱 실패시 일반 텍스트로 처리
    if (input.trim()) {
      await sendMessage(input.trim());
    }
  }
});

// 명령줄 인자로 직접 메시지 전송
if (process.argv[2]) {
  sendMessage(process.argv.slice(2).join(' '));
}
