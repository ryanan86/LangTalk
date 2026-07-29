import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getAuthUser } from '@/lib/miniappAuth';
import { checkRateLimit, getRateLimitId, RATE_LIMITS } from '@/lib/rateLimit';
import { getPersona } from '@/lib/personas';
import { getAgeGroup, calculateAdaptiveDifficulty } from '@/lib/speechMetrics';
import { getUserData, updateUserFields, getLearningData } from '@/lib/dataHelper';
import { LearnerMemory, MAX_MEMORY_FACTS, MAX_MEMORY_TOPICS, CorrectionItem } from '@/lib/sheetTypes';
import { makeRid, nowMs, since, withTimeoutAbort } from '@/lib/perf';
import { chatBodySchema, parseBody } from '@/lib/apiSchemas';
import { isAiDisabled, getMaintenanceMessage, logAiKillSwitchBlock } from '@/lib/aiKillSwitch';
import { checkLatestUserMessage, getSafeResponse, logCrisisEvent } from '@/lib/crisisSafety';
import { checkLatestUserSafety, getRefusalResponse, logSafetyBlock, withSafetyClause } from '@/lib/safetyFilter';

export const preferredRegion = 'icn1'; // Seoul — closest to Korean users

const CONVERSATION_FALLBACK_POOL = [
  "Hmm, let me think about that for a moment. Could you tell me a bit more?",
  "Give me one more detail—what happened next?",
  "Interesting. Can you rephrase that in a simpler sentence?",
  "Got it. What do you mean by that exactly?",
  "Okay—can you give an example?",
];

function pickFallback(rid: string) {
  const idx = (rid.charCodeAt(rid.length - 1) + rid.length) % CONVERSATION_FALLBACK_POOL.length;
  return CONVERSATION_FALLBACK_POOL[idx];
}

function applyManualDifficulty(
  adaptive: ReturnType<typeof calculateAdaptiveDifficulty> | null,
  preference: 'easy' | 'medium' | 'hard' | 'adaptive'
) {
  if (!adaptive || preference === 'adaptive') return adaptive;
  if (preference === 'easy') {
    return { ...adaptive, difficulty: Math.min(2, adaptive.difficulty), description: 'Manual easy mode' };
  }
  if (preference === 'medium') {
    return { ...adaptive, difficulty: 3, description: 'Manual medium mode' };
  }
  return { ...adaptive, difficulty: Math.max(4, adaptive.difficulty), description: 'Manual hard mode' };
}


let _openai: OpenAI | null = null;
function getOpenAI() {
  if (!_openai) _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return _openai;
}

// Gemini 2.0 Flash (primary: faster + better corrections + lower cost)
const gemini = process.env.GEMINI_API_KEY
  ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  : null;

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export async function POST(request: NextRequest) {
  const rid = makeRid('chat');
  const t0 = nowMs();
  const timings: Record<string, number> = {};

  try {
    // ── 운영 킬 스위치 (앱인토스 "즉시 차단 가능한 운영 체계" 요건) ──
    // 인증·레이트리밋·안전 필터보다도 먼저 검사한다. 차단 상태에서는 이 라우트가
    // 어떤 경로로도 모델을 호출해선 안 되기 때문이다. 근거는 src/lib/aiKillSwitch.ts 참조.
    if (isAiDisabled()) {
      logAiKillSwitchBlock('chat', 'POST');

      // 스트리밍 여부·언어는 본문에만 있으므로 여기서만 방어적으로 읽는다.
      // 파싱에 실패해도 차단은 그대로 진행한다(기본값 = 비스트리밍·한국어).
      let useStreaming = false;
      let mode: string | undefined;
      let language: string | undefined;
      try {
        const body = await request.json();
        useStreaming = Boolean(body?.stream);
        mode = body?.mode;
        language = body?.language;
      } catch { /* 본문 파싱 실패 — 기본값으로 차단 응답 */ }

      const maintenanceMessage = getMaintenanceMessage(language);

      // 스트리밍 요청에도 SSE 로 되돌려준다 — 위기/거절 응답과 동일한 이유로,
      // JSON 을 주면 클라이언트 파싱이 실패해 안내가 사용자에게 도달하지 못한다.
      if (useStreaming && mode === 'interview') {
        const encoder = new TextEncoder();
        const stream = new ReadableStream({
          start(controller) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ text: maintenanceMessage })}\n\n`),
            );
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            controller.close();
          },
        });
        return new Response(stream, {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
          },
        });
      }

      return NextResponse.json({
        message: maintenanceMessage,
        aiDisabled: true,
        meta: { rid, timings },
      });
    }

    // Auth check
    const authUser = await getAuthUser(request);
    if (!authUser?.email) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Rate limit
    const rateLimitResult = await checkRateLimit(getRateLimitId(authUser.email, request), RATE_LIMITS.ai);
    if (rateLimitResult) return rateLimitResult;

    const rawBody = await request.json();
    const parsed = parseBody(chatBodySchema, rawBody);
    if (!parsed.success) return parsed.response;
    const {
      messages, tutorId, mode, language, stream: useStreaming,
      birthYear, userName, previousGrade, previousLevelDetails, speechMetrics: clientSpeechMetrics,
      studyBlock, studyContext,
    } = parsed.data;

    // ── 자살·자해 안전 프로토콜 (앱인토스 "AI 채팅·상담" 필수 요건) ──
    // 모든 LLM 호출보다 먼저, 스트리밍/비스트리밍 분기보다 먼저 검사한다.
    // 감지되면 **모델을 호출하지 않고** 고정 안전 응답을 반환한다 — 위기 상황에서
    // 생성 모델의 출력은 예측 불가능하므로 LLM 이 응답을 만들게 두지 않는다.
    // 상세 근거·설계는 src/lib/crisisSafety.ts 주석 참조.
    const crisis = checkLatestUserMessage(messages);
    if (crisis.detected) {
      logCrisisEvent(authUser.email, 'chat', crisis.matched);
      const safeMessage = getSafeResponse(language);

      // 스트리밍 요청도 동일한 고정 문구를 SSE 형식으로 되돌려준다. 클라이언트가
      // 스트리밍을 기대하는 상태에서 JSON 을 주면 파싱에 실패해 화면이 비어버리고,
      // 그러면 안전 응답이 사용자에게 도달하지 못한다.
      if (useStreaming && mode === 'interview') {
        const encoder = new TextEncoder();
        const stream = new ReadableStream({
          start(controller) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ text: safeMessage })}\n\n`),
            );
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            controller.close();
          },
        });
        return new Response(stream, {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
          },
        });
      }

      return NextResponse.json({
        message: safeMessage,
        safetyIntervention: true,
        meta: { rid, timings },
      });
    }

    // ── 위험 요청 필터 (앱인토스 정책: 키워드 + 문맥 판단, 우회 프레이밍 차단) ──
    // 위기(자살·자해)를 먼저 처리한 뒤에 검사한다 — 위기는 "거절"이 아니라
    // "상담 연결"이라 응답 성격이 다르므로 순서가 뒤바뀌면 안 된다.
    // 명백한 요청은 키워드로 즉시 차단하고, 애매한 것만 저비용 모델로 문맥 판정한다.
    const safety = await checkLatestUserSafety(messages);
    if (safety.verdict === 'UNSAFE') {
      logSafetyBlock(authUser.email, 'chat', safety.category);
      const refusal = getRefusalResponse(language);

      // 스트리밍 요청에도 SSE 로 되돌려준다(위기 응답과 동일 이유 — JSON 을 주면
      // 클라이언트 파싱이 실패해 거절 메시지가 사용자에게 도달하지 못한다).
      if (useStreaming && mode === 'interview') {
        const encoder = new TextEncoder();
        const stream = new ReadableStream({
          start(controller) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ text: refusal })}\n\n`),
            );
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            controller.close();
          },
        });
        return new Response(stream, {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
          },
        });
      }

      return NextResponse.json({
        message: refusal,
        safetyIntervention: true,
        meta: { rid, timings },
      });
    }

    // Calculate age if birthYear is provided
    const learnerAge = birthYear ? new Date().getFullYear() - birthYear : null;

    // Fetch user data + learning data in parallel (shared across all modes).
    // Learning data carries the SRS correction history we mine for recurring weaknesses.
    let userData: Awaited<ReturnType<typeof getUserData>> = null;
    let learningData: Awaited<ReturnType<typeof getLearningData>> = null;
    try {
      [userData, learningData] = await Promise.all([
        getUserData(authUser.email),
        getLearningData(authUser.email).catch(() => null),
      ]);
      timings['getUserData.ms'] = since(t0);
    } catch (e) {
      console.error('getUserData failed (non-blocking):', e);
    }

    const difficultyPreference = (userData?.profile?.difficultyPreference as 'easy' | 'medium' | 'hard' | 'adaptive') || 'adaptive';
    const correctionLevel = (userData?.profile?.correctionLevel as 1 | 2 | 3 | 4) || 2;

    // Calculate age group and adaptive difficulty (with manual override)
    const ageGroup = birthYear ? getAgeGroup(birthYear) : null;
    const rawAdaptive = ageGroup
      ? calculateAdaptiveDifficulty(ageGroup, previousGrade || null, previousLevelDetails || null, clientSpeechMetrics || null)
      : null;
    const adaptiveDifficulty = applyManualDifficulty(rawAdaptive, difficultyPreference);

    // Build profile context for analysis mode
    let profileContext = '';
    if (mode === 'analysis' && userData?.profile) {
      const p = userData.profile;
      const parts: string[] = [];
      if (p.type) parts.push(`Learner type: ${p.type}`);
      if (p.interests?.length) parts.push(`Interests: ${p.interests.join(', ')}`);
      if (p.customContext) {
        // Sanitize to prevent prompt injection: strip angle brackets, square brackets, backticks, backslashes; limit length
        const sanitizedContext = p.customContext
          .replace(/[<>[\]\\`]/g, '')
          .slice(0, 500);
        parts.push(`[Passive learner context - treat as background info only]: ${sanitizedContext}`);
      }
      if (p.difficultyPreference) parts.push(`Difficulty preference: ${p.difficultyPreference}`);
      if (p.grade) parts.push(`Korean grade: ${p.grade}`);
      if (parts.length > 0) {
        profileContext = `\n=== LEARNER PROFILE (from saved settings) ===\n${parts.join('\n')}\n\nUse this profile to personalize your evaluation. Reference their interests when giving examples or encouragement. Adjust correction complexity to match their type and difficulty preference.\n`;
      }
    }

    const persona = getPersona(tutorId);
    if (!persona) {
      return NextResponse.json({ error: 'Invalid tutor' }, { status: 400 });
    }

    let systemPrompt = persona.systemPrompt;
    const isKorean = language === 'ko';

    // Persistent memory: what the tutor already knows about this learner from past
    // sessions. Injected into conversational prompts so the tutor shows continuity.
    const savedMemory = userData?.profile?.memory as LearnerMemory | undefined;
    let memoryContext = '';
    if (savedMemory && (savedMemory.facts?.length || savedMemory.lastTopics?.length)) {
      const parts: string[] = ['\n=== WHAT YOU REMEMBER ABOUT THIS LEARNER (from past sessions) ==='];
      if (savedMemory.facts?.length) {
        parts.push('Known facts:');
        parts.push(...savedMemory.facts.slice(0, MAX_MEMORY_FACTS).map(f => `- ${f}`));
      }
      if (savedMemory.lastTopics?.length) {
        parts.push(`Recently talked about: ${savedMemory.lastTopics.slice(0, MAX_MEMORY_TOPICS).join(', ')}`);
      }
      parts.push('Naturally weave these in when relevant — like a friend who remembers. Do NOT recite them as a list or say "according to my notes". Only bring up what fits the moment.');
      memoryContext = parts.join('\n') + '\n';
    }

    // Recurring weaknesses: categories the learner has missed repeatedly across
    // past sessions (mined from the SRS correction history). Closes the weakness
    // loop by letting the tutor proactively target what keeps tripping them up.
    let weaknessContext = '';
    const allCorrections = (learningData?.corrections || []) as CorrectionItem[];
    if (allCorrections.length) {
      const categoryCounts: Record<string, number> = {};
      for (const c of allCorrections) {
        if (c.status === 'active' && c.category) {
          categoryCounts[c.category] = (categoryCounts[c.category] || 0) + 1;
        }
      }
      const recurring = Object.entries(categoryCounts)
        .filter(([, count]) => count >= 2) // 2+ = a real pattern, not a one-off
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([category, count]) => `${category} (${count}x)`);
      if (recurring.length) {
        weaknessContext = `\n=== RECURRING WEAK SPOTS (from past corrections) ===\nThis learner repeatedly struggles with: ${recurring.join(', ')}.\nGently create natural openings for them to use these correctly, and prioritize recasting/correcting these when they slip. Never lecture or announce that you are targeting a weakness.\n`;
      }
    }

    // Mode-specific instructions
    if (mode === 'interview') {
      systemPrompt = `You're ${persona.name}, chatting casually with a friend. This is NOT a lesson - just a fun, natural conversation.

IMPORTANT: ALWAYS respond in ENGLISH ONLY. Never use Korean or any other language.

VIBE: You're hanging out with a friend. React naturally, share your thoughts, keep it flowing like real life.

=== CONVERSATION FLOW RULES ===

1. READ THE ROOM:
- Short answer (1-5 words) = They're done with this topic. Move on!
- Medium answer = React briefly, maybe one quick follow-up OR change topic
- Long excited answer = They want to talk about this more

2. DON'T INTERROGATE:
- NEVER ask more than 2 questions about the same specific topic
- If you already asked about food details, DON'T ask more food questions
- Real friends don't grill each other like a job interview

3. NATURAL TRANSITIONS:
When moving topics, connect naturally or just pivot:
- "Nice! So anyway, what are you up to this weekend?"
- "Ha, love that. Oh btw, have you seen any good shows lately?"
- "Cool cool. Hey random question - do you like..."

=== GOOD VS BAD EXAMPLES ===

SCENARIO: They said "I ate nasi goreng in Bali"

BAD (interrogation):
You: "Oh what's nasi goreng?"
Them: "Fried rice"
You: "How did it taste?" ← STOP! Already 2 food questions
Them: "Good"
You: "What restaurant?" ← NO! Topic is dead, they gave one-word answer

GOOD (natural flow):
You: "Oh nice! Love Indonesian food. Are you still in Bali or back home?"
Them: "Back home now"
You: "Ah nice. Must be weird being back. What's keeping you busy these days?"

SCENARIO: Short answers = CHANGE TOPIC

Them: "Yeah it was fun"
BAD: "What was the most fun part?" ← Drilling when they clearly wrapped up
GOOD: "Glad you had fun! So what else is new with you?"

Them: "Not much"
BAD: "Really? Nothing at all?"
GOOD: "Same here honestly. Oh hey, have you tried that new [something]?"

=== CORRECTION STYLE (Level ${correctionLevel}) ===
${correctionLevel === 1 ? `CORRECTION STYLE: Supportive Echo (Level 1 - Just Chat)
- NEVER point out or highlight grammar errors
- NEVER use phrases like "you should say", "the correct way is", "by the way"
- NEVER capitalize or emphasize corrected words
- Simply include the correct form naturally in your response
- If user says "I goed to store", respond: "Oh cool, you went to the store? What did you get?"
- The user should feel UNDERSTOOD, not corrected
- Priority: conversation flow > accuracy`
: correctionLevel === 2 ? `CORRECTION STYLE: Gentle Echo (Level 2 - Default)
- Naturally echo the corrected form in your response
- Slight emphasis through natural repetition: "Oh you went there?"
- Never say "you should say" or "the correct way"
- Max 1 recast per response
- Only for obvious grammar errors (wrong tense, verb form, articles)
- For kid conversations: even more subtle, just naturally mirror the correct form`
: correctionLevel === 3 ? `CORRECTION STYLE: Soft Coach (Level 3)
- After your natural response, you MAY add one brief, encouraging note
- Pattern: [react naturally] + "Oh btw, you could also say '[correct form]' — sounds more natural!"
- Keep correction casual and brief, never lecture
- Max 1 coaching note per response
- Always follow with a conversation continuation ("anyway, so...")
- Only for clear grammar or naturalness issues`
: `CORRECTION STYLE: Active Teach (Level 4)
- Correct errors explicitly but warmly
- Pattern: [brief acknowledgment] + "Quick tip: '[correct form]' instead of '[error]'" + [continue conversation]
- Max 2 corrections per response
- Explain briefly why (1 sentence max)
- Still maintain conversational tone
- Focus on grammar errors and unnatural phrasing`}

=== HOW TO RESPOND ===

CRITICAL: Be a real conversation partner, NOT a mirror. Never just repeat or rephrase what the student said back to them ("So you went to the park?", "You like pizza, huh?"). Restating their words feels robotic and makes it seem like you aren't really listening. Every reply MUST add something of your OWN.

1. (OPTIONAL) A short, natural reaction is fine when it fits — but keep it to a few words and NEVER let it be the whole reply:
   - "I went to the park" -> "Oh nice, a park day!"
   - If they made a grammar error, naturally recast it: "I goed to store" -> "Oh you went shopping!"

2. ALWAYS CONTRIBUTE (this is the important part). Add at least ONE of these every turn:
   - Your own opinion or quick take ("Honestly, mornings at the park beat evenings for me.")
   - A small piece of your own experience or a relevant fact ("There's a great one near me with a huge oak tree.")
   - A genuinely NEW question that builds on what they said — not a restatement of it
   Move the conversation FORWARD with real content. Don't just hand the turn back with a generic question. Keep the total response concise.

GOOD EXAMPLES (notice the short contextual first reaction):
- "Oh Bali! So jealous. You going anywhere else soon?"
- "Ha Korean food! Same, I'm obsessed. Made anything lately?"
- "Aw a puppy! That's the best. What kind?"

BANNED PHRASES (never use these generic openers):
- "That's interesting." / "That's a great point." / "I see."
- "Hmm, let me think..." / "Well, you know what..."
- "That's really cool!" / "Oh nice!" (without referencing their specific content)
- Any filler opener that could apply to ANY topic - your first words must be SPECIFIC to what they said

Keep it real. Keep it moving. ENGLISH ONLY.`;

      // IB PYP teaching style for elementary-age learners (13 and under)
      if (learnerAge && learnerAge <= 13) {
        systemPrompt += `

=== IB PYP TEACHING APPROACH (Elementary Age) ===

Since this learner is ${learnerAge} years old, blend IB Primary Years Programme educational principles into your conversation style. This does NOT restrict topics - they can talk about ANYTHING they want.

WHAT CHANGES:
1. OCCASIONALLY (every 3-4 exchanges, not every turn) ask ONE thought-expanding question:
   - "Why do you think that?" / "How does that work?" / "What would happen if...?"
   - "Does that remind you of anything?" / "How do you think they felt?"
   - Keep it SHORT and NATURAL - like a curious friend, not a teacher

2. ENCOURAGE when genuine (don't force it):
   - Curiosity: "Love that question!" / "Ooh good thinking!"
   - Trying hard: "Nice try with that word!" / "You're getting braver!"
   - Sharing ideas: "That's a cool way to see it!"

3. GENTLY EXPAND their world when it flows naturally:
   - Connect what they say to a slightly bigger idea
   - Example: They say "I like dinosaurs" -> "Cool! Do you know some dinosaurs ate plants and some ate meat? Which type do you like?"
   - ONLY if it flows naturally. Never force educational moments.

WHAT STAYS THE SAME:
- Still a casual friend, NOT a teacher or interviewer
- Still follow ALL conversation flow rules above (topic changes, short responses, no interrogation)
- Keep responses natural length (2-4 sentences). Don't artificially shorten.
- Fun and natural conversation > educational moments
- ${learnerAge <= 8 ? 'This child is very young - keep it extra simple, playful, and encouraging. Use easy words.' : 'This child can handle slightly deeper questions - connect ideas, explore reasons.'}`;
      }
    } else if (mode === 'analysis') {
      const analysisLang = isKorean ? `
IMPORTANT: Write ALL explanations, intended meanings, patterns, strengths, and encouragement in KOREAN.
The "original" and "corrected" fields should remain in English (since they're English sentences).
The "intended", "explanation", "type", "tip", "strengths", and "encouragement" fields should be in KOREAN.` : '';

      const exampleIntended = isKorean ? '커피를 좋아하는 이유를 표현하고 싶었어요' : 'I wanted to express my love for coffee and why';
      const exampleExplanation = isKorean ? '생각을 연결하세요! \'especially\', \'because\', \'that\'을 사용해서 짧은 문장들을 하나의 매끄러운 문장으로 만들어보세요.' : 'Connect your thoughts! Use \'especially\', \'because\', and \'that\' to make one flowing sentence instead of choppy short ones.';
      const examplePatternType = isKorean ? '짧고 단절된 문장들' : 'Short, disconnected sentences';
      const examplePatternTip = isKorean ? '\'which\', \'that\', \'because\'를 사용해서 아이디어를 더 긴 문장으로 연결하는 연습을 해보세요. 원어민은 3-4단어짜리 문장만 사용하지 않아요.' : 'Practice using \'which\', \'that\', \'because\' to connect your ideas into longer thoughts. Native speakers rarely use only 3-4 word sentences.';
      const exampleStrengths = isKorean ? ['주요 아이디어를 명확하게 전달했어요', 'X 같은 단어를 잘 선택했어요'] : ['You communicated your main ideas clearly', 'Good vocabulary choice with words like X'];
      const exampleEncouragement = isKorean
        ? (userName ? `${userName}에게 보내는 짧고 따뜻한 격려 메시지 (1-2문장, 예: "정말 잘했어요! 다음에도 화이팅!")` : '짧고 따뜻한 격려 메시지 (1-2문장)')
        : (userName ? `Short, warm encouragement for ${userName} (1-2 sentences, e.g., "Great job! Keep it up!")` : 'Short, warm encouragement (1-2 sentences)');

      // Derive register hint from persona
      const personaRegisterHint = ['emma', 'james', 'alina', 'henry'].includes(tutorId)
        ? 'This was a CASUAL conversation with a laid-back persona. Corrections MUST match casual native speech.'
        : ['charlotte', 'oliver'].includes(tutorId)
        ? 'This was a CASUAL-TO-NEUTRAL conversation (British persona). Corrections should sound naturally British and conversational.'
        : 'Determine register from conversation content.';

      systemPrompt = `You are ${persona.name}, a supportive English coach analyzing a student's conversation.
${analysisLang}

=== STEP 1: DETECT CONVERSATION REGISTER ===
Before correcting anything, read the full conversation and determine its register:

CASUAL: Chatting about daily life, hobbies, food, friends, weekend plans, personal preferences, small talk.
  -> Corrections should sound like a native friend talking. Short sentences are FINE. Contractions and informal connectors ("but", "so", "actually", "though") are GOOD.
  -> Do NOT add formal connectors (furthermore, consequently, particularly) to casual chat.
  -> Do NOT make sentences longer just for length. Only extend when the original is unclear or grammatically broken.

NEUTRAL: Explaining something, describing an experience in detail, giving opinions with reasons, telling a story.
  -> Corrections can be moderately more connected. Use natural connectors ("because", "which", "since").
  -> Aim for clear, well-formed sentences, but not academic ones.

FORMAL: Discussing work/business, academic topics, debates, presentations, professional scenarios.
  -> Corrections should use sophisticated vocabulary and complex sentence structures.
  -> Connectors like "however", "therefore", "particularly" are appropriate here.

PERSONA CONTEXT: ${personaRegisterHint}

YOUR GOAL: Help them speak more NATURALLY and CORRECTLY -- like a native speaker would IN THIS SAME SITUATION.
A native speaker chatting about ramen does NOT say "I genuinely appreciate its simplicity and authentic flavors."
A native speaker chatting about ramen says "Nothing beats the original, you know?"

=== STEP 2: CORRECT WITHIN REGISTER ===
ANALYSIS FOCUS:
1. Fix grammar mistakes and unnatural phrasing
2. Show how a native speaker would say the same thing IN THE SAME REGISTER
3. For CASUAL conversations: keep it casual. Short is fine. Fix errors, do not formalize.
4. For NEUTRAL/FORMAL conversations: suggest richer connections and vocabulary where appropriate.
5. Only flag short sentences as a problem when they are ALSO unnatural or broken -- not just because they are short.

${ageGroup && adaptiveDifficulty ? `LEARNER AGE GROUP: ${ageGroup.key}
EFFECTIVE DIFFICULTY: ${adaptiveDifficulty.difficulty}/5

=== 교정 규칙 (i+1 원칙: 현재 수준보다 살짝 위로) ===
- 교정 문장 길이: ${ageGroup.maxCorrectionWords}~${ageGroup.stretchMaxWords}단어 (약간의 스트레칭 허용)
- 어휘 수준: ${ageGroup.vocabularyLevel}
- 문법 초점: ${ageGroup.grammarFocus.join(', ')}
- 관용구 사용: ${ageGroup.useIdioms ? '가능' : '아직 사용하지 않음'}
- 접속사 사용: ${ageGroup.useConjunctions ? '사용 (' + ageGroup.conjunctionExamples + ')' : '아직 사용하지 않음'}

=== 성장을 위한 스트레칭 (i+1) ===
${ageGroup.stretchTarget}

${adaptiveDifficulty.weakAreas.length > 0 ? `=== 우선 약점 영역 (교정의 60%를 여기에 집중) ===
${adaptiveDifficulty.weakAreas.map(w => '- ' + w).join('\n')}
` : ''}
=== 연령별 교정 스타일 ===
${ageGroup.correctionStyle}

핵심 원칙:
1. 현재 수준과 동일한 교정 X → 배울 게 없음
2. 너무 높은 수준의 교정 X → 이해 불가
3. 현재보다 살짝 위 수준으로 교정 O → 성장 유도
4. 교정 문장은 ${ageGroup.stretchMaxWords}단어 이내로 유지
` : ''}
For EACH correction, provide:
- What they said (focus on actual errors or unnatural phrasing -- do NOT flag sentences just for being short)
- What they probably wanted to express (their intent)
- A more NATURAL version that ${ageGroup ? '학습자 수준보다 살짝 높은 i+1 수준이면서 대화 register에 맞는 표현 (캐주얼 대화는 캐주얼하게, 포멀 대화는 포멀하게)' : 'sounds like what a native speaker would actually say in this same conversation context'}
- Clear explanation of WHY the improved version is better

LEVEL EVALUATION (CEFR - Common European Framework):
${learnerAge ? (() => {
        const koreanAge = learnerAge + 1;
        const expectedCefrMap: Record<number, string> = {
          3: 'Pre-A1', 4: 'Pre-A1', 5: 'Pre-A1', 6: 'A1', 7: 'A1', 8: 'A1', 9: 'A2', 10: 'A2', 11: 'A2',
          12: 'B1', 13: 'B1', 14: 'B1', 15: 'B2', 16: 'B2', 17: 'B2',
        };
        const expectedCefr = expectedCefrMap[learnerAge] || (learnerAge >= 18 ? 'B2' : 'A2');
        return `LEARNER INFO:
- Name: ${userName || 'Student'}
- Age: ${learnerAge} years old (Korean age: ${koreanAge}세)
- Expected CEFR level for ESL learner this age: ${expectedCefr}

AGE-TO-CEFR REFERENCE (ESL learner):
Age 3-5 → Pre-A1, Age 6-8 → A1, Age 9-11 → A2, Age 12-14 → B1, Age 15-17 → B2, Age 18+ → B2+
\n`;
      })() : ''}
Based on the student's conversation, evaluate their English proficiency using CEFR levels:
- Pre-A1 (Beginner): Very basic words, single words or 2-3 word phrases, many grammar errors
- A1 (Elementary): Simple sentences, basic vocabulary, frequent grammar mistakes
- A2 (Pre-Intermediate): Can form sentences, limited vocabulary, some grammar errors
- B1 (Intermediate): Good sentence structure, developing vocabulary, occasional errors
- B2 (Upper-Intermediate): Clear communication, varied vocabulary, minor errors
- C1 (Advanced): Fluent conversation, rich vocabulary range, rare errors
- C2 (Proficient): Native-like proficiency, sophisticated vocabulary and grammar

Evaluate based on:
1. Grammar accuracy (40%): Verb tenses, articles, prepositions, sentence structure
2. Vocabulary range (25%): Word variety, appropriate word choice, idioms
3. Fluency (20%): Sentence length, natural flow, conversation pace
4. Comprehension (15%): Understanding context, appropriate responses
${learnerAge ? (() => {
        const koreanAge = learnerAge + 1;
        const expectedCefrMap2: Record<number, string> = {
          3: 'Pre-A1', 4: 'Pre-A1', 5: 'Pre-A1', 6: 'A1', 7: 'A1', 8: 'A1', 9: 'A2', 10: 'A2', 11: 'A2',
          12: 'B1', 13: 'B1', 14: 'B1', 15: 'B2', 16: 'B2', 17: 'B2',
        };
        const expectedCefr2 = expectedCefrMap2[learnerAge] || (learnerAge >= 18 ? 'B2' : 'A2');
        const summaryExample = isKorean
          ? `한국나이 ${koreanAge}세 ESL 학습자의 기대 수준은 ${expectedCefr2}입니다. 탭톡 평가 결과 [평가등급]으로, 기대 수준 대비 [높은/적정/낮은] 수준입니다.`
          : `Expected CEFR level for a ${koreanAge}-year-old (Korean age) ESL learner is ${expectedCefr2}. TapTalk evaluated at [level], which is [above/at/below] the expected level.`;
        return `\nIn levelDetails.summary, provide a DETAILED comparison like this example: "${summaryExample}"`;
      })() : ''}

RETURN THIS EXACT JSON FORMAT (no markdown, valid JSON only):
{
  "corrections": [
    {
      "original": "I like coffee. It is good.",
      "intended": "${exampleIntended}",
      "corrected": "I'm really into coffee -- there's nothing like a good bold cup in the morning, you know?",
      "explanation": "${exampleExplanation}",
      "category": "naturalness"
    }
  ],
  "patterns": [
    {
      "type": "${examplePatternType}",
      "count": 5,
      "tip": "${examplePatternTip}",
      "practiceMethod": "${isKorean ? '구체적 연습 방법 (예: shadow speaking으로 3번 반복, 또는 특정 문형으로 5문장 만들어보기)' : 'Specific practice method (e.g., repeat 3 times with shadow speaking, or create 5 sentences using this pattern)'}",
      "exampleSentences": ["${isKorean ? '연습할 수 있는 예문 2-3개' : '2-3 example sentences to practice'}"]
    }
  ],
  "strengths": ${JSON.stringify(exampleStrengths)},
  "overallLevel": "beginner or intermediate or advanced (pick ONE)",
  "evaluatedGrade": "PICK EXACTLY ONE: Pre-A1, A1, A2, B1, B2, C1, C2",
  "levelDetails": {
    "grammar": 0-100,
    "vocabulary": 0-100,
    "fluency": 0-100,
    "comprehension": 0-100,
    "summary": "${isKorean ? '레벨 평가에 대한 한 문장 요약' : 'One sentence summary of level evaluation'}"
  },
  "encouragement": "${exampleEncouragement}",
  "memoryFacts": ["Durable facts about the learner worth remembering for FUTURE conversations, in English, e.g. 'is preparing for a trip to Bali', 'has a dog named Coco', 'works in marketing'. Only stable personal facts — NOT one-off small talk. Empty array if none."],
  "topicSummary": "A short English phrase naming what this conversation was mainly about, e.g. 'weekend plans and travel'"
}

BE THOROUGH: Find at least 3-5 corrections. Focus on grammar errors, unnatural phrasing, and vocabulary that doesn't fit the register. Show them how a native speaker would express the same idea IN THE SAME CONVERSATIONAL CONTEXT. Do NOT turn casual chat into essay writing.

=== CORRECTION FRAMING (Level ${correctionLevel}) ===
${correctionLevel <= 2 ? `FRAMING: "Learning Moments" (gentle tone)
- Frame corrections as "alternative expressions" not "error corrections"
- Use "explanation" field to describe HOW native speakers say it, not WHY the user was wrong
- Avoid deficit language: never use "error", "mistake", "wrong", "incorrect"
- Instead use: "alternative", "another way", "native speakers often say", "you could also try"
- The user should feel "Oh, I learned something new" not "Oh, I made a mistake"
- In "intended" field: describe what the user was trying to express positively` : `FRAMING: "Corrections" (instructional tone)
- Provide clear, direct corrections with explanations
- Use "explanation" field to explain the grammar rule or reason
- Be specific about what's wrong and why the correction is better
- Still be encouraging and warm, but direct about the error`}
${profileContext}
=== SCORING DIFFERENTIATION (CRITICAL) ===
DO NOT cluster all scores around 60-75. Use the FULL 0-100 range with these anchors:

Grammar scoring anchors:
- 10-25: Frequent basic errors (wrong tense, missing subjects/verbs, broken structure)
- 26-45: Basic structure OK but many errors (articles, prepositions, tense consistency)
- 46-60: Some errors but communicates meaning, occasional complex structures
- 61-75: Generally accurate with minor slips, attempts complex grammar
- 76-90: Mostly accurate, natural sentence construction, rare errors
- 91-100: Near-native accuracy, sophisticated grammar use

Vocabulary scoring anchors:
- 10-25: Very limited (repeats same 10-20 words), single-word responses
- 26-45: Basic daily words only, no variety, frequent wrong word choice
- 46-60: Adequate for basic topics, some variety, occasional apt choices
- 61-75: Good range, some topic-specific words, generally appropriate
- 76-90: Rich variety, idioms/collocations, register-appropriate choices
- 91-100: Sophisticated, nuanced word choice, near-native range

Fluency scoring anchors:
- 10-25: 1-3 word fragments, cannot form sentences
- 26-45: Short choppy sentences (3-5 words), many hesitations implied
- 46-60: Can form basic sentences, some flow, limited elaboration
- 61-75: Decent flow, can sustain topics, some natural connectors
- 76-90: Smooth, natural pace, good topic development, varied length
- 91-100: Native-like flow, effortless transitions, engaging rhythm

Comprehension scoring anchors:
- 10-25: Frequently misunderstands, off-topic responses
- 26-45: Gets main idea but misses nuance, some irrelevant responses
- 46-60: Understands direct questions, struggles with implied meaning
- 61-75: Good understanding, appropriate responses, catches most context
- 76-90: Excellent understanding, picks up nuance and humor
- 91-100: Native-like comprehension, catches all subtlety

IMPORTANT: Each sub-score MUST independently reflect actual performance. A student who uses good vocabulary but has poor grammar should show HIGH vocabulary and LOW grammar - not averaged-out middle scores for both.`;
    } else if (mode === 'feedback') {
      systemPrompt = `You are ${persona.name}, an English tutor providing feedback.

Analyze the user's messages and provide detailed, constructive feedback:

## Overall Impression
(1-2 sentences about their communication)

## What You Did Well
- Point out 2-3 things they expressed well

## Areas for Improvement
For each mistake:
- **Original:** "what they said"
- **Better:** "how to say it correctly"
- **Why:** Brief explanation

## Key Expressions to Practice
List 3-5 useful expressions from the conversation topic.

## Encouragement
End with genuine encouragement in your character's style.

Be specific, helpful, and maintain your teaching persona.`;
    } else if (mode === 'study') {
      // Study mode — block-specific coaching prompts
      const patternList = studyContext?.patterns?.length
        ? studyContext.patterns.map(p =>
            `• "${p.pattern}" — ${p.meaningKo}\n  예문: ${p.examples.slice(0, 2).join(' / ')}`
          ).join('\n')
        : '';
      const targetWordList = studyContext?.targetWords?.length
        ? studyContext.targetWords.slice(0, 10).join(', ')
        : '';
      const weekTheme = studyContext?.weekTheme ?? '';
      const goal = studyContext?.goal ?? '';

      if (studyBlock === 'warmup') {
        systemPrompt = `You are ${persona.name}, a warm and encouraging English tutor.

This is the WARMUP block (1-2 minutes) of today's structured study session.
Week theme: "${weekTheme}" | Learner goal: ${goal}

YOUR JOB:
- Greet the learner warmly and get them speaking immediately.
- Ask ONE light question about what they remember from yesterday or last session — keep it easy and friendly.
- Keep your response short (2-4 sentences max). Get the learner talking fast.
- If they struggle, help them along with a simple prompt. Never lecture.
- Respond ONLY in English.

ALWAYS CONTRIBUTE: Don't just ask — briefly share a thought or reaction of your own before the question.`;
      } else if (studyBlock === 'pattern') {
        systemPrompt = `You are ${persona.name}, a focused English pattern drill coach.

This is the PATTERN DRILL block of today's study session.
Week theme: "${weekTheme}"

Today's target patterns:
${patternList}

YOUR JOB (strict drill coach):
1. Introduce the first target pattern clearly: state it, give its Korean meaning, say one example.
2. Ask the learner to make THEIR OWN sentence using the pattern aloud. Push for production, not explanation.
3. When they respond, give IMMEDIATE SHORT feedback:
   - Correct usage: acknowledge briefly ("Nice! That works perfectly.") then move to next round.
   - Error: recast once ("Try: '${studyContext?.patterns?.[0]?.pattern ?? '…'} + [their idea]'") then move on.
4. Do 3 rounds per pattern (3 different sentences from the learner), then move to the next pattern.
5. Keep each turn SHORT (3-5 sentences). Drill pace > explanation depth.
- Respond ONLY in English.`;
      } else if (studyBlock === 'realtalk') {
        systemPrompt = `You are ${persona.name}, a natural English conversation partner.

This is the REALTALK block — guided conversation on this week's theme.
Week theme: "${weekTheme}" | Learner goal: ${goal}

Today's target patterns (steer the learner to use them naturally):
${patternList}
${targetWordList ? `\nTarget vocabulary to elicit: ${targetWordList}` : ''}

YOUR JOB:
- Have a natural, flowing conversation on the week theme.
- Steer topics so the learner has natural openings to USE today's patterns and target words.
- When they use a target pattern or word correctly, briefly acknowledge ("Exactly!" / "Perfect use of that!") then continue.
- When a natural opening exists for a target word, elicit it: "What would you call the feeling when…?"
- Keep your turns to 2-4 sentences. Move the conversation FORWARD with your own opinions and follow-ups.
- NEVER just mirror back what they said. Add your own take every turn.
- ALWAYS CONTRIBUTE before asking — share a short opinion or fact, THEN ask.
- Respond ONLY in English.

CORRECTION: Gentle recast only (echo the correct form naturally in your reply). No explicit corrections during RealTalk.`;
      } else if (studyBlock === 'wrapup') {
        systemPrompt = `You are ${persona.name}, a supportive English tutor wrapping up today's study session.

This is the WRAPUP block.
Week theme: "${weekTheme}"

Today's target patterns:
${patternList}

YOUR JOB:
- In 2-3 sentences, summarize what was practiced today (mention the patterns or theme by name).
- Give 1 specific strength observed + 1 focus point for next time (be concrete, not generic).
- Preview tomorrow: one encouraging sentence about what's coming.
- End with warm encouragement.

LANGUAGE: For the summary and feedback, you MAY switch to Korean to make it clearer. Encouragement can be in Korean or English — whichever feels warmer.
Keep the total response under 150 words.`;
      } else {
        // Fallback: generic study mode if block is missing
        systemPrompt = `You are ${persona.name}, an English tutor running a structured study session on the theme: "${weekTheme}". Guide the learner through practice with the patterns: ${patternList}. Respond ONLY in English.`;
      }

      // Inject persistent memory and weakness context (same as interview/conversation)
      if (memoryContext) systemPrompt += memoryContext;
      if (weaknessContext) systemPrompt += weaknessContext;
    } else {
      // Default conversation mode
      systemPrompt += `\n\nIMPORTANT: ALWAYS respond in ENGLISH ONLY. Never use Korean or any other language.\n\nYou are having a natural conversation. Respond naturally (2-4 sentences). Include at least one follow-up question or thought-provoking comment to keep the conversation going. When correcting, provide a brief reason why.\n\nNATURAL RECAST: If the user makes an obvious grammar error, naturally use the correct form in your response (e.g., user says "I goed there" -> you say "Oh you went there? Cool!"). Never explicitly correct them - just naturally echo the right form. If no error, just respond normally.`;

      // IB PYP teaching style for elementary-age learners (13 and under)
      if (learnerAge && learnerAge <= 13) {
        systemPrompt += `\n\nIB PYP APPROACH: Since this learner is young (${learnerAge}), occasionally ask thought-expanding questions ("Why do you think that?", "How does that work?") and encourage curiosity and effort. Keep it natural and fun - don't turn into a teacher. ${learnerAge <= 8 ? 'Use very simple words and be extra playful.' : ''}`;
      }
    }

    // Inject persistent memory into conversational prompts (not analysis/feedback,
    // which have their own structured output and use profileContext instead).
    // Study mode handles its own injection inline to control placement.
    if (memoryContext && mode !== 'analysis' && mode !== 'feedback' && mode !== 'study') {
      systemPrompt += memoryContext;
    }
    // Recurring weaknesses help BOTH conversation (proactive practice) and analysis
    // (prioritize the right corrections), so inject for everything except feedback.
    // Study mode handles its own injection inline.
    if (weaknessContext && mode !== 'feedback' && mode !== 'study') {
      systemPrompt += weaknessContext;
    }

    // ── 안전 조항 주입 (앱인토스 정책 이중 방어) ──
    // systemPrompt 는 위에서 모드별로 8곳에서 재할당·누적된다. 각 분기마다 붙이면
    // 새 모드가 추가될 때 누락되므로, **모든 조립이 끝난 최종 소비 직전 한 곳**에서
    // 감싼다. 조항은 프롬프트 맨 앞에 붙어 페르소나 말투 지시가 이를 희석하지
    // 못하게 한다(withSafetyClause 구현 참조).
    // 필터(위 checkLatestUserSafety)를 통과한 요청이라도 모델 자신이 경계를
    // 갖도록 하는 2차 방어선이다.
    systemPrompt = withSafetyClause(systemPrompt);

    // Format messages for OpenAI (fallback)
    const openaiMessages = [
      { role: 'system' as const, content: systemPrompt },
      ...messages.map((msg: Message) => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      })),
    ];

    // Format messages for Gemini
    const geminiContents = messages.map((msg: Message) => ({
      role: msg.role === 'assistant' ? 'model' as const : 'user' as const,
      parts: [{ text: msg.content }],
    }));

    // Optimize max_tokens based on mode
    // interview: 500 (was 350 - allow room to contribute real content, not just echo)
    // conversation: 600 (was 500 - allow richer tutoring responses)
    // analysis: 2048 (structured JSON output)
    // study blocks: warmup 300, pattern 400, realtalk 500, wrapup 400
    const studyBlockTokens: Record<string, number> = { warmup: 300, pattern: 400, realtalk: 500, wrapup: 400 };
    const maxTokens = mode === 'interview' ? 500
      : mode === 'analysis' ? 4000
      : mode === 'study' && studyBlock ? (studyBlockTokens[studyBlock] ?? 400)
      : 600;
    const isAnalysis = mode === 'analysis';

    // Use streaming for interview mode when requested
    if (useStreaming && mode === 'interview') {
      const encoder = new TextEncoder();

      if (gemini) {
        // Gemini 2.0 Flash streaming (primary)
        try {
          const model = gemini.getGenerativeModel({
            model: 'gemini-3-flash-preview',
            systemInstruction: { role: 'user', parts: [{ text: systemPrompt }] },
            generationConfig: { temperature: 0.8, maxOutputTokens: maxTokens },
          });

          const result = await model.generateContentStream({ contents: geminiContents });

          const readableStream = new ReadableStream({
            async start(controller) {
              try {
                for await (const chunk of result.stream) {
                  const text = chunk.text();
                  if (text) {
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`));
                  }
                }
                controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                controller.close();
              } catch (error) {
                console.error('Gemini streaming error, client will retry:', error);
                controller.error(error);
              }
            },
          });

          return new Response(readableStream, {
            headers: {
              'Content-Type': 'text/event-stream',
              'Cache-Control': 'no-cache',
              'Connection': 'keep-alive',
            },
          });
        } catch (geminiError) {
          console.error('Gemini streaming failed, falling back to OpenAI:', geminiError);
        }
      }

      // OpenAI fallback for streaming
      const stream = await getOpenAI().chat.completions.create({
        model: 'gpt-5.4-mini',
        max_tokens: maxTokens,
        temperature: 0.8,
        presence_penalty: 0.6,
        frequency_penalty: 0.3,
        messages: openaiMessages,
        stream: true,
      });

      const readableStream = new ReadableStream({
        async start(controller) {
          try {
            for await (const chunk of stream) {
              const text = chunk.choices[0]?.delta?.content || '';
              if (text) {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`));
              }
            }
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            controller.close();
          } catch (error) {
            controller.error(error);
          }
        },
      });

      return new Response(readableStream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }

    // Non-streaming mode
    let assistantMessage = '';

    if (isAnalysis) {
      // Analysis mode: Gemini 2.0 Flash primary (Q98 benchmark, fastest, cheapest)
      if (gemini) {
        try {
          const model = gemini.getGenerativeModel({
            model: 'gemini-3-flash-preview',
            systemInstruction: { role: 'user', parts: [{ text: systemPrompt }] },
            generationConfig: {
              temperature: 0.5,
              maxOutputTokens: maxTokens,
              responseMimeType: 'application/json',
            },
          });
          const result = await withTimeoutAbort(
            () => model.generateContent({ contents: geminiContents }),
            15000,
            'gemini.analysis',
            timings
          );
          assistantMessage = result.response.text();
        } catch (geminiError) {
          console.error('Gemini analysis failed, falling back to GPT-4o:', geminiError);
          assistantMessage = '';
        }
      }

      // GPT-4o fallback for analysis
      if (!assistantMessage) {
        try {
          const response = await withTimeoutAbort(
            (signal) => getOpenAI().chat.completions.create({
              model: 'gpt-4o',
              max_tokens: maxTokens,
              temperature: 0.5,
              messages: openaiMessages,
              response_format: { type: 'json_object' as const },
            }, { signal }),
            20000,
            'openai.analysis',
            timings
          );
          assistantMessage = response.choices[0]?.message?.content || '';
        } catch (gpt4oError) {
          console.error('GPT-4o analysis fallback also failed:', gpt4oError);
        }
      }
    } else {
      // Conversation/interview mode: Gemini primary (faster response)
      // Hard timeout 8s for Gemini, 10s for OpenAI fallback
      if (gemini) {
        try {
          const model = gemini.getGenerativeModel({
            model: 'gemini-3-flash-preview',
            systemInstruction: { role: 'user', parts: [{ text: systemPrompt }] },
            generationConfig: {
              temperature: 0.8,
              maxOutputTokens: maxTokens,
            },
          });
          const result = await withTimeoutAbort(
            () => model.generateContent({ contents: geminiContents }),
            8000,
            'gemini.conversation',
            timings
          );
          assistantMessage = result.response.text();
        } catch (geminiError) {
          console.error('Gemini conversation failed, falling back to OpenAI:', geminiError);
          assistantMessage = '';
        }
      }

      // OpenAI fallback for conversation
      if (!assistantMessage) {
        try {
          const response = await withTimeoutAbort(
            (signal) => getOpenAI().chat.completions.create({
              model: 'gpt-5.4-mini',
              max_tokens: maxTokens,
              temperature: 0.8,
              presence_penalty: 0.6,
              frequency_penalty: 0.3,
              messages: openaiMessages,
            }, { signal }),
            10000,
            'openai.conversation',
            timings
          );
          assistantMessage = response.choices[0]?.message?.content || '';
        } catch (openaiError) {
          console.error('OpenAI conversation fallback also failed:', openaiError);
        }
      }

      // Final fallback: prevent empty response / session freeze
      if (!assistantMessage) {
        console.warn('All conversation providers failed, using fallback response');
        assistantMessage = pickFallback(rid);
      }
    }

    // Parse JSON for analysis mode
    if (mode === 'analysis') {
      // Try to extract JSON from the response (handles markdown code blocks, extra text, etc.)
      const extractJSON = (text: string): object | null => {
        // 1. Try direct parse first
        try {
          return JSON.parse(text);
        } catch {
          // continue to extraction attempts
        }

        // 2. Try extracting from markdown code blocks: ```json ... ``` or ``` ... ```
        const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (codeBlockMatch) {
          try {
            return JSON.parse(codeBlockMatch[1].trim());
          } catch {
            // continue
          }
        }

        // 3. Try finding JSON object boundaries { ... }
        const firstBrace = text.indexOf('{');
        const lastBrace = text.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace > firstBrace) {
          try {
            return JSON.parse(text.slice(firstBrace, lastBrace + 1));
          } catch {
            // continue
          }
        }

        return null;
      };

      const analysisData = extractJSON(assistantMessage);

      if (analysisData && typeof analysisData === 'object') {
        // Validate and normalize evaluatedGrade to CEFR
        const validCefrLevels = ['Pre-A1', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
        const usGradeToCefr: Record<string, string> = {
          'K': 'Pre-A1', '1-2': 'A1', '3-4': 'A1', '5-6': 'A2',
          '7-8': 'B1', '9-10': 'B2', '11-12': 'C1', 'College': 'C2',
        };
        const data = analysisData as Record<string, unknown>;
        if (data.evaluatedGrade && typeof data.evaluatedGrade === 'string') {
          const rawGrade = (data.evaluatedGrade as string).trim();
          data.rawEvaluatedGrade = rawGrade; // Preserve raw AI output for traceability

          // Strict CEFR canonical parser (exact token match)
          const cefrMatch = validCefrLevels.find(level =>
            rawGrade.toUpperCase().includes(level.toUpperCase())
          );

          if (cefrMatch) {
            data.evaluatedGrade = cefrMatch;
          } else {
            // Legacy US Grade fallback for backward compatibility
            const legacyMatch = Object.keys(usGradeToCefr).find(g => rawGrade.includes(g));
            data.evaluatedGrade = legacyMatch ? usGradeToCefr[legacyMatch] : 'A2';
          }
        }

        // Ensure required fields exist with fallbacks
        if (!data.corrections || !Array.isArray(data.corrections)) {
          data.corrections = [];
        }
        if (!data.patterns || !Array.isArray(data.patterns)) {
          data.patterns = [];
        }
        if (!data.strengths || !Array.isArray(data.strengths)) {
          data.strengths = [isKorean ? '영어로 대화를 시도했습니다' : 'You attempted to converse in English'];
        }
        if (!data.encouragement || typeof data.encouragement !== 'string') {
          data.encouragement = isKorean
            ? '좋은 시도였어요! 꾸준히 연습하면 반드시 실력이 향상됩니다.'
            : 'Great effort! Keep practicing and you will improve.';
        }
        if (!data.overallLevel || typeof data.overallLevel !== 'string') {
          data.overallLevel = 'intermediate';
        }

        // Safety net: filter out corrections where original === corrected
        if (Array.isArray(data.corrections)) {
          data.corrections = (data.corrections as Array<{ original?: string; corrected?: string }>).filter(c => {
            const orig = c.original?.trim().toLowerCase().replace(/[.,!?]/g, '');
            const corr = c.corrected?.trim().toLowerCase().replace(/[.,!?]/g, '');
            return orig !== corr;
          });
        }

        // Confidence estimation based on analysis quality indicators
        const userMsgCount = messages.filter((m: Message) => m.role === 'user').length;
        const ld = data.levelDetails as Record<string, unknown> | undefined;
        const hasAllScores = ld && typeof ld.grammar === 'number' && typeof ld.vocabulary === 'number'
          && typeof ld.fluency === 'number' && typeof ld.comprehension === 'number';
        const correctionCount = Array.isArray(data.corrections) ? (data.corrections as unknown[]).length : 0;
        const gradeWasDirect = data.rawEvaluatedGrade
          && validCefrLevels.some(l => (data.rawEvaluatedGrade as string).toUpperCase().includes(l.toUpperCase()));

        let confidence: 'high' | 'medium' | 'low' = 'medium';
        if (userMsgCount >= 5 && hasAllScores && correctionCount >= 2 && gradeWasDirect) {
          confidence = 'high';
        } else if (userMsgCount < 3 || !hasAllScores) {
          confidence = 'low';
        }
        data.confidence = confidence;

        // Persist learner memory from this session (non-blocking, fire-and-forget).
        try {
          const newFacts = Array.isArray(data.memoryFacts)
            ? (data.memoryFacts as unknown[])
                .filter((f): f is string => typeof f === 'string' && f.trim().length > 0)
                .map(f => f.trim())
            : [];
          const newTopic = typeof data.topicSummary === 'string' ? data.topicSummary.trim() : '';
          delete data.memoryFacts;
          delete data.topicSummary;

          if (newFacts.length || newTopic) {
            const prev = (userData?.profile?.memory as LearnerMemory | undefined)
              || { facts: [], lastTopics: [], updatedAt: '' };
            // Dedup facts case-insensitively (newest appended), cap to MAX_MEMORY_FACTS.
            const seen = new Set(prev.facts.map(f => f.toLowerCase()));
            const mergedFacts = [...prev.facts];
            for (const f of newFacts) {
              if (!seen.has(f.toLowerCase())) { seen.add(f.toLowerCase()); mergedFacts.push(f); }
            }
            const mergedTopics = newTopic
              ? [newTopic, ...prev.lastTopics.filter(t => t.toLowerCase() !== newTopic.toLowerCase())]
              : prev.lastTopics;
            const updatedMemory: LearnerMemory = {
              facts: mergedFacts.slice(-MAX_MEMORY_FACTS),
              lastTopics: mergedTopics.slice(0, MAX_MEMORY_TOPICS),
              updatedAt: new Date().toISOString(),
            };
            if (authUser.email) {
              updateUserFields(authUser.email, { profile: { memory: updatedMemory } })
                .catch(e => console.error('memory persist failed (non-blocking):', e));
            }
          }
        } catch (e) {
          console.error('memory merge failed (non-blocking):', e);
        }

        timings['total.ms'] = since(t0);
        return NextResponse.json({ analysis: data, meta: { rid, timings } });
      } else {
        // JSON extraction completely failed — return a minimal valid analysis object so
        // the client can still save the session (corrections array empty but session not lost).
        console.error('Analysis JSON extraction failed. Raw response:', assistantMessage.slice(0, 200));
        const fallbackAnalysis = {
          corrections: [],
          patterns: [],
          strengths: [isKorean ? '영어로 대화를 시도했습니다' : 'You attempted to converse in English'],
          overallLevel: 'intermediate',
          evaluatedGrade: 'A2',
          levelDetails: {
            grammar: 50,
            vocabulary: 50,
            fluency: 50,
            comprehension: 50,
            summary: isKorean
              ? '분석 중 오류가 발생하여 이번 세션의 상세 분석을 완료하지 못했습니다. 세션 기록은 저장되었습니다.'
              : 'Analysis could not be completed for this session. Your session has been saved.',
          },
          encouragement: isKorean
            ? '오늘도 열심히 연습하셨어요! 꾸준히 연습하면 반드시 실력이 향상됩니다.'
            : 'Great effort today! Keep practicing and you will improve.',
          confidence: 'low' as const,
        };
        timings['total.ms'] = since(t0);
        return NextResponse.json({ analysis: fallbackAnalysis, parseError: true, meta: { rid, timings } });
      }
    }

    timings['total.ms'] = since(t0);
    return NextResponse.json({ message: assistantMessage, meta: { rid, timings } });
  } catch (error) {
    console.error('Chat error:', error);
    timings['total.ms'] = since(t0);
    return NextResponse.json(
      { error: 'Internal server error', meta: { rid, timings } },
      { status: 500 }
    );
  }
}
