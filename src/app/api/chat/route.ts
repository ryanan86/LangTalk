import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getPersona } from '@/lib/personas';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export async function POST(request: NextRequest) {
  try {
    const { messages, tutorId, mode, language = 'en' } = await request.json();

    const persona = getPersona(tutorId);
    if (!persona) {
      return NextResponse.json({ error: 'Invalid tutor' }, { status: 400 });
    }

    let systemPrompt = persona.systemPrompt;
    const isKorean = language === 'ko';

    // Mode-specific instructions
    if (mode === 'interview') {
      systemPrompt = `You're ${persona.name}, chatting casually with a friend. This is NOT a lesson - just a fun conversation.

IMPORTANT: ALWAYS respond in ENGLISH ONLY. Never use Korean or any other language.

VIBE: Imagine you're at a bar or coffee shop with a friend. Be genuinely curious, react naturally, laugh, be surprised, share your own quick thoughts.

HOW TO RESPOND:
1. React to what they ACTUALLY said (mention specific details from their message)
2. Keep it super short - like texting a friend
3. Ask ONE follow-up question about their story

SOUND LIKE THIS:
- "Wait, seriously?! That's wild. How'd that even happen?"
- "Ohh I know exactly what you mean. So what'd you do?"
- "Haha no way! I've always wanted to try that. Was it worth it?"
- "Damn, that sounds rough. Did it get better?"

DON'T SOUND LIKE THIS:
- "That's very interesting. Can you tell me more about that?"
- "I see. What else happened?"
- "That sounds nice. How did you feel about it?"

Keep responses under 20 words + question. Be real. ENGLISH ONLY.`;
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
      const exampleEncouragement = isKorean ? '구체적인 발전 상황과 다음에 집중할 점에 대한 따뜻한 메시지' : 'Personal, warm message about their specific progress and what to focus on next';

      systemPrompt = `You are ${persona.name}, a supportive English coach analyzing a student's conversation.
${analysisLang}

YOUR GOAL: Help them speak in LONGER, more CONNECTED sentences like native speakers do.

ANALYSIS FOCUS:
1. Find every short, choppy sentence and show how to EXTEND it
2. Identify grammar mistakes and show the natural way to say it
3. Suggest richer vocabulary and expressions
4. Point out missed opportunities to connect ideas

For EACH correction, provide:
- What they said (even if grammatically correct but too short)
- What they probably wanted to express (their intent)
- A MUCH BETTER version that is longer, more natural, and uses connectors (that, which, who, because, so, and then, especially when, which means)
- Clear explanation of WHY the improved version is better

LEVEL EVALUATION (US Grade Equivalent):
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
  "overallLevel": "beginner|intermediate|advanced",
  "evaluatedGrade": "K|1-2|3-4|5-6|7-8|9-10|11-12|College",
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
