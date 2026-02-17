# TapTalk 2026-02-18 변경사항 정리

작성일: 2026-02-18
작성자: 클이사 (Claude AI Team)
커밋: `d661d3f`, `d7b1cad`

---

## 1. CEFR 평가체계 전환 (US Grade 폐기)

### 배경
기존 미국 원어민 학년 기준(Kindergarten ~ College) 평가 시스템이 ESL 학습자에게 부적절.
거의 모든 학습자가 "Kindergarten" 수준으로 고정 평가되는 치명적 문제.

### 변경 내용

**`src/lib/speakingMetrics.ts`** (핵심 변경)
- `GradeBenchmark` 인터페이스 -> `CefrBenchmark` + `CefrLevel` 타입으로 교체
- `GRADE_BENCHMARKS` 배열 (K ~ College) -> `CEFR_BENCHMARKS` (Pre-A1 ~ C2) 7단계
- `calculateGradeMatch()` -> `calculateCefrLevel()` 함수 교체
- 표준화 점수 변환 테이블 추가:
  - `CEFR_TO_IELTS`: CEFR -> IELTS Speaking 밴드
  - `CEFR_TO_TOEFL`: CEFR -> TOEFL Speaking 점수
  - `CEFR_TO_TOEIC`: CEFR -> TOEIC Speaking 점수/레벨
- `SpeakingMetricsResult.gradeMatch` -> `cefrMatch` 필드 변경
- 이전 `GRADE_BENCHMARKS`는 deprecated alias로 유지 (하위호환)

**`src/lib/speechMetrics.ts`**
- `scoreToCefr()` 함수 신규 추가 (점수 -> CEFR 레벨 변환)
- `scoreToGrade()` deprecated alias로 유지

**`src/app/api/speaking-evaluate/route.ts`**
- 응답 인터페이스: `gradeLevel` -> `cefrLevel` (level, label, description, confidence)
- `getExpectedGradeForAge` 제거, `getCefrIndex` 추가
- methodology: `'algorithmic-cefr-analysis'`

**`src/app/talk/page.tsx`**
- 요약 리포트에서 `cefrLevel` 표시 (이전 `gradeLevel` fallback 유지)

**`src/app/test-report/page.tsx`**
- 목업 데이터 CEFR 형식으로 변경

### CEFR 레벨 기준

| 레벨 | 설명 | IELTS | TOEFL | TOEIC |
|------|------|-------|-------|-------|
| Pre-A1 | Beginner | 0-1.0 | 0-3 | 0-45 (Lv1) |
| A1 | Elementary | 2.0-2.5 | 4-9 | 50-95 (Lv2-3) |
| A2 | Pre-Intermediate | 3.0-3.5 | 10-15 | 100-115 (Lv4) |
| B1 | Intermediate | 4.0-5.0 | 16-21 | 120-145 (Lv5-6) |
| B2 | Upper-Intermediate | 5.5-6.5 | 22-25 | 150-175 (Lv7) |
| C1 | Advanced | 7.0-8.0 | 26-28 | 180-195 (Lv8) |
| C2 | Proficiency | 8.5-9.0 | 29-30 | 200 (Lv8) |

---

## 2. 실시간 세션 안정성 개선

### 배경
수강 중 튜터 무응답, 과도한 지연, 짧은/피상적 답변 등의 장애 보고.
원인: API 타임아웃 미처리, fallback 부재, 보수적 토큰 정책.

### 변경 내용

**`src/app/api/chat/route.ts`**

| 항목 | 이전 | 이후 |
|------|------|------|
| interview max_tokens | 150 | 350 |
| conversation max_tokens | 500 | 600 |
| Gemini conversation timeout | 없음 | 8초 |
| OpenAI conversation timeout | 없음 | 10초 |
| Gemini analysis timeout | 없음 | 15초 |
| GPT-4o analysis timeout | 없음 | 20초 |
| 양쪽 API 실패 시 | 빈 응답 (세션 멈춤) | CONVERSATION_FALLBACK 자동 응답 |

**타임아웃 구현**: `withTimeout()` 래퍼 함수 (Promise.race 기반)
```typescript
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T>
```

**Fallback 체인**: Gemini -> OpenAI -> 정적 fallback 메시지
```
"Hmm, let me think about that for a moment. Could you tell me a bit more?"
```

**프롬프트 수정**:
- "Still keep responses under 20 words" -> 제거
- "Keep responses concise (2-3 sentences)" -> "Respond naturally (2-4 sentences). Include at least one follow-up question"

---

## 3. Vocab Book (단어장) 시스템

### 배경
nukai 팀의 vocabBook 코드를 리뷰하여 결함 수정 후 적용.

### 구조

**`src/lib/vocabBook.ts`** (신규, nukai 코드 리뷰 후 재작성)
- `buildSessionVocabItems()`: 세션 대화에서 학습 단어 추출
- 교정에서 나온 단어: proficiency 20% (숙련도 낮음 = 학습 가치 높음)
- 자주 사용한 단어: proficiency 30% + 5%/사용 (최대 60%)
- 난이도: BASIC_WORDS(A1-A2) -> 1, ADVANCED_PATTERNS(-tion/-ment 등) -> 4-5, 길이 보조
- 정렬: 교정 단어 우선, 빈도 순

**`src/lib/sheetTypes.ts`** - VocabBookItem 인터페이스 추가
```typescript
interface VocabBookItem {
  id: string;
  term: string;
  sourceSentence?: string;
  sourceSessionId: string;
  sourceDate: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  proficiency: number;
  nextReviewAt: string;
  reviewCount: number;
  status: 'active' | 'mastered' | 'archived';
}
```

**`src/lib/sheetHelper.ts`** - Google Sheets 범위 A:F -> A:G 확장, vocabBook 컬럼 추가

**`src/app/api/vocab-book/route.ts`**
- GET: 오늘/전체/복습예정 단어 조회
- POST: 단어 저장 (기존 단어 중복 시 reviewCount++, proficiency +5% 누적)

**`src/app/talk/page.tsx`** - 요약 리포트 UI
- 세션 종료 시 `buildSessionVocabItems()` 호출
- 최대 8개 단어 카드 표시 (term, 난이도 5점 도트, 숙련도 바, 출처 문장)
- `/api/vocab-book` POST로 저장

---

## 4. Learning Rank (학습 포지션)

### 배경
nukai의 가짜 percentile(선형 변환을 "상위 10%"로 표시) 문제 수정.

### 변경 내용

**`src/lib/learningRank.ts`** (신규, nukai 코드 재작성)
- `calculateLearningRank()`: 종합 점수 산출
- 입력: grammar/vocabulary/fluency/comprehension 점수, 세션 수
- 가중치: vocabulary 30%, grammar 25%, fluency 25%, comprehension 20%
- 일관성 보너스: 세션 수 * 0.25 (최대 10점, 40세션 포화)
- 밴드: Advanced(85+) / Intermediate-High(70+) / Intermediate(50+) / Elementary(30+) / Beginner

**`src/app/talk/page.tsx`** - 요약 리포트 UI
- Learning Position 카드: 종합 점수, 밴드 라벨, 프로그레스 바
- Midnight Glass 디자인 (cyan-teal 그라데이션)

---

## 5. Adaptive Difficulty CEFR 정렬

### 배경
`calculateAdaptiveDifficulty`가 US Grade 기반이어서 CEFR 전환 후 불일치.

### 변경 내용

**`src/lib/speechMetrics.ts`**
- CEFR 레벨 매핑 추가:
  - young_child -> Pre-A1 ~ A1
  - older_child -> A1 ~ A2
  - teenager -> A2 ~ B1
  - adult -> B1 ~ B2
- `previousGrade`가 CEFR 레벨이면 CEFR 경로, 아니면 레거시 Grade 경로
- 완전한 하위호환 유지

---

## 6. Profile 난이도 선택기

### 변경 내용

**`src/app/profile/page.tsx`**
- 난이도 선택 UI 추가 (4옵션):
  - Easy / 쉬움: 기본 교정, 쉬운 어휘
  - Medium / 보통: 균형 잡힌 교정과 어휘
  - Hard / 어려움: 고급 교정, 풍부한 어휘
  - Adaptive / 자동 조절: 성과에 따라 자동 조절 (기본값)
- `difficultyPreference` 프로필 저장/로드 연동
- 기존 `chat/route.ts`에서 이미 `p.difficultyPreference`로 활용 중

---

## 7. 토론 품질 게이트 (nukai 코드리뷰 적용)

**`src/app/api/debate-topics/route.ts`**
- `isDebateReadyTopic()`: 찬반 논거 각 2개 이상 + motion 형식 제목 필수
- `topicQualityScore()`: 품질 순위 정렬 (motion + 논거수 + 어휘 + 트렌드)

**`src/app/api/debate-chat/route.ts`**
- `resolveDebateMotion()`: 비-motion 제목 자동 "This house believes that..." 랩핑

---

## 8. 기타 변경

**`src/app/layout.tsx`** - 다크모드 테마 감지 버그 수정
**`src/app/page.tsx`** - 라이트모드 지원 추가

---

## 커밋 이력

| Hash | Description |
|------|-------------|
| `d661d3f` | feat: CEFR evaluation framework + session reliability + nukai integration |
| `d7b1cad` | feat: vocab book UI, learning rank display, adaptive difficulty CEFR alignment |

## 전체 변경 파일 (19개)

| 파일 | 상태 |
|------|------|
| `src/lib/speakingMetrics.ts` | MAJOR REWRITE - CEFR |
| `src/lib/speechMetrics.ts` | MODIFIED - scoreToCefr + CEFR difficulty |
| `src/lib/vocabBook.ts` | NEW |
| `src/lib/learningRank.ts` | NEW |
| `src/lib/sheetTypes.ts` | MODIFIED |
| `src/lib/sheetHelper.ts` | MODIFIED |
| `src/app/api/chat/route.ts` | MODIFIED - reliability |
| `src/app/api/speaking-evaluate/route.ts` | MODIFIED - CEFR |
| `src/app/api/vocab-book/route.ts` | NEW + POST |
| `src/app/api/debate-topics/route.ts` | MODIFIED - quality gates |
| `src/app/api/debate-chat/route.ts` | MODIFIED - motion wrap |
| `src/app/talk/page.tsx` | MODIFIED - vocab/rank UI |
| `src/app/profile/page.tsx` | MODIFIED - difficulty selector |
| `src/app/layout.tsx` | MODIFIED - theme fix |
| `src/app/page.tsx` | MODIFIED - light mode |
| `src/app/test-report/page.tsx` | MODIFIED - CEFR mock |
| `docs/WORK_LOG.md` | UPDATED |
