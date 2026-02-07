import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getPersona } from '@/lib/personas';
import { getAgeGroup, calculateAdaptiveDifficulty } from '@/lib/speechMetrics';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      messages, tutorId, mode, language = 'en', stream: useStreaming = false,
      birthYear, userName, previousGrade, previousLevelDetails, speechMetrics: clientSpeechMetrics,
    } = body;

    // Calculate age if birthYear is provided
    const learnerAge = birthYear ? new Date().getFullYear() - birthYear : null;

    // Calculate age group and adaptive difficulty
    const ageGroup = birthYear ? getAgeGroup(birthYear) : null;
    const adaptiveDifficulty = ageGroup
      ? calculateAdaptiveDifficulty(ageGroup, previousGrade || null, previousLevelDetails || null, clientSpeechMetrics || null)
      : null;

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

=== HOW TO RESPOND ===

1. React genuinely to what they said (1 short reaction)
2. EITHER: One natural follow-up OR share a tiny thought of yours OR change topic
3. Keep it under 20 words total. Like texting.

BE THIS FRIEND:
- "Ha nice! Bali's so good. You going anywhere else soon?"
- "Oh man, yeah. Anyway what are you up to today?"
- "Love that for you! Oh random - you watch any good shows lately?"

NOT THIS INTERVIEWER:
- "That's interesting. Tell me more about the food."
- "I see. And then what happened?"
- "How did that make you feel?"

Keep it real. Keep it moving. ENGLISH ONLY.`;
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

      systemPrompt = `You are ${persona.name}, a supportive English coach analyzing a student's conversation.
${analysisLang}

YOUR GOAL: Help them speak in LONGER, more CONNECTED sentences like native speakers do.

ANALYSIS FOCUS:
1. Find every short, choppy sentence and show how to EXTEND it
2. Identify grammar mistakes and show the natural way to say it
3. Suggest richer vocabulary and expressions
4. Point out missed opportunities to connect ideas

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
- What they said (even if grammatically correct but too short)
- What they probably wanted to express (their intent)
- A MUCH BETTER version that is ${ageGroup ? '학습자 수준보다 살짝 높은 i+1 수준 (성장 유도)' : 'longer, more natural, and uses connectors (that, which, who, because, so, and then, especially when, which means)'}
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
      "corrected": "I really love coffee, especially the kind that has a rich, bold flavor because it helps me wake up in the morning and gives me the energy I need to start my day.",
      "explanation": "${exampleExplanation}",
      "category": "sentence-extension"
    }
  ],
  "patterns": [
    {
      "type": "${examplePatternType}",
      "count": 5,
      "tip": "${examplePatternTip}"
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

BE THOROUGH: Find at least 3-5 corrections. Even correct sentences can be improved to sound more natural and fluent. Show them how a native speaker would express the same idea with more detail and flow.`;
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
      systemPrompt += `\n\nIMPORTANT: ALWAYS respond in ENGLISH ONLY. Never use Korean or any other language.\n\nYou are having a natural conversation. Keep responses concise (2-3 sentences). Ask follow-up questions to keep the conversation going. Remember: DO NOT correct grammar or pronunciation during the conversation - just respond naturally.`;
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
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: maxTokens,
      temperature: 0.8,
      presence_penalty: 0.6,
      frequency_penalty: 0.3,
      messages: openaiMessages,
    });

    const assistantMessage = response.choices[0]?.message?.content || '';

    // Parse JSON for analysis mode
    if (mode === 'analysis') {
      try {
        const analysisData = JSON.parse(assistantMessage);

        // Validate and sanitize evaluatedGrade
        const validGrades = ['K', '1-2', '3-4', '5-6', '7-8', '9-10', '11-12', 'College'];
        if (analysisData.evaluatedGrade) {
          // Extract first valid grade if AI returned multiple options
          const foundGrade = validGrades.find(g =>
            analysisData.evaluatedGrade.includes(g)
          );
          analysisData.evaluatedGrade = foundGrade || '5-6'; // Default to 5-6 if invalid
        }

        return NextResponse.json({ analysis: analysisData });
      } catch {
        // If JSON parsing fails, return raw message
        return NextResponse.json({ message: assistantMessage, parseError: true });
      }
    }

    return NextResponse.json({ message: assistantMessage });
  } catch (error) {
    console.error('Chat error:', error);
    return NextResponse.json(
      { error: 'Failed to get response' },
      { status: 500 }
    );
  }
}
