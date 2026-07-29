# AI 응답 킬 스위치 (AI_KILL_SWITCH)

부적절한 AI 응답이 발생했을 때 **코드 수정·재배포 없이 즉시 AI 출력을 정지**하기 위한
운영 스위치입니다. 앱인토스 정책 요건 "부적절하거나 문제가 될 수 있는 응답이 발생했을 때
즉시 수정하거나 차단할 수 있는 운영 체계"에 대응합니다.

구현: `src/lib/aiKillSwitch.ts`

---

## 1. 켜는 방법 (AI 차단)

1. Vercel 대시보드 → 해당 프로젝트 → **Settings → Environment Variables**
2. `AI_KILL_SWITCH` 를 추가(또는 수정)하고 값을 `1` 로 설정
   - 적용 환경(Production / Preview / Development)을 정확히 선택할 것
3. **Deployments 탭에서 최신 배포를 Redeploy** 합니다.

> **중요 — Vercel 은 환경변수 변경만으로는 반영되지 않습니다.**
> 환경변수는 배포(빌드) 시점에 해당 배포에 주입되므로, 이미 실행 중인 배포는 값이 바뀌어도
> 계속 예전 값을 봅니다. **반드시 재배포(Redeploy)해야 적용됩니다.**
> Redeploy 는 빌드 캐시를 사용하면 보통 1~2분 내에 끝납니다.
> 더 빨리 막아야 하는 상황이라면 Vercel 의 이전 배포로 롤백하거나 도메인 연결을 끊는 등
> 다른 수단을 함께 고려하세요.

## 2. 끄는 방법 (정상 복구)

`AI_KILL_SWITCH` 값을 `0` 으로 바꾸거나 변수를 삭제한 뒤 **재배포**합니다.

## 3. 값 판정 규칙 (fail-open)

| 값 | 결과 |
|---|---|
| `1` | 차단 |
| `true` / `TRUE` / `True` (대소문자 무시, 앞뒤 공백 무시) | 차단 |
| 미설정 / 빈 문자열 / `0` / `yes` / 그 밖의 모든 값 | **정상 서비스** |

오타 하나로 서비스 전체가 멈추는 사고를 막기 위해, 정확히 `1` 또는 `true` 일 때만 차단하고
나머지는 모두 정상 동작(fail-open)합니다.

## 4. 상태 확인

관리자 페이지 `/admin/ai-status` 상단에 **AI 응답 킬 스위치 ON/OFF** 배지가 표시됩니다.
읽기 전용이며, 이 화면에서 전환할 수는 없습니다(전환은 위 1·2번 절차로만).

차단된 요청은 서버 로그에 요청 1건당 한 줄씩 남습니다. 사용자 입력은 기록하지 않습니다.

```
[ai-kill-switch] AI 응답 차단 | route=chat | method=POST
```

## 5. 켜졌을 때 사용자가 보는 것

LLM 을 호출하지 않고 **고정 문구**만 돌려줍니다(모델이 문구를 생성하지 않습니다).

- 한국어(기본)
  > 지금은 AI 대화를 잠시 이용하실 수 없어요.
  > 서비스 점검 중이라 응답을 잠시 멈춰 두었어요. 곧 정상화될 예정이니 잠시 후 다시 시도해 주세요.
  > 기다려 주셔서 고맙습니다.
- 영어(`language: 'en'`)
  > AI conversation is temporarily unavailable. …

대화형 라우트(`/api/chat`, `/api/debate-chat` POST)는 이 문구를 **대화 메시지 형태로**
그대로 화면에 띄웁니다(스트리밍 요청이면 동일 문구를 SSE 로 전달). 채점·평가·플랜 생성처럼
결과물이 저장되는 라우트는 **가짜 결과를 만들지 않고** HTTP 503 오류로 반환합니다.

## 6. 적용 범위 — 차단되는 8개 라우트

| 라우트 | 메서드 | 차단 시 응답 |
|---|---|---|
| `/api/chat` | POST | 200 `{ message, aiDisabled: true, meta }` / 스트리밍 요청은 SSE `data: {"text":"…"}` + `data: [DONE]` |
| `/api/debate-chat` | POST | 200 `{ message, aiDisabled: true }` |
| `/api/debate-chat` | PUT | 503 `{ error, aiDisabled: true }` |
| `/api/ai-evaluate` | POST | 503 `{ error, aiDisabled: true }` |
| `/api/speaking-evaluate` | POST | 503 `{ error, success: false, aiDisabled: true }` |
| `/api/exam/grade` | POST | 503 `{ error, aiDisabled: true }` |
| `/api/speech-coaching/analyze` | POST | 503 `{ error, aiDisabled: true }` |
| `/api/study/plan` | POST | 503 `{ error, aiDisabled: true }` |
| `/api/trending-topics` | POST | 503 `{ error, success: false, aiDisabled: true }` |

검사는 각 핸들러 `try` 블록의 **맨 처음**에서 이뤄집니다 — 인증·레이트리밋·안전 필터보다
먼저이므로, 차단 상태에서는 어떤 경로로도 모델이 호출되지 않습니다.

**차단되지 않는 것**(모델을 호출하지 않으므로 대상 아님):
`/api/trending-topics` GET(프리셋 토픽), `/api/study/plan` GET(저장된 플랜 조회), TTS/STT 라우트.
