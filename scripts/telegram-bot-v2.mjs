#!/usr/bin/env node
/**
 * 양방향 텔레그램 봇 v2
 *
 * 기존 telegram-bot.mjs 기반 확장:
 * - DecisionDetector: Claude stdout에서 질문 패턴 감지
 * - 인라인 키보드: 감지된 질문을 텔레그램 버튼으로 전송
 * - callback_query: 유저 버튼 클릭 → response.json 기록
 * - /ralph, /reply, /decisions 명령어
 * - --append-system-prompt로 [DECISION NEEDED] 마커 사용 지시
 * - 구조화된 상태 메시지 (에이전트, 단계, 완료율)
 */

import TelegramBot from 'node-telegram-bot-api';
import { spawn, exec } from 'child_process';
import { promisify } from 'util';
import {
  readFileSync, existsSync, writeFileSync, mkdirSync,
  unlinkSync, readdirSync, appendFileSync
} from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import https from 'https';

const execAsync = promisify(exec);

// ─── .env 로드 ───────────────────────────────────────────

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

// ─── 설정 ────────────────────────────────────────────────

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const PROJECT_PATH = '/Users/taewoongan/Projects/langtalk';
const DECISIONS_DIR = '/tmp/claude-telegram-decisions';
const RESPONSE_FILE = join(DECISIONS_DIR, 'response.json');
const QUESTION_FILE = join(DECISIONS_DIR, 'question.json');
const HISTORY_FILE = join(DECISIONS_DIR, 'history.jsonl');

// 디렉토리 초기화
mkdirSync(DECISIONS_DIR, { recursive: true });

// Claude에게 팀 협업 + 의사결정 마커 사용을 지시하는 시스템 프롬프트
const DECISION_SYSTEM_PROMPT = `당신은 멀티에이전트 팀의 리더 '클이사'입니다.
팀원: 젬팀장(Gemini, 리서치/최신정보), 오팀장(GPT, 전략/기획/UX).
작업 시 반드시 팀원과 협업하세요:
- 리서치/최신정보 필요: Bash로 node scripts/ask_gemini.mjs "질문" 실행 → 젬팀장 의견 확인
- 전략/기획/UX 필요: Bash로 node scripts/ask_gpt.mjs "질문" 실행 → 오팀장 의견 확인
- 복잡한 구현: Task 도구로 서브에이전트 활용
각 팀원 응답을 인용하며 종합 판단을 내리세요.
의사결정이 필요하면 [DECISION NEEDED] 질문 다음줄에 [OPTIONS] 옵션1 | 옵션2 형식으로 출력하세요. 유저 응답은 [TELEGRAM USER DECISION]으로 전달됩니다.`;

// ─── 에이전트 이모지 ─────────────────────────────────────

const AGENT_EMOJI = {
  'Claude': '👨‍✈️', '클이사': '👨‍✈️', 'Leader': '👨‍✈️',
  '젬팀장': '🔮', 'Researcher': '🔮', 'Gemini': '🔮',
  '오팀장': '💡', 'GPT': '💡',
  'Engineer': '🛠️', 'Codex': '⚙️', 'Tester': '🧪',
  'Designer': '🎨', 'Planner': '📋', 'default': '🤖'
};

// ─── DecisionDetector ────────────────────────────────────

class DecisionDetector {
  constructor() {
    this.pendingQuestions = new Map(); // id → question object
  }

  /**
   * stdout 라인에서 질문 패턴을 감지.
   * 반환: { id, question, options } | null
   */
  detect(line) {
    const clean = line.replace(/\x1B\[[0-9;]*m/g, '').trim();

    // 패턴 1: [DECISION NEEDED] ... [OPTIONS] opt1 | opt2
    const decisionMatch = clean.match(/\[DECISION NEEDED\]\s*(.+)/);
    if (decisionMatch) {
      const question = decisionMatch[1].trim();
      const id = `q-${Date.now()}`;
      // 옵션은 같은 줄이나 다음 줄의 [OPTIONS]에서 추출
      const optionsMatch = clean.match(/\[OPTIONS\]\s*(.+)/);
      const options = optionsMatch
        ? optionsMatch[1].split('|').map(o => o.trim()).filter(Boolean)
        : [];

      return { id, question, options };
    }

    // 패턴 2: "Should I ...?" / "어떤 것을 선택...?" 등 자연어 질문
    const naturalPatterns = [
      /should I (.+)\?/i,
      /어떤 것을 (.+)\?/,
      /(.+)로 할까요\?/,
      /(.+) 중에 어떤/,
      /which (?:one|option) (.+)\?/i,
      /do you (?:want|prefer) (.+)\?/i,
    ];

    for (const pattern of naturalPatterns) {
      const match = clean.match(pattern);
      if (match) {
        return {
          id: `q-${Date.now()}`,
          question: clean,
          options: [], // 자연어 질문은 옵션을 자동 추출하기 어려움
        };
      }
    }

    return null;
  }

  /**
   * [OPTIONS] 라인만 따로 파싱 (멀티라인 지원)
   */
  detectOptions(line) {
    const clean = line.replace(/\x1B\[[0-9;]*m/g, '').trim();
    const match = clean.match(/\[OPTIONS\]\s*(.+)/);
    if (match) {
      return match[1].split('|').map(o => o.trim()).filter(Boolean);
    }
    return null;
  }

  addQuestion(questionObj) {
    this.pendingQuestions.set(questionObj.id, {
      ...questionObj,
      timestamp: new Date().toISOString(),
      status: 'pending',
    });
  }

  getQuestion(id) {
    return this.pendingQuestions.get(id);
  }

  getPendingQuestions() {
    return [...this.pendingQuestions.values()].filter(q => q.status === 'pending');
  }

  resolveQuestion(id, answer) {
    const q = this.pendingQuestions.get(id);
    if (q) {
      q.status = 'answered';
      q.answer = answer;
      q.answered_at = new Date().toISOString();
    }
  }
}

// ─── LiveRelayMessage ────────────────────────────────────

class LiveRelayMessage {
  constructor(bot, chatId) {
    this.bot = bot;
    this.chatId = chatId;
    this.messageId = null;
    this.lines = [];
    this.maxLines = 30;
    this.lastUpdate = 0;
    this.updateInterval = 500;
    this.pending = false;
  }

  async init(title) {
    const msg = await this.bot.sendMessage(
      this.chatId,
      `📡 *${title}*\n━━━━━━━━━━━━━━━\n⏱️ 시작...`,
      { parse_mode: 'Markdown' }
    );
    this.messageId = msg.message_id;
    this.lines = [`📡 *${title}*`, '━━━━━━━━━━━━━━━'];
    return this;
  }

  async addLine(line) {
    this.lines.push(line);

    if (this.lines.length > this.maxLines + 2) {
      this.lines = [this.lines[0], this.lines[1], '...', ...this.lines.slice(-this.maxLines)];
    }

    const now = Date.now();
    if (now - this.lastUpdate >= this.updateInterval && !this.pending) {
      this.pending = true;
      await this.flush();
      this.pending = false;
    }
  }

  async flush() {
    if (!this.messageId) return;
    try {
      const content = this.lines.join('\n');
      await this.bot.editMessageText(content.substring(0, 4000), {
        chat_id: this.chatId,
        message_id: this.messageId,
        parse_mode: 'Markdown',
      });
      this.lastUpdate = Date.now();
    } catch {
      // 동일 내용, rate limit 등 무시
    }
  }

  async finalize(summary) {
    this.lines.push('━━━━━━━━━━━━━━━');
    this.lines.push(summary);
    await this.flush();
  }
}

// ─── ClaudeCodeRelay (확장) ──────────────────────────────

class ClaudeCodeRelay {
  constructor(bot, chatId, liveMsg, decisionDetector) {
    this.bot = bot;
    this.chatId = chatId;
    this.liveMsg = liveMsg;
    this.detector = decisionDetector;
    this.process = null;
    this.buffer = '';
    this.lastDetectedQuestion = null; // [DECISION NEEDED] 후 [OPTIONS] 대기용
    this._lastToolAgent = null; // 마지막 도구 호출의 에이전트 (gemini/gpt/subagent)
  }

  async run(prompt, mode = 'autopilot') {
    // 프롬프트만 전달 (모드 키워드는 --append-system-prompt로 지시)
    const fullPrompt = prompt;

    // Initialize session logger
    const LOG_DIR = join(homedir(), 'Projects', 'langtalk', 'logs', 'telegram-sessions');
    mkdirSync(LOG_DIR, { recursive: true });
    const now = new Date();
    const dateStr = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
    this.logFile = join(LOG_DIR, `${dateStr}_v2_${mode}.log`);
    const logHeader = [
      `=== Telegram Bot v2 Session Log ===`,
      `Date: ${now.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}`,
      `Mode: ${mode}`,
      `Prompt: ${prompt}`,
      `${'='.repeat(50)}\n`,
    ].join('\n');
    appendFileSync(this.logFile, logHeader);

    await this.liveMsg.addLine(`\n👨‍✈️ *클이사*: "${prompt}"`);
    await this.liveMsg.addLine(`🚀 모드: ${mode}`);
    await this.liveMsg.addLine(`⏱️ 에이전트 작업 시작...\n`);

    return new Promise((resolve, reject) => {
      const args = [
        '-p',
        '--verbose',
        '--output-format', 'stream-json',
        '--append-system-prompt', DECISION_SYSTEM_PROMPT,
      ];

      this.process = spawn('/Users/taewoongan/.local/bin/claude', args, {
        cwd: PROJECT_PATH,
        env: {
          ...process.env,
          PATH: `/Users/taewoongan/local/node/bin:/Users/taewoongan/.local/bin:${process.env.PATH}`,
          FORCE_COLOR: '0',
        },
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      // 프롬프트를 stdin으로 전달 (stdout stream-json 출력을 위해 필수)
      this.process.stdin.write(fullPrompt);
      this.process.stdin.end();

      this.process.stdout.on('data', async (data) => {
        const text = data.toString();
        if (this.logFile) {
          const ts = new Date().toLocaleTimeString('ko-KR', { timeZone: 'Asia/Seoul', hour12: false });
          appendFileSync(this.logFile, `[${ts}] [STDOUT] ${text.trimEnd()}\n`);
        }
        await this.processOutput(text);
      });

      this.process.stderr.on('data', async (data) => {
        const text = data.toString();
        if (this.logFile) {
          const ts = new Date().toLocaleTimeString('ko-KR', { timeZone: 'Asia/Seoul', hour12: false });
          appendFileSync(this.logFile, `[${ts}] [STDERR] ${text.trimEnd()}\n`);
        }
        await this.processOutput(text, true);
      });

      this.process.on('close', async (code) => {
        if (this.logFile) {
          appendFileSync(this.logFile, `\n${'='.repeat(50)}\nSession ended with exit code: ${code}\n`);
        }
        console.log(`Claude 프로세스 종료 (exit: ${code})`);
        await this.liveMsg.finalize(`✅ 작업 완료 (exit: ${code})`);
        resolve(code);
      });

      this.process.on('error', async (err) => {
        if (this.logFile) {
          appendFileSync(this.logFile, `[ERROR] ${err.message}\n`);
        }
        console.log('[error]', err.message);
        await this.liveMsg.addLine(`❌ 에러: ${err.message}`);
        reject(err);
      });
    });
  }

  async processOutput(text, isError = false) {
    this.buffer += text;
    const lines = this.buffer.split('\n');
    this.buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      // stream-json 파싱
      let content = null;
      let skipFormat = false; // formatLine 건너뛰고 직접 addLine
      try {
        const json = JSON.parse(trimmed);

        if (json.type === 'system' && json.subtype === 'init') {
          // 세션 시작
          content = `⚙️ 세션 시작 (${json.model || 'claude'})`;
          skipFormat = true;

        } else if (json.type === 'assistant' && json.message?.content) {
          const parts = json.message.content;
          const texts = parts.filter(c => c.type === 'text').map(c => c.text);
          const tools = parts.filter(c => c.type === 'tool_use');

          if (texts.length > 0) {
            const txt = texts.join('\n').trim();
            if (txt) {
              content = `👨‍✈️ *클이사*: ${txt.substring(0, 200)}${txt.length > 200 ? '...' : ''}`;
              skipFormat = true;
            }
          }
          if (tools.length > 0) {
            for (const tool of tools) {
              const name = tool.name || 'tool';
              const input = tool.input || {};
              const cmd = input.command || '';

              // 중요한 도구만 표시 (잡일은 숨김)
              if (name === 'Bash' && cmd.includes('ask_gemini')) {
                await this.liveMsg.addLine(`🔮 클이사 → *젬팀장*에게 추가 질문`);
                this._lastToolAgent = 'gemini';
              } else if (name === 'Bash' && cmd.includes('ask_gpt')) {
                await this.liveMsg.addLine(`💡 클이사 → *오팀장*에게 추가 질문`);
                this._lastToolAgent = 'gpt';
              } else if (name === 'Task') {
                const desc = (input.description || '').substring(0, 40);
                await this.liveMsg.addLine(`🤖 서브에이전트 작업: ${desc}`);
                this._lastToolAgent = 'subagent';
              } else if (name === 'Edit' || name === 'Write') {
                const file = (input.file_path || '').split('/').pop();
                await this.liveMsg.addLine(`📝 파일 수정: ${file}`);
                this._lastToolAgent = null;
              } else if (name === 'Bash' && !cmd.includes('ask_')) {
                // npm, git 등 주요 명령만 표시
                if (cmd.match(/^(npm|git|npx|node |tsc|next)/)) {
                  await this.liveMsg.addLine(`⚡ 실행: ${cmd.substring(0, 50)}`);
                }
                this._lastToolAgent = null;
              } else {
                // Read, Grep, Glob 등 탐색 도구는 숨김
                this._lastToolAgent = null;
              }
            }
            if (!texts.length) continue;
          }

        } else if (json.type === 'user' && json.tool_use_result) {
          // 도구 결과 — 팀원 응답만 표시, 나머지는 숨김
          const stdout = json.tool_use_result.stdout || '';
          const stderr = json.tool_use_result.stderr || '';
          const output = (stdout || stderr).trim();

          if (this._lastToolAgent === 'gemini' && output) {
            content = `🔮 *젬팀장*: ${output.substring(0, 250)}${output.length > 250 ? '...' : ''}`;
            this._lastToolAgent = null;
            skipFormat = true;
          } else if (this._lastToolAgent === 'gpt' && output) {
            content = `💡 *오팀장*: ${output.substring(0, 250)}${output.length > 250 ? '...' : ''}`;
            this._lastToolAgent = null;
            skipFormat = true;
          } else {
            // 일반 도구 결과는 숨김
            this._lastToolAgent = null;
            continue;
          }

        } else if (json.type === 'result') {
          // 최종 결과 — 긴 결과는 분할 전송
          const result = typeof json.result === 'string' ? json.result : JSON.stringify(json.result || '');
          const cost = json.total_cost_usd ? ` ($${json.total_cost_usd.toFixed(3)})` : '';
          const turns = json.num_turns ? ` ${json.num_turns}턴` : '';
          if (result.length > 500) {
            await this.liveMsg.addLine(`✅ *클이사 작업 완료*:${turns}${cost}`);
            await sendLongMessage(this.bot, this.chatId, result);
            continue;
          }
          content = `✅ *클이사 최종 답변*:${turns}${cost}\n${result}`;
          skipFormat = true;

        } else {
          // 기타 JSON 타입은 무시 (시스템 내부 메시지)
          continue;
        }
      } catch {
        // JSON이 아닌 경우 원본 텍스트 사용
        content = trimmed;
      }

      if (!content || content.length < 2) continue;

      // 질문 감지
      await this.checkForDecision(content);

      if (skipFormat) {
        await this.liveMsg.addLine(content);
      } else {
        // 포맷팅 & 중계
        const formatted = this.formatLine(content, isError);
        if (formatted) {
          await this.liveMsg.addLine(formatted);
        }
      }
    }
  }

  async checkForDecision(line) {
    // [OPTIONS] 라인 체크 (이전 [DECISION NEEDED]에 대한 옵션)
    if (this.lastDetectedQuestion) {
      const options = this.detector.detectOptions(line);
      if (options && options.length > 0) {
        this.lastDetectedQuestion.options = options;
        this.detector.addQuestion(this.lastDetectedQuestion);
        await this.sendDecisionToTelegram(this.lastDetectedQuestion);
        this.lastDetectedQuestion = null;
        return;
      }
      // 옵션 없이 다른 줄이 오면 옵션 없는 질문으로 처리
      if (!line.includes('[OPTIONS]')) {
        this.detector.addQuestion(this.lastDetectedQuestion);
        await this.sendDecisionToTelegram(this.lastDetectedQuestion);
        this.lastDetectedQuestion = null;
      }
    }

    // 새 질문 감지
    const detected = this.detector.detect(line);
    if (detected) {
      if (detected.options.length > 0) {
        // 같은 줄에 옵션이 있으면 바로 전송
        this.detector.addQuestion(detected);
        await this.sendDecisionToTelegram(detected);
      } else {
        // [OPTIONS]를 다음 줄에서 기다림
        this.lastDetectedQuestion = detected;
      }
    }
  }

  async sendDecisionToTelegram(question) {
    // question.json에 기록
    writeFileSync(QUESTION_FILE, JSON.stringify({
      id: question.id,
      question: question.question,
      options: question.options,
      timestamp: question.timestamp,
      status: 'pending',
    }, null, 2));

    // 텔레그램에 인라인 키보드로 전송
    const keyboard = [];

    if (question.options.length > 0) {
      // 옵션 버튼 생성 (2열 배치)
      for (let i = 0; i < question.options.length; i += 2) {
        const row = [{ text: question.options[i], callback_data: `decision:${question.id}:${i}` }];
        if (i + 1 < question.options.length) {
          row.push({ text: question.options[i + 1], callback_data: `decision:${question.id}:${i + 1}` });
        }
        keyboard.push(row);
      }
    }

    // 텍스트 응답 안내 버튼
    keyboard.push([{ text: '✏️ 직접 입력 (/reply)', callback_data: `decision:${question.id}:custom` }]);

    await this.bot.sendMessage(this.chatId, [
      `❓ *Claude가 결정을 요청합니다*`,
      ``,
      question.question,
      ``,
      question.options.length > 0
        ? `아래 버튼을 클릭하거나 \`/reply 답변\`을 입력하세요.`
        : `\`/reply 답변\`으로 응답해주세요.`,
    ].join('\n'), {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: keyboard,
      },
    });
  }

  formatLine(line, isError = false) {
    const clean = line.replace(/\x1B\[[0-9;]*m/g, '');

    if (clean.includes('Compiling') || clean.includes('node_modules')) return null;
    if (clean.length < 3) return null;

    // [DECISION NEEDED] 는 이미 별도 처리됨
    if (clean.includes('[DECISION NEEDED]')) return `🤔 ${clean}`;
    if (clean.includes('[OPTIONS]')) return null; // 옵션은 키보드로 표시

    // [Team Talk] 패턴
    if (clean.includes('[Team Talk]') || clean.includes('[Agent-to-Agent]')) {
      return `💬 ${clean}`;
    }

    // @에이전트 패턴
    const agentMatch = clean.match(/@(\w+):/);
    if (agentMatch) {
      const agent = agentMatch[1];
      const emoji = AGENT_EMOJI[agent] || AGENT_EMOJI.default;
      return `${emoji} *@${agent}*: ${clean.replace(/@\w+:/, '').trim()}`;
    }

    // 단계/진행 상황
    if (clean.includes('Phase:') || clean.includes('단계:') || clean.includes('Step ')) {
      return `📋 ${clean.substring(0, 100)}`;
    }

    // 생각/분석 패턴
    if (clean.includes('thinking') || clean.includes('분석')) return `💭 ${clean}`;

    // 도구 사용 패턴
    if (clean.includes('Read') || clean.includes('Edit') || clean.includes('Write')) {
      return `📄 ${clean.substring(0, 100)}`;
    }

    // 에러 패턴
    if (isError || clean.includes('error') || clean.includes('Error')) {
      return `⚠️ ${clean.substring(0, 100)}`;
    }

    // 완료율/진행률
    if (clean.includes('%') || clean.includes('진행')) return `📊 ${clean}`;

    // 일반 출력
    if (clean.length > 10) {
      return `  ${clean.substring(0, 80)}${clean.length > 80 ? '...' : ''}`;
    }

    return null;
  }

  kill() {
    if (this.process) {
      this.process.kill('SIGTERM');
    }
  }
}

// ─── 봇 초기화 ───────────────────────────────────────────

// polling: false — 라이브러리 내장 polling이 ESM 환경에서 불안정하므로 직접 구현
const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: false });
const detector = new DecisionDetector();
const activeSessions = new Map();

console.log('📡 양방향 텔레그램 봇 v2 시작...');

// ─── 수동 Polling 구현 ──────────────────────────────────

let pollingOffset = 0;
const POLL_TIMEOUT = 30; // seconds (long polling)

function httpGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error('JSON parse error: ' + data.substring(0, 100))); }
      });
    }).on('error', reject);
  });
}

let pollCount = 0;
async function pollUpdates() {
  pollCount++;
  const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/getUpdates?timeout=${POLL_TIMEOUT}&offset=${pollingOffset}`;
  try {
    const data = await httpGet(url);
    if (data.ok && data.result?.length > 0) {
      console.log(`📨 ${data.result.length}개 업데이트 수신`);
      for (const update of data.result) {
        pollingOffset = update.update_id + 1;
        try {
          handleUpdate(update);
        } catch (handlerErr) {
          console.error('Handler error:', handlerErr.message);
        }
      }
    }
  } catch (err) {
    console.error('Polling error:', err.message);
    await new Promise(r => setTimeout(r, 3000));
  }
  setImmediate(pollUpdates);
}

function handleUpdate(update) {
  if (update.message) {
    const msg = update.message;
    // onText 핸들러들 실행
    let handled = false;
    for (const handler of textHandlers) {
      const match = msg.text?.match(handler.pattern);
      if (match) {
        handler.callback(msg, match);
        handled = true;
        break;
      }
    }
    // 매칭 안 되면 일반 message 핸들러
    if (!handled && generalMessageHandler) {
      generalMessageHandler(msg);
    }
  }
  if (update.callback_query) {
    callbackQueryHandler(update.callback_query);
  }
}

// 핸들러 레지스트리
const textHandlers = [];
let generalMessageHandler = null;
let callbackQueryHandler = () => {};

function onText(pattern, callback) {
  textHandlers.push({ pattern, callback });
}

function onMessage(callback) {
  generalMessageHandler = callback;
}

function onCallbackQuery(callback) {
  callbackQueryHandler = callback;
}

// polling 시작: 먼저 오래된 updates를 건너뛰고 새 메시지만 수신
setTimeout(async () => {
  try {
    // offset=-1로 최신 update 1개만 가져와서 offset 설정
    const data = await httpGet(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/getUpdates?offset=-1&timeout=0`);
    if (data.ok && data.result?.length > 0) {
      pollingOffset = data.result[data.result.length - 1].update_id + 1;
    }
    console.log('🔄 polling 시작 (offset:', pollingOffset, ')');
  } catch (e) {
    console.log('🔄 polling 시작 (offset: 0)');
  }
  pollUpdates().catch(e => console.error('pollUpdates fatal:', e));
}, 1000);

// ─── 인라인 키보드 콜백 핸들러 ───────────────────────────

onCallbackQuery(async (query) => {
  const data = query.data;
  if (!data.startsWith('decision:')) return;

  const parts = data.split(':');
  const questionId = parts[1];
  const optionIndex = parts[2];

  const question = detector.getQuestion(questionId);
  if (!question) {
    await bot.answerCallbackQuery(query.id, { text: '이 질문은 이미 만료되었습니다.' });
    return;
  }

  if (optionIndex === 'custom') {
    await bot.answerCallbackQuery(query.id, { text: '/reply 명령으로 답변을 입력해주세요.' });
    return;
  }

  const idx = parseInt(optionIndex, 10);
  const answer = question.options[idx];
  if (!answer) {
    await bot.answerCallbackQuery(query.id, { text: '유효하지 않은 옵션입니다.' });
    return;
  }

  // 응답 기록
  detector.resolveQuestion(questionId, answer);
  writeResponseFile(questionId, answer);

  // 확인 메시지
  await bot.answerCallbackQuery(query.id, { text: `✅ "${answer}" 선택됨` });

  // 원래 메시지 업데이트
  try {
    await bot.editMessageText(
      `✅ *결정 완료*\n\n${question.question}\n\n→ *${answer}*`,
      {
        chat_id: query.message.chat.id,
        message_id: query.message.message_id,
        parse_mode: 'Markdown',
      }
    );
  } catch {}
});

function writeResponseFile(questionId, answer) {
  writeFileSync(RESPONSE_FILE, JSON.stringify({
    id: questionId,
    answer,
    timestamp: new Date().toISOString(),
  }, null, 2));
}

// ─── 명령어 ──────────────────────────────────────────────

// /start
onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id, [
    `📡 *양방향 에이전트 중계 시스템 v2*`,
    ``,
    `Claude Code와 실시간으로 소통하며 자율 작업을 원격 제어합니다.`,
    ``,
    `🔑 *Chat ID:* \`${msg.chat.id}\``,
    ``,
    `━━━━━━━━━━━━━━━`,
    ``,
    `📋 *작업 명령어*`,
    `\`/run 작업\` — 자동 라운드 토론 + 실행`,
    `\`/discuss 작업\` — 팀 토론 (자동 라운드)`,
    `\`/discuss N 작업\` — N라운드 강제 지정`,
    `\`/ralph 작업\` — 완료까지 반복 (ralph)`,
    `\`/swarm 작업\` — 병렬 에이전트`,
    `\`/analyze 대상\` — 프로젝트 분석`,
    ``,
    `💬 *소통 명령어*`,
    `\`/reply 답변\` — Claude의 질문에 응답`,
    `\`/decisions\` — 대기 중인 질문 목록`,
    ``,
    `🛠️ *관리 명령어*`,
    `\`/stop\` — 실행 중단`,
    `\`/status\` — 프로젝트 현황`,
    `\`/build\` — 빌드 실행`,
    `\`/deploy 메시지\` — 배포 (git push)`,
    `\`/history\` — 질문/응답 이력`,
    ``,
    `💡 Claude가 의사결정이 필요하면 버튼이 나타납니다!`,
  ].join('\n'), { parse_mode: 'Markdown' });
});

// /run - autopilot 모드 (자동 라운드 결정)
onText(/\/run (.+)/, async (msg, match) => {
  await runRoundDiscussion(msg.chat.id, match[1], 'autopilot');
});

// /ralph - ralph 모드
onText(/\/ralph (.+)/, async (msg, match) => {
  await runRoundDiscussion(msg.chat.id, match[1], 'ralph');
});

// /swarm - 병렬 에이전트
onText(/\/swarm (.+)/, async (msg, match) => {
  await runRoundDiscussion(msg.chat.id, match[1], 'ultrapilot');
});

// /discuss - 라운드 수 지정 가능
onText(/\/discuss\s+(\d+)\s+(.+)/, async (msg, match) => {
  const rounds = Math.min(4, Math.max(1, parseInt(match[1], 10)));
  await runRoundDiscussion(msg.chat.id, match[2], 'autopilot', rounds);
});

// /discuss - 자동 라운드
onText(/\/discuss\s+([^\d].+)/, async (msg, match) => {
  await runRoundDiscussion(msg.chat.id, match[1], 'autopilot');
});

// /analyze - 분석
onText(/\/analyze (.+)/, async (msg, match) => {
  await runRoundDiscussion(msg.chat.id, `${match[1]}에 대해 분석하고 개선 방향을 제시해줘`, 'autopilot');
});

// /reply - 명시적 응답
onText(/\/reply (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const answer = match[1];

  // 가장 최근 대기 중인 질문 찾기
  const pending = detector.getPendingQuestions();

  if (pending.length === 0) {
    // 대기 질문 없어도 직접 응답 파일 생성 (자유 응답)
    writeResponseFile(`reply-${Date.now()}`, answer);
    bot.sendMessage(chatId, `✅ 응답이 전송되었습니다: "${answer}"`);
    return;
  }

  const latestQuestion = pending[pending.length - 1];
  detector.resolveQuestion(latestQuestion.id, answer);
  writeResponseFile(latestQuestion.id, answer);

  bot.sendMessage(chatId, [
    `✅ 응답 전송 완료`,
    ``,
    `질문: ${latestQuestion.question}`,
    `답변: *${answer}*`,
  ].join('\n'), { parse_mode: 'Markdown' });
});

// /decisions - 대기 중인 질문 목록
onText(/\/decisions/, (msg) => {
  const pending = detector.getPendingQuestions();

  if (pending.length === 0) {
    bot.sendMessage(msg.chat.id, '📭 대기 중인 질문이 없습니다.');
    return;
  }

  const lines = pending.map((q, i) => {
    const opts = q.options.length > 0 ? `\n  옵션: ${q.options.join(', ')}` : '';
    return `${i + 1}. ${q.question}${opts}`;
  });

  bot.sendMessage(msg.chat.id, [
    `❓ *대기 중인 질문 (${pending.length}개)*`,
    ``,
    ...lines,
    ``,
    `\`/reply 답변\` 으로 가장 최근 질문에 응답하세요.`,
  ].join('\n'), { parse_mode: 'Markdown' });
});

// /history - Q&A 이력
onText(/\/history/, (msg) => {
  if (!existsSync(HISTORY_FILE)) {
    bot.sendMessage(msg.chat.id, '📭 아직 질문/응답 이력이 없습니다.');
    return;
  }

  try {
    const content = readFileSync(HISTORY_FILE, 'utf-8').trim();
    const entries = content.split('\n').slice(-10).map(line => {
      try {
        const entry = JSON.parse(line);
        return `Q: ${entry.question}\nA: ${entry.answer}`;
      } catch { return null; }
    }).filter(Boolean);

    if (entries.length === 0) {
      bot.sendMessage(msg.chat.id, '📭 아직 질문/응답 이력이 없습니다.');
      return;
    }

    bot.sendMessage(msg.chat.id, [
      `📋 *최근 질문/응답 이력*`,
      ``,
      ...entries.map((e, i) => `${i + 1}. ${e}`),
    ].join('\n'), { parse_mode: 'Markdown' });
  } catch {
    bot.sendMessage(msg.chat.id, '❌ 이력을 읽을 수 없습니다.');
  }
});

// /stop
onText(/\/stop/, (msg) => {
  const chatId = msg.chat.id;
  if (activeSessions.has(chatId)) {
    activeSessions.get(chatId).kill();
    activeSessions.delete(chatId);
    bot.sendMessage(chatId, '⏹️ 작업이 중단되었습니다.');
  } else {
    bot.sendMessage(chatId, '실행 중인 작업이 없습니다.');
  }
});

// /status
onText(/\/status/, async (msg) => {
  const { stdout: gitLog } = await execAsync('git log --oneline -3', { cwd: PROJECT_PATH }).catch(() => ({ stdout: '' }));
  const { stdout: gitStatus } = await execAsync('git status --short', { cwd: PROJECT_PATH }).catch(() => ({ stdout: '' }));

  const pendingCount = detector.getPendingQuestions().length;
  const sessionActive = activeSessions.has(msg.chat.id);

  bot.sendMessage(msg.chat.id, [
    `👨‍✈️ *프로젝트 상태*`,
    ``,
    `📁 \`${PROJECT_PATH}\``,
    `🤖 세션: ${sessionActive ? '✅ 실행 중' : '⏸️ 대기'}`,
    `❓ 대기 질문: ${pendingCount}개`,
    ``,
    `📝 *최근 커밋:*`,
    '```',
    gitLog.trim() || '없음',
    '```',
    ``,
    `📋 *변경사항:*`,
    '```',
    gitStatus.trim() || '없음 (clean)',
    '```',
  ].join('\n'), { parse_mode: 'Markdown' });
});

// /build
onText(/\/build/, async (msg) => {
  const chatId = msg.chat.id;
  const liveMsg = new LiveRelayMessage(bot, chatId);
  await liveMsg.init('빌드 실행');
  await liveMsg.addLine('⏱️ npm run build 실행 중...');

  try {
    const { stdout, stderr } = await execAsync('npm run build', {
      cwd: PROJECT_PATH,
      env: { ...process.env, PATH: `/Users/taewoongan/local/node/bin:${process.env.PATH}` },
      timeout: 180000,
    });
    await liveMsg.addLine('✅ 빌드 완료');
    await liveMsg.finalize(`\`\`\`\n${(stdout || stderr).substring(0, 1000)}\n\`\`\``);
  } catch (e) {
    await liveMsg.finalize(`❌ 빌드 실패: ${e.message.substring(0, 500)}`);
  }
});

// /deploy
onText(/\/deploy(.*)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const commitMsg = match[1].trim() || 'Update';
  const liveMsg = new LiveRelayMessage(bot, chatId);
  await liveMsg.init('배포 실행');

  try {
    await liveMsg.addLine('📦 git add -A');
    await execAsync('git add -A', { cwd: PROJECT_PATH });

    await liveMsg.addLine(`📝 git commit -m "${commitMsg}"`);
    const { stdout: commitOut } = await execAsync(`git commit -m "${commitMsg}"`, { cwd: PROJECT_PATH }).catch(e => ({ stdout: e.message }));

    if (commitOut.includes('nothing to commit')) {
      await liveMsg.finalize('📝 변경사항 없음');
      return;
    }

    await liveMsg.addLine('🚀 git push origin main');
    await execAsync('git push origin main', { cwd: PROJECT_PATH });

    await liveMsg.finalize('✅ 배포 완료!\n1-2분 후 taptalk.xyz에서 확인');
  } catch (e) {
    await liveMsg.finalize(`❌ 배포 실패: ${e.message.substring(0, 200)}`);
  }
});

// /mychatid
onText(/\/mychatid/, (msg) => {
  bot.sendMessage(msg.chat.id, `🔑 *Chat ID:* \`${msg.chat.id}\``, { parse_mode: 'Markdown' });
});

// 일반 메시지 (명령어 아닌 것)
onMessage((msg) => {
  if (msg.text?.startsWith('/')) return;

  // 활성 세션이 있으면 답변으로 취급
  if (activeSessions.has(msg.chat.id)) {
    const pending = detector.getPendingQuestions();
    if (pending.length > 0) {
      const latestQuestion = pending[pending.length - 1];
      detector.resolveQuestion(latestQuestion.id, msg.text);
      writeResponseFile(latestQuestion.id, msg.text);
      bot.sendMessage(msg.chat.id, `✅ "${msg.text}" → Claude에게 전달됩니다.`);
      return;
    }
    // 대기 질문 없으면 자유 응답으로 전달
    writeResponseFile(`msg-${Date.now()}`, msg.text);
    bot.sendMessage(msg.chat.id, `💬 "${msg.text}" → Claude에게 전달됩니다.`);
    return;
  }

  bot.sendMessage(msg.chat.id, [
    `💡 사용 가능한 명령어:`,
    `\`/run 작업\` — Claude Code 실행`,
    `\`/ralph 작업\` — 반복 완료 모드`,
    `\`/reply 답변\` — 질문 응답`,
    `\`/stop\` — 중단`,
  ].join('\n'), { parse_mode: 'Markdown' });
});

// ─── 팀원 호출 (Gemini / GPT) ────────────────────────────

const NODE_BIN = '/Users/taewoongan/local/node/bin/node';
const SCRIPTS_DIR = '/Users/taewoongan/Projects/langtalk/scripts';

async function askTeamMember(name, script, prompt, opts = {}) {
  const { timeoutMs = 30000, maxTokens = 1500 } = typeof opts === 'number' ? { timeoutMs: opts } : opts;
  return new Promise((resolve) => {
    const scriptPath = join(SCRIPTS_DIR, script);
    const proc = spawn(NODE_BIN, [scriptPath, prompt], {
      cwd: PROJECT_PATH,
      env: {
        ...process.env,
        PATH: `/Users/taewoongan/local/node/bin:${process.env.PATH}`,
        MAX_TOKENS: String(maxTokens),
      },
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: timeoutMs,
    });

    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', d => stdout += d.toString());
    proc.stderr.on('data', d => stderr += d.toString());

    const timer = setTimeout(() => {
      proc.kill('SIGTERM');
      console.log(`${name} 타임아웃 (${timeoutMs}ms)`);
      resolve(`(응답 타임아웃)`);
    }, timeoutMs);

    proc.on('close', (code) => {
      clearTimeout(timer);
      if (code === 0 && stdout) {
        const cleaned = stdout.replace(/^===.*===\s*\n?/, '').trim();
        console.log(`${name} 응답 완료 (${cleaned.length}자)`);
        resolve(cleaned);
      } else {
        console.log(`${name} 실패 (exit: ${code}) ${stderr.substring(0, 100)}`);
        resolve(`(응답 실패: ${stderr.substring(0, 80) || 'exit ' + code})`);
      }
    });
  });
}

// ─── 긴 메시지 분할 전송 ─────────────────────────────────

async function sendLongMessage(bot, chatId, text, opts = {}) {
  const { maxLen = 4000, parseMode = undefined } = opts;
  if (!text || text.length === 0) return;
  if (text.length <= maxLen) {
    return bot.sendMessage(chatId, text, parseMode ? { parse_mode: parseMode } : {});
  }
  // 줄 단위로 분할
  const chunks = [];
  let current = '';
  for (const line of text.split('\n')) {
    if ((current + '\n' + line).length > maxLen && current) {
      chunks.push(current);
      current = line;
    } else {
      current += (current ? '\n' : '') + line;
    }
  }
  if (current) chunks.push(current);
  for (let i = 0; i < chunks.length; i++) {
    const header = chunks.length > 1 ? `(${i + 1}/${chunks.length})\n` : '';
    await bot.sendMessage(chatId, header + chunks[i], parseMode ? { parse_mode: parseMode } : {});
  }
}

// ─── 복잡도 분류 ─────────────────────────────────────────

function classifyComplexity(prompt) {
  let score = 0;
  const lower = prompt.toLowerCase();
  const charCount = prompt.length;

  if (charCount > 200) score += 2;
  else if (charCount > 80) score += 1;

  // 멀티파일 지표
  const multiFile = [/여러\s*파일/, /multiple\s*files/i, /전체/, /리팩토링/, /refactor/i, /아키텍처/, /architecture/i, /시스템/, /system\s+design/i, /마이그레이션/, /migration/i];
  for (const p of multiFile) { if (p.test(prompt)) { score += 2; break; } }

  // 리서치 필요 지표
  const research = [/최신/, /latest/i, /2025/, /2026/, /버전/, /version/i, /라이브러리/, /library/i, /패키지/, /package/i, /api/i, /sdk/i];
  for (const p of research) { if (p.test(prompt)) { score += 1; break; } }

  // 전략/UX 지표
  const strategy = [/ux/i, /ui/i, /디자인/, /design/i, /사용자/, /user/i, /기획/, /전략/, /strategy/i, /플로우/, /flow/i, /어떻게/, /how\s+should/i];
  for (const p of strategy) { if (p.test(prompt)) { score += 1; break; } }

  // 복잡한 구현 지표
  const complex = [/인증/, /auth/i, /결제/, /payment/i, /보안/, /security/i, /성능/, /performance/i, /최적화/, /optimiz/i, /데이터베이스/, /database/i];
  for (const p of complex) { if (p.test(prompt)) { score += 1; break; } }

  // 간단한 작업 지표 (감점)
  const simple = [/색상/, /color/i, /오타/, /typo/i, /간단/, /simple/i, /빠르게/, /quick/i, /텍스트\s*변경/, /주석/];
  for (const p of simple) { if (p.test(prompt)) { score -= 2; break; } }

  score = Math.max(0, Math.min(6, score));
  if (score <= 1) return { rounds: 1, label: '간단' };
  if (score <= 3) return { rounds: 2, label: '보통' };
  if (score <= 4) return { rounds: 3, label: '복잡' };
  return { rounds: 4, label: '풀 토론' };
}

// ─── 라운드 토론 프롬프트 템플릿 ─────────────────────────

const ROUND_PROMPTS = {
  gemini_research: (task) => `당신은 개발팀의 기술 리서처입니다.
프로젝트: TapTalk (Next.js 14 AI 영어회화앱, taptalk.xyz)
기술스택: Next.js 14, TypeScript, Tailwind, NextAuth, Google Sheets, OpenAI, ElevenLabs, Vercel.

다음 작업의 기술적 측면을 리서치하세요:
- 관련 라이브러리 최신 버전, API 변경사항, 주의점
- 대안적 기술 접근법 (장단점 비교)
- 성능/호환성 이슈

작업: ${task}

한국어로 간결하게 (최대 10줄). 구체적 버전/문서 인용 우선.`,

  gpt_strategy: (task) => `당신은 개발팀의 전략가/UX 전문가입니다.
프로젝트: TapTalk (AI 영어회화앱, 한국인 학습자 대상, 8-60세, 모바일 퍼스트)

다음 작업의 전략/UX를 분석하세요:
- 사용자 경험에 미치는 영향
- 개발자가 놓칠 수 있는 엣지 케이스
- UX 모범 사례 적용 방안
- 리스크 (사용자에게 무엇이 잘못될 수 있는지)

작업: ${task}

한국어로 간결하게 (최대 10줄). 구체적이고 실용적인 의견만.`,

  gpt_critique: (task, draft) => `당신은 시니어 코드 리뷰어입니다. 당신의 역할은 문제를 찾는 것이지, 동의하는 것이 아닙니다.

원래 작업: ${task}

리드 개발자의 계획/구현:
---
${draft}
---

반드시 2개 이상의 구체적 문제점을 찾으세요:

문제점 (잘못되었거나 위험한 것):
1. [구체적 문제] — [왜 중요한지] — [수정 방안]
2. [구체적 문제] — [왜 중요한지] — [수정 방안]

누락된 것:
- [간과된 부분]

잘한 점 (간략히):
- [견고한 부분]

규칙:
- "전반적으로 좋아 보입니다"로 시작하지 마세요. 문제점부터 시작.
- 모든 문제는 구체적이어야 합니다 (정확한 부분 인용).
한국어로 최대 15줄.`,

  gemini_validation: (task, draft) => `당신은 기술 검증자입니다. 이 구현을 최신 문서와 모범 사례 기준으로 검증하세요.

원래 작업: ${task}

검증 대상 구현:
---
${draft}
---

검증 항목:
1. 사용된 API/라이브러리가 최신 문서 기준으로 올바른가?
2. deprecated된 메서드나 breaking change를 놓쳤는가?
3. 보안이나 성능 우려사항은?
4. Next.js 14 App Router 관례에 맞는가?

실제 발견된 문제만 보고. 문제 없으면 간략히 OK.
한국어로 최대 10줄.`,

  claude_draft: (task, geminiOp, gptOp) => `[팀 토론 - 라운드 2: 초안 작성]

원래 요청: ${task}

팀원들의 의견:

[젬팀장(Gemini) - 기술 리서치]
${geminiOp}

[오팀장(GPT) - 전략/UX]
${gptOp}

지시:
1. 두 팀원의 의견을 주의 깊게 검토하고, 각각의 구체적 포인트를 참조하세요.
2. 구현 계획을 세우거나 실제 코드를 작성하세요.
3. 팀원 의견에 동의/비동의한 부분과 그 이유를 설명하세요.
4. 이 초안은 다음 라운드에서 비판받을 예정이므로 철저하게 작성하세요.`,

  claude_final: (task, draft, critique, validation) => `[팀 토론 - 최종 라운드: 피드백 반영]

원래 요청: ${task}

라운드 2에서 당신의 초안:
${draft}

[오팀장 비판]
${critique}

[젬팀장 검증]
${validation}

지시:
1. 비판의 각 항목에 대해 하나씩 대응하세요:
   a. 수정함 (무엇을 바꿨는지 설명), 또는
   b. 비동의 (구체적 근거와 함께 왜 동의하지 않는지 설명)
2. 피드백을 일반적으로만 인정하지 마세요. 구체적 변경사항을 보여주세요.
3. 모든 피드백을 반영한 최종 구현을 실행하세요.
4. 마지막에: "피드백 반영 변경사항: 1) ... 2) ..." 형식으로 목록 작성.`,
};

// ─── 라운드 토론 UI ──────────────────────────────────────

class RoundDiscussionUI {
  constructor(bot, chatId) {
    this.bot = bot;
    this.chatId = chatId;
    this.headerMsgId = null;
    this.totalRounds = 0;
    this.currentRound = 0;
    this.startTime = Date.now();
  }

  _bar(current, total) {
    const f = '\u2593'.repeat(current);
    const e = '\u2591'.repeat(total - current);
    return `[${f}${e}] ${current}/${total}`;
  }

  async initHeader(prompt, complexity, totalRounds) {
    this.totalRounds = totalRounds;
    const modeLabels = { 1: '직접 실행', 2: '의견수렴+실행', 3: '의견+초안+비판', 4: '풀 라운드 토론' };
    const text = [
      `━━ ROUND DISCUSSION ━━`,
      ``,
      `작업: ${prompt.substring(0, 80)}${prompt.length > 80 ? '...' : ''}`,
      `모드: ${modeLabels[totalRounds]} (${totalRounds}R)`,
      `복잡도: ${complexity.label}`,
      ``,
      `진행: ${this._bar(0, totalRounds)}`,
    ].join('\n');
    const msg = await this.bot.sendMessage(this.chatId, text);
    this.headerMsgId = msg.message_id;
  }

  async updateHeader(currentRound, status) {
    this.currentRound = currentRound;
    const elapsed = Math.round((Date.now() - this.startTime) / 1000);
    const text = [
      `━━ ROUND DISCUSSION ━━`,
      `진행: ${this._bar(currentRound, this.totalRounds)}`,
      `경과: ${elapsed}s | ${status}`,
    ].join('\n');
    try {
      await this.bot.editMessageText(text, { chat_id: this.chatId, message_id: this.headerMsgId });
    } catch {}
  }

  async startRound(num, description) {
    await this.updateHeader(num, description);
    const msg = await this.bot.sendMessage(this.chatId, `── R${num}/${this.totalRounds}: ${description} ──`);
    return msg.message_id;
  }

  async agentResponse(agent, emoji, response) {
    const text = `${emoji} *${agent}*:\n${response.substring(0, 900)}${response.length > 900 ? '...' : ''}`;
    await sendLongMessage(this.bot, this.chatId, text, { parseMode: 'Markdown' });
  }

  async finalize(summary, totalCost) {
    const elapsed = Math.round((Date.now() - this.startTime) / 1000);
    const text = [
      `━━ DISCUSSION COMPLETE ━━`,
      `라운드: ${this.totalRounds} | 시간: ${elapsed}s${totalCost ? ` | 비용: $${totalCost.toFixed(4)}` : ''}`,
      ``,
      summary ? summary.substring(0, 1500) : '작업 완료',
    ].join('\n');
    await sendLongMessage(this.bot, this.chatId, text);
  }
}

// ─── Claude 1라운드 실행 ─────────────────────────────────

function runClaudeRound(chatId, prompt, mode, opts = {}) {
  const { maxTurns = 20, captureOutput = false } = opts;

  // Session logging
  const ROUND_LOG_DIR = join(homedir(), 'Projects', 'langtalk', 'logs', 'telegram-sessions');
  mkdirSync(ROUND_LOG_DIR, { recursive: true });
  const roundNow = new Date();
  const roundDateStr = roundNow.toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const roundLogFile = join(ROUND_LOG_DIR, `${roundDateStr}_v2round_${mode}.log`);
  appendFileSync(roundLogFile, `=== Round Session Log ===\nDate: ${roundNow.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}\nMode: ${mode}\nPrompt: ${prompt.substring(0, 500)}\n${'='.repeat(50)}\n\n`);

  return new Promise((resolve, reject) => {
    const args = ['-p', '--verbose', '--output-format', 'stream-json', '--max-turns', String(maxTurns), '--append-system-prompt', DECISION_SYSTEM_PROMPT];
    const proc = spawn('/Users/taewoongan/.local/bin/claude', args, {
      cwd: PROJECT_PATH,
      env: {
        ...process.env,
        PATH: `/Users/taewoongan/local/node/bin:/Users/taewoongan/.local/bin:${process.env.PATH}`,
        FORCE_COLOR: '0',
      },
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    proc.stdin.write(prompt);
    proc.stdin.end();

    activeSessions.set(chatId, { kill: () => proc.kill('SIGTERM') });

    let buffer = '';
    const captured = [];
    const result = { output: '', summary: '', cost: 0 };

    proc.stdout.on('data', (data) => {
      const text = data.toString();
      const ts = new Date().toLocaleTimeString('ko-KR', { timeZone: 'Asia/Seoul', hour12: false });
      appendFileSync(roundLogFile, `[${ts}] [STDOUT] ${text.trimEnd()}\n`);

      buffer += text;
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      for (const line of lines) {
        const t = line.trim();
        if (!t) continue;
        try {
          const j = JSON.parse(t);
          if (captureOutput && j.type === 'assistant' && j.message?.content) {
            const texts = j.message.content.filter(c => c.type === 'text').map(c => c.text);
            if (texts.length) captured.push(texts.join('\n'));
          }
          if (j.type === 'result') {
            const r = typeof j.result === 'string' ? j.result : JSON.stringify(j.result || '');
            result.summary = r.substring(0, 1000);
            result.cost = j.total_cost_usd || 0;
          }
        } catch {}
      }
    });

    proc.stderr.on('data', (data) => {
      const ts = new Date().toLocaleTimeString('ko-KR', { timeZone: 'Asia/Seoul', hour12: false });
      appendFileSync(roundLogFile, `[${ts}] [STDERR] ${data.toString().trimEnd()}\n`);
    });

    proc.on('close', (code) => {
      appendFileSync(roundLogFile, `\n${'='.repeat(50)}\nSession ended with exit code: ${code}\n`);
      activeSessions.delete(chatId);
      result.output = captured.join('\n').substring(0, 3000);
      resolve(result);
    });

    proc.on('error', (err) => {
      appendFileSync(roundLogFile, `[ERROR] ${err.message}\n`);
      activeSessions.delete(chatId);
      reject(err);
    });

    // 라운드당 5분 타임아웃
    setTimeout(() => { proc.kill('SIGTERM'); }, 300000);
  });
}

// ─── 라운드 토론 엔진 (startClaudeSession 대체) ─────────

async function runRoundDiscussion(chatId, prompt, mode, forceRounds = null) {
  // 기존 세션 정리
  if (activeSessions.has(chatId)) {
    activeSessions.get(chatId).kill();
    activeSessions.delete(chatId);
  }
  try {
    if (existsSync(RESPONSE_FILE)) unlinkSync(RESPONSE_FILE);
    if (existsSync(QUESTION_FILE)) unlinkSync(QUESTION_FILE);
  } catch {}

  const complexity = classifyComplexity(prompt);
  const totalRounds = forceRounds || complexity.rounds;
  const ui = new RoundDiscussionUI(bot, chatId);
  await ui.initHeader(prompt, complexity, totalRounds);

  const state = { geminiR1: '', gptR1: '', claudeR2: '', gptR3: '', geminiR3: '', totalCost: 0 };

  try {
    // ══════ Round 1: 의견 수렴 ══════
    if (totalRounds >= 2) {
      await ui.startRound(1, '의견 수렴');

      const [gemR, gptR] = await Promise.allSettled([
        askTeamMember('젬팀장', 'ask_gemini.mjs', ROUND_PROMPTS.gemini_research(prompt), { timeoutMs: 25000, maxTokens: 1500 }),
        askTeamMember('오팀장', 'ask_gpt.mjs', ROUND_PROMPTS.gpt_strategy(prompt), { timeoutMs: 25000, maxTokens: 1500 }),
      ]);

      state.geminiR1 = gemR.status === 'fulfilled' ? gemR.value : '(젬팀장 응답 타임아웃)';
      state.gptR1 = gptR.status === 'fulfilled' ? gptR.value : '(오팀장 응답 타임아웃)';

      await ui.agentResponse('젬팀장 (리서치)', '🔮', state.geminiR1);
      await ui.agentResponse('오팀장 (전략)', '💡', state.gptR1);
      state.totalCost += 0.005;
    }

    // ══════ Round 2: Claude 실행/초안 ══════
    const r2Desc = totalRounds === 1 ? '직접 실행' : totalRounds === 2 ? '팀 의견 반영 실행' : '초안 작성';
    await ui.startRound(totalRounds === 1 ? 1 : 2, r2Desc);

    let claudePrompt;
    if (totalRounds === 1) {
      claudePrompt = prompt;
    } else if (totalRounds === 2) {
      claudePrompt = ROUND_PROMPTS.claude_draft(prompt, state.geminiR1, state.gptR1) + '\n\n팀 의견을 반영하여 바로 구현을 실행하세요. 이것이 최종 라운드입니다.';
    } else {
      claudePrompt = ROUND_PROMPTS.claude_draft(prompt, state.geminiR1, state.gptR1) + '\n\n상세한 계획과 초안을 작성하세요. 아직 최종이 아닙니다 — 다음 라운드에서 리뷰됩니다.';
    }

    const maxTurns = totalRounds <= 2 ? 25 : 15;
    const needCapture = totalRounds >= 3;

    // 1-2라운드 작업은 LiveRelayMessage로 실시간 중계
    if (totalRounds <= 2) {
      const liveMsg = new LiveRelayMessage(bot, chatId);
      await liveMsg.init(`${mode.toUpperCase()} — R${totalRounds === 1 ? 1 : 2} 실행`);
      const relay = new ClaudeCodeRelay(bot, chatId, liveMsg, detector);
      activeSessions.set(chatId, relay);
      try {
        await relay.run(claudePrompt, mode);
      } catch (e) {
        await liveMsg.addLine(`❌ 실행 실패: ${e.message}`);
      }
      activeSessions.delete(chatId);
      state.totalCost += 0.03;
      await ui.finalize('', state.totalCost);
      return;
    }

    // 3-4라운드: Claude 결과 캡처 (비판용)
    const claudeR2 = await runClaudeRound(chatId, claudePrompt, mode, { maxTurns, captureOutput: true });
    state.claudeR2 = claudeR2.output || claudeR2.summary || '';
    state.totalCost += claudeR2.cost || 0.03;

    if (state.claudeR2) {
      await ui.agentResponse('클이사 (초안)', '👨‍✈️', state.claudeR2.substring(0, 800));
    }

    // ══════ Round 3: 비판 + 검증 ══════
    await ui.startRound(3, '비판 & 검증');
    const draftForReview = state.claudeR2.substring(0, 2000);

    const [critR, valR] = await Promise.allSettled([
      askTeamMember('오팀장', 'ask_gpt.mjs', ROUND_PROMPTS.gpt_critique(prompt, draftForReview), { timeoutMs: 30000, maxTokens: 2000 }),
      askTeamMember('젬팀장', 'ask_gemini.mjs', ROUND_PROMPTS.gemini_validation(prompt, draftForReview), { timeoutMs: 25000, maxTokens: 1000 }),
    ]);

    state.gptR3 = critR.status === 'fulfilled' ? critR.value : '(오팀장 비판 타임아웃)';
    state.geminiR3 = valR.status === 'fulfilled' ? valR.value : '(젬팀장 검증 타임아웃)';

    await ui.agentResponse('오팀장 (비판)', '💡', state.gptR3);
    await ui.agentResponse('젬팀장 (검증)', '🔮', state.geminiR3);
    state.totalCost += 0.005;

    // ══════ Round 3 or 4: 최종 반영 실행 ══════
    const finalRound = totalRounds >= 4 ? 4 : 3;
    await ui.startRound(finalRound, '피드백 반영 최종 구현');

    const finalPrompt = ROUND_PROMPTS.claude_final(prompt, state.claudeR2.substring(0, 1500), state.gptR3, state.geminiR3);

    // 최종 라운드는 LiveRelayMessage로 실시간 중계
    const liveMsg = new LiveRelayMessage(bot, chatId);
    await liveMsg.init(`R${finalRound} — 최종 구현`);
    const relay = new ClaudeCodeRelay(bot, chatId, liveMsg, detector);
    activeSessions.set(chatId, relay);
    try {
      await relay.run(finalPrompt, mode);
    } catch (e) {
      await liveMsg.addLine(`❌ 실행 실패: ${e.message}`);
    }
    activeSessions.delete(chatId);
    state.totalCost += 0.03;

    await ui.finalize('모든 라운드 완료. 팀 피드백 반영 구현 완료.', state.totalCost);

  } catch (err) {
    await sendLongMessage(bot, chatId, `❌ 라운드 토론 실패: ${err.message}`);
  }
}

// ─── 에러 처리 ───────────────────────────────────────────

// polling_error는 수동 polling에서 직접 처리됨

process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err.message);
});

process.on('unhandledRejection', (err) => {
  console.error('Unhandled rejection:', err);
});

console.log('✅ 양방향 봇 대기 중... (텔레그램에서 /start 입력)');
