# 양방향 텔레그램 봇 v2 사용 매뉴얼

## 개요

Claude Code와 텔레그램을 통해 **양방향 소통**하며 자율 작업을 원격 제어하는 봇입니다.
Claude가 의사결정이 필요할 때 텔레그램으로 질문을 보내고, 유저가 버튼을 클릭하면 Claude가 그 결정을 반영하여 작업을 계속합니다.

터미널을 열어둘 필요 없이 tmux 세션에서 백그라운드로 동작합니다.

---

## 시작하기

### 1단계: tmux로 봇 시작

```bash
cd ~/Projects/langtalk/scripts
./tmux-launcher.sh
```

정상 시작 시 출력:
```
🚀 Claude 양방향 텔레그램 봇 시작...
   세션: claude-telegram
   로그: /tmp/claude-telegram-logs/bot-20260209.log
✅ 봇이 시작되었습니다!
```

### 2단계: 텔레그램에서 확인

텔레그램 봇 채팅에서 `/start`를 입력하면 사용법이 표시됩니다.

---

## 명령어 목록

### 작업 실행

| 명령어 | 설명 | 예시 |
|--------|------|------|
| `/run 작업` | autopilot 모드로 실행 | `/run 로그인 페이지에 비밀번호 찾기 기능 추가해줘` |
| `/ralph 작업` | 완료될 때까지 반복 실행 | `/ralph REST API 만들고 테스트까지 통과시켜줘` |
| `/swarm 작업` | 병렬 에이전트로 실행 | `/swarm 전체 컴포넌트 다크모드 지원 추가해줘` |
| `/analyze 대상` | 분석 모드 | `/analyze src/app/talk/page.tsx` |

### 소통 (양방향)

| 명령어 | 설명 | 예시 |
|--------|------|------|
| `/reply 답변` | Claude의 질문에 응답 | `/reply PostgreSQL로 해줘` |
| `/decisions` | 대기 중인 질문 목록 확인 | `/decisions` |
| `/history` | 이전 질문/응답 이력 확인 | `/history` |
| (일반 텍스트) | 작업 중이면 자동으로 답변 전달 | `PostgreSQL` (그냥 타이핑) |

### 관리

| 명령어 | 설명 |
|--------|------|
| `/stop` | 현재 실행 중인 작업 중단 |
| `/status` | 프로젝트 상태 + 세션 상태 확인 |
| `/build` | `npm run build` 실행 |
| `/deploy 메시지` | git add + commit + push |
| `/mychatid` | 본인의 Chat ID 확인 |

---

## 사용 시나리오

### 시나리오 1: 간단한 기능 추가

```
유저: /run 메인 페이지에 다크모드 토글 버튼 추가해줘

봇: 📡 AUTOPILOT 모드 실행
    👨‍✈️ 노이사: "메인 페이지에 다크모드 토글 버튼 추가해줘"
    🚀 모드: autopilot
    📄 Read src/app/page.tsx
    📄 Edit src/app/page.tsx
    ✅ 작업 완료 (exit: 0)
```

### 시나리오 2: 의사결정이 필요한 작업 (핵심!)

```
유저: /ralph REST API 전체 만들어줘

봇: 📡 RALPH 모드 실행
    👨‍✈️ 노이사: "REST API 전체 만들어줘"
    🚀 모드: ralph
    ...작업 진행 중...
    🤔 [DECISION NEEDED] 데이터베이스를 어떤 것으로 할까요?

봇: ❓ Claude가 결정을 요청합니다
    데이터베이스를 어떤 것으로 할까요?

    [PostgreSQL]  [SQLite]  [MongoDB]
    [✏️ 직접 입력 (/reply)]

유저: (PostgreSQL 버튼 클릭)

봇: ✅ 결정 완료
    데이터베이스를 어떤 것으로 할까요?
    → PostgreSQL

    ...Claude가 PostgreSQL로 계속 작업...
    ✅ 작업 완료 (exit: 0)
```

### 시나리오 3: 직접 텍스트로 응답

```
봇: ❓ Claude가 결정을 요청합니다
    API 인증 방식을 어떻게 할까요?

    [JWT]  [Session]
    [✏️ 직접 입력 (/reply)]

유저: /reply JWT로 하되 refresh token도 구현해줘

봇: ✅ 응답 전송 완료
    질문: API 인증 방식을 어떻게 할까요?
    답변: JWT로 하되 refresh token도 구현해줘
```

또는 명령어 없이 그냥 메시지를 보내도 됩니다:

```
유저: JWT로 하되 refresh token도 구현해줘

봇: ✅ "JWT로 하되 refresh token도 구현해줘" → Claude에게 전달됩니다.
```

### 시나리오 4: 배포까지 한 번에

```
유저: /ralph 로그인 버그 수정하고 테스트 통과시킨 후 빌드까지 해줘

...Claude 자율 작업 (여러 번 반복)...
...중간에 질문이 있으면 텔레그램으로 물어봄...

봇: ✅ 작업 완료 (exit: 0)

유저: /deploy 로그인 버그 수정

봇: 📡 배포 실행
    📦 git add -A
    📝 git commit -m "로그인 버그 수정"
    🚀 git push origin main
    ✅ 배포 완료!
```

---

## tmux 관리

### tmux-launcher.sh 명령어

```bash
# 봇 시작 (기본)
./tmux-launcher.sh

# 봇 중지
./tmux-launcher.sh stop

# 봇 재시작
./tmux-launcher.sh restart

# 상태 확인
./tmux-launcher.sh status

# 실시간 로그 확인 (Ctrl+C로 종료)
./tmux-launcher.sh logs
```

### tmux 직접 접속

```bash
# tmux 세션에 접속하여 봇 출력 직접 확인
tmux attach -t claude-telegram

# 접속 해제 (봇은 계속 실행): Ctrl+B → D
```

---

## 작동 원리

### 데이터 흐름

```
유저 (텔레그램)
  │
  ├─ /ralph "REST API 만들어줘"
  │     ↓
  │  telegram-bot-v2.mjs → spawn('claude', ['-p', ...])
  │     ↓
  │  Claude Code 자율 작업 (ralph 모드)
  │     ↓ stdout 스트림
  │  telegram-bot-v2.mjs → 실시간 텔레그램 중계
  │     ↓
  │  Claude: "[DECISION NEEDED] DB를 PostgreSQL? SQLite?"
  │     ↓
  │  DecisionDetector 감지 → question.json 기록
  │     ↓
  │  텔레그램: 인라인 키보드 [PostgreSQL] [SQLite]
  │     ↓
  ├─ 유저: PostgreSQL 클릭
  │     ↓
  │  response.json 기록 → Claude 턴 종료 시 Stop Hook 실행
  │     ↓
  │  decision-injector.mjs: response.json 읽음 → 응답 주입
  │  persistent-mode.cjs: ralph 상태 확인 → 계속 작업 지시
  │     ↓
  │  Claude: PostgreSQL 결정 반영 + ralph 모드 지속
  │
```

### 파일 구조

```
~/Projects/langtalk/scripts/
├── telegram-bot-v2.mjs     # 양방향 봇 (메인)
├── decision-injector.mjs   # Stop 훅 (응답 주입)
├── tmux-launcher.sh        # tmux 런처
├── telegram-bot.mjs        # 기존 봇 (v1, 일방향)
└── telegram-notify.mjs     # PostToolUse 알림 훅

/tmp/claude-telegram-decisions/
├── question.json           # 현재 대기 중인 질문
├── response.json           # 유저 응답 (일회성)
└── history.jsonl           # Q&A 이력 (append-only)

~/.claude/settings.json     # Stop 훅 등록
```

---

## 주의사항

1. **tmux 필요**: `brew install tmux`로 먼저 설치해야 합니다
2. **Node.js 경로**: `~/local/node/bin/node`를 사용합니다 (PATH 설정 필요)
3. **봇 토큰**: `~/.claude/.env`에 `TELEGRAM_BOT_TOKEN`과 `TELEGRAM_CHAT_ID`가 설정되어 있어야 합니다
4. **기존 봇과 동시 실행 불가**: `telegram-bot.mjs`(v1)와 `telegram-bot-v2.mjs`는 같은 봇 토큰을 사용하므로 동시에 실행하면 안 됩니다
5. **Stop 훅 타이밍**: decision-injector는 Claude의 **턴 종료 시** 실행됩니다. 따라서 유저가 버튼을 클릭한 후 Claude의 현재 턴이 끝나야 응답이 주입됩니다

---

## 문제 해결

### 봇이 시작되지 않을 때
```bash
# 로그 확인
cat /tmp/claude-telegram-logs/bot-$(date +%Y%m%d).log

# node-telegram-bot-api 설치 확인
cd ~/Projects/langtalk && npm ls node-telegram-bot-api
```

### Claude가 질문을 안 할 때
Claude가 `[DECISION NEEDED]` 마커를 사용하지 않으면 자연어 질문 패턴(`~할까요?`, `Should I ...?`)도 감지합니다. 하지만 `--append-system-prompt`를 통해 마커 사용을 지시하고 있으므로 대부분 마커를 사용합니다.

### 응답이 Claude에게 전달되지 않을 때
```bash
# response.json 확인
cat /tmp/claude-telegram-decisions/response.json

# decision-injector 수동 테스트
echo '{}' | node ~/Projects/langtalk/scripts/decision-injector.mjs
```

### tmux 세션이 남아있을 때
```bash
tmux kill-session -t claude-telegram
```
