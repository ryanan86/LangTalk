/**
 * Age-appropriate Debate Topics
 * Personalized based on grade level and interests
 */

import { DebateTopicRow, AgeGroup, DebateCategory, DebateTopicData } from './sheetTypes';
import { randomUUID } from 'crypto';

// ============================================
// Topic Templates by Age Group
// ============================================

export interface DebateTopicTemplate {
  id: string;
  ageGroups: AgeGroup[];
  category: DebateCategory;
  title: { ko: string; en: string };
  description: { ko: string; en: string };
  difficulty: number;
  keyVocabulary?: string[];
  proArguments?: string[];
  conArguments?: string[];
}

interface TopicTemplate {
  ageGroups: AgeGroup[];
  category: DebateCategory;
  title: { ko: string; en: string };
  description: { ko: string; en: string };
  difficulty: number;
  keyVocabulary?: string[];
}

const topicTemplates: TopicTemplate[] = [
  // ============================================
  // ELEMENTARY LOW (초1-3)
  // ============================================
  {
    ageGroups: ['elementary_low'],
    category: 'daily',
    title: {
      ko: '아침에 일찍 일어나는 것이 좋을까?',
      en: 'Is waking up early in the morning good?',
    },
    description: {
      ko: '아침형 인간 vs 저녁형 인간, 어떤 게 더 좋을까요?',
      en: 'Morning person vs night owl - which is better?',
    },
    difficulty: 1,
    keyVocabulary: ['wake up', 'early', 'late', 'tired', 'energy'],
  },
  {
    ageGroups: ['elementary_low'],
    category: 'school',
    title: {
      ko: '숙제가 꼭 필요할까?',
      en: 'Is homework really necessary?',
    },
    description: {
      ko: '숙제가 공부에 도움이 될까요, 아니면 너무 힘들까요?',
      en: 'Does homework help learning, or is it too much?',
    },
    difficulty: 1,
    keyVocabulary: ['homework', 'study', 'learn', 'practice', 'tired'],
  },
  {
    ageGroups: ['elementary_low'],
    category: 'daily',
    title: {
      ko: '급식이 맛있어야 할까, 건강해야 할까?',
      en: 'Should school lunch be tasty or healthy?',
    },
    description: {
      ko: '맛있는 음식과 건강한 음식, 뭐가 더 중요할까요?',
      en: 'Tasty food vs healthy food - what matters more?',
    },
    difficulty: 1,
    keyVocabulary: ['lunch', 'tasty', 'healthy', 'vegetables', 'delicious'],
  },
  {
    ageGroups: ['elementary_low'],
    category: 'daily',
    title: {
      ko: '하루에 게임을 얼마나 해도 될까?',
      en: 'How much gaming per day is okay?',
    },
    description: {
      ko: '게임 시간 제한이 필요할까요?',
      en: 'Do we need time limits for gaming?',
    },
    difficulty: 1,
    keyVocabulary: ['game', 'play', 'time', 'hour', 'fun'],
  },
  {
    ageGroups: ['elementary_low'],
    category: 'school',
    title: {
      ko: '체육 시간이 더 많아야 할까?',
      en: 'Should we have more PE classes?',
    },
    description: {
      ko: '운동하는 시간이 더 필요할까요?',
      en: 'Do we need more time for exercise at school?',
    },
    difficulty: 1,
    keyVocabulary: ['sports', 'exercise', 'run', 'play', 'healthy'],
  },
  {
    ageGroups: ['elementary_low', 'elementary_high'],
    category: 'daily',
    title: {
      ko: '방학이 더 길어야 할까?',
      en: 'Should summer vacation be longer?',
    },
    description: {
      ko: '방학 기간에 대해 이야기해봐요',
      en: "Let's discuss vacation length",
    },
    difficulty: 1,
    keyVocabulary: ['vacation', 'summer', 'winter', 'long', 'short'],
  },

  // ============================================
  // ELEMENTARY HIGH (초4-6)
  // ============================================
  {
    ageGroups: ['elementary_high'],
    category: 'technology',
    title: {
      ko: '초등학생도 스마트폰이 필요할까?',
      en: 'Do elementary students need smartphones?',
    },
    description: {
      ko: '스마트폰의 장점과 단점을 생각해봐요',
      en: "Let's think about pros and cons of smartphones",
    },
    difficulty: 2,
    keyVocabulary: ['smartphone', 'useful', 'dangerous', 'communication', 'distraction'],
  },
  {
    ageGroups: ['elementary_high'],
    category: 'school',
    title: {
      ko: '학교에서 교복을 입어야 할까?',
      en: 'Should schools require uniforms?',
    },
    description: {
      ko: '교복의 좋은 점과 나쁜 점은 뭘까요?',
      en: 'What are the advantages and disadvantages of uniforms?',
    },
    difficulty: 2,
    keyVocabulary: ['uniform', 'equal', 'freedom', 'identity', 'comfortable'],
  },
  {
    ageGroups: ['elementary_high'],
    category: 'daily',
    title: {
      ko: '유튜버가 좋은 직업일까?',
      en: 'Is being a YouTuber a good job?',
    },
    description: {
      ko: '유튜버라는 직업에 대해 이야기해봐요',
      en: "Let's discuss being a YouTuber as a career",
    },
    difficulty: 2,
    keyVocabulary: ['content', 'famous', 'hard work', 'creative', 'income'],
  },
  {
    ageGroups: ['elementary_high'],
    category: 'society',
    title: {
      ko: '반려동물을 키우는 것이 좋을까?',
      en: 'Is having a pet a good idea?',
    },
    description: {
      ko: '반려동물의 좋은 점과 책임에 대해 이야기해요',
      en: "Let's discuss benefits and responsibilities of pets",
    },
    difficulty: 2,
    keyVocabulary: ['pet', 'responsibility', 'care', 'love', 'time'],
  },
  {
    ageGroups: ['elementary_high'],
    category: 'technology',
    title: {
      ko: 'AI가 친구가 될 수 있을까?',
      en: 'Can AI become a friend?',
    },
    description: {
      ko: '인공지능과 친구가 된다면 어떨까요?',
      en: 'What if AI could be our friend?',
    },
    difficulty: 2,
    keyVocabulary: ['artificial intelligence', 'robot', 'feelings', 'real', 'technology'],
  },

  // ============================================
  // MIDDLE SCHOOL (중1-3)
  // ============================================
  {
    ageGroups: ['middle'],
    category: 'technology',
    title: {
      ko: 'SNS가 우리에게 좋은 영향을 줄까?',
      en: 'Does social media have a positive effect on us?',
    },
    description: {
      ko: '소셜 미디어의 장단점을 분석해봐요',
      en: "Let's analyze pros and cons of social media",
    },
    difficulty: 3,
    keyVocabulary: ['social media', 'connection', 'comparison', 'mental health', 'influence'],
  },
  {
    ageGroups: ['middle'],
    category: 'school',
    title: {
      ko: '시험 성적이 실력을 보여줄까?',
      en: 'Do test scores show true ability?',
    },
    description: {
      ko: '시험 제도의 공정성에 대해 토론해봐요',
      en: "Let's debate the fairness of testing",
    },
    difficulty: 3,
    keyVocabulary: ['test', 'grade', 'ability', 'fair', 'pressure'],
  },
  {
    ageGroups: ['middle'],
    category: 'society',
    title: {
      ko: '용돈을 스스로 관리해야 할까?',
      en: 'Should teens manage their own allowance?',
    },
    description: {
      ko: '경제 교육과 자기 관리에 대해 이야기해요',
      en: "Let's discuss financial education and self-management",
    },
    difficulty: 3,
    keyVocabulary: ['allowance', 'save', 'spend', 'budget', 'responsibility'],
  },
  {
    ageGroups: ['middle'],
    category: 'technology',
    title: {
      ko: '온라인 수업이 오프라인 수업보다 나을까?',
      en: 'Is online learning better than in-person classes?',
    },
    description: {
      ko: '두 가지 학습 방식을 비교해봐요',
      en: "Let's compare two learning methods",
    },
    difficulty: 3,
    keyVocabulary: ['online', 'offline', 'convenient', 'interaction', 'focus'],
  },
  {
    ageGroups: ['middle'],
    category: 'culture',
    title: {
      ko: 'K-pop 아이돌이 좋은 롤모델일까?',
      en: 'Are K-pop idols good role models?',
    },
    description: {
      ko: '연예인을 롤모델로 삼는 것에 대해 토론해요',
      en: "Let's debate having celebrities as role models",
    },
    difficulty: 3,
    keyVocabulary: ['idol', 'role model', 'influence', 'image', 'reality'],
  },

  // ============================================
  // HIGH SCHOOL (고1-3)
  // ============================================
  {
    ageGroups: ['high'],
    category: 'school',
    title: {
      ko: '수능 제도가 공정한 평가 방법일까?',
      en: 'Is the college entrance exam a fair evaluation?',
    },
    description: {
      ko: '대학 입시 제도의 공정성을 논의해봐요',
      en: "Let's discuss fairness of college admission systems",
    },
    difficulty: 4,
    keyVocabulary: ['exam', 'fair', 'opportunity', 'stress', 'alternative'],
  },
  {
    ageGroups: ['high'],
    category: 'society',
    title: {
      ko: '18세에 투표권을 주는 것이 옳을까?',
      en: 'Should 18-year-olds have the right to vote?',
    },
    description: {
      ko: '청소년 참정권에 대해 토론해봐요',
      en: "Let's debate youth voting rights",
    },
    difficulty: 4,
    keyVocabulary: ['vote', 'politics', 'mature', 'responsibility', 'democracy'],
  },
  {
    ageGroups: ['high'],
    category: 'technology',
    title: {
      ko: 'AI가 인간의 일자리를 대체할까?',
      en: 'Will AI replace human jobs?',
    },
    description: {
      ko: '인공지능과 미래 직업에 대해 분석해봐요',
      en: "Let's analyze AI and future employment",
    },
    difficulty: 4,
    keyVocabulary: ['automation', 'unemployment', 'skill', 'adaptation', 'coexistence'],
  },
  {
    ageGroups: ['high'],
    category: 'ethics',
    title: {
      ko: '성형수술을 자유롭게 해도 될까?',
      en: 'Should cosmetic surgery be freely allowed?',
    },
    description: {
      ko: '외모와 개인의 선택에 대해 토론해봐요',
      en: "Let's debate appearance and personal choice",
    },
    difficulty: 4,
    keyVocabulary: ['appearance', 'choice', 'pressure', 'self-esteem', 'natural'],
  },

  // ============================================
  // UNIVERSITY
  // ============================================
  {
    ageGroups: ['university'],
    category: 'society',
    title: {
      ko: '대학 등록금이 무료여야 할까?',
      en: 'Should university tuition be free?',
    },
    description: {
      ko: '고등교육 비용 부담에 대해 토론해요',
      en: "Let's debate higher education costs",
    },
    difficulty: 4,
    keyVocabulary: ['tuition', 'scholarship', 'investment', 'equality', 'quality'],
  },
  {
    ageGroups: ['university'],
    category: 'society',
    title: {
      ko: '공무원이 안정적인 직업일까?',
      en: 'Is being a civil servant a stable career?',
    },
    description: {
      ko: '직업 선택과 안정성에 대해 이야기해요',
      en: "Let's discuss career choices and stability",
    },
    difficulty: 4,
    keyVocabulary: ['stability', 'career', 'passion', 'salary', 'growth'],
  },

  // ============================================
  // ADULT
  // ============================================
  {
    ageGroups: ['adult'],
    category: 'society',
    title: {
      ko: '재택근무가 표준이 되어야 할까?',
      en: 'Should remote work become the standard?',
    },
    description: {
      ko: '원격 근무의 장단점을 분석해봐요',
      en: "Let's analyze pros and cons of remote work",
    },
    difficulty: 4,
    keyVocabulary: ['remote', 'productivity', 'balance', 'communication', 'flexibility'],
  },
  {
    ageGroups: ['adult'],
    category: 'society',
    title: {
      ko: '주 4일 근무제를 도입해야 할까?',
      en: 'Should we adopt a 4-day work week?',
    },
    description: {
      ko: '근무 시간과 생산성에 대해 토론해요',
      en: "Let's debate work hours and productivity",
    },
    difficulty: 5,
    keyVocabulary: ['productivity', 'work-life balance', 'efficiency', 'burnout', 'economy'],
  },
  {
    ageGroups: ['adult'],
    category: 'environment',
    title: {
      ko: '개인의 친환경 노력이 의미 있을까?',
      en: 'Do individual eco-friendly efforts matter?',
    },
    description: {
      ko: '개인 vs 기업의 환경 책임에 대해 토론해요',
      en: "Let's debate individual vs corporate environmental responsibility",
    },
    difficulty: 5,
    keyVocabulary: ['sustainable', 'carbon footprint', 'responsibility', 'impact', 'collective'],
  },

  // ============================================
  // CROSS-AGE (Multiple age groups)
  // ============================================
  {
    ageGroups: ['elementary_high', 'middle', 'high'],
    category: 'technology',
    title: {
      ko: 'E스포츠가 진짜 스포츠일까?',
      en: 'Is esports a real sport?',
    },
    description: {
      ko: '전자 스포츠의 정당성에 대해 토론해요',
      en: "Let's debate the legitimacy of esports",
    },
    difficulty: 3,
    keyVocabulary: ['competition', 'skill', 'athlete', 'entertainment', 'physical'],
  },
  {
    ageGroups: ['middle', 'high', 'university', 'adult'],
    category: 'culture',
    title: {
      ko: 'AI가 만든 예술을 진짜 예술로 인정해야 할까?',
      en: 'Should AI-generated art be considered real art?',
    },
    description: {
      ko: 'AI 창작물의 예술적 가치를 토론해요',
      en: "Let's debate the artistic value of AI creations",
    },
    difficulty: 4,
    keyVocabulary: ['creativity', 'originality', 'human', 'tool', 'expression'],
  },
  {
    ageGroups: ['high', 'university', 'adult'],
    category: 'ethics',
    title: {
      ko: '가짜 뉴스를 법으로 규제해야 할까?',
      en: 'Should fake news be regulated by law?',
    },
    description: {
      ko: '표현의 자유와 정보의 진실성에 대해 토론해요',
      en: "Let's debate freedom of speech vs information accuracy",
    },
    difficulty: 5,
    keyVocabulary: ['misinformation', 'freedom of speech', 'censorship', 'democracy', 'responsibility'],
  },
];

// ============================================
// Helper Functions
// ============================================

/**
 * Convert template to full topic row
 */
export function templateToTopicRow(template: TopicTemplate): DebateTopicRow {
  return {
    topicId: randomUUID(),
    ageGroups: template.ageGroups,
    category: template.category,
    topicData: {
      title: template.title,
      description: template.description,
      difficulty: template.difficulty,
      keyVocabulary: template.keyVocabulary,
    },
    trendScore: Math.random() * 100, // Random initial score
    isActive: true,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Get topics for specific age group and category
 */
export function getTopicsForAgeGroup(
  ageGroup: AgeGroup,
  category?: DebateCategory
): DebateTopicRow[] {
  return topicTemplates
    .filter(t => t.ageGroups.includes(ageGroup))
    .filter(t => !category || t.category === category)
    .map(templateToTopicRow);
}

/**
 * Get random topic for age group
 */
export function getRandomTopicForAgeGroup(
  ageGroup: AgeGroup,
  category?: DebateCategory,
  excludeIds?: string[]
): DebateTopicRow | null {
  const topics = getTopicsForAgeGroup(ageGroup, category);
  const available = excludeIds
    ? topics.filter(t => !excludeIds.includes(t.topicId))
    : topics;

  if (available.length === 0) return null;

  const randomIndex = Math.floor(Math.random() * available.length);
  return available[randomIndex];
}

/**
 * Generate personalized topic based on user interests
 */
export function generatePersonalizedTopic(
  interests: string[],
  ageGroup: AgeGroup,
  recentTopics: string[]
): DebateTopicRow | null {
  // Find topics that match user interests
  const relatedTopics = topicTemplates.filter(t => {
    if (!t.ageGroups.includes(ageGroup)) return false;

    // Check if topic title contains any interest
    const titleText = `${t.title.ko} ${t.title.en}`.toLowerCase();
    return interests.some(interest =>
      titleText.includes(interest.toLowerCase())
    );
  });

  // Exclude recently done topics
  const available = relatedTopics.filter(t =>
    !recentTopics.some(recent =>
      recent.toLowerCase().includes(t.title.ko.toLowerCase()) ||
      recent.toLowerCase().includes(t.title.en.toLowerCase())
    )
  );

  if (available.length === 0) return null;

  const randomIndex = Math.floor(Math.random() * available.length);
  return templateToTopicRow(available[randomIndex]);
}

/**
 * Generate topic from conversation context
 */
export function generateTopicFromContext(
  conversationTopic: string,
  ageGroup: AgeGroup
): DebateTopicRow {
  // Create a dynamic topic based on conversation
  return {
    topicId: randomUUID(),
    ageGroups: [ageGroup],
    category: 'daily',
    topicData: {
      title: {
        ko: `${conversationTopic}에 대해 어떻게 생각해?`,
        en: `What do you think about ${conversationTopic}?`,
      },
      description: {
        ko: `이전 대화에서 나온 주제로 토론해봐요`,
        en: `Let's debate based on our previous conversation`,
      },
      difficulty: 3,
    },
    trendScore: 80, // High score for personalized
    isActive: true,
    createdAt: new Date().toISOString(),
    generatedFrom: 'conversation',
  };
}

/**
 * Get all available categories for age group
 */
export function getCategoriesForAgeGroup(ageGroup: AgeGroup): DebateCategory[] {
  const categories = new Set<DebateCategory>();

  topicTemplates
    .filter(t => t.ageGroups.includes(ageGroup))
    .forEach(t => categories.add(t.category));

  return Array.from(categories);
}

/**
 * Get topic count by age group
 */
export function getTopicCountByAgeGroup(): Record<AgeGroup, number> {
  const counts: Record<AgeGroup, number> = {
    elementary_low: 0,
    elementary_high: 0,
    middle: 0,
    high: 0,
    university: 0,
    adult: 0,
  };

  topicTemplates.forEach(t => {
    t.ageGroups.forEach(ag => {
      counts[ag]++;
    });
  });

  return counts;
}

export { topicTemplates };
