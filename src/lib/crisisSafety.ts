/**
 * 자살·자해 위기 발화 감지 및 안전 응답 프로토콜.
 *
 * 배경 — 앱인토스 "AI 채팅·상담" 정책 필수 요건:
 *   "자살·자해 관련 발화가 감지되면, 이용자 안전을 고려한 안전 응답 프로토콜을
 *    적용해 주세요." (위반 시 경고 -> 출시 제한 -> 노출 중단)
 * 이 정책은 "동일한 AI 모델을 사용하는 자체 앱이나 웹 서비스"에도 동일하게
 * 적용되므로 미니앱뿐 아니라 taptalk.xyz 본체 전 경로가 대상이다.
 *
 * 왜 급한가 — 이 서비스는 만 5세부터를 대상으로 하고(learnerAge <= 8 분기,
 * IB PYP 모드), 주제 제한 없는 자유 대화다. 2026-07-30 감사 시점까지 코드 전체에
 * 자살/자해/hotline 관련 처리가 **0건**이었다. 아이가 "I want to disappear" 라고
 * 말하면 그대로 캐주얼 친구 페르소나에 넘어갔다.
 *
 * 설계 원칙
 *  1) **응답을 LLM 이 생성하지 않는다.** 위기 상황에서 생성 모델의 출력은 예측
 *     불가능하다. 고정 문구만 반환한다.
 *  2) **오탐을 감수한다.** 놓쳤을 때의 비용이 압도적으로 크므로 민감하게 잡는다.
 *     단, 학습 맥락의 관용표현(예: "I'm dying to ...")은 명시적으로 제외한다.
 *  3) **방법 문의는 재차 거부한다.** 같은 세션에서 반복해도 동일 응답.
 *  4) **자동으로 수업 흐름에 복귀하지 않는다.** 사용자가 명시적으로 이어가야 한다.
 */

/** 감지 결과. */
export interface CrisisCheck {
  /** 위기 발화로 판정됐는가. */
  detected: boolean;
  /** 매칭된 패턴 (로깅·감사용, 원문은 담지 않는다). */
  matched?: string;
}

/**
 * 관용표현 예외 — 영어 학습 서비스라 일상 과장 표현이 자주 등장한다.
 * 이걸 거르지 않으면 정상 수업이 위기 응답으로 중단돼 서비스가 못 쓰게 된다.
 * 여기 걸리면 **검사를 건너뛰는 게 아니라** 해당 매칭만 무효로 본다.
 */
const IDIOM_ALLOWLIST: RegExp[] = [
  /\bdying to\s+(?:know|see|meet|try|go|eat|hear)\b/i,
  /\bdie\s+for\b/i,                    // "I'd die for a coffee"
  /\bkilling it\b/i,
  /\bkilled it\b/i,
  /\bdead\s+(?:tired|serious|easy|simple|end|line)\b/i,
  /\bto death\b/i,                     // "bored to death"
  /\bkill\s+time\b/i,
  /죽을\s*(?:만큼|정도)\b/,            // "죽을 만큼 좋아"
  /죽인다\b/,                          // 속어 (칭찬)
];

/**
 * 위기 신호 패턴. 영어·한국어 병기 — 이 서비스는 한국인 학습자가 영어로
 * 말하므로 두 언어가 섞여 들어온다.
 *
 * 의도적으로 **방법(how-to)이 아니라 의도(intent) 표현**을 넓게 잡는다.
 * 방법 문의는 아래 METHOD_PATTERNS 로 별도 처리한다.
 */
const CRISIS_PATTERNS: RegExp[] = [
  // --- 영어: 직접적 자살 의도 ---
  /\bkill\s+my\s?self\b/i,
  /\bkilling\s+my\s?self\b/i,
  /\bcommit\s+suicide\b/i,
  /\bsuicidal?\b/i,
  /\bend\s+(?:my|it\s+all|my\s+own)\s*(?:life|life\.)?\b/i,
  /\btake\s+my\s+own\s+life\b/i,
  /\bwant\s+to\s+die\b/i,
  /\bwanna\s+die\b/i,
  /\bi\s+(?:wish|want)\s+i\s+(?:was|were)\s+dead\b/i,
  /\brather\s+be\s+dead\b/i,
  // --- 영어: 완곡한 소멸 욕구 (아동·청소년에게 흔한 표현) ---
  /\bwant\s+to\s+disappear\b/i,
  /\bdon'?t\s+want\s+to\s+(?:be\s+)?(?:live|alive|exist)\b/i,
  /\bdon'?t\s+want\s+to\s+wake\s+up\b/i,
  /\bno\s+(?:reason|point)\s+(?:to|in)\s+liv/i,
  /\bbetter\s+off\s+without\s+me\b/i,
  /\bnobody\s+would\s+(?:miss|care)\b/i,
  // --- 영어: 자해 ---
  /\bself[\s-]?harm(?:ing)?\b/i,
  /\bcut(?:ting)?\s+my\s?self\b/i,
  /\bhurt(?:ing)?\s+my\s?self\b/i,
  // --- 한국어 ---
  /자살/,
  /자해/,
  /죽고\s*싶/,
  /죽어\s*버리/,
  /사라지고\s*싶/,
  /살기\s*싫/,
  /살고\s*싶지\s*않/,
  /없어지고\s*싶/,
  /목숨을\s*끊/,
  /극단적\s*선택/,
];

/**
 * 방법·수단 문의 패턴. 감지 시 어떤 프레이밍이든(소설·이론·교육용) 거부한다.
 * 앱인토스 정책 "우회 요청에 대한 대응 기준" 대응.
 */
const METHOD_PATTERNS: RegExp[] = [
  /\bhow\s+(?:to|do\s+i|can\s+i)\s+(?:kill|die|hang|overdose|poison)/i,
  /\b(?:painless|easiest|fastest|best)\s+way\s+to\s+die\b/i,
  /\bhow\s+many\s+pills\b/i,
  /\blethal\s+dose\b/i,
  /(?:자살|죽는)\s*방법/,
  /약\s*몇\s*알/,
];

/** 관용표현이면 true — 위기 판정을 무효화한다. */
function isIdiom(text: string): boolean {
  return IDIOM_ALLOWLIST.some((re) => re.test(text));
}

/**
 * 단일 텍스트에 대한 위기 검사.
 *
 * 오탐 억제: 관용표현에 걸리면 **그 텍스트 전체를 안전으로 본다.** 위기 표현과
 * 관용표현이 한 문장에 동시에 오는 경우는 실무상 극히 드물고, 반대로 관용표현을
 * 위기로 오판하면 정상 수업이 중단돼 사용자가 서비스를 떠난다.
 */
export function checkCrisis(text: string): CrisisCheck {
  if (!text || typeof text !== 'string') return { detected: false };
  const t = text.trim();
  if (t.length === 0) return { detected: false };

  if (isIdiom(t)) return { detected: false };

  for (const re of METHOD_PATTERNS) {
    if (re.test(t)) return { detected: true, matched: `method:${re.source.slice(0, 40)}` };
  }
  for (const re of CRISIS_PATTERNS) {
    if (re.test(t)) return { detected: true, matched: `intent:${re.source.slice(0, 40)}` };
  }
  return { detected: false };
}

/**
 * 대화 배열에서 **가장 최근 사용자 발화만** 검사한다.
 *
 * 전체 이력을 검사하지 않는 이유: 한 번 위기 발화가 나오면 그 대화가 영구히
 * 위기 응답에 고정돼 사용자가 대화를 이어갈 수 없다. 정책이 요구하는 것은
 * "감지 시 안전 응답"이지 "세션 영구 차단"이 아니다.
 */
export function checkLatestUserMessage(
  messages: Array<{ role?: string; content?: string }> | undefined | null,
): CrisisCheck {
  if (!Array.isArray(messages) || messages.length === 0) return { detected: false };
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m?.role === 'user') return checkCrisis(m.content ?? '');
  }
  return { detected: false };
}

/**
 * 고정 안전 응답. **LLM 이 생성하지 않는다.**
 *
 * 포함 요소 (정책 요구):
 *  - 공감 + 비판단적 어조
 *  - 한국 위기상담 창구 (24시간)
 *  - 방법 관련 안내 거부 명시
 *  - 자동으로 수업으로 돌아가지 않음 (사용자가 이어가야 함)
 */
const SAFE_RESPONSE_KO = `지금 많이 힘드신 것 같아 걱정돼요. 그 마음을 혼자 감당하지 않으셨으면 해요.

지금 바로 이야기 나눌 수 있는 곳이 있어요. 24시간 무료예요.

• 자살예방상담전화 **109**
• 정신건강상담전화 **1577-0199**
• 청소년전화 **1388**

저는 영어 학습을 도와드리는 AI라, 이런 이야기는 전문 상담사와 나누시는 게 훨씬 도움이 돼요. 위험한 방법에 대한 정보는 어떤 경우에도 알려드릴 수 없어요.

괜찮아지시면 언제든 다시 영어 연습하러 와 주세요. 기다리고 있을게요.`;

const SAFE_RESPONSE_EN = `I'm concerned about what you just shared. Please don't carry this alone.

There are people ready to talk with you right now — free, 24 hours a day:

• Suicide Prevention Hotline (Korea) **109**
• Mental Health Helpline **1577-0199**
• Youth Helpline **1388**

I'm an AI that helps with English practice, so this is something best shared with a trained counselor. I can't provide any information about methods of harm, under any circumstances.

Whenever you're ready, come back and we'll practice English together. I'll be here.`;

/** 언어에 맞는 고정 안전 응답. 기본은 한국어(국내 서비스). */
export function getSafeResponse(language?: string): string {
  return language === 'en' ? SAFE_RESPONSE_EN : SAFE_RESPONSE_KO;
}

/**
 * 위기 감지 이벤트 로깅.
 *
 * **원문을 남기지 않는다** — 민감정보이고, 로그는 개인정보 보호 대상이다.
 * 매칭된 패턴 종류와 사용자 해시만 남겨 운영이 빈도를 파악할 수 있게 한다.
 */
export function logCrisisEvent(
  emailOrId: string | undefined,
  route: string,
  matched: string | undefined,
): void {
  // 이메일 원문 대신 앞 3자만 — 운영이 반복 사용자를 식별할 최소 정보.
  const who = emailOrId ? `${emailOrId.slice(0, 3)}***` : 'anonymous';
  console.warn(
    `[crisis-safety] 위기 발화 감지 | route=${route} | user=${who} | pattern=${matched ?? 'n/a'}`,
  );
}
