import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { checkRateLimit, getRateLimitId, RATE_LIMITS } from '@/lib/rateLimit';
import { getPersona } from '@/lib/personas';
import { makeRid, nowMs, since, withTimeoutAbort } from '@/lib/perf';
import { speechCoachingAnalyzeSchema, parseBody } from '@/lib/apiSchemas';
import type { SpeechAnalysis } from '@/lib/speechCoachingTypes';

export const preferredRegion = 'icn1';

let _openai: OpenAI | null = null;
function getOpenAI() {
  if (!_openai) _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return _openai;
}

const gemini = process.env.GEMINI_API_KEY
  ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  : null;

function buildSystemPrompt(
  tutorName: string,
  tutorStyle: string,
  sessionNumber: number,
  duration: number,
  focusAreas?: string[],
  hasPreviousAnalysis?: boolean,
): string {
  const focusSection = focusAreas?.length
    ? `\nThe learner's focus areas for this session are: ${focusAreas.join(', ')}. Pay special attention to whether these areas have improved.`
    : '';

  const comparisonSection = hasPreviousAnalysis
    ? `\nThis is session #${sessionNumber}. A previous analysis is provided. You MUST include a "comparisonWithPrevious" field comparing this session to the previous one. Highlight what improved, what still needs work, and give an overall progress assessment.`
    : '\nThis is the first coaching session. Do NOT include "comparisonWithPrevious" in your response.';

  return `You are ${tutorName}, a professional speech and presentation coach. Your coaching style: ${tutorStyle}.

Analyze the following speech/presentation transcript and provide detailed, constructive feedback.

Duration of the speech: ${duration} seconds.${focusSection}${comparisonSection}

You MUST respond with a valid JSON object matching this exact structure:
{
  "overallScore": <number 0-100>,
  "delivery": {
    "wordsPerMinute": <number - calculate from word count and duration>,
    "fillerWords": [{"word": "<filler word>", "count": <number>}],
    "pauseQuality": "<good|too-many|too-few>",
    "pacing": "<too-fast|good|too-slow>"
  },
  "grammar": {
    "corrections": [{"original": "<wrong phrase>", "corrected": "<correct phrase>", "explanation": "<brief explanation>"}],
    "accuracy": <number 0-100>
  },
  "pronunciation": {
    "issues": [{"word": "<word>", "suggestion": "<how to pronounce>", "severity": "<minor|major>"}],
    "clarity": <number 0-100>
  },
  "content": {
    "structure": "<feedback on intro/body/conclusion structure>",
    "coherence": <number 0-100>,
    "vocabulary": "<CEFR level: A1|A2|B1|B2|C1|C2>"
  },
  "strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "improvements": ["<improvement 1>", "<improvement 2>", "<improvement 3>"],
  "focusForNextSession": "<one specific area to focus on next time>",
  "encouragement": "<motivational message in the tutor's style>"${hasPreviousAnalysis ? `,
  "comparisonWithPrevious": {
    "improved": ["<area that improved>"],
    "stillNeedsWork": ["<area still needing work>"],
    "overallProgress": "<summary of progress>"
  }` : ''}
}

Filler words to detect: um, uh, like, you know, so, basically, actually, literally, I mean, right, well, kind of, sort of, anyway, ok so.
WPM calculation: count all words in the transcript, divide by (duration / 60).
Pacing: <100 WPM = too-slow, 100-160 WPM = good, >160 WPM = too-fast.

Be encouraging but honest. Give specific, actionable feedback. Limit grammar corrections to the most important 5. Limit pronunciation issues to the most notable 3.

IMPORTANT: Return ONLY the JSON object, no markdown, no code fences, no extra text.`;
}

function parseAnalysisJSON(text: string): SpeechAnalysis | null {
  try {
    // Strip markdown code fences if present
    const cleaned = text.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();
    const parsed = JSON.parse(cleaned);

    // Basic validation
    if (typeof parsed.overallScore !== 'number' || !parsed.delivery || !parsed.grammar) {
      return null;
    }
    return parsed as SpeechAnalysis;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  const rid = makeRid('speech');
  const t0 = nowMs();
  const timings: Record<string, number> = {};

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const rateLimitResult = checkRateLimit(getRateLimitId(session.user.email, request), RATE_LIMITS.ai);
    if (rateLimitResult) return rateLimitResult;

    const rawBody = await request.json();
    const parsed = parseBody(speechCoachingAnalyzeSchema, rawBody);
    if (!parsed.success) return parsed.response;

    const { transcript, tutorId, duration, sessionNumber, previousAnalysis, focusAreas } = parsed.data;

    const persona = getPersona(tutorId);
    if (!persona) {
      return NextResponse.json({ error: 'Invalid tutor' }, { status: 400 });
    }

    const systemPrompt = buildSystemPrompt(
      persona.name,
      persona.style,
      sessionNumber,
      duration,
      focusAreas,
      !!previousAnalysis,
    );

    const userContent = previousAnalysis
      ? `Here is my speech transcript:\n\n${transcript}\n\nPrevious session analysis:\n${JSON.stringify(previousAnalysis, null, 2)}`
      : `Here is my speech transcript:\n\n${transcript}`;

    let analysisText: string | null = null;

    // Try Gemini first
    if (gemini) {
      try {
        const model = gemini.getGenerativeModel({
          model: 'gemini-2.0-flash',
          systemInstruction: { role: 'user', parts: [{ text: systemPrompt }] },
          generationConfig: {
            temperature: 0.4,
            maxOutputTokens: 4096,
            responseMimeType: 'application/json',
          },
        });

        const result = await withTimeoutAbort(
          () => model.generateContent({
            contents: [{ role: 'user', parts: [{ text: userContent }] }],
          }),
          20000,
          'gemini.speech',
          timings,
        );
        analysisText = result.response.text();
      } catch (e) {
        console.error(`[${rid}] Gemini speech analysis failed, falling back to OpenAI:`, e);
      }
    }

    // OpenAI fallback
    if (!analysisText) {
      try {
        const openai = getOpenAI();
        const result = await withTimeoutAbort(
          async () => {
            const completion = await openai.chat.completions.create({
              model: 'gpt-4o-mini',
              messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userContent },
              ],
              temperature: 0.4,
              max_tokens: 4096,
              response_format: { type: 'json_object' },
            });
            return completion.choices[0]?.message?.content || null;
          },
          20000,
          'openai.speech',
          timings,
        );
        analysisText = result;
      } catch (e) {
        console.error(`[${rid}] OpenAI speech analysis failed:`, e);
      }
    }

    if (!analysisText) {
      return NextResponse.json({ error: 'Analysis failed' }, { status: 500 });
    }

    const analysis = parseAnalysisJSON(analysisText);
    if (!analysis) {
      console.error(`[${rid}] Failed to parse analysis JSON:`, analysisText.slice(0, 500));
      return NextResponse.json({ error: 'Invalid analysis response' }, { status: 500 });
    }

    timings['total.ms'] = since(t0);

    return NextResponse.json({ analysis, _timings: timings });
  } catch (e) {
    console.error(`[${rid}] Speech coaching error:`, e);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
