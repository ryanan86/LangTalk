import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { checkRateLimit, getRateLimitId, RATE_LIMITS } from '@/lib/rateLimit';
import { getDebatePersona, moderator } from '@/lib/debatePersonas';
import { DebateMessage, DebatePhase, DebateTopic, DebateTeam } from '@/lib/debateTypes';

let _openai: OpenAI | null = null;
function getOpenAI() {
  if (!_openai) _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return _openai;
}

interface DebateChatRequest {
  messages: DebateMessage[];
  topic: DebateTopic;
  currentSpeakerId: string;
  speakerTeam: DebateTeam | 'moderator'; // Team is now passed from frontend
  phase: DebatePhase;
  roundIndex?: number;
  userTeam: DebateTeam;
  language?: 'ko' | 'en';
}

// POST: Generate AI debate response
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const rateLimitResult = checkRateLimit(getRateLimitId(session.user.email, request), RATE_LIMITS.ai);
    if (rateLimitResult) return rateLimitResult;

    const {
      messages,
      topic,
      currentSpeakerId,
      speakerTeam,
      phase,
      roundIndex = 0,
      userTeam,
      language = 'en',
    }: DebateChatRequest = await request.json();

    const isKorean = language === 'ko';

    const persona = getDebatePersona(currentSpeakerId);
    if (!persona) {
      return NextResponse.json({ error: 'Invalid speaker' }, { status: 400 });
    }

    let systemPrompt: string;

    if (persona.role === 'moderator') {
      systemPrompt = buildModeratorPrompt(phase, topic, userTeam, roundIndex, isKorean);
    } else {
      // Use the team passed from frontend (fixes the critical bug)
      const actualTeam = speakerTeam === 'moderator' ? userTeam : speakerTeam as DebateTeam;
      systemPrompt = buildDebaterPrompt(persona.systemPrompt, phase, topic, actualTeam, roundIndex, isKorean);
    }

    // Format conversation history for context
    const openaiMessages = [
      { role: 'system' as const, content: systemPrompt },
      ...messages.slice(-10).map((msg) => ({
        role: (msg.role === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
        content: `[${msg.speakerName} (${msg.team === 'pro' ? 'PRO' : msg.team === 'con' ? 'CON' : 'Moderator'})]: ${msg.content}`,
      })),
    ];

    // More tokens for opening/closing (2min turns), less for rebuttals (90s)
    const maxTokens = (phase === 'opening' || phase === 'closing') ? 350 : 250;

    const response = await getOpenAI().chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: maxTokens,
      temperature: 0.8,
      presence_penalty: 0.6,
      frequency_penalty: 0.3,
      messages: openaiMessages,
    });

    const assistantMessage = response.choices[0]?.message?.content || '';

    return NextResponse.json({ message: assistantMessage });
  } catch (error) {
    console.error('Debate chat error:', error);
    return NextResponse.json(
      { error: 'Failed to get response' },
      { status: 500 }
    );
  }
}

function buildModeratorPrompt(
  phase: DebatePhase,
  topic: DebateTopic,
  userTeam: DebateTeam,
  roundIndex: number,
  isKorean: boolean
): string {
  const basePrompt = moderator.systemPrompt;

  const phaseInstructions: Record<string, string> = {
    preparation: `You are introducing the debate topic to all participants.

TOPIC: "${topic.title.en}"
${topic.description.en}

Introduce this topic professionally. Explain:
1. What the Pro team will argue (supporting the statement)
2. What the Con team will argue (opposing the statement)
3. Encourage all participants to prepare their arguments

The user is on the ${userTeam === 'pro' ? 'PRO (Supporting)' : 'CON (Opposing)'} team.

Keep it to 3-4 sentences. Be warm and encouraging.`,

    opening: `Opening Statements phase is beginning.

Briefly announce that we're starting opening statements. Call on the next speaker to present their position. Keep your transition to 1-2 sentences.`,

    rebuttal: `Rebuttal Round ${roundIndex + 1} is underway.

${roundIndex === 0
  ? 'Announce that we\'re moving to rebuttals. Each speaker will respond to the opposing team\'s arguments.'
  : 'Announce Round 2 of rebuttals. Speakers should address new points raised in Round 1.'}

Keep your transition to 1-2 sentences. Be energetic and maintain momentum.`,

    closing: `It's time for closing arguments.

Announce that each team will now deliver their final arguments. This is their last chance to persuade. Keep your transition to 1-2 sentences.`,

    analysis: `The debate has concluded. You will now summarize the key moments.

Briefly acknowledge that both teams made excellent points. Keep it to 2 sentences - the detailed analysis will follow separately.`,

    result: '',
  };

  const instruction = phaseInstructions[phase] || '';

  return `${basePrompt}

${instruction}

IMPORTANT: Always respond in ENGLISH. ${isKorean ? 'The user understands Korean but practice should be in English.' : ''}
Keep responses concise and professional.`;
}

function buildDebaterPrompt(
  basePrompt: string,
  phase: DebatePhase,
  topic: DebateTopic,
  team: DebateTeam,
  roundIndex: number,
  isKorean: boolean
): string {
  const teamPosition = team === 'pro' ? 'SUPPORTING (PRO)' : 'OPPOSING (CON)';
  const teamStance = team === 'pro'
    ? 'You firmly believe this statement is TRUE and beneficial. Argue FOR it.'
    : 'You firmly believe this statement is FALSE or harmful. Argue AGAINST it.';

  const phaseInstructions: Record<string, string> = {
    preparation: '',

    opening: `Give your OPENING STATEMENT (you have about 2 minutes worth of content).

Present your core argument clearly and persuasively:
1. State your position firmly
2. Give 2-3 strong reasons with brief supporting evidence
3. Preview what you'll argue in the debate

Be confident and clear. Use debate language like "We firmly believe...", "Our position is...", "The evidence clearly shows..."

Aim for 4-6 sentences.`,

    rebuttal: roundIndex === 0
      ? `Give your REBUTTAL (Round 1 - you have about 90 seconds worth of content).

Directly address the opposing team's arguments:
1. Identify their weakest point and dismantle it
2. Reinforce your team's strongest argument
3. Introduce a new angle they haven't considered

Use rebuttal language like "The opposing team claims... however...", "That argument falls apart because...", "What they failed to mention is..."

Aim for 3-4 sentences. Be sharp and direct.`
      : `Give your REBUTTAL (Round 2 - you have about 90 seconds worth of content).

This is the second round of rebuttals. Build on the debate so far:
1. Address any new points raised in Round 1 rebuttals
2. Strengthen your team's position with additional evidence
3. Point out contradictions in the opponent's arguments

Use language like "Despite their attempts to counter...", "The fundamental flaw in their reasoning is...", "As we've demonstrated..."

Aim for 3-4 sentences. Be decisive.`,

    closing: `Give your CLOSING ARGUMENT (you have about 2 minutes worth of content).

This is your final statement. Make it count:
1. Summarize your team's strongest arguments
2. Explain why your position is more convincing overall
3. Address the key points of contention
4. End with a powerful, memorable conclusion

Use closing language like "Throughout this debate, we have shown...", "The evidence overwhelmingly supports...", "In conclusion..."

Aim for 4-6 sentences. Be compelling and conclusive.`,

    analysis: '',
    result: '',
  };

  const instruction = phaseInstructions[phase] || '';
  if (!instruction) return basePrompt;

  return `${basePrompt}

DEBATE CONTEXT:
- TOPIC: "${topic.title.en}"
- YOUR TEAM: ${teamPosition}
- ${teamStance}

${instruction}

CRITICAL RULES:
1. You MUST argue from your team's perspective (${team === 'pro' ? 'PRO - Supporting' : 'CON - Opposing'}). NEVER switch sides.
2. Be persuasive but respectful
3. Respond in ENGLISH only
4. Stay on topic - every argument must relate to "${topic.title.en}"

${isKorean ? 'Note: The user understands Korean but this debate is conducted in English for practice.' : ''}`;
}

// PUT: Generate debate analysis with scoring
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const rateLimitResult = checkRateLimit(getRateLimitId(session.user.email, request), RATE_LIMITS.ai);
    if (rateLimitResult) return rateLimitResult;

    const {
      messages,
      topic,
      userTeam,
      language = 'en',
    } = await request.json();

    const isKorean = language === 'ko';

    const analysisPrompt = `You are an expert English debate judge and coach analyzing a practice debate.

DEBATE TOPIC: "${topic.title.en}"
USER'S TEAM: ${userTeam === 'pro' ? 'Pro (Supporting)' : 'Con (Opposing)'}

FULL DEBATE TRANSCRIPT:
${messages.map((m: DebateMessage) => `[${m.speakerName} - ${m.team.toUpperCase()} - ${m.phase}]: ${m.content}`).join('\n')}

Score EACH TEAM on 5 criteria (0-20 points each, total 100):
1. clarity: How clear and logical were the arguments?
2. evidence: Quality of evidence and supporting reasoning
3. rebuttal: How effectively did they counter opposing arguments?
4. responsiveness: How well did they address opponent's specific points?
5. language: English proficiency, vocabulary, and persuasiveness

${isKorean ? 'Write ALL feedback text (strengths, improvements, explanations, judgmentReason, overallFeedback) in KOREAN. Grammar corrections: show English sentences but explain in Korean.' : 'Write all feedback in English.'}

Return ONLY valid JSON in this EXACT format:
{
  "winner": "pro" or "con",
  "proScore": { "clarity": 0-20, "evidence": 0-20, "rebuttal": 0-20, "responsiveness": 0-20, "language": 0-20, "total": 0-100 },
  "conScore": { "clarity": 0-20, "evidence": 0-20, "rebuttal": 0-20, "responsiveness": 0-20, "language": 0-20, "total": 0-100 },
  "judgmentReason": "2-3 sentence explanation of why the winning team won",
  "userPerformance": {
    "strengths": ["strength 1", "strength 2", "strength 3"],
    "improvements": ["improvement 1", "improvement 2"],
    "grammarCorrections": [
      { "original": "incorrect sentence from user", "corrected": "corrected version", "explanation": "why this is wrong" }
    ]
  },
  "debateSummary": {
    "proPoints": ["main pro argument 1", "main pro argument 2"],
    "conPoints": ["main con argument 1", "main con argument 2"],
    "keyMoments": ["key moment 1", "key moment 2"]
  },
  "expressionsToLearn": ["useful debate phrase 1", "useful phrase 2", "useful phrase 3", "useful phrase 4", "useful phrase 5"],
  "overallFeedback": "3-4 sentence personalized feedback for the user about their debate performance and English usage"
}

Be fair and objective in scoring. The total for each team must equal the sum of their 5 criteria scores.`;

    const response = await getOpenAI().chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 2000,
      temperature: 0.3,
      messages: [
        { role: 'system', content: analysisPrompt },
      ],
      response_format: { type: 'json_object' as const },
    });

    const analysisText = response.choices[0]?.message?.content || '';

    try {
      const analysis = JSON.parse(analysisText);
      // Ensure totals are calculated correctly
      if (analysis.proScore) {
        analysis.proScore.total = analysis.proScore.clarity + analysis.proScore.evidence +
          analysis.proScore.rebuttal + analysis.proScore.responsiveness + analysis.proScore.language;
      }
      if (analysis.conScore) {
        analysis.conScore.total = analysis.conScore.clarity + analysis.conScore.evidence +
          analysis.conScore.rebuttal + analysis.conScore.responsiveness + analysis.conScore.language;
      }
      return NextResponse.json({ analysis });
    } catch {
      console.error('Failed to parse analysis JSON:', analysisText);
      return NextResponse.json({ analysis: null, raw: analysisText });
    }
  } catch (error) {
    console.error('Debate analysis error:', error);
    return NextResponse.json(
      { error: 'Failed to generate analysis' },
      { status: 500 }
    );
  }
}
