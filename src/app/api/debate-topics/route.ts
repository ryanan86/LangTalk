import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getUserData, getLearningData, getDebateTopicsForUser } from '@/lib/sheetHelper';
import { GRADE_TO_AGE_GROUP, AgeGroup, DebateCategory, DebateTopicRow } from '@/lib/sheetTypes';
import {
  getTopicsForAgeGroup,
  generateTopicFromContext,
} from '@/lib/debateTopicsV2';
import { makeRid, nowMs, since } from '@/lib/perf';

export const dynamic = 'force-dynamic';

// GET: Get debate topics suitable for the user
export async function GET(request: NextRequest) {
  const rid = makeRid('dtpc');
  const t0 = nowMs();

  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ topics: [], error: 'Not logged in' });
    }

    const email = session.user.email;
    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get('category') as DebateCategory | null;
    const includePersonalized = searchParams.get('personalized') !== 'false';
    const limit = parseInt(searchParams.get('limit') || '10', 10);

    // Get user data to determine age group
    let ageGroup: AgeGroup = 'adult'; // default
    let userData = null;
    let learningData = null;

    if (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
        process.env.GOOGLE_PRIVATE_KEY &&
        process.env.GOOGLE_SUBSCRIPTION_SHEET_ID) {

      [userData, learningData] = await Promise.all([
        getUserData(email),
        getLearningData(email),
      ]);

      if (userData?.profile?.grade) {
        ageGroup = GRADE_TO_AGE_GROUP[userData.profile.grade] || 'adult';
      } else if (userData?.profile?.type) {
        // Infer age group from profile type
        const type = userData.profile.type;
        if (type.includes('elementary')) {
          ageGroup = 'elementary_high';
        } else if (type.includes('middle')) {
          ageGroup = 'middle';
        } else if (type.includes('high')) {
          ageGroup = 'high';
        } else if (type === 'university') {
          ageGroup = 'university';
        } else {
          ageGroup = 'adult';
        }
      }
    }

    // Get topics from static templates (age-appropriate)
    let staticTopics = getTopicsForAgeGroup(ageGroup, category || undefined);

    // Shuffle and limit
    staticTopics = shuffleArray(staticTopics).slice(0, limit);

    // Transform to response format
    const topics = staticTopics.map(transformTopicRow);

    // Get personalized topics from learning data if available
    let personalizedTopics: ReturnType<typeof transformTopicRow>[] = [];

    if (includePersonalized && learningData) {
      // Get topics from user's conversation history
      const topTopics = learningData.topicsHistory
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)
        .map(t => t.topic);

      // Get user interests
      const interests = userData?.profile?.interests || [];

      // Generate personalized topics from context
      const contexts = [...topTopics, ...interests].slice(0, 3);
      for (const context of contexts) {
        const personalizedTopic = generateTopicFromContext(context, ageGroup);
        if (personalizedTopic) {
          personalizedTopics.push(transformTopicRow(personalizedTopic));
        }
      }

      // Remove duplicates
      const seenIds = new Set(topics.map(t => t.id));
      personalizedTopics = personalizedTopics.filter(t => !seenIds.has(t.id));
    }

    // Try to get topics from Google Sheets if available
    let sheetsTopics: ReturnType<typeof transformTopicRow>[] = [];
    if (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
        process.env.GOOGLE_PRIVATE_KEY &&
        process.env.GOOGLE_SUBSCRIPTION_SHEET_ID) {
      try {
        const dbTopics = await getDebateTopicsForUser(email, category || undefined);
        sheetsTopics = dbTopics.map(transformTopicRow);
      } catch (e) {
        console.error('Error fetching topics from sheets:', e);
      }
    }

    // Merge all topics, prioritizing sheets > personalized > static
    // Then filter for debate-ready topics and rank by quality
    const mergedTopics = [
      ...sheetsTopics.slice(0, Math.floor(limit / 2)),
      ...personalizedTopics.slice(0, 3),
      ...topics,
    ];

    const allTopics = mergedTopics
      .filter(isDebateReadyTopic)
      .sort((a, b) => topicQualityScore(b) - topicQualityScore(a))
      .slice(0, limit);

    // Get available categories
    const availableCategories = getAvailableCategories(ageGroup);

    console.log(`[${rid}] OK ${since(t0)}ms`);
    return NextResponse.json({
      topics: allTopics,
      personalized: personalizedTopics,
      trending: sheetsTopics.slice(0, 3),
      ageGroup,
      availableCategories,
      email,
    });
  } catch (error) {
    console.error(`[${rid}] ERR ${since(t0)}ms`, error);
    console.error('Debate topics error:', error);
    return NextResponse.json({ topics: [], error: 'Failed to get topics' });
  }
}

// Helper function to transform DebateTopicRow to response format
function transformTopicRow(topic: DebateTopicRow) {
  return {
    id: topic.topicId,
    title: topic.topicData.title,
    description: topic.topicData.description,
    category: topic.category,
    difficulty: topic.topicData.difficulty,
    keyVocabulary: topic.topicData.keyVocabulary || [],
    proArguments: topic.topicData.proArguments || [],
    conArguments: topic.topicData.conArguments || [],
    ageGroups: topic.ageGroups,
    trendScore: topic.trendScore,
  };
}

function isDebateReadyTopic(topic: ReturnType<typeof transformTopicRow>): boolean {
  const title = String(topic.title?.en || '');
  const hasPro = Array.isArray(topic.proArguments) && topic.proArguments.length >= 2;
  const hasCon = Array.isArray(topic.conArguments) && topic.conArguments.length >= 2;
  const isMotionLike = /should|is|are|can|must|this house believes/i.test(title);
  return hasPro && hasCon && isMotionLike;
}

function topicQualityScore(topic: ReturnType<typeof transformTopicRow>): number {
  const title = String(topic.title?.en || '');
  const isMotion = /should|is|are|can|must|this house believes/i.test(title) ? 20 : 0;
  const proScore = Array.isArray(topic.proArguments) ? Math.min(topic.proArguments.length, 4) * 5 : 0;
  const conScore = Array.isArray(topic.conArguments) ? Math.min(topic.conArguments.length, 4) * 5 : 0;
  const vocabScore = Array.isArray(topic.keyVocabulary) ? Math.min(topic.keyVocabulary.length, 5) * 2 : 0;
  const trend = Number(topic.trendScore || 0) * 0.1;
  return isMotion + proScore + conScore + vocabScore + trend;
}

// Shuffle array helper
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Get available categories for age group
function getAvailableCategories(ageGroup: AgeGroup): { id: DebateCategory; ko: string; en: string }[] {
  const allCategories: { id: DebateCategory; ko: string; en: string }[] = [
    { id: 'daily', ko: '일상', en: 'Daily Life' },
    { id: 'school', ko: '학교', en: 'School' },
    { id: 'technology', ko: '기술', en: 'Technology' },
    { id: 'society', ko: '사회', en: 'Society' },
    { id: 'environment', ko: '환경', en: 'Environment' },
    { id: 'culture', ko: '문화', en: 'Culture' },
    { id: 'sports', ko: '스포츠', en: 'Sports' },
    { id: 'ethics', ko: '윤리', en: 'Ethics' },
  ];

  // Filter based on age group appropriateness
  if (ageGroup === 'elementary_low' || ageGroup === 'elementary_high') {
    return allCategories.filter(c =>
      ['daily', 'school', 'sports', 'culture'].includes(c.id)
    );
  }

  if (ageGroup === 'middle') {
    return allCategories.filter(c =>
      ['daily', 'school', 'technology', 'sports', 'culture', 'environment'].includes(c.id)
    );
  }

  return allCategories;
}
