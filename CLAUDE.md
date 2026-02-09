# TapTalk 프로젝트 컨텍스트

## 프로젝트 개요
- **서비스명**: TapTalk (탭톡)
- **목적**: AI 영어 회화 연습 앱
- **대상**: 한국인 영어 학습자 (아이~성인)
- **URL**: taptalk.xyz

## 기술 스택
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Auth**: NextAuth.js (Google OAuth)
- **DB**: Google Sheets (googleapis)
- **AI**: OpenAI GPT-4o-mini
- **TTS**: 하이브리드 (ElevenLabs + OpenAI)
- **STT**: OpenAI Whisper
- **Hosting**: Vercel
- **Mobile**: Capacitor (Android)

---

# 🤖 멀티 에이전트 팀 시스템

## 팀 구성

### @Orchestrator (Claude Code) - 팀장/지휘자
- **역할**: 작업 분배, 코드 작성, 빌드, 테스트, 배포 총괄
- **원칙**:
  - 혼자 결정하지 않고 팀원에게 적절히 위임
  - 2025년 5월 이후 정보는 반드시 @Researcher에게 확인
  - 기획/UX 결정은 @Strategist와 상의
  - 확실하지 않은 정보는 추측하지 말고 질의

### @Researcher (Gemini) - 리서처
- **역할**: 최신 기술 문서, 2025-2026 라이브러리 변경사항, 실시간 정보 조회
- **호출 방법**:
  ```bash
  node scripts/ask_gemini.mjs "질문 내용"
  ```
- **활용 시점**:
  - 최신 라이브러리 버전 및 breaking changes 확인
  - 2025년 이후 출시된 API 사용법
  - 실시간 문서 검증
  - 프론트엔드 UI 트렌드

### @Strategist (ChatGPT) - 전략가
- **역할**: 기획, UX 설계, 비즈니스 로직, 코드 리뷰
- **호출 방법**:
  ```bash
  node scripts/ask_gpt.mjs "질문 내용"
  ```
- **활용 시점**:
  - 사용자 경험(UX) 기획
  - 복잡한 로직 설계 및 리뷰
  - 아이디어 브레인스토밍
  - Edge case 분석

---

## oh-my-claudecode 실행 모드

플러그인이 설치되어 있음. 자연어로 키워드 사용 가능.

| 모드 | 키워드 | 설명 |
|------|--------|------|
| Autopilot | `autopilot:` | 완전 자율 실행 (계획→구현→테스트) |
| Ultrapilot | `ultrapilot:` | 3-5배 병렬 처리 |
| Ralph | `ralph:` | 완료될 때까지 반복 수정 |
| Ecomode | `eco:` | 토큰 30-50% 절감 |
| Ultrawork | `ulw:` | 최대 병렬 처리 |

### 사용 예시
```
autopilot: TapTalk 메인 화면에 다크모드 토글 추가해줘
ralph: 이 버그가 완전히 해결될 때까지 수정해줘
eco: 간단하게 버튼 색상만 변경해줘
```

---

## 팀 워크플로우

### 일반 작업
```
사용자 요청 → @Orchestrator가 직접 처리 → 완료
```

### 최신 기술 필요 시
```
사용자 요청
    ↓
@Orchestrator: "이건 내 지식 범위 밖"
    ↓
node scripts/ask_gemini.mjs "질문"
    ↓
응답 기반으로 구현
```

### 기획/UX 결정 필요 시
```
사용자 요청
    ↓
@Orchestrator: "UX 결정이 필요함"
    ↓
node scripts/ask_gpt.mjs "질문"
    ↓
기획안 기반으로 구현
```

---

## 환경변수 (세션 시작 시 자동 로드)

다음 환경변수가 `~/.zshrc`에 설정되어 있음:
- `GEMINI_API_KEY` - Gemini API 키
- `OPENAI_API_KEY` - OpenAI API 키

---

## 텔레그램 봇

### 시작 방법
```bash
node scripts/telegram-bot.mjs
```

### 명령어
| 명령어 | 기능 |
|--------|------|
| `/start` | 봇 시작 |
| `/run [작업]` | Claude Code 실행 (autopilot) |
| `/swarm [작업]` | 병렬 에이전트 모드 (ultrapilot) |
| `/analyze [대상]` | 프로젝트 분석 |
| `/stop` | 실행 중단 |
| `/status` | 프로젝트 상태 |
| `/build` | 프로젝트 빌드 |
| `/deploy [메시지]` | Git 커밋 & 푸시 |

---

## 🤖 Multi-Agent Live Relay Protocol

텔레그램 봇은 Claude Code CLI의 stdout을 실시간으로 캡처하여 중계합니다.

### 핵심 원칙
- 모든 작업은 `autopilot` 또는 `swarm` (ultrapilot) 모드로 실행한다.
- 에이전트 간의 모든 의사소통은 터미널에 `[Agent-to-Agent]` 또는 `[Team Talk]` 태그를 붙여 출력한다.
- 텔레그램 브릿지는 이 태그가 붙은 메시지를 감지하면 즉시 사용자에게 릴레이한다.

### 중계 대상 패턴
| 패턴 | 이모지 | 설명 |
|------|--------|------|
| `[Team Talk]` / `[Agent-to-Agent]` | 💬 | 에이전트 간 대화 |
| `@노이사:` / `@김팀장:` / `@오팀장:` | 직급별 | 에이전트 직접 발언 |
| `thinking` / `분석` | 💭 | 사고 과정 |
| `Read` / `Edit` / `Write` | 📄 | 도구 사용 |
| `error` / `Error` | ⚠️ | 에러 |
| `%` / `진행` | 📊 | 진행 상황 |

### 아키텍처
```
[Telegram] → /run 명령
     ↓
[telegram-bot.mjs] → spawn('claude', ['-p', prompt])
     ↓
[Claude Code CLI] → oh-my-claudecode autopilot/swarm
     ↓
[stdout stream] → 실시간 캡처
     ↓
[LiveRelayMessage] → 메시지 편집으로 실시간 업데이트 (0.5초 스로틀)
     ↓
[Telegram] → 사용자에게 중계
```

### 에이전트 직급
| 이름 | 직급 | 역할 | AI |
|------|------|------|-----|
| 노이사 | 이사 | 총괄 지휘 | Claude |
| 김팀장 | 팀장 | 리서치 | Gemini |
| 오팀장 | 팀장 | 전략/기획 | GPT |

---

## 주요 디렉토리 구조
```
src/
├── app/
│   ├── page.tsx           # 랜딩 페이지
│   ├── talk/page.tsx      # 메인 대화 페이지 (핵심!)
│   ├── review/page.tsx    # 교정 복습
│   ├── debate/page.tsx    # 토론 모드
│   ├── admin/             # 관리자 페이지
│   └── api/
│       ├── chat/          # AI 대화 API
│       ├── text-to-speech/ # TTS API
│       ├── speech-to-text/ # STT API
│       └── speaking-evaluate/ # 영어 평가 API
├── components/
├── lib/
│   ├── personas.ts        # 튜터 캐릭터 정의
│   ├── speechMetrics.ts   # 연령별 난이도 계산
│   └── i18n.tsx           # 다국어 (한/영)
scripts/
├── ask_gemini.mjs         # Gemini API 브릿지
├── ask_gpt.mjs            # ChatGPT API 브릿지
└── telegram-bot.mjs       # 텔레그램 봇
```

---

## TTS 전략
```
Emma (shimmer)    → ElevenLabs
James (echo)      → ElevenLabs
Charlotte (fable) → OpenAI
Oliver (onyx)     → OpenAI
Alina (nova)      → ElevenLabs (아이)
Henly (alloy)     → ElevenLabs (아이)
```

---

## 빌드 & 배포

### 웹 빌드
```bash
npm run build
```

### Android APK 빌드
```bash
export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
cd android && ./gradlew assembleRelease
```
APK 위치: `android/app/build/outputs/apk/release/app-release.apk`

### 배포 (Vercel 자동)
```bash
git add -A && git commit -m "..." && git push origin main
```

---

## 금지 사항

1. `.env` 파일 읽기/수정 금지 (`.env.example`만 참조)
2. 사용자 확인 없이 `git push --force` 금지
3. `node_modules/`, `.next/` 폴더 직접 수정 금지
4. API 키를 코드에 하드코딩 금지 (환경변수 사용)
5. 팀원 의견 무시하고 독단적 결정 금지
6. 2025년 5월 이후 정보를 확인 없이 단정 금지
7. **이모지(emoji) 사용 절대 금지** - 코드, UI, 데이터 파일 어디에서도 이모지 사용 불가. 아이콘이 필요하면 반드시 SVG 고화질 벡터 이미지로 대체할 것

---

## 관리자 계정
- ryan@nuklabs.com
- taewoongan@gmail.com

---

## 주의사항
1. **talk/page.tsx**는 1800줄+ 대형 파일 - 수정 시 주의
2. 빌드 시 warning은 OK, error만 수정
3. Google Sheets API 호출은 rate limit 주의
4. ElevenLabs는 월 사용량 제한 있음

---

## 자주 사용하는 질문 템플릿

### @Researcher (Gemini)
```bash
node scripts/ask_gemini.mjs "2026년 2월 기준 Next.js 최신 버전과 주요 변경사항"
node scripts/ask_gemini.mjs "React 19에서 권장하는 성능 최적화 방법"
```

### @Strategist (ChatGPT)
```bash
node scripts/ask_gpt.mjs "음성 녹음 버튼의 최적 UX 설계안"
node scripts/ask_gpt.mjs "이 코드의 문제점과 개선방안"
```

---

## 검증 체크리스트

모든 작업 완료 후:
- [ ] `npm run build` 성공
- [ ] `npx tsc --noEmit` 타입 에러 없음
- [ ] 주요 기능 동작 확인
- [ ] git commit 메시지 명확히 작성
