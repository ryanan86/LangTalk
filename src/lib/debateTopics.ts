// Debate Topics by Category

import { DebateTopic, DebateCategory } from './debateTypes';

export const debateTopics: DebateTopic[] = [
  // Social Topics
  {
    id: 'social-1',
    category: 'social',
    title: {
      en: 'Social media does more harm than good',
      ko: '소셜 미디어는 득보다 실이 많다',
    },
    description: {
      en: 'Debate whether platforms like Instagram, TikTok, and Twitter have a net negative impact on society.',
      ko: '인스타그램, 틱톡, 트위터와 같은 플랫폼이 사회에 부정적인 영향을 미치는지 토론합니다.',
    },
  },
  {
    id: 'social-2',
    category: 'social',
    title: {
      en: 'Remote work should become the standard',
      ko: '재택근무가 표준이 되어야 한다',
    },
    description: {
      en: 'Should companies make remote work the default option for all employees who can work from home?',
      ko: '기업들이 재택근무가 가능한 모든 직원들에게 재택근무를 기본 옵션으로 해야 할까요?',
    },
  },
  {
    id: 'social-3',
    category: 'social',
    title: {
      en: 'University education is overvalued',
      ko: '대학 교육은 과대평가되어 있다',
    },
    description: {
      en: 'Is a traditional four-year university degree still worth the investment in today\'s world?',
      ko: '오늘날 세계에서 전통적인 4년제 대학 학위가 여전히 투자할 가치가 있을까요?',
    },
  },
  {
    id: 'social-4',
    category: 'social',
    title: {
      en: 'Cash should be completely replaced by digital payments',
      ko: '현금은 디지털 결제로 완전히 대체되어야 한다',
    },
    description: {
      en: 'Should society move towards a completely cashless economy?',
      ko: '사회가 완전한 무현금 경제로 나아가야 할까요?',
    },
  },

  // Culture Topics
  {
    id: 'culture-1',
    category: 'culture',
    title: {
      en: 'Streaming has improved the quality of TV and movies',
      ko: '스트리밍이 TV와 영화의 질을 향상시켰다',
    },
    description: {
      en: 'Has Netflix, Disney+, and other streaming services made entertainment better or worse?',
      ko: '넷플릭스, 디즈니+ 등 스트리밍 서비스가 엔터테인먼트를 더 좋게 만들었을까요, 아니면 더 나쁘게 만들었을까요?',
    },
  },
  {
    id: 'culture-2',
    category: 'culture',
    title: {
      en: 'AI-generated art should be considered real art',
      ko: 'AI가 생성한 예술은 진정한 예술로 인정받아야 한다',
    },
    description: {
      en: 'Can artwork created by AI be considered legitimate art on the same level as human-created works?',
      ko: 'AI가 만든 작품이 인간이 만든 작품과 같은 수준의 정당한 예술로 간주될 수 있을까요?',
    },
  },
  {
    id: 'culture-3',
    category: 'culture',
    title: {
      en: 'K-pop\'s global success is sustainable',
      ko: 'K-pop의 세계적 성공은 지속 가능하다',
    },
    description: {
      en: 'Will K-pop continue to dominate global music charts, or is it a temporary trend?',
      ko: 'K-pop이 계속해서 글로벌 음악 차트를 지배할까요, 아니면 일시적인 트렌드일까요?',
    },
  },

  // Environment Topics
  {
    id: 'env-1',
    category: 'environment',
    title: {
      en: 'Individual actions can significantly impact climate change',
      ko: '개인의 행동이 기후 변화에 큰 영향을 미칠 수 있다',
    },
    description: {
      en: 'Do personal choices like recycling and reducing meat consumption really make a difference?',
      ko: '재활용이나 육류 소비 줄이기 같은 개인적 선택이 정말 차이를 만들까요?',
    },
  },
  {
    id: 'env-2',
    category: 'environment',
    title: {
      en: 'Electric vehicles are the solution to transportation emissions',
      ko: '전기차가 교통 배출의 해결책이다',
    },
    description: {
      en: 'Are electric vehicles truly better for the environment when considering their full lifecycle?',
      ko: '전체 수명 주기를 고려할 때 전기차가 정말 환경에 더 좋을까요?',
    },
  },
  {
    id: 'env-3',
    category: 'environment',
    title: {
      en: 'Nuclear energy should be expanded',
      ko: '원자력 에너지를 확대해야 한다',
    },
    description: {
      en: 'Is nuclear power a necessary part of the transition to clean energy?',
      ko: '원자력이 청정에너지로의 전환에 필수적인 부분일까요?',
    },
  },

  // Politics Topics
  {
    id: 'politics-1',
    category: 'politics',
    title: {
      en: 'Voting should be mandatory',
      ko: '투표는 의무화되어야 한다',
    },
    description: {
      en: 'Should governments require all eligible citizens to vote in elections?',
      ko: '정부가 모든 유권자에게 선거에서 투표하도록 요구해야 할까요?',
    },
  },
  {
    id: 'politics-2',
    category: 'politics',
    title: {
      en: 'Universal Basic Income is a good idea',
      ko: '보편적 기본소득은 좋은 아이디어다',
    },
    description: {
      en: 'Should governments provide a guaranteed income to all citizens regardless of employment?',
      ko: '정부가 고용 여부와 관계없이 모든 시민에게 보장된 소득을 제공해야 할까요?',
    },
  },
  {
    id: 'politics-3',
    category: 'politics',
    title: {
      en: 'The retirement age should be raised',
      ko: '정년 나이를 높여야 한다',
    },
    description: {
      en: 'Should the official retirement age be increased as life expectancy rises?',
      ko: '기대 수명이 늘어남에 따라 공식 정년 나이를 높여야 할까요?',
    },
  },

  // International Topics
  {
    id: 'intl-1',
    category: 'international',
    title: {
      en: 'Globalization benefits developing countries',
      ko: '세계화가 개발도상국에 이익이 된다',
    },
    description: {
      en: 'Does increased global trade and connection help or hurt developing nations?',
      ko: '글로벌 무역과 연결의 증가가 개발도상국에 도움이 될까요, 해가 될까요?',
    },
  },
  {
    id: 'intl-2',
    category: 'international',
    title: {
      en: 'English should be the universal global language',
      ko: '영어가 보편적인 세계 공용어가 되어야 한다',
    },
    description: {
      en: 'Should English become the standard international language for business and diplomacy?',
      ko: '영어가 비즈니스와 외교를 위한 표준 국제 언어가 되어야 할까요?',
    },
  },
  {
    id: 'intl-3',
    category: 'international',
    title: {
      en: 'Immigration policies should be more open',
      ko: '이민 정책은 더 개방적이어야 한다',
    },
    description: {
      en: 'Should countries make it easier for people to immigrate and work across borders?',
      ko: '국가들이 사람들이 국경을 넘어 이민하고 일할 수 있도록 더 쉽게 해야 할까요?',
    },
  },

  // Sports Topics
  {
    id: 'sports-1',
    category: 'sports',
    title: {
      en: 'E-sports should be recognized as real sports',
      ko: 'E스포츠는 진정한 스포츠로 인정받아야 한다',
    },
    description: {
      en: 'Should competitive video gaming be considered on par with traditional athletics?',
      ko: '경쟁적 비디오 게임이 전통적인 운동 경기와 동등하게 여겨져야 할까요?',
    },
  },
  {
    id: 'sports-2',
    category: 'sports',
    title: {
      en: 'Professional athletes are overpaid',
      ko: '프로 운동선수들은 과도한 연봉을 받는다',
    },
    description: {
      en: 'Are the salaries of top athletes justified compared to other professions?',
      ko: '최고 운동선수들의 연봉이 다른 직업과 비교해 정당화될 수 있을까요?',
    },
  },
  {
    id: 'sports-3',
    category: 'sports',
    title: {
      en: 'The Olympics should be held in one permanent location',
      ko: '올림픽은 하나의 영구적인 장소에서 개최되어야 한다',
    },
    description: {
      en: 'Should the Olympic Games stop rotating between cities and find a permanent home?',
      ko: '올림픽이 도시 간 순환을 멈추고 영구적인 개최지를 정해야 할까요?',
    },
  },
];

// Helper functions
export const getTopicsByCategory = (category: DebateCategory): DebateTopic[] => {
  return debateTopics.filter(topic => topic.category === category);
};

export const getRandomTopic = (): DebateTopic => {
  const randomIndex = Math.floor(Math.random() * debateTopics.length);
  return debateTopics[randomIndex];
};

export const getRandomTopicByCategory = (category: DebateCategory): DebateTopic => {
  const categoryTopics = getTopicsByCategory(category);
  const randomIndex = Math.floor(Math.random() * categoryTopics.length);
  return categoryTopics[randomIndex];
};

export const getAllCategories = (): DebateCategory[] => {
  return ['social', 'culture', 'environment', 'politics', 'international', 'sports'];
};

export const getRandomCategory = (): DebateCategory => {
  const categories = getAllCategories();
  const randomIndex = Math.floor(Math.random() * categories.length);
  return categories[randomIndex];
};
