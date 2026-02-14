#!/usr/bin/env node
/**
 * TapTalk AI Model Benchmark v2 - Production-Quality Evaluation
 *
 * Improvements over v1:
 * - Realistic 50+ char student messages with diverse error types
 * - Production-matching system prompt (from chat/route.ts analysis mode)
 * - Enhanced quality scoring: correction depth, Korean quality, advice specificity
 * - Raw response samples saved for manual review
 *
 * Usage: node scripts/ai-benchmark-v2.mjs
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ============================================================
// 1. API KEYS
// ============================================================
function loadEnvFile() {
  const paths = [
    resolve(__dirname, '..', '.env.local'),
    resolve(process.env.HOME || '', '.claude', '.env'),
  ];
  for (const envPath of paths) {
    try {
      const content = readFileSync(envPath, 'utf-8');
      for (const line of content.split('\n')) {
        const match = line.match(/^([A-Z_]+)=["']?([^"'\n]*)["']?$/);
        if (match && !process.env[match[1]]) {
          process.env[match[1]] = match[2].replace(/\\n/g, '\n');
        }
      }
    } catch { /* skip */ }
  }
}
loadEnvFile();

const keys = {
  openai: process.env.OPENAI_API_KEY || '',
  gemini: (process.env.GEMINI_API_KEY || '').replace(/\n/g, ''),
  anthropic: process.env.ANTHROPIC_API_KEY || '',
  deepseek: process.env.DEEPSEEK_API_KEY || '',
};

// ============================================================
// 2. MODEL DEFINITIONS (pricing per 1M tokens, USD - Feb 2026)
// ============================================================
const MODELS = [
  // OpenAI
  { id: 'gpt-4o', provider: 'openai', name: 'GPT-4o', inputPrice: 2.50, outputPrice: 10.00, tier: 'premium' },
  { id: 'gpt-4o-mini', provider: 'openai', name: 'GPT-4o Mini', inputPrice: 0.15, outputPrice: 0.60, tier: 'budget' },
  { id: 'gpt-3.5-turbo', provider: 'openai', name: 'GPT-3.5 Turbo', inputPrice: 0.50, outputPrice: 1.50, tier: 'legacy' },
  { id: 'o3-mini', provider: 'openai', name: 'O3 Mini', inputPrice: 1.10, outputPrice: 4.40, tier: 'reasoning' },

  // Gemini
  { id: 'gemini-2.0-flash', provider: 'gemini', name: 'Gemini 2.0 Flash', inputPrice: 0.10, outputPrice: 0.40, tier: 'budget' },
  { id: 'gemini-2.0-flash-lite', provider: 'gemini', name: 'Gemini 2.0 Flash Lite', inputPrice: 0.0, outputPrice: 0.0, tier: 'free' },

  // Anthropic (Claude) - verified working models only
  { id: 'claude-sonnet-4-5-20250929', provider: 'anthropic', name: 'Claude Sonnet 4.5', inputPrice: 3.00, outputPrice: 15.00, tier: 'premium' },
  { id: 'claude-haiku-4-5-20251001', provider: 'anthropic', name: 'Claude Haiku 4.5', inputPrice: 1.00, outputPrice: 5.00, tier: 'mid' },
  { id: 'claude-3-5-haiku-20241022', provider: 'anthropic', name: 'Claude 3.5 Haiku', inputPrice: 1.00, outputPrice: 5.00, tier: 'mid' },

  // DeepSeek
  { id: 'deepseek-chat', provider: 'deepseek', name: 'DeepSeek V3', inputPrice: 0.27, outputPrice: 1.10, tier: 'budget' },
];

// ============================================================
// 3. TEST DATA - Realistic Korean 14-year-old student (intermediate)
//    Each student message: 50+ characters with diverse error types
// ============================================================
const TEST_CONVERSATION = [
  {
    role: 'assistant',
    content: "Hey! How's it going? What did you get up to this weekend?"
  },
  {
    role: 'user',
    content: "Hello Emma! This weekend was very busy for me. On Saturday I go to the science museum with my family because my little sister wanted to see the dinosaur exhibition. It was really crowded but I enjoyed it very much."
  },
  {
    role: 'assistant',
    content: "Oh that sounds awesome! Dinosaur exhibitions are so cool. Did your sister love it?"
  },
  {
    role: 'user',
    content: "Yes she was so exciting! She kept running around and touching everything even though the guard told her don't touch. My mom was very embarrassing because of her behavior. But actually I think the space section was more interesting than dinosaur part."
  },
  {
    role: 'assistant',
    content: "Haha little kids are like that! What was cool about the space section?"
  },
  {
    role: 'user',
    content: "They had a real size model of the Mars rover and you can sit inside a simulation of space station. I tried the zero gravity experience and it feeled so strange like my body is floating. I think I want to become a aerospace engineer when I grow up because space technology is very fascinated to me."
  },
  {
    role: 'assistant',
    content: "Whoa an aerospace engineer! That's a huge dream. Are you into science at school too?"
  },
  {
    role: 'user',
    content: "Yes I am one of the best student in my science class. Last semester I got 95 point in the final exam. But honestly my English is not so good comparing to my science. My teacher always says me that I need to read more English books but I don't have many time because I have to study for other subjects too and also I go to math academy three times a week."
  },
  {
    role: 'assistant',
    content: "95 on a science exam? That's incredible! And hey, your English is way better than you think. Do you get to practice outside of class?"
  },
  {
    role: 'user',
    content: "Thank you for saying that. Actually I watch YouTube videos in English almost everyday especially about science and technology channels. But when I try to speak, my pronunciation is not clear and I always forget how to say what I want to say. Like yesterday I tried to explain about black hole to my friend but I couldn't find the right words and I just gave up and explained in Korean instead. It was very frustrating for me."
  },
  {
    role: 'assistant',
    content: "That's super relatable honestly! Watching YouTube in English is actually great practice. The speaking part just needs more practice."
  },
  {
    role: 'user',
    content: "I agree with you. That's why I started using this app. I hope I can improve my speaking skill faster. My goal is to make a presentation in English about renewable energy for our school festival next month. My teacher said if I can do it well, she will recommend me to the national science competition which is very important for my university admission."
  },
];

// ============================================================
// 4. SYSTEM PROMPT - Production-matching (from chat/route.ts)
// ============================================================
const SYSTEM_PROMPT = `You are Emma, a supportive English coach analyzing a student's conversation.

IMPORTANT: Write ALL explanations, intended meanings, patterns, strengths, and encouragement in KOREAN.
The "original" and "corrected" fields should remain in English (since they're English sentences).
The "intended", "explanation", "type", "tip", "strengths", and "encouragement" fields should be in KOREAN.

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

PERSONA CONTEXT: This was a CASUAL conversation with a laid-back persona. Corrections MUST match casual native speech.

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

LEARNER AGE GROUP: teenager
EFFECTIVE DIFFICULTY: 3/5

=== Correction Rules (i+1 principle: slightly above current level) ===
- Correction sentence length: 8~20 words (slight stretching allowed)
- Vocabulary level: middle school appropriate with some stretch words
- Grammar focus: verb tenses, articles, prepositions, relative clauses
- Idiom usage: basic idioms allowed
- Conjunction usage: because, which, since, although, even though

=== Growth Stretching (i+1) ===
Push toward: more natural connectors, varied sentence starters, appropriate verb tenses

For EACH correction, provide:
- What they said (focus on actual errors or unnatural phrasing -- do NOT flag sentences just for being short)
- What they probably wanted to express (their intent)
- A more NATURAL version that sounds like what a native speaker would actually say in this same conversation context
- Clear explanation of WHY the improved version is better

LEARNER INFO:
- Name: Student
- Age: 14 years old (Korean age: 15)
- Expected US grade for this age: 9-10

AGE-TO-GRADE REFERENCE (US system):
Age 3-5 -> K, Age 6-7 -> G1-G2, Age 8-9 -> G3-G4, Age 10-11 -> G5-G6, Age 12-13 -> G7-G8, Age 14-15 -> G9-G10, Age 16-17 -> G11-G12, Age 18+ -> College

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

In levelDetails.summary, provide a DETAILED comparison like: "Korean age 15 corresponds to US Grade 9-10. TapTalk evaluated at G[grade], which is [above/at/below] the expected level for this age."

RETURN THIS EXACT JSON FORMAT (no markdown, valid JSON only):
{
  "corrections": [
    {
      "original": "I like coffee. It is good.",
      "intended": "커피를 좋아하는 이유를 표현하고 싶었어요",
      "corrected": "I'm really into coffee -- there's nothing like a good bold cup in the morning, you know?",
      "explanation": "생각을 연결하세요! 'especially', 'because', 'that'을 사용해서 짧은 문장들을 하나의 매끄러운 문장으로 만들어보세요.",
      "category": "naturalness"
    }
  ],
  "patterns": [
    {
      "type": "패턴명 (Korean)",
      "count": 5,
      "tip": "연습 팁 (Korean)",
      "practiceMethod": "구체적 연습 방법 (예: shadow speaking으로 3번 반복)",
      "exampleSentences": ["예문1", "예문2"]
    }
  ],
  "strengths": ["강점1", "강점2"],
  "overallLevel": "beginner or intermediate or advanced (pick ONE)",
  "evaluatedGrade": "PICK EXACTLY ONE: K, 1-2, 3-4, 5-6, 7-8, 9-10, 11-12, or College",
  "levelDetails": {
    "grammar": 0-100,
    "vocabulary": 0-100,
    "fluency": 0-100,
    "comprehension": 0-100,
    "summary": "레벨 평가에 대한 한 문장 요약"
  },
  "encouragement": "짧고 따뜻한 격려 메시지 (1-2문장)"
}

BE THOROUGH: Find at least 5-8 corrections. Focus on grammar errors, unnatural phrasing, and vocabulary that doesn't fit the register. Show them how a native speaker would express the same idea IN THE SAME CONVERSATIONAL CONTEXT. Do NOT turn casual chat into essay writing.

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

IMPORTANT: Each sub-score MUST independently reflect actual performance.`;

// ============================================================
// 5. API CALLERS
// ============================================================

async function callOpenAI(modelId, systemPrompt, messages) {
  const body = {
    model: modelId,
    messages: [
      { role: 'system', content: systemPrompt },
      ...messages.map(m => ({ role: m.role, content: m.content })),
    ],
    temperature: 0.5,
    max_tokens: 4096,
    response_format: { type: 'json_object' },
  };

  // o1/o3 models don't support system messages or temperature or response_format
  if (modelId.startsWith('o1') || modelId.startsWith('o3')) {
    body.messages = [
      { role: 'user', content: systemPrompt + '\n\nConversation:\n' + messages.map(m => `${m.role}: ${m.content}`).join('\n') + '\n\nReturn ONLY valid JSON. Start with { and end with }.' },
    ];
    delete body.temperature;
    delete body.max_tokens;
    delete body.response_format;
    body.max_completion_tokens = 4096;
  }

  // gpt-3.5-turbo doesn't support response_format
  if (modelId === 'gpt-3.5-turbo') {
    delete body.response_format;
    body.messages[0].content += '\n\nReturn ONLY valid JSON. Start with { and end with }. No markdown.';
  }

  const resp = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${keys.openai}`,
    },
    body: JSON.stringify(body),
  });

  const data = await resp.json();
  if (data.error) throw new Error(`OpenAI ${modelId}: ${data.error.message}`);

  return {
    content: data.choices?.[0]?.message?.content || '',
    inputTokens: data.usage?.prompt_tokens || 0,
    outputTokens: data.usage?.completion_tokens || 0,
  };
}

async function callGemini(modelId, systemPrompt, messages) {
  const contents = messages.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  const body = {
    system_instruction: { parts: [{ text: systemPrompt }] },
    contents,
    generationConfig: {
      temperature: 0.5,
      maxOutputTokens: 4096,
      responseMimeType: 'application/json',
    },
  };

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${keys.gemini}`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data = await resp.json();
  if (data.error) throw new Error(`Gemini ${modelId}: ${data.error.message}`);

  return {
    content: data.candidates?.[0]?.content?.parts?.[0]?.text || '',
    inputTokens: data.usageMetadata?.promptTokenCount || 0,
    outputTokens: data.usageMetadata?.candidatesTokenCount || 0,
  };
}

async function callAnthropic(modelId, systemPrompt, messages) {
  // Use assistant prefill to force JSON output (Claude best practice)
  const formattedMessages = [
    ...messages.map(m => ({ role: m.role, content: m.content })),
    { role: 'assistant', content: '{' },
  ];

  const body = {
    model: modelId,
    max_tokens: 8192,
    temperature: 0.5,
    system: systemPrompt + '\n\nIMPORTANT: Return ONLY valid JSON. No markdown, no code blocks, no preamble text. Start directly with { and end with }.',
    messages: formattedMessages,
  };

  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': keys.anthropic,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(body),
  });

  const data = await resp.json();
  if (data.error) throw new Error(`Anthropic ${modelId}: ${data.error?.message || JSON.stringify(data.error)}`);

  // Prepend the prefilled '{' back to reconstruct complete JSON
  const rawContent = data.content?.[0]?.text || '';
  const content = '{' + rawContent;

  return {
    content,
    inputTokens: data.usage?.input_tokens || 0,
    outputTokens: data.usage?.output_tokens || 0,
  };
}

async function callDeepSeek(modelId, systemPrompt, messages) {
  const body = {
    model: modelId,
    messages: [
      { role: 'system', content: systemPrompt },
      ...messages.map(m => ({ role: m.role, content: m.content })),
    ],
    temperature: 0.5,
    max_tokens: 4096,
    response_format: { type: 'json_object' },
  };

  const resp = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${keys.deepseek}`,
    },
    body: JSON.stringify(body),
  });

  const data = await resp.json();
  if (data.error) throw new Error(`DeepSeek ${modelId}: ${data.error.message}`);

  return {
    content: data.choices?.[0]?.message?.content || '',
    inputTokens: data.usage?.prompt_tokens || 0,
    outputTokens: data.usage?.completion_tokens || 0,
  };
}

// ============================================================
// 6. ENHANCED QUALITY EVALUATOR
// ============================================================
function evaluateQuality(content, model) {
  const result = {
    jsonValid: false,
    jsonParsed: null,
    correctionCount: 0,
    patternCount: 0,
    hasStrengths: false,
    hasGrade: false,
    gradeValue: '',
    hasLevelDetails: false,
    hasEncouragement: false,
    hasKorean: false,
    scoreDifferentiation: 0,
    // Enhanced metrics
    avgCorrectionLength: 0,       // avg chars per correction explanation
    hasIntended: false,            // corrections include "intended" field
    hasPracticeMethod: false,      // patterns include practiceMethod
    hasExampleSentences: false,    // patterns include exampleSentences
    hasSummary: false,             // levelDetails has summary
    koreanCharCount: 0,            // total Korean characters
    correctionCategories: [],      // unique categories used
    qualityScore: 0,
  };

  // Extract JSON
  let json = null;
  try {
    json = JSON.parse(content);
  } catch {
    const match = content.match(/```(?:json)?\s*([\s\S]*?)```/) || content.match(/(\{[\s\S]*\})/);
    if (match) {
      try { json = JSON.parse(match[1].trim()); } catch { /* fail */ }
    }
  }

  if (!json) return result;

  result.jsonValid = true;
  result.jsonParsed = json;

  // Korean character count
  const allText = JSON.stringify(json);
  const koreanChars = allText.match(/[\uAC00-\uD7AF]/g) || [];
  result.koreanCharCount = koreanChars.length;
  result.hasKorean = result.koreanCharCount > 20; // meaningful Korean content

  // Corrections depth
  if (Array.isArray(json.corrections)) {
    result.correctionCount = json.corrections.length;
    const explanations = json.corrections.map(c => c.explanation || '').filter(Boolean);
    result.avgCorrectionLength = explanations.length > 0
      ? Math.round(explanations.reduce((a, b) => a + b.length, 0) / explanations.length)
      : 0;
    result.hasIntended = json.corrections.some(c => c.intended && c.intended.length > 5);
    result.correctionCategories = [...new Set(json.corrections.map(c => c.category).filter(Boolean))];
  }

  // Patterns depth
  if (Array.isArray(json.patterns)) {
    result.patternCount = json.patterns.length;
    result.hasPracticeMethod = json.patterns.some(p => p.practiceMethod && p.practiceMethod.length > 10);
    result.hasExampleSentences = json.patterns.some(p => Array.isArray(p.exampleSentences) && p.exampleSentences.length > 0);
  }

  // Strengths
  result.hasStrengths = Array.isArray(json.strengths) && json.strengths.length > 0;

  // Grade
  const validGrades = ['K', '1-2', '3-4', '5-6', '7-8', '9-10', '11-12', 'College'];
  result.hasGrade = validGrades.includes(json.evaluatedGrade);
  result.gradeValue = json.evaluatedGrade || '';

  // Level Details
  if (json.levelDetails) {
    const ld = json.levelDetails;
    result.hasLevelDetails = typeof ld.grammar === 'number' && typeof ld.vocabulary === 'number';
    result.hasSummary = typeof ld.summary === 'string' && ld.summary.length > 10;

    if (result.hasLevelDetails) {
      const scores = [ld.grammar, ld.vocabulary, ld.fluency, ld.comprehension].filter(s => typeof s === 'number');
      if (scores.length >= 4) {
        const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
        const variance = scores.reduce((a, b) => a + (b - mean) ** 2, 0) / scores.length;
        result.scoreDifferentiation = Math.sqrt(variance);
      }
    }
  }

  // Encouragement
  result.hasEncouragement = typeof json.encouragement === 'string' && json.encouragement.length > 10;

  // ============================================================
  // QUALITY SCORE (0-100) - weighted by importance for TapTalk
  // ============================================================
  let score = 0;

  // JSON validity (must-have)
  if (result.jsonValid) score += 10;

  // Corrections (most important - 30pts max)
  score += Math.min(10, result.correctionCount * 2);        // count (5+ corrections = 10pts)
  if (result.hasIntended) score += 5;                        // intended field present
  if (result.avgCorrectionLength > 30) score += 5;           // detailed explanations
  if (result.correctionCategories.length >= 2) score += 5;   // variety in categories
  if (result.avgCorrectionLength > 60) score += 5;           // very detailed

  // Patterns (15pts max)
  score += Math.min(5, result.patternCount * 2);             // count
  if (result.hasPracticeMethod) score += 5;                  // concrete practice
  if (result.hasExampleSentences) score += 5;                // examples provided

  // Evaluation accuracy (20pts max)
  if (result.hasGrade) score += 5;
  if (result.hasLevelDetails) score += 5;
  if (result.hasSummary) score += 5;
  if (result.scoreDifferentiation > 5) score += 3;           // scores not clustered
  if (result.scoreDifferentiation > 10) score += 2;          // good differentiation

  // Korean localization (15pts max)
  if (result.hasKorean) score += 5;
  if (result.koreanCharCount > 100) score += 5;              // substantial Korean
  if (result.koreanCharCount > 300) score += 5;              // rich Korean content

  // Other fields (10pts max)
  if (result.hasStrengths) score += 5;
  if (result.hasEncouragement) score += 5;

  result.qualityScore = Math.min(100, score);
  return result;
}

// ============================================================
// 7. BENCHMARK RUNNER
// ============================================================
async function runBenchmark(model) {
  const caller = { openai: callOpenAI, gemini: callGemini, anthropic: callAnthropic, deepseek: callDeepSeek }[model.provider];
  if (!caller) return { model, success: false, error: 'Unknown provider' };
  if (!keys[model.provider]) return { model, success: false, error: 'API key not configured' };

  const startTime = Date.now();
  try {
    const response = await caller(model.id, SYSTEM_PROMPT, TEST_CONVERSATION);
    const elapsed = Date.now() - startTime;
    const quality = evaluateQuality(response.content, model);

    const inputCost = (response.inputTokens / 1_000_000) * model.inputPrice;
    const outputCost = (response.outputTokens / 1_000_000) * model.outputPrice;

    let scores = null;
    if (quality.jsonParsed?.levelDetails) {
      const ld = quality.jsonParsed.levelDetails;
      scores = { grammar: ld.grammar, vocabulary: ld.vocabulary, fluency: ld.fluency, comprehension: ld.comprehension };
    }

    return {
      model, success: true, elapsed,
      inputTokens: response.inputTokens,
      outputTokens: response.outputTokens,
      cost: inputCost + outputCost,
      costBreakdown: { input: inputCost, output: outputCost },
      quality, scores, grade: quality.gradeValue,
      rawContent: response.content,
    };
  } catch (error) {
    return { model, success: false, elapsed: Date.now() - startTime, error: error.message };
  }
}

// ============================================================
// 8. MAIN
// ============================================================
async function main() {
  console.log('='.repeat(100));
  console.log('  TapTalk AI Benchmark v2 - Production-Quality Evaluation');
  console.log('  Date:', new Date().toISOString().slice(0, 19));
  console.log('  Test data: 12 messages, 6 student responses (50-200+ chars each)');
  console.log('  Student profile: 14yr Korean student, intermediate level');
  console.log('='.repeat(100));
  console.log();

  // Check keys
  console.log('[API Keys]');
  for (const [k, v] of Object.entries(keys)) {
    console.log(`  ${k.padEnd(12)}: ${v ? 'OK' : 'MISSING'}`);
  }
  console.log();

  const availableModels = MODELS.filter(m => keys[m.provider]);
  console.log(`[Testing ${availableModels.length} models with production-quality prompts...]\n`);

  // Run grouped by provider (parallel across providers, sequential within)
  const byProvider = {};
  for (const m of availableModels) {
    if (!byProvider[m.provider]) byProvider[m.provider] = [];
    byProvider[m.provider].push(m);
  }

  const results = [];
  const providerPromises = Object.entries(byProvider).map(async ([, models]) => {
    const providerResults = [];
    for (const model of models) {
      process.stdout.write(`  Testing ${model.name.padEnd(22)} ... `);
      const result = await runBenchmark(model);
      if (result.success) {
        console.log(`OK  ${(result.elapsed / 1000).toFixed(1)}s  Q:${result.quality.qualityScore}/100  Grade:${result.grade || '-'}  Corrections:${result.quality.correctionCount}  Korean:${result.quality.koreanCharCount}chars`);
      } else {
        console.log(`FAIL: ${result.error?.slice(0, 60)}`);
      }
      providerResults.push(result);
      await new Promise(r => setTimeout(r, 500));
    }
    return providerResults;
  });

  const allResults = await Promise.all(providerPromises);
  for (const pr of allResults) results.push(...pr);

  // Sort by quality
  results.sort((a, b) => (b.quality?.qualityScore || 0) - (a.quality?.qualityScore || 0));

  const success = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  // ============================================================
  // 9. RESULTS
  // ============================================================
  console.log('\n' + '='.repeat(130));
  console.log('  BENCHMARK RESULTS');
  console.log('='.repeat(130));

  // Main table
  const h = ['#', 'Model', 'Provider', 'Time', 'InTok', 'OutTok', 'Cost', 'Quality', 'Grade', 'Corr', 'KR', 'Gram', 'Vocab', 'Flu', 'Comp', 'CorrDetail'];
  const w = [3, 24, 10, 7, 7, 7, 9, 8, 7, 5, 6, 5, 6, 5, 5, 10];
  console.log('\n' + h.map((x, i) => x.padEnd(w[i])).join(''));
  console.log('-'.repeat(130));

  results.forEach((r, i) => {
    const row = [
      `${i + 1}`,
      r.model.name,
      r.model.provider,
      r.success ? `${(r.elapsed / 1000).toFixed(1)}s` : '-',
      r.success ? `${r.inputTokens}` : '-',
      r.success ? `${r.outputTokens}` : '-',
      r.success ? `$${r.cost.toFixed(4)}` : '-',
      r.success ? `${r.quality.qualityScore}/100` : '-',
      r.success ? (r.grade || '-') : '-',
      r.success ? `${r.quality.correctionCount}` : '-',
      r.success ? `${r.quality.koreanCharCount}` : '-',
      r.scores ? `${r.scores.grammar}` : '-',
      r.scores ? `${r.scores.vocabulary}` : '-',
      r.scores ? `${r.scores.fluency}` : '-',
      r.scores ? `${r.scores.comprehension}` : '-',
      r.success ? `avg${r.quality.avgCorrectionLength}ch` : '-',
    ];
    console.log(row.map((v, j) => String(v).padEnd(w[j])).join(''));
  });

  // Rankings
  console.log('\n' + '='.repeat(80));
  console.log('  DETAILED RANKINGS');
  console.log('='.repeat(80));

  console.log('\n[QUALITY (best first)]');
  success.sort((a, b) => b.quality.qualityScore - a.quality.qualityScore);
  success.forEach((r, i) => {
    console.log(`  ${i + 1}. ${r.model.name.padEnd(22)} Q:${r.quality.qualityScore}/100  Corrections:${r.quality.correctionCount}  Patterns:${r.quality.patternCount}  Korean:${r.quality.koreanCharCount}ch  IntendedField:${r.quality.hasIntended ? 'Y' : 'N'}  PracticeMethod:${r.quality.hasPracticeMethod ? 'Y' : 'N'}`);
  });

  console.log('\n[COST (cheapest first)]');
  const byCost = [...success].sort((a, b) => a.cost - b.cost);
  byCost.forEach((r, i) => {
    console.log(`  ${i + 1}. ${r.model.name.padEnd(22)} $${r.cost.toFixed(6)}  (In:$${r.costBreakdown.input.toFixed(6)} Out:$${r.costBreakdown.output.toFixed(6)})`);
  });

  console.log('\n[SPEED (fastest first)]');
  const bySpeed = [...success].sort((a, b) => a.elapsed - b.elapsed);
  bySpeed.forEach((r, i) => {
    console.log(`  ${i + 1}. ${r.model.name.padEnd(22)} ${(r.elapsed / 1000).toFixed(2)}s`);
  });

  console.log('\n[VALUE = Quality / Cost (higher = better)]');
  const byValue = [...success].map(r => ({
    ...r,
    value: r.cost > 0 ? r.quality.qualityScore / (r.cost * 10000) : r.quality.qualityScore * 100
  })).sort((a, b) => b.value - a.value);
  byValue.forEach((r, i) => {
    console.log(`  ${i + 1}. ${r.model.name.padEnd(22)} Value:${r.value.toFixed(1)}  (Q:${r.quality.qualityScore} / $${r.cost.toFixed(4)})`);
  });

  // Grade consensus
  console.log('\n[GRADE EVALUATION CONSENSUS]');
  const gradeMap = {};
  success.forEach(r => {
    if (r.grade) {
      if (!gradeMap[r.grade]) gradeMap[r.grade] = [];
      gradeMap[r.grade].push(r.model.name);
    }
  });
  for (const [grade, models] of Object.entries(gradeMap)) {
    console.log(`  Grade ${grade}: ${models.join(', ')}`);
  }

  // Score comparison
  console.log('\n[SCORE DETAILS]');
  success.forEach(r => {
    if (r.scores) {
      const ld = r.quality.jsonParsed?.levelDetails;
      console.log(`  ${r.model.name}: G:${r.scores.grammar} V:${r.scores.vocabulary} F:${r.scores.fluency} C:${r.scores.comprehension}  Grade:${r.grade}  StdDev:${r.quality.scoreDifferentiation.toFixed(1)}  Summary: ${(ld?.summary || '-').slice(0, 80)}`);
    }
  });

  // Sample corrections comparison
  console.log('\n[CORRECTION SAMPLES (first 2 per model)]');
  success.forEach(r => {
    if (r.quality.jsonParsed?.corrections?.length > 0) {
      console.log(`\n  --- ${r.model.name} (${r.quality.correctionCount} total) ---`);
      r.quality.jsonParsed.corrections.slice(0, 2).forEach((c, i) => {
        console.log(`    ${i + 1}. [${c.category || '?'}] "${(c.original || '').slice(0, 60)}" -> "${(c.corrected || '').slice(0, 60)}"`);
        if (c.intended) console.log(`       Intended: ${(c.intended || '').slice(0, 80)}`);
        if (c.explanation) console.log(`       Why: ${(c.explanation || '').slice(0, 100)}`);
      });
    }
  });

  // Failed
  if (failed.length > 0) {
    console.log('\n[FAILED MODELS]');
    failed.forEach(r => console.log(`  ${r.model.name}: ${r.error}`));
  }

  // Recommendations
  console.log('\n' + '='.repeat(80));
  console.log('  RECOMMENDATIONS');
  console.log('='.repeat(80));

  if (success.length > 0) {
    const bestQ = success[0];
    const bestSpeed = bySpeed[0];
    const bestVal = byValue[0];
    const cheapest = byCost[0];

    console.log(`\n  Best Quality:     ${bestQ.model.name} (Q:${bestQ.quality.qualityScore}, $${bestQ.cost.toFixed(4)}, ${(bestQ.elapsed/1000).toFixed(1)}s)`);
    console.log(`  Fastest:          ${bestSpeed.model.name} (${(bestSpeed.elapsed/1000).toFixed(1)}s, Q:${bestSpeed.quality.qualityScore})`);
    console.log(`  Best Value:       ${bestVal.model.name} (Q:${bestVal.quality.qualityScore}, $${bestVal.cost.toFixed(4)})`);
    console.log(`  Cheapest:         ${cheapest.model.name} ($${cheapest.cost.toFixed(6)})`);

    // Analysis mode pick (quality >= 60, then cheapest)
    const analysisPick = success.filter(r => r.quality.qualityScore >= 60).sort((a, b) => a.cost - b.cost);
    if (analysisPick.length > 0) {
      console.log(`\n  -> Analysis Mode:     ${analysisPick[0].model.name} (Q:${analysisPick[0].quality.qualityScore}, $${analysisPick[0].cost.toFixed(4)})`);
    }
    // Conversation mode pick (fastest with valid JSON)
    const convPick = success.filter(r => r.quality.jsonValid).sort((a, b) => a.elapsed - b.elapsed);
    if (convPick.length > 0) {
      console.log(`  -> Conversation Mode: ${convPick[0].model.name} (${(convPick[0].elapsed/1000).toFixed(1)}s, $${convPick[0].cost.toFixed(4)})`);
    }
  }

  console.log('\n' + '='.repeat(80));

  // Save JSON
  const jsonOutput = {
    version: 2,
    timestamp: new Date().toISOString(),
    testProfile: { age: 14, level: 'intermediate', messageCount: TEST_CONVERSATION.length, studentMessages: TEST_CONVERSATION.filter(m => m.role === 'user').length },
    results: results.map(r => ({
      model: r.model.name,
      modelId: r.model.id,
      provider: r.model.provider,
      tier: r.model.tier,
      inputPricePerM: r.model.inputPrice,
      outputPricePerM: r.model.outputPrice,
      success: r.success,
      elapsed: r.elapsed,
      inputTokens: r.inputTokens,
      outputTokens: r.outputTokens,
      cost: r.cost,
      qualityScore: r.quality?.qualityScore,
      jsonValid: r.quality?.jsonValid,
      grade: r.grade,
      scores: r.scores,
      correctionCount: r.quality?.correctionCount,
      avgCorrectionLength: r.quality?.avgCorrectionLength,
      patternCount: r.quality?.patternCount,
      hasIntended: r.quality?.hasIntended,
      hasPracticeMethod: r.quality?.hasPracticeMethod,
      hasExampleSentences: r.quality?.hasExampleSentences,
      koreanCharCount: r.quality?.koreanCharCount,
      scoreDifferentiation: r.quality?.scoreDifferentiation,
      correctionCategories: r.quality?.correctionCategories,
      error: r.error,
      // Save first 3 corrections for review
      sampleCorrections: r.quality?.jsonParsed?.corrections?.slice(0, 3) || [],
      samplePatterns: r.quality?.jsonParsed?.patterns?.slice(0, 2) || [],
      encouragement: r.quality?.jsonParsed?.encouragement || '',
      levelSummary: r.quality?.jsonParsed?.levelDetails?.summary || '',
    })),
  };

  const outputPath = resolve(__dirname, 'benchmark-results-v2.json');
  writeFileSync(outputPath, JSON.stringify(jsonOutput, null, 2));
  console.log(`\nResults saved: ${outputPath}`);
}

main().catch(console.error);
