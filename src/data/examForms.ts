import type { ExamForm } from '@/lib/examTypes';

/**
 * Exam question bank — 2 forms per exam type (4 total).
 * TOEIC Speaking: 6 tasks, ~12 min
 * OPIc: 6 tasks, ~13 min
 */
export const EXAM_FORMS: ExamForm[] = [
  // ──────────────────────────────────────────────
  // TOEIC SPEAKING — Form 1
  // ──────────────────────────────────────────────
  {
    examType: 'toeic-speaking',
    formId: 'ts-form-1',
    titleKo: '토익 스피킹 모의고사 1회',
    totalMinutes: 12,
    tasks: [
      {
        id: 'ts1-ra-01',
        examType: 'toeic-speaking',
        type: 'read-aloud',
        order: 1,
        promptKo: '다음 안내문을 소리 내어 읽어 주세요. 준비 시간은 45초이며, 답변 시간도 45초입니다.',
        promptEn:
          'Attention all passengers. Flight KA 271 to New York will begin boarding at Gate 14 in approximately twenty minutes. Please have your boarding pass and identification ready for inspection. Carry-on bags must fit in the overhead compartment or under the seat in front of you.',
        prepSeconds: 45,
        answerSeconds: 45,
      },
      {
        id: 'ts1-ra-02',
        examType: 'toeic-speaking',
        type: 'read-aloud',
        order: 2,
        promptKo: '다음 공지문을 소리 내어 읽어 주세요. 준비 시간은 45초이며, 답변 시간도 45초입니다.',
        promptEn:
          'Notice to all staff: The main conference room on the third floor will be unavailable for bookings from Monday through Wednesday next week due to scheduled renovation work. During this period, please use Meeting Room B on the second floor or the small breakout spaces near the reception area.',
        prepSeconds: 45,
        answerSeconds: 45,
      },
      {
        id: 'ts1-qa-01',
        examType: 'toeic-speaking',
        type: 'qa',
        order: 3,
        promptKo: '질문을 듣고 바로 답변하세요. 준비 시간은 3초이며, 답변 시간은 15초입니다.',
        promptEn: 'What time do you usually wake up on weekdays?',
        prepSeconds: 3,
        answerSeconds: 15,
      },
      {
        id: 'ts1-qa-02',
        examType: 'toeic-speaking',
        type: 'qa',
        order: 4,
        promptKo: '질문을 듣고 바로 답변하세요. 준비 시간은 3초이며, 답변 시간은 15초입니다.',
        promptEn: 'How do you usually get to work or school?',
        prepSeconds: 3,
        answerSeconds: 15,
      },
      {
        id: 'ts1-qa-03',
        examType: 'toeic-speaking',
        type: 'qa',
        order: 5,
        promptKo: '질문을 듣고 바로 답변하세요. 준비 시간은 3초이며, 답변 시간은 30초입니다.',
        promptEn:
          'Describe a time when you had to solve an unexpected problem at work or in your daily life. What happened and what did you do?',
        prepSeconds: 3,
        answerSeconds: 30,
      },
      {
        id: 'ts1-op-01',
        examType: 'toeic-speaking',
        type: 'opinion',
        order: 6,
        promptKo:
          '다음 주제에 대한 의견을 말해 주세요. 준비 시간은 45초이며, 답변 시간은 60초입니다. 찬성 또는 반대 입장을 선택하고 구체적인 이유를 들어 설명하세요.',
        promptEn:
          'Some people believe that employees are more productive when they work from home. Others think that working from the office leads to better results. Which do you prefer, and why?',
        prepSeconds: 45,
        answerSeconds: 60,
      },
    ],
  },

  // ──────────────────────────────────────────────
  // TOEIC SPEAKING — Form 2
  // ──────────────────────────────────────────────
  {
    examType: 'toeic-speaking',
    formId: 'ts-form-2',
    titleKo: '토익 스피킹 모의고사 2회',
    totalMinutes: 12,
    tasks: [
      {
        id: 'ts2-ra-01',
        examType: 'toeic-speaking',
        type: 'read-aloud',
        order: 1,
        promptKo: '다음 안내문을 소리 내어 읽어 주세요. 준비 시간은 45초이며, 답변 시간도 45초입니다.',
        promptEn:
          "Welcome to Greenfield Shopping Center. Our store hours are ten a.m. to nine p.m., Monday through Saturday, and eleven a.m. to seven p.m. on Sundays. Customer service is available at the information desk near the main entrance. We hope you enjoy your visit today.",
        prepSeconds: 45,
        answerSeconds: 45,
      },
      {
        id: 'ts2-ra-02',
        examType: 'toeic-speaking',
        type: 'read-aloud',
        order: 2,
        promptKo: '다음 공지문을 소리 내어 읽어 주세요. 준비 시간은 45초이며, 답변 시간도 45초입니다.',
        promptEn:
          'Dear valued customers, our online ordering system will undergo scheduled maintenance this Saturday from midnight to six a.m. During this window, you will be unable to place orders or access your account. We apologize for any inconvenience and appreciate your patience.',
        prepSeconds: 45,
        answerSeconds: 45,
      },
      {
        id: 'ts2-qa-01',
        examType: 'toeic-speaking',
        type: 'qa',
        order: 3,
        promptKo: '질문을 듣고 바로 답변하세요. 준비 시간은 3초이며, 답변 시간은 15초입니다.',
        promptEn: 'What do you typically do during your lunch break?',
        prepSeconds: 3,
        answerSeconds: 15,
      },
      {
        id: 'ts2-qa-02',
        examType: 'toeic-speaking',
        type: 'qa',
        order: 4,
        promptKo: '질문을 듣고 바로 답변하세요. 준비 시간은 3초이며, 답변 시간은 15초입니다.',
        promptEn: 'What kind of technology do you use most often at work or for studying?',
        prepSeconds: 3,
        answerSeconds: 15,
      },
      {
        id: 'ts2-qa-03',
        examType: 'toeic-speaking',
        type: 'qa',
        order: 5,
        promptKo: '질문을 듣고 바로 답변하세요. 준비 시간은 3초이며, 답변 시간은 30초입니다.',
        promptEn:
          'Talk about an experience where you had to work closely with a team to complete a project. What role did you play, and what was the outcome?',
        prepSeconds: 3,
        answerSeconds: 30,
      },
      {
        id: 'ts2-op-01',
        examType: 'toeic-speaking',
        type: 'opinion',
        order: 6,
        promptKo:
          '다음 주제에 대한 의견을 말해 주세요. 준비 시간은 45초이며, 답변 시간은 60초입니다. 찬성 또는 반대 입장을 선택하고 구체적인 이유를 들어 설명하세요.',
        promptEn:
          'Some people think that companies should require all employees to wear a uniform. Others believe people should be free to dress however they like at work. What is your opinion?',
        prepSeconds: 45,
        answerSeconds: 60,
      },
    ],
  },

  // ──────────────────────────────────────────────
  // OPIc — Form 1
  // ──────────────────────────────────────────────
  {
    examType: 'opic',
    formId: 'op-form-1',
    titleKo: '오픽 모의고사 1회',
    totalMinutes: 13,
    tasks: [
      {
        id: 'op1-si-01',
        examType: 'opic',
        type: 'self-intro',
        order: 1,
        promptKo:
          '자기소개를 해 주세요. 이름, 사는 곳, 하는 일 또는 학교생활, 가족 등 본인에 대해 자유롭게 이야기하세요. 준비 시간 없이 바로 시작하며, 답변 시간은 60초입니다.',
        promptEn:
          'Let\'s start with you introducing yourself. Tell me a little about who you are — where you live, what you do, your family, or anything else you\'d like to share.',
        prepSeconds: 0,
        answerSeconds: 60,
      },
      {
        id: 'op1-qa-01',
        examType: 'opic',
        type: 'qa',
        order: 2,
        promptKo:
          '여행에 관한 질문입니다. 준비 시간은 20초이며, 답변 시간은 60초입니다.',
        promptEn:
          'You said you like to travel. Tell me about a memorable trip you have taken. Where did you go, who did you go with, and what made it so special?',
        prepSeconds: 20,
        answerSeconds: 60,
      },
      {
        id: 'op1-qa-02',
        examType: 'opic',
        type: 'qa',
        order: 3,
        promptKo:
          '음악에 관한 질문입니다. 준비 시간은 20초이며, 답변 시간은 60초입니다.',
        promptEn:
          'Tell me about the kind of music you enjoy. Do you have a favorite artist or band? How and when do you usually listen to music?',
        prepSeconds: 20,
        answerSeconds: 60,
      },
      {
        id: 'op1-qa-03',
        examType: 'opic',
        type: 'qa',
        order: 4,
        promptKo:
          '운동에 관한 질문입니다. 준비 시간은 20초이며, 답변 시간은 60초입니다.',
        promptEn:
          'Do you exercise regularly? What kind of physical activity do you enjoy, and how often do you do it? Has your exercise routine changed over the years?',
        prepSeconds: 20,
        answerSeconds: 60,
      },
      {
        id: 'op1-rp-01',
        examType: 'opic',
        type: 'roleplay',
        order: 5,
        promptKo:
          '다음 상황에서 요청하거나 문제를 해결해 보세요. 준비 시간은 20초이며, 답변 시간은 60초입니다.',
        promptEn:
          "I'd like you to act out this situation. You are at a hotel and you realize your room has a broken air conditioner. Call the front desk, explain the situation, and ask them to fix it or provide an alternative solution.",
        prepSeconds: 20,
        answerSeconds: 60,
      },
      {
        id: 'op1-un-01',
        examType: 'opic',
        type: 'unexpected',
        order: 6,
        promptKo:
          '예상치 못한 질문입니다. 준비 시간은 20초이며, 답변 시간은 60초입니다.',
        promptEn:
          "More and more people are shopping online instead of going to physical stores. What do you think about this trend? Is it mostly good, mostly bad, or somewhere in between?",
        prepSeconds: 20,
        answerSeconds: 60,
      },
    ],
  },

  // ──────────────────────────────────────────────
  // OPIc — Form 2
  // ──────────────────────────────────────────────
  {
    examType: 'opic',
    formId: 'op-form-2',
    titleKo: '오픽 모의고사 2회',
    totalMinutes: 13,
    tasks: [
      {
        id: 'op2-si-01',
        examType: 'opic',
        type: 'self-intro',
        order: 1,
        promptKo:
          '자기소개를 해 주세요. 이름, 사는 곳, 하는 일 또는 학교생활, 가족 등 본인에 대해 자유롭게 이야기하세요. 준비 시간 없이 바로 시작하며, 답변 시간은 60초입니다.',
        promptEn:
          "Please introduce yourself. Tell me about who you are — your name, where you're from, what you do for a living or if you're a student, and anything interesting about yourself.",
        prepSeconds: 0,
        answerSeconds: 60,
      },
      {
        id: 'op2-qa-01',
        examType: 'opic',
        type: 'qa',
        order: 2,
        promptKo:
          '집/거주환경에 관한 질문입니다. 준비 시간은 20초이며, 답변 시간은 60초입니다.',
        promptEn:
          'Describe the place where you currently live. What does it look like? What do you like most about your home or neighborhood? Is there anything you wish were different?',
        prepSeconds: 20,
        answerSeconds: 60,
      },
      {
        id: 'op2-qa-02',
        examType: 'opic',
        type: 'qa',
        order: 3,
        promptKo:
          '여가 활동에 관한 질문입니다. 준비 시간은 20초이며, 답변 시간은 60초입니다.',
        promptEn:
          'What do you usually do in your free time? Do you have any hobbies or activities that you are passionate about? Tell me how you got into them.',
        prepSeconds: 20,
        answerSeconds: 60,
      },
      {
        id: 'op2-qa-03',
        examType: 'opic',
        type: 'qa',
        order: 4,
        promptKo:
          '식습관 및 음식에 관한 질문입니다. 준비 시간은 20초이며, 답변 시간은 60초입니다.',
        promptEn:
          'Tell me about your eating habits. Do you prefer cooking at home or eating out? Is there a type of cuisine or a specific dish that you particularly enjoy? Why?',
        prepSeconds: 20,
        answerSeconds: 60,
      },
      {
        id: 'op2-rp-01',
        examType: 'opic',
        type: 'roleplay',
        order: 5,
        promptKo:
          '다음 상황에서 요청하거나 문제를 해결해 보세요. 준비 시간은 20초이며, 답변 시간은 60초입니다.',
        promptEn:
          "I'd like you to act out this situation. You ordered a product online three weeks ago, but it has not arrived yet. Call the customer service center, explain the problem, and ask what can be done to resolve it.",
        prepSeconds: 20,
        answerSeconds: 60,
      },
      {
        id: 'op2-un-01',
        examType: 'opic',
        type: 'unexpected',
        order: 6,
        promptKo:
          '예상치 못한 질문입니다. 준비 시간은 20초이며, 답변 시간은 60초입니다.',
        promptEn:
          "Many young people today prefer to live in cities rather than in rural areas. What are the advantages and disadvantages of city life? Share your thoughts.",
        prepSeconds: 20,
        answerSeconds: 60,
      },
    ],
  },
];
