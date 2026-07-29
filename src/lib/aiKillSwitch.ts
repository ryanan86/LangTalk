/**
 * AI 응답 전면 차단 스위치 (운영 킬 스위치).
 *
 * 배경 — 앱인토스 정책 필수 요건:
 *   "부적절하거나 문제가 될 수 있는 응답이 발생했을 때 **즉시 수정하거나 차단할 수
 *    있는 운영 체계**를 갖춰 주세요."
 * 기존에는 AI 출력을 멈출 수단이 코드 수정 + 재배포뿐이었다. 사고 대응 시간이
 * 수십 분 단위라 "즉시 차단"을 만족하지 못한다.
 *
 * 설계 원칙
 *  1) **환경변수로 제어한다.** Vercel 대시보드에서 값만 바꾸면 되므로 DB 쓰기 경로가
 *     필요 없다. 장애 중에 DB 가 죽어 있으면 DB 플래그는 읽지 못해 무용지물이 된다.
 *  2) **모호한 값에는 fail-open.** 오타 하나로 서비스 전체가 죽으면 안 된다.
 *     정확히 "1" 또는 "true"(대소문자 무시)일 때만 차단한다.
 *  3) **응답을 LLM 이 생성하지 않는다.** 차단 상태에서 모델을 부르면 차단이 아니다.
 *     crisisSafety / safetyFilter 와 동일하게 고정 문구만 반환한다.
 *  4) **매 호출마다 process.env 를 새로 읽는다.** 모듈 로드 시점에 캐싱하면 값이
 *     바뀌어도 프로세스가 살아 있는 동안 반영되지 않는다.
 */

/**
 * AI 응답을 차단해야 하는가.
 *
 * `AI_KILL_SWITCH` 가 "1" 또는 "true"(공백 제거·대소문자 무시)일 때만 true.
 * 미설정·빈 문자열·"0"·"yes"·기타 오타는 모두 false(정상 서비스)다.
 */
export function isAiDisabled(): boolean {
  const raw = process.env.AI_KILL_SWITCH;
  if (typeof raw !== 'string') return false;
  const v = raw.trim().toLowerCase();
  return v === '1' || v === 'true';
}

/**
 * 고정 점검 안내 문구. **LLM 이 생성하지 않는다.**
 *
 * 사용자가 "고장"이 아니라 "일시 점검"으로 인지하도록, 그리고 재시도 시점을
 * 알 수 있도록 쓴다. 원인·내부 사정은 밝히지 않는다.
 */
const MAINTENANCE_KO = `지금은 AI 대화를 잠시 이용하실 수 없어요.

서비스 점검 중이라 응답을 잠시 멈춰 두었어요. 곧 정상화될 예정이니 잠시 후 다시 시도해 주세요.

기다려 주셔서 고맙습니다.`;

const MAINTENANCE_EN = `AI conversation is temporarily unavailable.

We've paused responses while we perform maintenance. It should be back shortly — please try again in a little while.

Thanks for your patience.`;

/** 언어에 맞는 고정 점검 안내. 기본은 한국어(국내 서비스). */
export function getMaintenanceMessage(language?: string): string {
  return language === 'en' ? MAINTENANCE_EN : MAINTENANCE_KO;
}

/**
 * 차단 이벤트 로깅. 차단 요청 1건당 정확히 1회.
 *
 * **사용자 입력을 절대 남기지 않는다** — 라우트·메서드만 남긴다. 차단 상태에서는
 * 모든 요청이 걸리므로 로그가 폭증하는데, 거기에 원문이 섞이면 로그 자체가
 * 개인정보 유출 경로가 된다.
 */
export function logAiKillSwitchBlock(route: string, method: string): void {
  console.warn(`[ai-kill-switch] AI 응답 차단 | route=${route} | method=${method}`);
}
