/**
 * Age-appropriate Debate Topics
 * Personalized based on grade level and interests
 */

import { DebateTopicRow, AgeGroup, DebateCategory } from './sheetTypes';
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
  proArguments?: string[];
  conArguments?: string[];
}

const topicTemplates: TopicTemplate[] = [
  // ============================================
  // ELEMENTARY LOW (초1-3)
  // ============================================
  {
    ageGroups: ['elementary_low'],
    category: 'daily',
    title: {
      ko: '아침형 생활이 저녁형보다 우월하다',
      en: 'Morning routines are superior to evening routines',
    },
    description: {
      ko: '아침형 인간 vs 저녁형 인간, 어떤 게 더 좋을까요?',
      en: 'Morning person vs night owl - which is better?',
    },
    difficulty: 1,
    keyVocabulary: ['wake up', 'early', 'late', 'tired', 'energy'],
    proArguments: ['아침에 일찍 일어나면 하루를 더 길게 쓸 수 있다', '아침 시간에 집중력이 더 높다', '규칙적인 생활 습관이 건강에 좋다'],
    conArguments: ['사람마다 집중이 잘 되는 시간이 다르다', '억지로 일찍 일어나면 피곤해서 효율이 떨어진다', '저녁에 더 창의적인 사람도 많다'],
  },
  {
    ageGroups: ['elementary_low'],
    category: 'school',
    title: {
      ko: '숙제는 학생의 학습에 필수적이다',
      en: 'Homework is essential for student learning',
    },
    description: {
      ko: '숙제가 공부에 도움이 될까요, 아니면 너무 힘들까요?',
      en: 'Does homework help learning, or is it too much?',
    },
    difficulty: 1,
    keyVocabulary: ['homework', 'study', 'learn', 'practice', 'tired'],
    proArguments: ['복습 효과로 학습 강화', '자기관리 능력 발전', '수업 내용 정착에 도움'],
    conArguments: ['과도한 스트레스 유발', '자유 시간 침해', '학생 개인차 무시'],
  },
  {
    ageGroups: ['elementary_low'],
    category: 'daily',
    title: {
      ko: '학교 급식은 맛보다 건강을 우선해야 한다',
      en: 'School lunch should prioritize health over taste',
    },
    description: {
      ko: '맛있는 음식과 건강한 음식, 뭐가 더 중요할까요?',
      en: 'Tasty food vs healthy food - what matters more?',
    },
    difficulty: 1,
    keyVocabulary: ['lunch', 'tasty', 'healthy', 'vegetables', 'delicious'],
    proArguments: ['성장기 영양 섭취가 중요하다', '건강한 식습관을 어릴 때부터 길러야 한다', '학교는 교육 기관으로서 건강을 가르쳐야 한다'],
    conArguments: ['맛없으면 음식을 남겨 영양을 못 챙긴다', '먹는 즐거움도 중요한 교육이다', '맛과 건강을 함께 추구할 수 있다'],
  },
  {
    ageGroups: ['elementary_low'],
    category: 'daily',
    title: {
      ko: '어린이 게임 시간은 하루 1시간으로 제한해야 한다',
      en: 'Children\'s gaming time should be limited to 1 hour per day',
    },
    description: {
      ko: '게임 시간 제한이 필요할까요?',
      en: 'Do we need time limits for gaming?',
    },
    difficulty: 1,
    keyVocabulary: ['game', 'play', 'time', 'hour', 'fun'],
    proArguments: ['과도한 게임은 눈 건강을 해친다', '공부와 운동 시간을 확보할 수 있다', '게임 중독을 예방할 수 있다'],
    conArguments: ['스스로 조절하는 능력을 키워야 한다', '게임도 창의력을 키울 수 있다', '획일적인 제한은 아이마다 다른 필요를 무시한다'],
  },
  {
    ageGroups: ['elementary_low'],
    category: 'school',
    title: {
      ko: '학교는 체육 수업 시간을 늘려야 한다',
      en: 'Schools should increase physical education class time',
    },
    description: {
      ko: '운동하는 시간이 더 필요할까요?',
      en: 'Do we need more time for exercise at school?',
    },
    difficulty: 1,
    keyVocabulary: ['sports', 'exercise', 'run', 'play', 'healthy'],
    proArguments: ['신체 활동이 건강한 성장에 꼭 필요하다', '운동하면 집중력과 학습 능력이 오른다', '요즘 아이들의 운동 부족 문제가 심각하다'],
    conArguments: ['학습 시간이 줄어들 수 있다', '방과 후 운동으로 충분히 보완 가능하다', '모든 아이가 운동을 좋아하지는 않는다'],
  },
  {
    ageGroups: ['elementary_low', 'elementary_high'],
    category: 'daily',
    title: {
      ko: '여름방학은 현재보다 더 길어야 한다',
      en: 'Summer vacation should be longer than it currently is',
    },
    description: {
      ko: '방학 기간에 대해 이야기해봐요',
      en: "Let's discuss vacation length",
    },
    difficulty: 1,
    keyVocabulary: ['vacation', 'summer', 'winter', 'long', 'short'],
    proArguments: ['충분한 휴식으로 새 학기 의욕이 생긴다', '다양한 경험과 탐구 활동을 할 수 있다', '가족과 함께하는 시간이 중요하다'],
    conArguments: ['긴 방학 동안 배운 내용을 잊어버린다', '맞벌이 가정에서는 아이 돌봄이 어렵다', '방학보다 학기 중 학습이 더 중요하다'],
  },

  // ============================================
  // ELEMENTARY HIGH (초4-6)
  // ============================================
  {
    ageGroups: ['elementary_high'],
    category: 'technology',
    title: {
      ko: '초등학생에게 스마트폰은 필요하다',
      en: 'Elementary school students need smartphones',
    },
    description: {
      ko: '스마트폰의 장점과 단점을 생각해봐요',
      en: "Let's think about pros and cons of smartphones",
    },
    difficulty: 2,
    keyVocabulary: ['smartphone', 'useful', 'dangerous', 'communication', 'distraction'],
    proArguments: ['긴급 상황에서 부모와 연락할 수 있다', '다양한 학습 콘텐츠를 활용할 수 있다', '디지털 리터러시를 일찍 키울 수 있다'],
    conArguments: ['게임과 SNS로 공부에 집중하기 어렵다', '사이버 폭력과 유해 콘텐츠에 노출될 수 있다', '시력과 수면에 부정적인 영향을 준다'],
  },
  {
    ageGroups: ['elementary_high'],
    category: 'school',
    title: {
      ko: '학교는 교복 착용을 의무화해야 한다',
      en: 'Schools should make wearing uniforms mandatory',
    },
    description: {
      ko: '교복의 좋은 점과 나쁜 점은 뭘까요?',
      en: 'What are the advantages and disadvantages of uniforms?',
    },
    difficulty: 2,
    keyVocabulary: ['uniform', 'equal', 'freedom', 'identity', 'comfortable'],
    proArguments: ['경제적 격차로 인한 차별을 줄일 수 있다', '학교 소속감과 공동체 의식을 높인다', '아침마다 옷 선택 고민을 없앤다'],
    conArguments: ['개성과 자기 표현의 자유를 침해한다', '불편하거나 비용이 많이 들 수 있다', '자유로운 옷차림으로 창의성을 키울 수 있다'],
  },
  {
    ageGroups: ['elementary_high'],
    category: 'daily',
    title: {
      ko: '유튜버는 안정적인 직업이다',
      en: 'Being a YouTuber is a stable career',
    },
    description: {
      ko: '유튜버라는 직업에 대해 이야기해봐요',
      en: "Let's discuss being a YouTuber as a career",
    },
    difficulty: 2,
    keyVocabulary: ['content', 'famous', 'hard work', 'creative', 'income'],
    proArguments: ['성공하면 높은 수익을 올릴 수 있다', '자신이 좋아하는 일을 직업으로 삼을 수 있다', '시간과 장소에 구애받지 않고 일할 수 있다'],
    conArguments: ['수익이 불안정하고 예측하기 어렵다', '알고리즘 변화로 하루아침에 수입이 줄 수 있다', '성공하는 유튜버는 극소수에 불과하다'],
  },
  {
    ageGroups: ['elementary_high'],
    category: 'society',
    title: {
      ko: '모든 가정에서 반려동물을 키우는 것이 좋다',
      en: 'It is beneficial for all households to keep pets',
    },
    description: {
      ko: '반려동물의 좋은 점과 책임에 대해 이야기해요',
      en: "Let's discuss benefits and responsibilities of pets",
    },
    difficulty: 2,
    keyVocabulary: ['pet', 'responsibility', 'care', 'love', 'time'],
    proArguments: ['정서적 안정감과 행복감을 준다', '책임감과 생명 존중 의식을 키운다', '외로움을 줄이고 가족 간 유대감을 높인다'],
    conArguments: ['돌봄 비용과 시간이 많이 든다', '알레르기나 위생 문제가 생길 수 있다', '모든 가정이 반려동물을 돌볼 여건이 되는 것은 아니다'],
  },
  {
    ageGroups: ['elementary_high'],
    category: 'technology',
    title: {
      ko: 'AI는 진정한 친구가 될 수 있다',
      en: 'AI can become a true friend',
    },
    description: {
      ko: '인공지능과 친구가 된다면 어떨까요?',
      en: 'What if AI could be our friend?',
    },
    difficulty: 2,
    keyVocabulary: ['artificial intelligence', 'robot', 'feelings', 'real', 'technology'],
    proArguments: ['항상 곁에 있고 판단 없이 대화를 들어준다', '외롭거나 힘든 사람에게 큰 위로가 될 수 있다', '다양한 정보와 도움을 즉시 제공한다'],
    conArguments: ['진짜 감정이 없기 때문에 진정한 친구라 볼 수 없다', 'AI 의존도가 높아지면 인간 관계가 약해진다', '프라이버시 침해와 데이터 보안 문제가 있다'],
  },

  // ============================================
  // MIDDLE SCHOOL (중1-3)
  // ============================================
  {
    ageGroups: ['middle'],
    category: 'technology',
    title: {
      ko: 'SNS는 사회에 긍정적인 영향을 미친다',
      en: 'Social media has a positive impact on society',
    },
    description: {
      ko: '소셜 미디어의 장단점을 분석해봐요',
      en: "Let's analyze pros and cons of social media",
    },
    difficulty: 3,
    keyVocabulary: ['social media', 'connection', 'comparison', 'mental health', 'influence'],
    proArguments: ['전 세계 사람들과 쉽게 소통하고 연결될 수 있다', '사회 문제를 빠르게 공론화할 수 있다', '다양한 정보와 문화를 접할 기회를 준다'],
    conArguments: ['비교와 경쟁으로 정신 건강에 해롭다', '가짜 뉴스와 혐오 표현이 빠르게 퍼진다', '중독성이 강해 일상생활을 방해한다'],
  },
  {
    ageGroups: ['middle'],
    category: 'school',
    title: {
      ko: '시험 성적은 학생의 진정한 실력을 반영한다',
      en: 'Test scores truly reflect a student\'s real ability',
    },
    description: {
      ko: '시험 제도의 공정성에 대해 토론해봐요',
      en: "Let's debate the fairness of testing",
    },
    difficulty: 3,
    keyVocabulary: ['test', 'grade', 'ability', 'fair', 'pressure'],
    proArguments: ['객관적인 기준으로 학생 간 비교가 가능하다', '체계적인 학습 성과를 측정할 수 있다', '학습 목표와 동기 부여에 도움이 된다'],
    conArguments: ['암기 위주 평가로 창의성을 측정하지 못한다', '시험 당일 컨디션에 따라 결과가 달라진다', '경제적 여건에 따른 사교육 격차가 반영된다'],
  },
  {
    ageGroups: ['middle'],
    category: 'society',
    title: {
      ko: '청소년은 용돈을 스스로 관리해야 한다',
      en: 'Teenagers should manage their own allowance independently',
    },
    description: {
      ko: '경제 교육과 자기 관리에 대해 이야기해요',
      en: "Let's discuss financial education and self-management",
    },
    difficulty: 3,
    keyVocabulary: ['allowance', 'save', 'spend', 'budget', 'responsibility'],
    proArguments: ['경제 관념과 금융 습관을 일찍 익힐 수 있다', '자기 결정권과 책임감을 키운다', '실생활에서 직접 경험하며 배우는 것이 효과적이다'],
    conArguments: ['충동 구매로 돈을 낭비할 수 있다', '부모의 지도와 교육이 병행되어야 효과적이다', '금융 지식이 부족한 상태에서 혼자 관리는 위험하다'],
  },
  {
    ageGroups: ['middle'],
    category: 'technology',
    title: {
      ko: '온라인 수업은 오프라인 수업보다 효과적이다',
      en: 'Online learning is more effective than in-person classes',
    },
    description: {
      ko: '두 가지 학습 방식을 비교해봐요',
      en: "Let's compare two learning methods",
    },
    difficulty: 3,
    keyVocabulary: ['online', 'offline', 'convenient', 'interaction', 'focus'],
    proArguments: ['시간과 장소에 구애 없이 학습할 수 있다', '원하는 속도로 반복 학습이 가능하다', '다양한 디지털 자료를 활용한 풍부한 수업이 가능하다'],
    conArguments: ['교사와 학생 간 직접 소통이 줄어든다', '자기 통제가 안 되면 집중하기 어렵다', '실험, 실습 등 체험 활동을 대체할 수 없다'],
  },
  {
    ageGroups: ['middle'],
    category: 'culture',
    title: {
      ko: 'K-pop 아이돌은 좋은 롤모델이다',
      en: 'K-pop idols are good role models',
    },
    description: {
      ko: '연예인을 롤모델로 삼는 것에 대해 토론해요',
      en: "Let's debate having celebrities as role models",
    },
    difficulty: 3,
    keyVocabulary: ['idol', 'role model', 'influence', 'image', 'reality'],
    proArguments: ['꾸준한 노력과 성실함을 보여주는 좋은 본보기다', '긍정적인 메시지와 사회 공헌 활동을 한다', '글로벌 무대에서 한국 문화를 알리는 역할을 한다'],
    conArguments: ['미디어를 통해 꾸며진 이미지일 수 있다', '과도한 팬덤 문화가 일상생활에 지장을 준다', '외모 중심 문화를 조장할 수 있다'],
  },

  // ============================================
  // HIGH SCHOOL (고1-3)
  // ============================================
  {
    ageGroups: ['high'],
    category: 'school',
    title: {
      ko: '수능은 공정한 대학 입시 평가 방법이다',
      en: 'The CSAT is a fair method of evaluating university applicants',
    },
    description: {
      ko: '대학 입시 제도의 공정성을 논의해봐요',
      en: "Let's discuss fairness of college admission systems",
    },
    difficulty: 4,
    keyVocabulary: ['exam', 'fair', 'opportunity', 'stress', 'alternative'],
    proArguments: ['전국 모든 학생에게 동일한 기준을 적용한다', '성적 외 요소의 개입 없이 객관적으로 평가한다', '지역과 학교에 관계없이 능력을 증명할 기회를 준다'],
    conArguments: ['사교육 여건에 따라 유불리가 달라진다', '단 하루의 시험으로 진로를 결정하는 것은 부당하다', '다양한 재능과 역량을 반영하지 못한다'],
  },
  {
    ageGroups: ['high'],
    category: 'society',
    title: {
      ko: '18세에게 투표권을 부여해야 한다',
      en: '18-year-olds should be granted the right to vote',
    },
    description: {
      ko: '청소년 참정권에 대해 토론해봐요',
      en: "Let's debate youth voting rights",
    },
    difficulty: 4,
    keyVocabulary: ['vote', 'politics', 'mature', 'responsibility', 'democracy'],
    proArguments: ['18세는 병역과 납세 등 사회적 의무를 지는 나이다', '청소년도 정치적 의사 표현의 권리가 있다', '더 많은 시민이 참여할수록 민주주의가 강해진다'],
    conArguments: ['정치적 판단력이 충분히 성숙하지 않을 수 있다', '입시 준비로 정치에 관심을 갖기 어려운 현실이다', '선거 연령 하향이 교육 현장을 정치화할 우려가 있다'],
  },
  {
    ageGroups: ['high'],
    category: 'technology',
    title: {
      ko: 'AI는 인간의 일자리를 대체하게 될 것이다',
      en: 'AI will replace human jobs',
    },
    description: {
      ko: '인공지능과 미래 직업에 대해 분석해봐요',
      en: "Let's analyze AI and future employment",
    },
    difficulty: 4,
    keyVocabulary: ['automation', 'unemployment', 'skill', 'adaptation', 'coexistence'],
    proArguments: ['반복적이고 정형화된 업무는 이미 자동화되고 있다', 'AI의 비용 효율성이 인간 노동보다 뛰어나다', '산업혁명 사례처럼 기술이 기존 직업을 대규모로 대체했다'],
    conArguments: ['AI가 새로운 직업군을 창출하기도 한다', '창의성, 공감 능력이 필요한 직업은 대체하기 어렵다', '인간과 AI의 협업 모델이 더 현실적이다'],
  },
  {
    ageGroups: ['high'],
    category: 'ethics',
    title: {
      ko: '성형수술은 개인의 자유로 보장되어야 한다',
      en: 'Cosmetic surgery should be guaranteed as a personal freedom',
    },
    description: {
      ko: '외모와 개인의 선택에 대해 토론해봐요',
      en: "Let's debate appearance and personal choice",
    },
    difficulty: 4,
    keyVocabulary: ['appearance', 'choice', 'pressure', 'self-esteem', 'natural'],
    proArguments: ['자신의 신체에 대한 결정은 개인의 권리다', '자신감 회복과 삶의 질 향상에 도움이 된다', '국가가 개인의 외모 선택을 제한해서는 안 된다'],
    conArguments: ['사회적 외모 압박이 성형을 강요하는 구조가 문제다', '성형 산업이 외모 차별을 심화시킬 수 있다', '신체 불만족의 근본 원인을 해결하지 못한다'],
  },

  // ============================================
  // UNIVERSITY
  // ============================================
  {
    ageGroups: ['university'],
    category: 'society',
    title: {
      ko: '대학 등록금은 무료여야 한다',
      en: 'University tuition should be free',
    },
    description: {
      ko: '고등교육 비용 부담에 대해 토론해요',
      en: "Let's debate higher education costs",
    },
    difficulty: 4,
    keyVocabulary: ['tuition', 'scholarship', 'investment', 'equality', 'quality'],
    proArguments: ['경제적 여건에 관계없이 교육 기회가 평등해진다', '높은 교육 수준이 사회 전체의 발전으로 이어진다', '학자금 대출 부담으로 인한 청년 빈곤을 줄일 수 있다'],
    conArguments: ['재정 부담이 모든 납세자에게 전가된다', '무상 교육이 대학 교육의 질을 낮출 수 있다', '직업 교육 등 다른 형태의 교육 지원이 더 효과적일 수 있다'],
  },
  {
    ageGroups: ['university'],
    category: 'society',
    title: {
      ko: '공무원은 현대 사회에서 가장 안정적인 직업이다',
      en: 'Civil servants hold the most stable careers in modern society',
    },
    description: {
      ko: '직업 선택과 안정성에 대해 이야기해요',
      en: "Let's discuss career choices and stability",
    },
    difficulty: 4,
    keyVocabulary: ['stability', 'career', 'passion', 'salary', 'growth'],
    proArguments: ['정년이 보장되고 해고 위험이 낮다', '연금 등 복지 혜택이 뛰어나다', '경기 침체에도 고용이 유지된다'],
    conArguments: ['급여 성장이 제한적이고 성과 보상이 약하다', '빠르게 변화하는 사회에서 공무원 제도도 변화 중이다', '안정성보다 성장 가능성을 중시하는 가치관도 있다'],
  },

  // ============================================
  // ADULT
  // ============================================
  {
    ageGroups: ['adult'],
    category: 'society',
    title: {
      ko: '재택근무가 새로운 근무 표준이 되어야 한다',
      en: 'Remote work should become the new standard of employment',
    },
    description: {
      ko: '원격 근무의 장단점을 분석해봐요',
      en: "Let's analyze pros and cons of remote work",
    },
    difficulty: 4,
    keyVocabulary: ['remote', 'productivity', 'balance', 'communication', 'flexibility'],
    proArguments: ['출퇴근 시간을 줄여 삶의 질이 높아진다', '지역에 관계없이 인재를 채용할 수 있다', '자율적인 환경에서 생산성이 오르는 직원이 많다'],
    conArguments: ['팀워크와 협업이 약화될 수 있다', '집에서는 업무 집중이 어려운 환경일 수 있다', '신입 직원의 온보딩과 성장에 불리하다'],
  },
  {
    ageGroups: ['adult'],
    category: 'society',
    title: {
      ko: '주 4일 근무제를 도입해야 한다',
      en: 'A four-day work week should be adopted',
    },
    description: {
      ko: '근무 시간과 생산성에 대해 토론해요',
      en: "Let's debate work hours and productivity",
    },
    difficulty: 5,
    keyVocabulary: ['productivity', 'work-life balance', 'efficiency', 'burnout', 'economy'],
    proArguments: ['번아웃을 줄이고 직원 만족도를 높인다', '일부 기업 실험에서 생산성이 오히려 향상됐다', '개인 생활과 소비 활성화로 경제에도 긍정적이다'],
    conArguments: ['업무량은 동일한데 시간이 줄면 강도가 높아진다', '서비스업 등 주 5일 운영이 필요한 직종은 적용이 어렵다', '기업의 비용 부담이 증가할 수 있다'],
  },
  {
    ageGroups: ['adult'],
    category: 'environment',
    title: {
      ko: '개인의 친환경 노력은 의미 있는 변화를 만든다',
      en: 'Individual eco-friendly efforts create meaningful change',
    },
    description: {
      ko: '개인 vs 기업의 환경 책임에 대해 토론해요',
      en: "Let's debate individual vs corporate environmental responsibility",
    },
    difficulty: 5,
    keyVocabulary: ['sustainable', 'carbon footprint', 'responsibility', 'impact', 'collective'],
    proArguments: ['수백만 명의 개인 노력이 모이면 큰 변화를 만든다', '소비자 행동이 기업의 친환경 정책을 이끈다', '개인의 가치관 변화가 사회 전반의 문화를 바꾼다'],
    conArguments: ['전체 탄소 배출의 대부분은 기업과 산업에서 나온다', '개인에게 책임을 전가해 기업의 책임을 희석시킨다', '구조적 정책 변화 없이 개인 노력만으로는 한계가 있다'],
  },

  // ============================================
  // CROSS-AGE (Multiple age groups)
  // ============================================
  {
    ageGroups: ['elementary_high', 'middle', 'high'],
    category: 'technology',
    title: {
      ko: 'E스포츠는 전통 스포츠와 동등한 스포츠이다',
      en: 'Esports is a sport equal to traditional sports',
    },
    description: {
      ko: '전자 스포츠의 정당성에 대해 토론해요',
      en: "Let's debate the legitimacy of esports",
    },
    difficulty: 3,
    keyVocabulary: ['competition', 'skill', 'athlete', 'entertainment', 'physical'],
    proArguments: ['높은 수준의 전략과 반응 능력이 필요하다', '국제 대회와 선수 육성 체계가 갖춰져 있다', '전 세계 수억 명이 시청하는 글로벌 경쟁 스포츠다'],
    conArguments: ['신체 활동이 없어 스포츠의 본질에 맞지 않는다', '오랜 시간 앉아 하는 활동은 건강에 해롭다', '전통 스포츠와 동등하게 보기에는 역사와 문화가 부족하다'],
  },
  {
    ageGroups: ['middle', 'high', 'university', 'adult'],
    category: 'culture',
    title: {
      ko: 'AI 생성 예술은 진정한 예술로 인정되어야 한다',
      en: 'AI-generated art should be recognized as genuine art',
    },
    description: {
      ko: 'AI 창작물의 예술적 가치를 토론해요',
      en: "Let's debate the artistic value of AI creations",
    },
    difficulty: 4,
    keyVocabulary: ['creativity', 'originality', 'human', 'tool', 'expression'],
    proArguments: ['결과물의 미적 가치는 제작 방식과 무관하다', 'AI도 인간의 창의적 의도를 도구로 표현하는 수단이다', '새로운 기술을 예술에 적용하는 것은 역사적으로 반복된 일이다'],
    conArguments: ['예술은 인간의 감정과 경험에서 나오는 것이다', 'AI는 의미와 의도 없이 패턴을 조합할 뿐이다', '저작권과 원작자 권리 문제가 해결되지 않았다'],
  },
  {
    ageGroups: ['high', 'university', 'adult'],
    category: 'ethics',
    title: {
      ko: '가짜 뉴스는 법으로 규제해야 한다',
      en: 'Fake news should be regulated by law',
    },
    description: {
      ko: '표현의 자유와 정보의 진실성에 대해 토론해요',
      en: "Let's debate freedom of speech vs information accuracy",
    },
    difficulty: 5,
    keyVocabulary: ['misinformation', 'freedom of speech', 'censorship', 'democracy', 'responsibility'],
    proArguments: ['잘못된 정보가 사회 혼란과 인명 피해를 유발할 수 있다', '민주주의가 제대로 작동하려면 정확한 정보가 필요하다', '이미 사기나 명예훼손은 법으로 규제하고 있다'],
    conArguments: ['표현의 자유를 침해할 수 있다', '정부가 사실 여부를 판단하면 정치적 검열로 이어질 수 있다', '무엇이 가짜 뉴스인지 객관적으로 정의하기 어렵다'],
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
      proArguments: template.proArguments,
      conArguments: template.conArguments,
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
        ko: `${conversationTopic}은/는 우리 사회에 필요하다`,
        en: `${conversationTopic} is necessary for our society`,
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
