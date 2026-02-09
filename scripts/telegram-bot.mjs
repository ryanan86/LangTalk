#!/usr/bin/env node
/**
 * 실시간 멀티 에이전트 중계 텔레그램 봇
 *
 * Claude Code CLI의 stdout을 실시간으로 캡처하여 텔레그램에 중계
 * oh-my-claudecode의 HUD 데이터와 에이전트 간 대화를 가로챔
 */

import TelegramBot from 'node-telegram-bot-api';
import { spawn, exec } from 'child_process';
import { promisify } from 'util';
import { readFileSync, existsSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

const execAsync = promisify(exec);

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

// 설정
const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const PROJECT_PATH = '/Users/taewoongan/Projects/langtalk';

// 에이전트 이모지 매핑 (한국식 직급)
const AGENT_EMOJI = {
  'Claude': '👨‍✈️',
  '노이사': '👨‍✈️',      // 이사 (Claude)
  'Leader': '👨‍✈️',
  '김팀장': '🔮',         // 팀장 (Gemini)
  'Researcher': '🔮',
  'Gemini': '🔮',
  '오팀장': '💡',         // 팀장 (GPT)
  'GPT': '💡',
  'Engineer': '🛠️',
  'Codex': '⚙️',
  'Tester': '🧪',
  'Designer': '🎨',
  'Planner': '📋',
  'default': '🤖'
};

// 진행 상황 메시지 관리
class LiveRelayMessage {
  constructor(bot, chatId) {
    this.bot = bot;
    this.chatId = chatId;
    this.messageId = null;
    this.lines = [];
    this.maxLines = 30; // 최대 30줄 유지
    this.lastUpdate = 0;
    this.updateInterval = 500; // 0.5초 간격
    this.pending = false;
  }

  async init(title) {
    const msg = await this.bot.sendMessage(this.chatId, `📡 *${title}*\n━━━━━━━━━━━━━━━\n⏱️ 시작...`, { parse_mode: 'Markdown' });
    this.messageId = msg.message_id;
    this.lines = [`📡 *${title}*`, '━━━━━━━━━━━━━━━'];
    return this;
  }

  async addLine(line) {
    // 라인 추가
    this.lines.push(line);

    // 최대 줄 수 유지
    if (this.lines.length > this.maxLines + 2) { // 헤더 2줄 제외
      this.lines = [this.lines[0], this.lines[1], '...', ...this.lines.slice(-this.maxLines)];
    }

    // 업데이트 스로틀링
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
        parse_mode: 'Markdown'
      });
      this.lastUpdate = Date.now();
    } catch (e) {
      // 에러 무시 (동일 내용, rate limit 등)
    }
  }

  async finalize(summary) {
    this.lines.push('━━━━━━━━━━━━━━━');
    this.lines.push(summary);
    await this.flush();
  }
}

// Claude Code CLI 실행 및 stdout 중계
class ClaudeCodeRelay {
  constructor(bot, chatId, liveMsg) {
    this.bot = bot;
    this.chatId = chatId;
    this.liveMsg = liveMsg;
    this.process = null;
    this.buffer = '';
  }

  // Claude Code 프로세스 spawn
  async run(prompt, mode = 'autopilot') {
    const fullPrompt = `${mode}: ${prompt}`;

    await this.liveMsg.addLine(`\n👨‍✈️ *노이사*: "${prompt}"`);
    await this.liveMsg.addLine(`🚀 모드: ${mode}`);
    await this.liveMsg.addLine(`⏱️ 에이전트 작업 시작...\n`);

    return new Promise((resolve, reject) => {

      // Claude Code CLI 실행 (--verbose로 상세 출력)
      this.process = spawn('claude', ['-p', '--verbose', fullPrompt], {
        cwd: PROJECT_PATH,
        env: {
          ...process.env,
          PATH: `/Users/taewoongan/local/node/bin:${process.env.PATH}`,
          FORCE_COLOR: '0',
          CLAUDE_CODE_STREAM: '1', // 스트리밍 활성화 시도
        },
        shell: true
      });

      // stdout 실시간 리스닝
      this.process.stdout.on('data', async (data) => {
        const text = data.toString();
        await this.processOutput(text);
      });

      // stderr도 캡처
      this.process.stderr.on('data', async (data) => {
        const text = data.toString();
        await this.processOutput(text, true);
      });

      this.process.on('close', async (code) => {
        await this.liveMsg.finalize(`✅ 작업 완료 (exit: ${code})`);
        resolve(code);
      });

      this.process.on('error', async (err) => {
        await this.liveMsg.addLine(`❌ 에러: ${err.message}`);
        reject(err);
      });
    });
  }

  // 출력 파싱 및 중계
  async processOutput(text, isError = false) {
    this.buffer += text;

    // 줄 단위로 처리
    const lines = this.buffer.split('\n');
    this.buffer = lines.pop() || ''; // 마지막 불완전한 줄은 버퍼에 유지

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      // 에이전트 대화 패턴 감지
      const formatted = this.formatLine(trimmed, isError);
      if (formatted) {
        await this.liveMsg.addLine(formatted);
      }
    }
  }

  // 라인 포맷팅 (에이전트 감지)
  formatLine(line, isError = false) {
    // ANSI 코드 제거
    const clean = line.replace(/\x1B\[[0-9;]*m/g, '');

    // 무시할 패턴
    if (clean.includes('Compiling') || clean.includes('node_modules')) return null;
    if (clean.length < 3) return null;

    // [Team Talk] 패턴
    if (clean.includes('[Team Talk]') || clean.includes('[Agent-to-Agent]')) {
      return `💬 ${clean}`;
    }

    // @에이전트 패턴 (@Researcher, @Engineer 등)
    const agentMatch = clean.match(/@(\w+):/);
    if (agentMatch) {
      const agent = agentMatch[1];
      const emoji = AGENT_EMOJI[agent] || AGENT_EMOJI.default;
      return `${emoji} *@${agent}*: ${clean.replace(/@\w+:/, '').trim()}`;
    }

    // 생각/분석 패턴
    if (clean.includes('thinking') || clean.includes('분석')) {
      return `💭 ${clean}`;
    }

    // 도구 사용 패턴
    if (clean.includes('Read') || clean.includes('Edit') || clean.includes('Write')) {
      return `📄 ${clean.substring(0, 100)}`;
    }

    // 에러 패턴
    if (isError || clean.includes('error') || clean.includes('Error')) {
      return `⚠️ ${clean.substring(0, 100)}`;
    }

    // HUD/상태창 패턴
    if (clean.includes('%') || clean.includes('진행')) {
      return `📊 ${clean}`;
    }

    // 일반 출력 (중요한 것만)
    if (clean.length > 10) {
      return `  ${clean.substring(0, 80)}${clean.length > 80 ? '...' : ''}`;
    }

    return null;
  }

  // 프로세스 중단
  kill() {
    if (this.process) {
      this.process.kill('SIGTERM');
    }
  }
}

// 봇 초기화
const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });
console.log('📡 실시간 Claude Code 중계 봇 시작...');

// 활성 세션 관리
const activeSessions = new Map();

// === 명령어 ===

// Chat ID 확인 및 자동 저장 명령
bot.onText(/\/mychatid/, async (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, `
🔑 *당신의 Chat ID:*
\`${chatId}\`
`, { parse_mode: 'Markdown' });

  // 자동으로 .env에 추가
  try {
    const envPath = join(homedir(), '.claude', '.env');
    let content = '';
    if (existsSync(envPath)) {
      content = readFileSync(envPath, 'utf-8');
    }
    if (!content.includes('TELEGRAM_CHAT_ID')) {
      const { appendFileSync } = await import('fs');
      appendFileSync(envPath, `\nTELEGRAM_CHAT_ID="${chatId}"\n`);
      bot.sendMessage(chatId, '✅ Chat ID가 ~/.claude/.env에 자동 저장되었습니다!\n\n터미널 세션도 이제 중계됩니다.');
    } else {
      bot.sendMessage(chatId, 'ℹ️ Chat ID가 이미 저장되어 있습니다.');
    }
  } catch (e) {
    bot.sendMessage(chatId, `❌ 저장 실패: ${e.message}`);
  }
});

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, `
📡 *실시간 에이전트 중계 시스템*

이 봇은 Claude Code CLI의 출력을 실시간으로 중계합니다.
에이전트들의 사고 과정과 대화를 텔레그램에서 확인하세요.

🔑 *당신의 Chat ID:* \`${chatId}\`

━━━━━━━━━━━━━━━

📋 *명령어*

\`/run 작업내용\` - Claude Code 실행 (autopilot)
\`/swarm 작업내용\` - 병렬 에이전트 모드
\`/analyze 대상\` - 프로젝트 분석
\`/stop\` - 실행 중단

\`/status\` - 프로젝트 현황
\`/build\` - 빌드
\`/deploy 메시지\` - 배포

💡 작업 중 에이전트 대화가 실시간으로 중계됩니다!
`, { parse_mode: 'Markdown' });
});

// Claude Code 실행 (autopilot 모드)
bot.onText(/\/run (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const prompt = match[1];

  // 이미 실행 중인 세션이 있으면 중단
  if (activeSessions.has(chatId)) {
    activeSessions.get(chatId).kill();
    activeSessions.delete(chatId);
  }

  const liveMsg = new LiveRelayMessage(bot, chatId);
  await liveMsg.init('Claude Code 실행 중계');

  const relay = new ClaudeCodeRelay(bot, chatId, liveMsg);
  activeSessions.set(chatId, relay);

  try {
    await relay.run(prompt, 'autopilot');
  } catch (e) {
    await liveMsg.addLine(`❌ 실행 실패: ${e.message}`);
  } finally {
    activeSessions.delete(chatId);
  }
});

// Swarm 모드 (병렬 에이전트)
bot.onText(/\/swarm (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const prompt = match[1];

  if (activeSessions.has(chatId)) {
    activeSessions.get(chatId).kill();
    activeSessions.delete(chatId);
  }

  const liveMsg = new LiveRelayMessage(bot, chatId);
  await liveMsg.init('Swarm 모드 실행');

  const relay = new ClaudeCodeRelay(bot, chatId, liveMsg);
  activeSessions.set(chatId, relay);

  try {
    await relay.run(prompt, 'ultrapilot');
  } catch (e) {
    await liveMsg.addLine(`❌ 실행 실패: ${e.message}`);
  } finally {
    activeSessions.delete(chatId);
  }
});

// 분석 모드
bot.onText(/\/analyze (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const target = match[1];

  if (activeSessions.has(chatId)) {
    activeSessions.get(chatId).kill();
    activeSessions.delete(chatId);
  }

  const liveMsg = new LiveRelayMessage(bot, chatId);
  await liveMsg.init(`"${target}" 분석 중계`);

  const relay = new ClaudeCodeRelay(bot, chatId, liveMsg);
  activeSessions.set(chatId, relay);

  try {
    await relay.run(`${target}에 대해 분석하고 개선 방향을 제시해줘`, 'autopilot');
  } catch (e) {
    await liveMsg.addLine(`❌ 분석 실패: ${e.message}`);
  } finally {
    activeSessions.delete(chatId);
  }
});

// 실행 중단
bot.onText(/\/stop/, (msg) => {
  const chatId = msg.chat.id;

  if (activeSessions.has(chatId)) {
    activeSessions.get(chatId).kill();
    activeSessions.delete(chatId);
    bot.sendMessage(chatId, '⏹️ 작업이 중단되었습니다.');
  } else {
    bot.sendMessage(chatId, '실행 중인 작업이 없습니다.');
  }
});

// 프로젝트 상태
bot.onText(/\/status/, async (msg) => {
  const { stdout: gitLog } = await execAsync('git log --oneline -3', { cwd: PROJECT_PATH }).catch(() => ({ stdout: '' }));
  const { stdout: gitStatus } = await execAsync('git status --short', { cwd: PROJECT_PATH }).catch(() => ({ stdout: '' }));

  bot.sendMessage(msg.chat.id, `
👨‍✈️ *프로젝트 상태*

📁 \`${PROJECT_PATH}\`

📝 *최근 커밋:*
\`\`\`
${gitLog.trim() || '없음'}
\`\`\`

📋 *변경사항:*
\`\`\`
${gitStatus.trim() || '없음 (clean)'}
\`\`\`
`, { parse_mode: 'Markdown' });
});

// 빌드
bot.onText(/\/build/, async (msg) => {
  const chatId = msg.chat.id;

  const liveMsg = new LiveRelayMessage(bot, chatId);
  await liveMsg.init('빌드 실행');
  await liveMsg.addLine('⏱️ npm run build 실행 중...');

  try {
    const { stdout, stderr } = await execAsync('npm run build', {
      cwd: PROJECT_PATH,
      env: { ...process.env, PATH: `/Users/taewoongan/local/node/bin:${process.env.PATH}` },
      timeout: 180000
    });

    await liveMsg.addLine('✅ 빌드 완료');
    await liveMsg.finalize(`\`\`\`\n${(stdout || stderr).substring(0, 1000)}\n\`\`\``);
  } catch (e) {
    await liveMsg.finalize(`❌ 빌드 실패: ${e.message.substring(0, 500)}`);
  }
});

// 배포
bot.onText(/\/deploy(.*)/, async (msg, match) => {
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

// 일반 메시지
bot.on('message', (msg) => {
  if (msg.text?.startsWith('/')) return;

  bot.sendMessage(msg.chat.id, `
💡 사용 가능한 명령어:
\`/run 작업내용\` - Claude Code 실행
\`/analyze 대상\` - 분석
\`/stop\` - 중단
`, { parse_mode: 'Markdown' });
});

bot.on('polling_error', (error) => {
  if (!['ETELEGRAM', 'EFATAL'].includes(error.code)) {
    console.error('Polling error:', error.message);
  }
});

console.log('✅ 봇 대기 중...');
