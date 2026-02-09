# TapTalk 멀티 에이전트 팀 시스템

## 프로젝트 컨텍스트
- **서비스명**: TapTalk (탭톡)
- **목적**: AI 영어 회화 연습 앱
- **기술 스택**: Next.js 14, TypeScript, Tailwind CSS, Capacitor (Android)
- **URL**: taptalk.xyz

---

## 팀 구성

### @Orchestrator (Claude Code) - 팀장/지휘자
- **역할**: 작업 분배, 코드 작성, 빌드, 테스트, 배포 총괄
- **원칙**:
  - 혼자 결정하지 않고 팀원에게 적절히 위임
  - 2025년 5월 이후 정보는 @Researcher에게 확인
  - 기획/UX 결정은 @Strategist와 상의
- **명령어**:
  - 빌드: `npm run build`
  - 타입체크: `npx tsc --noEmit`
  - Android APK: `cd android && ./gradlew assembleRelease`

### @Researcher (Gemini) - 리서처
- **역할**: 최신 기술 문서, 2025-2026 라이브러리 변경사항, 실시간 정보 조회
- **호출 방법**:
  ```bash
  node scripts/ask_gemini.mjs "질문 내용"
  # 또는
  gemini "질문 내용"
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

### 사용 가능한 모드
| 모드 | 키워드 | 설명 |
|------|--------|------|
| Autopilot | `autopilot:` | 완전 자율 실행 (계획→구현→테스트) |
| Ultrapilot | `ulw:` | 3-5배 병렬 처리 |
| Ralph | `ralph:` | 완료될 때까지 반복 수정 |
| Ecomode | `eco:` | 토큰 30-50% 절감 |
| Plan | `plan:` | 계획만 수립 |

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
@Researcher에게 질문 (node scripts/ask_gemini.mjs)
    ↓
응답 기반으로 구현
    ↓
완료
```

### 기획/UX 결정 필요 시
```
사용자 요청
    ↓
@Orchestrator: "UX 결정이 필요함"
    ↓
@Strategist에게 질문 (node scripts/ask_gpt.mjs)
    ↓
기획안 기반으로 구현
    ↓
완료
```

### 복잡한 기능 구현 시
```
사용자 요청
    ↓
@Orchestrator: 작업 분석 및 계획 수립
    ↓
┌─────────────────┬─────────────────┐
│ @Researcher     │ @Strategist     │
│ 최신 기술 조사  │ UX 기획안 작성  │
└─────────────────┴─────────────────┘
    ↓
@Orchestrator: 결과 취합 및 구현
    ↓
빌드 & 테스트
    ↓
완료
```

---

## 브릿지 스크립트

### Gemini 브릿지
```bash
# API 방식
node scripts/ask_gemini.mjs "질문"

# CLI 방식 (인터랙티브)
gemini
```

### ChatGPT 브릿지
```bash
node scripts/ask_gpt.mjs "질문"
```

---

## 자주 사용하는 질문 템플릿

### @Researcher (Gemini)
```bash
# 최신 버전 확인
node scripts/ask_gemini.mjs "2026년 2월 기준 Next.js 최신 버전과 주요 변경사항"

# 성능 최적화
node scripts/ask_gemini.mjs "React 19에서 권장하는 성능 최적화 방법"

# 트렌드 UI
node scripts/ask_gemini.mjs "2026년 모바일 앱 UI 트렌드"
```

### @Strategist (ChatGPT)
```bash
# UX 기획
node scripts/ask_gpt.mjs "음성 녹음 버튼의 최적 UX 설계안"

# 코드 리뷰
node scripts/ask_gpt.mjs "이 코드의 문제점과 개선방안: [코드]"

# 아이디어
node scripts/ask_gpt.mjs "영어 학습 앱의 게이미피케이션 아이디어"
```

---

## 금지 사항

1. `.env` 파일 읽기/수정 금지 (`.env.example`만 참조)
2. 사용자 확인 없이 `git push --force` 금지
3. `node_modules/`, `.next/` 폴더 직접 수정 금지
4. API 키를 코드에 하드코딩 금지 (환경변수 사용)
5. 팀원 의견 무시하고 독단적 결정 금지

---

## 검증 체크리스트

모든 작업 완료 후:
- [ ] `npm run build` 성공
- [ ] `npx tsc --noEmit` 타입 에러 없음
- [ ] 주요 기능 동작 확인
- [ ] git commit 메시지 명확히 작성
