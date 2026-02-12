import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { checkRateLimit, getRateLimitId, RATE_LIMITS } from '@/lib/rateLimit';
import { getPersona } from '@/lib/personas';
import { getAgeGroup, calculateAdaptiveDifficulty } from '@/lib/speechMetrics';
import { getUserData } from '@/lib/sheetHelper';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// DeepSeek V3 client (OpenAI-compatible API)
const deepseek = process.env.DEEPSEEK_API_KEY
  ? new OpenAI({
      apiKey: process.env.DEEPSEEK_API_KEY,
      baseURL: 'https://api.deepseek.com',
    })
  : null;

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export async function POST(request: NextRequest) {
  try {
    // Auth check
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Rate limit
    const rateLimitResult = checkRateLimit(getRateLimitId(session.user.email, request), RATE_LIMITS.ai);
    if (rateLimitResult) return rateLimitResult;

    const body = await request.json();
    const {
      messages, tutorId, mode, language = 'en', stream: useStreaming = false,
      birthYear, userName, previousGrade, previousLevelDetails, speechMetrics: clientSpeechMetrics,
    } = body;

    // Input validation
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'Messages array is required' }, { status: 400 });
    }
    if (messages.length > 100) {
      return NextResponse.json({ error: 'Too many messages' }, { status: 400 });
    }
    if (!tutorId || typeof tutorId !== 'string') {
      return NextResponse.json({ error: 'Invalid tutor ID' }, { status: 400 });
    }
    const allowedModes = ['interview', 'analysis', 'feedback', undefined];
    if (mode && !allowedModes.includes(mode)) {
      return NextResponse.json({ error: 'Invalid mode' }, { status: 400 });
    }

    // Calculate age if birthYear is provided
    const learnerAge = birthYear ? new Date().getFullYear() - birthYear : null;

    // Calculate age group and adaptive difficulty
    const ageGroup = birthYear ? getAgeGroup(birthYear) : null;
    const adaptiveDifficulty = ageGroup
      ? calculateAdaptiveDifficulty(ageGroup, previousGrade || null, previousLevelDetails || null, clientSpeechMetrics || null)
      : null;

    // Fetch profile data for analysis mode (interests, customContext, difficulty preference)
    let profileContext = '';
    if (mode === 'analysis' && session.user.email) {
      try {
        const userData = await getUserData(session.user.email);
        if (userData?.profile) {
          const p = userData.profile;
          const parts: string[] = [];
          if (p.type) parts.push(`Learner type: ${p.type}`);
          if (p.interests?.length) parts.push(`Interests: ${p.interests.join(', ')}`);
          if (p.customContext) parts.push(`Custom context: ${p.customContext}`);
          if (p.difficultyPreference) parts.push(`Difficulty preference: ${p.difficultyPreference}`);
          if (p.grade) parts.push(`Korean grade: ${p.grade}`);
          if (parts.length > 0) {
            profileContext = `\n=== LEARNER PROFILE (from saved settings) ===\n${parts.join('\n')}\n\nUse this profile to personalize your evaluation. Reference their interests when giving examples or encouragement. Adjust correction complexity to match their type and difficulty preference.\n`;
          }
        }
      } catch (e) {
        console.error('Profile fetch for analysis failed (non-blocking):', e);
      }
    }

    const persona = getPersona(tutorId);
    if (!persona) {
      return NextResponse.json({ error: 'Invalid tutor' }, { status: 400 });
    }

    let systemPrompt = persona.systemPrompt;
    const isKorean = language === 'ko';

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

=== NATURAL RECAST (subtle correction) ===
If the user makes a CLEAR grammar error, naturally echo the corrected version in your response.
Examples:
- User: "I goed to the store" -> You: "Oh you went to the store? Nice!"
- User: "She don't like it" -> You: "Yeah she doesn't like that stuff huh"
- User: "I have went there" -> You: "Oh you've been there too? Cool!"
Rules:
- ONLY for obvious errors (wrong tense, wrong verb form, missing article, subject-verb agreement)
- Weave it into your natural response - NEVER say "you should say..." or "the correct way is..."
- If the sentence has no clear error, just respond normally - do NOT force a recast
- Max 1 recast per response
- Do NOT recast vocabulary choices, only grammar errors
- For kid conversations: even more subtle, just naturally mirror the correct form

=== HOW TO RESPOND ===

CRITICAL: Your first sentence MUST be a short (1-5 word) natural reaction that echoes or acknowledges what the student ACTUALLY said. This creates a natural conversational rhythm.

1. FIRST: Quick contextual reaction to their words (1-5 words). Reference their content!
   - They said "I went to the park" -> "Oh the park!" or "Nice, a park day!"
   - They said "I like pizza" -> "Ooh pizza!" or "Ha, same!"
   - They said "My dog is sick" -> "Oh no, your dog!" or "Aw that sucks."
   - They said "I watched a movie" -> "Oh what movie?" or "A movie night!"
   - If they made a grammar error, naturally recast in your reaction: "I goed to store" -> "Oh you went shopping!"

2. THEN: One follow-up OR share a thought OR change topic. Keep it under 15 words.

GOOD EXAMPLES (notice the short contextual first reaction):
- "Oh Bali! So jealous. You going anywhere else soon?"
- "Ha Korean food! Same, I'm obsessed. Made anything lately?"
- "Aw a puppy! That's the best. What kind?"

BAD EXAMPLES (generic, no reference to what they said):
- "That's interesting. Tell me more."
- "I see. And then what happened?"
- "Hmm, let me think... How did that make you feel?"
- "Oh nice! Good point. That's great."

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
- Still keep responses under 20 words
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

LEVEL EVALUATION (US Grade Equivalent):
${learnerAge ? (() => {
        const koreanAge = learnerAge + 1; // Korean age
        // Expected US grade for age - extended to all ages
        const expectedGradeMap: Record<number, string> = {
          3: 'K', 4: 'K', 5: 'K', 6: '1-2', 7: '1-2', 8: '3-4', 9: '3-4', 10: '5-6', 11: '5-6',
          12: '7-8', 13: '7-8', 14: '9-10', 15: '9-10', 16: '11-12', 17: '11-12',
        };
        const expectedGrade = expectedGradeMap[learnerAge] || (learnerAge >= 18 ? 'College' : '5-6');
        return `LEARNER INFO:
- Name: ${userName || 'Student'}
- Age: ${learnerAge} years old (Korean age: ${koreanAge}세)
- Expected US grade for this age: ${expectedGrade}

AGE-TO-GRADE REFERENCE (US system):
Age 3-5 → K, Age 6-7 → G1-G2, Age 8-9 → G3-G4, Age 10-11 → G5-G6, Age 12-13 → G7-G8, Age 14-15 → G9-G10, Age 16-17 → G11-G12, Age 18+ → College
\n`;
      })() : ''}
Based on the student's conversation, evaluate their English proficiency using US school grade levels:
- K (Kindergarten): Very basic words, single words or 2-3 word phrases, many grammar errors
- 1-2 (Grade 1-2): Simple sentences, basic vocabulary, frequent grammar mistakes
- 3-4 (Grade 3-4): Can form sentences, limited vocabulary, some grammar errors
- 5-6 (Grade 5-6): Good sentence structure, developing vocabulary, occasional errors
- 7-8 (Middle School): Clear communication, varied vocabulary, minor errors
- 9-10 (High School): Fluent conversation, good vocabulary range, rare errors
- 11-12 (Advanced): Near-native fluency, rich vocabulary, very few errors
- College: Native-like proficiency, sophisticated vocabulary and grammar

Evaluate based on:
1. Grammar accuracy (40%): Verb tenses, articles, prepositions, sentence structure
2. Vocabulary range (25%): Word variety, appropriate word choice, idioms
3. Fluency (20%): Sentence length, natural flow, conversation pace
4. Comprehension (15%): Understanding context, appropriate responses
${learnerAge ? (() => {
        const koreanAge = learnerAge + 1;
        const expectedGradeMap: Record<number, string> = {
          3: 'K', 4: 'K', 5: 'K', 6: '1-2', 7: '1-2', 8: '3-4', 9: '3-4', 10: '5-6', 11: '5-6',
          12: '7-8', 13: '7-8', 14: '9-10', 15: '9-10', 16: '11-12', 17: '11-12',
        };
        const expectedGrade = expectedGradeMap[learnerAge] || (learnerAge >= 18 ? 'College' : '5-6');
        const summaryExample = isKorean
          ? `한국나이 ${koreanAge}세는 영미권에서 G${expectedGrade}에 해당합니다. 탭톡 평가 결과 G[평가등급]으로, 동나이대 대비 [높은/적정/낮은] 수준입니다.`
          : `A ${koreanAge}-year-old (Korean age) corresponds to US Grade ${expectedGrade}. TapTalk evaluated at G[grade], which is [above/at/below] the expected level for this age.`;
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
  "evaluatedGrade": "PICK EXACTLY ONE: K, 1-2, 3-4, 5-6, 7-8, 9-10, 11-12, or College",
  "levelDetails": {
    "grammar": 0-100,
    "vocabulary": 0-100,
    "fluency": 0-100,
    "comprehension": 0-100,
    "summary": "${isKorean ? '레벨 평가에 대한 한 문장 요약' : 'One sentence summary of level evaluation'}"
  },
  "encouragement": "${exampleEncouragement}"
}

BE THOROUGH: Find at least 3-5 corrections. Focus on grammar errors, unnatural phrasing, and vocabulary that doesn't fit the register. Show them how a native speaker would express the same idea IN THE SAME CONVERSATIONAL CONTEXT. Do NOT turn casual chat into essay writing.
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
    } else {
      // Default conversation mode
      systemPrompt += `\n\nIMPORTANT: ALWAYS respond in ENGLISH ONLY. Never use Korean or any other language.\n\nYou are having a natural conversation. Keep responses concise (2-3 sentences). Ask follow-up questions to keep the conversation going.\n\nNATURAL RECAST: If the user makes an obvious grammar error, naturally use the correct form in your response (e.g., user says "I goed there" -> you say "Oh you went there? Cool!"). Never explicitly correct them - just naturally echo the right form. If no error, just respond normally.`;

      // IB PYP teaching style for elementary-age learners (13 and under)
      if (learnerAge && learnerAge <= 13) {
        systemPrompt += `\n\nIB PYP APPROACH: Since this learner is young (${learnerAge}), occasionally ask thought-expanding questions ("Why do you think that?", "How does that work?") and encourage curiosity and effort. Keep it natural and fun - don't turn into a teacher. ${learnerAge <= 8 ? 'Use very simple words and be extra playful.' : ''}`;
      }
    }

    // Format messages for OpenAI
    const openaiMessages = [
      { role: 'system' as const, content: systemPrompt },
      ...messages.map((msg: Message) => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      })),
    ];

    // Optimize max_tokens based on mode
    const maxTokens = mode === 'interview' ? 150 : mode === 'analysis' ? 2048 : 500;

    // Use streaming for interview mode when requested
    if (useStreaming && mode === 'interview') {
      const stream = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        max_tokens: maxTokens,
        temperature: 0.8,
        presence_penalty: 0.6,
        frequency_penalty: 0.3,
        messages: openaiMessages,
        stream: true,
      });

      // Create a readable stream for SSE
      const encoder = new TextEncoder();
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

    // Non-streaming mode (default)
    // Use DeepSeek V3 for analysis mode (better quality at lower cost), fallback to GPT-4o-mini
    let assistantMessage = '';
    const isAnalysis = mode === 'analysis';

    if (isAnalysis && deepseek) {
      try {
        const dsResponse = await deepseek.chat.completions.create({
          model: 'deepseek-chat',
          max_tokens: maxTokens,
          temperature: 0.3, // Lower temperature for more consistent analysis
          messages: openaiMessages,
          response_format: { type: 'json_object' as const },
        });
        assistantMessage = dsResponse.choices[0]?.message?.content || '';
      } catch (deepseekError) {
        console.error('DeepSeek analysis failed, falling back to GPT-4o-mini:', deepseekError);
        // Fallback to GPT-4o-mini
        const fallbackResponse = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          max_tokens: maxTokens,
          temperature: 0.5,
          messages: openaiMessages,
          response_format: { type: 'json_object' as const },
        });
        assistantMessage = fallbackResponse.choices[0]?.message?.content || '';
      }
    } else {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        max_tokens: maxTokens,
        temperature: 0.8,
        presence_penalty: 0.6,
        frequency_penalty: 0.3,
        messages: openaiMessages,
        ...(isAnalysis ? { response_format: { type: 'json_object' as const } } : {}),
      });
      assistantMessage = response.choices[0]?.message?.content || '';
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
        // Validate and sanitize evaluatedGrade
        const validGrades = ['K', '1-2', '3-4', '5-6', '7-8', '9-10', '11-12', 'College'];
        const data = analysisData as Record<string, unknown>;
        if (data.evaluatedGrade && typeof data.evaluatedGrade === 'string') {
          const foundGrade = validGrades.find(g =>
            (data.evaluatedGrade as string).includes(g)
          );
          data.evaluatedGrade = foundGrade || '5-6';
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

        return NextResponse.json({ analysis: data });
      } else {
        // JSON extraction completely failed - return raw message
        console.error('Analysis JSON extraction failed. Raw response:', assistantMessage.slice(0, 200));
        return NextResponse.json({ message: assistantMessage, parseError: true });
      }
    }

    return NextResponse.json({ message: assistantMessage });
  } catch (error) {
    console.error('Chat error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
