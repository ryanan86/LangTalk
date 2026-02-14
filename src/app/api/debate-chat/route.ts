import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { checkRateLimit, getRateLimitId, RATE_LIMITS } from '@/lib/rateLimit';
import { getDebatePersona, moderator } from '@/lib/debatePersonas';
import { DebateMessage, DebatePhase, DebateTopic, DebateTeam, DebateAnalysis } from '@/lib/debateTypes';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface DebateChatRequest {
  messages: DebateMessage[];
  topic: DebateTopic;
  currentSpeakerId: string;
  phase: DebatePhase;
  userTeam: DebateTeam;
  language?: 'ko' | 'en';
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

    const {
      messages,
      topic,
      currentSpeakerId,
      phase,
      userTeam,
      language = 'en',
    }: DebateChatRequest = await request.json();

    const isKorean = language === 'ko';

    // Get the persona for the current speaker
    const persona = getDebatePersona(currentSpeakerId);
    if (!persona) {
      return NextResponse.json({ error: 'Invalid speaker' }, { status: 400 });
    }

    // Build the system prompt based on phase and role
    let systemPrompt = persona.systemPrompt;

    // Add phase-specific instructions
    if (persona.role === 'moderator') {
      systemPrompt = buildModeratorPrompt(phase, topic, userTeam, isKorean);
    } else {
      // Determine which team this debater is on
      const debaterTeam = getDebaterTeam(currentSpeakerId, userTeam);
      systemPrompt = buildDebaterPrompt(persona.systemPrompt, phase, topic, debaterTeam, isKorean);
    }

    // Format messages for OpenAI
    const openaiMessages = [
      { role: 'system' as const, content: systemPrompt },
      ...messages.map((msg) => ({
        role: (msg.role === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
        content: `[${msg.speakerName}${msg.team !== 'moderator' ? ` (${msg.team === 'pro' ? 'Pro' : 'Con'})` : ''}]: ${msg.content}`,
      })),
    ];

    // Determine max tokens based on phase
    const maxTokens = phase === 'opening' || phase === 'closing' ? 200 : 150;

    const response = await openai.chat.completions.create({
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

// Helper function to determine debater's team
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function getDebaterTeam(_debaterId: string, userTeam: DebateTeam): DebateTeam {
  // The actual team assignment happens on the frontend and is passed to this API
  return userTeam;
}

function buildModeratorPrompt(
  phase: DebatePhase,
  topic: DebateTopic,
  userTeam: DebateTeam,
  isKorean: boolean
): string {
  const basePrompt = moderator.systemPrompt;

  const phaseInstructions: Record<DebatePhase, string> = {
    topic: `You are introducing the debate topic. Present the topic clearly and explain both sides briefly.

TOPIC: "${topic.title.en}"
${topic.description.en}

Introduce this topic professionally. Mention what the Pro side will argue and what the Con side will argue. Keep it to 2-3 sentences.`,

    team: `You are announcing the team assignments. The user has been assigned to the ${userTeam === 'pro' ? 'Pro (supporting)' : 'Con (opposing)'} team.

Announce the teams warmly and encourage everyone. Keep it brief - 1-2 sentences.`,

    opening: `It's time for opening statements. Guide the speakers through their opening arguments.

Current phase: Opening Statements
Call on the current speaker to give their opening argument. Keep your transition brief - just one sentence to introduce the speaker.`,

    debate: `The main debate is underway. Facilitate the discussion, ask probing questions, and ensure fair speaking time.

Keep your interjections brief - only speak to:
1. Transition between speakers
2. Ask a clarifying question
3. Redirect if the debate goes off-topic

Maximum 1-2 sentences.`,

    closing: `It's time for closing arguments. Guide each speaker to deliver their final points.

Call on the current speaker for their closing statement. Keep your transition brief - just one sentence.`,

    analysis: `The debate has concluded. Provide a fair summary and constructive feedback.

Summarize the key points from both sides. Highlight strong arguments from each team. Be encouraging about the user's participation.`,

    summary: `Wrap up the debate session with final thoughts and encouragement.

Thank all participants and highlight the most memorable moments. Encourage continued practice.`,
  };

  return `${basePrompt}

${phaseInstructions[phase]}

IMPORTANT: Always respond in ENGLISH. ${isKorean ? 'The user understands Korean but practice should be in English.' : ''}`;
}

function buildDebaterPrompt(
  basePrompt: string,
  phase: DebatePhase,
  topic: DebateTopic,
  team: DebateTeam,
  isKorean: boolean
): string {
  const teamPosition = team === 'pro' ? 'SUPPORTING' : 'OPPOSING';
  const teamStance = team === 'pro'
    ? 'You believe this statement is TRUE and beneficial.'
    : 'You believe this statement is FALSE or harmful.';

  const phaseInstructions: Record<DebatePhase, string> = {
    topic: '', // Debaters don't speak during topic reveal
    team: '', // Debaters don't speak during team assignment

    opening: `Give your OPENING STATEMENT.

Present your main argument clearly. State your position and give 1-2 strong reasons. Keep it focused and confident.`,

    debate: `You are in the MAIN DEBATE.

Respond to previous arguments, defend your position, or make new points. You can:
- Counter an opponent's argument
- Support your teammate's point
- Introduce a new perspective

Keep responses sharp and concise - this is a fast-paced debate.`,

    closing: `Give your CLOSING ARGUMENT.

Summarize your strongest points. Make a final appeal. End with a memorable statement that reinforces your position.`,

    analysis: '', // Debaters don't speak during analysis
    summary: '', // Debaters don't speak during summary
  };

  if (!phaseInstructions[phase]) {
    return basePrompt;
  }

  return `${basePrompt}

DEBATE CONTEXT:
- TOPIC: "${topic.title.en}"
- YOUR POSITION: ${teamPosition} this statement
- ${teamStance}

${phaseInstructions[phase]}

RULES:
1. ALWAYS argue from your team's perspective (${team === 'pro' ? 'Pro/Supporting' : 'Con/Opposing'})
2. Keep responses to 2-3 sentences maximum
3. Be persuasive but respectful
4. Respond in ENGLISH only

${isKorean ? 'Note: The user understands Korean but this debate is conducted in English for practice.' : ''}`;
}

// Separate endpoint for generating debate analysis
export async function PUT(request: NextRequest) {
  try {
    // Auth check
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Rate limit
    const rateLimitResult = checkRateLimit(getRateLimitId(session.user.email, request), RATE_LIMITS.ai);
    if (rateLimitResult) return rateLimitResult;

    const {
      messages,
      topic,
      userTeam,
      language = 'en',
    } = await request.json();

    const isKorean = language === 'ko';

    const analysisPrompt = `You are an English debate coach analyzing a practice debate session.

DEBATE TOPIC: "${topic.title.en}"
USER'S TEAM: ${userTeam === 'pro' ? 'Pro (Supporting)' : 'Con (Opposing)'}

Analyze the debate conversation below and provide feedback in JSON format.
${isKorean ? 'Write strengths, improvements, and feedback in KOREAN. Grammar corrections should show English sentences but explain in Korean.' : ''}

CONVERSATION:
${messages.map((m: DebateMessage) => `[${m.speakerName} - ${m.team}]: ${m.content}`).join('\n')}

Return ONLY valid JSON in this exact format:
{
  "userPerformance": {
    "strengths": ["${isKorean ? '잘한 점 1' : 'strength 1'}", "${isKorean ? '잘한 점 2' : 'strength 2'}"],
    "improvements": ["${isKorean ? '개선할 점 1' : 'improvement 1'}", "${isKorean ? '개선할 점 2' : 'improvement 2'}"],
    "grammarCorrections": [
      {
        "original": "what they said wrong",
        "corrected": "correct version",
        "explanation": "${isKorean ? '한국어로 설명' : 'explanation in English'}"
      }
    ]
  },
  "debateSummary": {
    "proPoints": ["main pro argument 1", "main pro argument 2"],
    "conPoints": ["main con argument 1", "main con argument 2"],
    "keyMoments": ["${isKorean ? '주요 순간 1' : 'key moment 1'}"]
  },
  "expressionsToLearn": ["useful phrase 1", "useful phrase 2", "useful phrase 3"],
  "overallFeedback": "${isKorean ? '전반적인 피드백 (한국어)' : 'overall feedback in English'}"
}`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 1500,
      temperature: 0.5,
      messages: [
        { role: 'system', content: analysisPrompt },
      ],
      response_format: { type: 'json_object' as const },
    });

    const analysisText = response.choices[0]?.message?.content || '';

    try {
      const analysis: DebateAnalysis = JSON.parse(analysisText);
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
