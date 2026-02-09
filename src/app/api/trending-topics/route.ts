import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { checkRateLimit, getRateLimitId, RATE_LIMITS } from '@/lib/rateLimit';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Trending Debate Topics API
 *
 * Fetches current news/trends and converts them to age-appropriate debate topics
 * using AI to ensure relevance and educational value.
 */

export interface TrendingTopic {
  id: string;
  title: {
    en: string;
    ko: string;
  };
  description: {
    en: string;
    ko: string;
  };
  category: 'technology' | 'environment' | 'society' | 'education' | 'health' | 'culture' | 'economy' | 'science';
  difficulty: 1 | 2 | 3 | 4 | 5;
  ageGroup: 'elementary' | 'middle' | 'high' | 'adult';
  keyVocabulary: string[];
  proArguments: string[];
  conArguments: string[];
  relatedNews: string;
  createdAt: string;
}

export interface TrendingTopicsResponse {
  topics: TrendingTopic[];
  generatedAt: string;
  basedOn: string; // What trend/news this was based on
}

// Age group mapping
const ageGroupFromBirthYear = (birthYear: number): string => {
  const age = new Date().getFullYear() - birthYear;
  if (age <= 12) return 'elementary';
  if (age <= 15) return 'middle';
  if (age <= 18) return 'high';
  return 'adult';
};

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
      birthYear,
      category,      // Optional: filter by category
      count = 3,     // Number of topics to generate
      language = 'en'
    } = body;

    // Input validation
    if (count && (typeof count !== 'number' || count < 1 || count > 10)) {
      return NextResponse.json({ error: 'Count must be between 1 and 10' }, { status: 400 });
    }
    const validCategories = ['technology', 'environment', 'society', 'education', 'health', 'culture', 'economy', 'science'];
    if (category && !validCategories.includes(category)) {
      return NextResponse.json({ error: 'Invalid category' }, { status: 400 });
    }

    const ageGroup = birthYear ? ageGroupFromBirthYear(birthYear) : 'high';
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _language = language; // Reserved for future localization

    // Get current date for context
    const today = new Date().toISOString().split('T')[0];

    const systemPrompt = `You are an educational content creator specializing in debate topics for English learners.

Your task is to create ${count} CURRENT and RELEVANT debate topics based on recent trends and news.

=== REQUIREMENTS ===

1. TIMELINESS: Topics should reflect current events and trends from 2024-2025
   - Reference actual recent news, technologies, or social changes
   - Avoid outdated topics or generic evergreen subjects

2. AGE APPROPRIATENESS for ${ageGroup.toUpperCase()}:
${ageGroup === 'elementary' ? `
   - Simple, relatable topics (school, family, games, environment)
   - Difficulty 1-2
   - Vocabulary: basic to intermediate
   - Example: "Should schools have longer recess time?"
` : ageGroup === 'middle' ? `
   - Topics about social media, technology, school life, environment
   - Difficulty 2-3
   - Vocabulary: intermediate
   - Example: "Is social media good or bad for teenagers?"
` : ageGroup === 'high' ? `
   - Complex societal issues, technology ethics, future careers
   - Difficulty 3-4
   - Vocabulary: intermediate to advanced
   - Example: "Should AI be allowed to make hiring decisions?"
` : `
   - Professional, political, economic, philosophical topics
   - Difficulty 4-5
   - Vocabulary: advanced to academic
   - Example: "Should remote work become the permanent standard?"
`}

3. EDUCATIONAL VALUE:
   - Topics should encourage critical thinking
   - Include vocabulary that challenges but doesn't overwhelm
   - Provide balanced pro/con arguments

4. CATEGORIES to consider:
   - technology: AI, social media, digital life
   - environment: climate change, sustainability
   - society: social issues, community
   - education: learning methods, school policies
   - health: mental health, lifestyle
   - culture: entertainment, traditions
   - economy: jobs, money, business
   - science: discoveries, space, innovation

${category ? `FOCUS ON CATEGORY: ${category}` : 'Mix different categories for variety.'}

=== CURRENT CONTEXT (${today}) ===
Consider recent developments like:
- AI advancements (ChatGPT, AI in daily life)
- Climate change initiatives
- Social media trends and regulations
- Remote work and education changes
- Mental health awareness
- Space exploration news
- Economic changes and job market

=== OUTPUT FORMAT ===
Return ONLY valid JSON with this structure:

{
  "topics": [
    {
      "id": "trend-<timestamp>-<index>",
      "title": {
        "en": "<engaging debate question in English>",
        "ko": "<같은 질문 한국어로>"
      },
      "description": {
        "en": "<2-3 sentences explaining the topic and why it matters now>",
        "ko": "<한국어 설명>"
      },
      "category": "<category>",
      "difficulty": <1-5>,
      "ageGroup": "${ageGroup}",
      "keyVocabulary": ["<word1>", "<word2>", "<word3>", "<word4>", "<word5>"],
      "proArguments": ["<argument for>", "<argument for>"],
      "conArguments": ["<argument against>", "<argument against>"],
      "relatedNews": "<brief mention of related current event>",
      "createdAt": "${today}"
    }
  ],
  "generatedAt": "${new Date().toISOString()}",
  "basedOn": "<what current trends these topics are based on>"
}

Make topics ENGAGING and DEBATABLE - not one-sided questions.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Generate ${count} trending debate topics for ${ageGroup} level students. ${category ? `Focus on ${category} category.` : ''} Today is ${today}.` }
      ],
      temperature: 0.8,  // Higher for creativity
      max_tokens: 2500,
    });

    const content = response.choices[0]?.message?.content || '';

    // Extract JSON
    let result: TrendingTopicsResponse;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found');
      }
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      return NextResponse.json(
        { error: 'Failed to parse topics', raw: content },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      ...result,
      metadata: {
        requestedCount: count,
        ageGroup,
        category: category || 'mixed',
      }
    });

  } catch (error) {
    console.error('Trending Topics error:', error);
    return NextResponse.json(
      { error: 'Failed to generate topics' },
      { status: 500 }
    );
  }
}

// GET method for fetching cached/preset trending topics
export async function GET(request: NextRequest) {
  // Auth check
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const ageGroup = searchParams.get('ageGroup') || 'high';
  const category = searchParams.get('category');

  // Return some preset trending topics (can be updated periodically)
  const presetTopics: TrendingTopic[] = [
    {
      id: 'trend-2024-ai-homework',
      title: {
        en: 'Should students be allowed to use AI tools like ChatGPT for homework?',
        ko: '학생들이 숙제에 ChatGPT 같은 AI 도구를 사용해도 될까요?'
      },
      description: {
        en: 'With AI becoming more powerful, schools are debating whether to allow or ban AI assistance for assignments.',
        ko: 'AI가 더욱 강력해지면서, 학교들은 과제에 AI 도움을 허용할지 금지할지 논의하고 있습니다.'
      },
      category: 'education',
      difficulty: 3,
      ageGroup: 'middle',
      keyVocabulary: ['artificial intelligence', 'academic integrity', 'plagiarism', 'learning tool', 'critical thinking'],
      proArguments: [
        'AI can help students learn more efficiently',
        'Using AI prepares students for future workplaces'
      ],
      conArguments: [
        'Students might not develop their own thinking skills',
        'It could be considered cheating'
      ],
      relatedNews: 'Many schools worldwide are updating their policies on AI use in 2024',
      createdAt: new Date().toISOString().split('T')[0]
    },
    {
      id: 'trend-2024-4day-week',
      title: {
        en: 'Should schools switch to a 4-day school week?',
        ko: '학교가 주 4일제로 전환해야 할까요?'
      },
      description: {
        en: 'Some schools are experimenting with 4-day weeks to reduce stress and costs. Is this a good idea?',
        ko: '일부 학교들이 스트레스와 비용 절감을 위해 주 4일제를 실험하고 있습니다. 좋은 생각일까요?'
      },
      category: 'education',
      difficulty: 2,
      ageGroup: 'elementary',
      keyVocabulary: ['schedule', 'workload', 'efficiency', 'balance', 'experiment'],
      proArguments: [
        'Students and teachers would have more rest',
        'It could save money on transportation and utilities'
      ],
      conArguments: [
        'Students might forget what they learned over long weekends',
        'Parents might have childcare problems'
      ],
      relatedNews: 'Several US states have implemented 4-day school weeks in 2024',
      createdAt: new Date().toISOString().split('T')[0]
    },
    {
      id: 'trend-2024-social-media-age',
      title: {
        en: 'Should there be a minimum age of 16 to use social media?',
        ko: '소셜 미디어 사용 최소 연령을 16세로 해야 할까요?'
      },
      description: {
        en: 'Australia recently proposed banning social media for under-16s. Should other countries follow?',
        ko: '호주가 최근 16세 미만의 소셜 미디어 사용 금지를 제안했습니다. 다른 나라도 따라야 할까요?'
      },
      category: 'society',
      difficulty: 3,
      ageGroup: 'middle',
      keyVocabulary: ['regulation', 'mental health', 'online safety', 'digital literacy', 'freedom'],
      proArguments: [
        'It could protect young people from cyberbullying and addiction',
        'Children could focus more on real-world relationships'
      ],
      conArguments: [
        'It limits freedom of expression',
        'Social media helps young people stay connected'
      ],
      relatedNews: 'Australia proposed social media ban for under-16s in late 2024',
      createdAt: new Date().toISOString().split('T')[0]
    },
    {
      id: 'trend-2024-ev-future',
      title: {
        en: 'Should all cars be electric by 2035?',
        ko: '2035년까지 모든 자동차가 전기차가 되어야 할까요?'
      },
      description: {
        en: 'Many countries are setting deadlines to ban gas cars. Is this realistic and good for the environment?',
        ko: '많은 국가들이 휘발유 차 금지 기한을 정하고 있습니다. 이것이 현실적이고 환경에 좋을까요?'
      },
      category: 'environment',
      difficulty: 4,
      ageGroup: 'high',
      keyVocabulary: ['emissions', 'infrastructure', 'sustainable', 'transition', 'carbon footprint'],
      proArguments: [
        'EVs produce zero direct emissions',
        'Setting deadlines forces innovation'
      ],
      conArguments: [
        'Charging infrastructure is not ready',
        'Battery production has environmental costs'
      ],
      relatedNews: 'EU confirmed 2035 ban on new gas car sales',
      createdAt: new Date().toISOString().split('T')[0]
    },
    {
      id: 'trend-2024-remote-work',
      title: {
        en: 'Should companies require employees to work in the office at least 3 days a week?',
        ko: '회사가 직원들에게 최소 주 3일 출근을 요구해야 할까요?'
      },
      description: {
        en: 'Many companies are ending full remote work. Is the return to office necessary for productivity?',
        ko: '많은 회사들이 완전 재택근무를 종료하고 있습니다. 생산성을 위해 사무실 복귀가 필요할까요?'
      },
      category: 'economy',
      difficulty: 4,
      ageGroup: 'adult',
      keyVocabulary: ['productivity', 'collaboration', 'work-life balance', 'hybrid', 'corporate culture'],
      proArguments: [
        'In-person collaboration improves teamwork',
        'Office presence builds company culture'
      ],
      conArguments: [
        'Remote work improves work-life balance',
        'Forcing office return reduces talent pool'
      ],
      relatedNews: 'Amazon, Google require employees back to office in 2024',
      createdAt: new Date().toISOString().split('T')[0]
    }
  ];

  // Filter by age group and category if specified
  let filtered = presetTopics;
  if (ageGroup) {
    filtered = filtered.filter(t => t.ageGroup === ageGroup || t.difficulty <= (ageGroup === 'elementary' ? 2 : ageGroup === 'middle' ? 3 : 5));
  }
  if (category) {
    filtered = filtered.filter(t => t.category === category);
  }

  return NextResponse.json({
    success: true,
    topics: filtered.slice(0, 5),
    note: 'These are preset trending topics. Use POST to generate fresh AI-powered topics.',
    generatedAt: new Date().toISOString()
  });
}
