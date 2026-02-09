export interface Review {
  name: string;
  initial: string;
  role: string;
  rating: number;
  text: string;
}

export const reviews: Review[] = [
  // Row 1 (좌→우)
  {
    name: '김지훈',
    initial: '김',
    role: '직장인 · 30대',
    rating: 5,
    text: '출퇴근 지하철에서 10분씩 했는데 3개월 만에 영어 미팅 자신감이 생겼어요',
  },
  {
    name: '박서연',
    initial: '박',
    role: '학부모 · 40대',
    rating: 5,
    text: '아이가 Emma랑 대화하는 걸 너무 좋아해요. 학원보다 효과적',
  },
  {
    name: '이준호',
    initial: '이',
    role: '대학생 · 20대',
    rating: 5,
    text: '호주 워홀 가기 전에 한 달 쓴 게 진짜 도움 됐어요',
  },
  {
    name: '최예진',
    initial: '최',
    role: '프리랜서 · 30대',
    rating: 5,
    text: '발음 교정이 실시간이라 원어민 수업 못지않아요',
  },
  {
    name: '정민수',
    initial: '정',
    role: '개발자 · 30대',
    rating: 5,
    text: '영어 기술 면접 준비에 매일 쓰고 있어요. AI가 진짜 잘 고쳐줌',
  },
  {
    name: '한소희',
    initial: '한',
    role: '간호사 · 20대',
    rating: 4,
    text: '야간 근무 끝나고 새벽에도 연습할 수 있어서 좋아요',
  },
  {
    name: '윤태호',
    initial: '윤',
    role: '자영업 · 50대',
    rating: 5,
    text: '외국인 손님 응대가 편해졌어요. 실전 회화 연습이 최고',
  },
  // Row 2 (우→좌)
  {
    name: '강다은',
    initial: '강',
    role: '디자이너 · 20대',
    rating: 5,
    text: '해외 클라이언트 미팅 전에 항상 연습해요. 긴장이 확 줄었어요',
  },
  {
    name: '송현우',
    initial: '송',
    role: '고등학생 · 10대',
    rating: 5,
    text: '수능 영어 듣기가 쉬워졌어요. 대화하면서 배우니까 재밌음',
  },
  {
    name: '임지현',
    initial: '임',
    role: '주부 · 40대',
    rating: 5,
    text: '아이 영어 숙제 도와주다가 저도 빠졌어요. 같이 하니까 더 좋아요',
  },
  {
    name: '오승준',
    initial: '오',
    role: '무역회사 · 30대',
    rating: 5,
    text: '비즈니스 이메일 표현을 대화로 배우니까 바로 쓸 수 있어요',
  },
  {
    name: '배수진',
    initial: '배',
    role: '대학원생 · 20대',
    rating: 4,
    text: '논문 발표 영어 연습에 딱이에요. 피드백이 구체적이라 좋아요',
  },
  {
    name: '신동혁',
    initial: '신',
    role: '회사원 · 40대',
    rating: 5,
    text: '해외 출장 일주일 전부터 집중 연습하면 현지에서 차이를 느껴요',
  },
  {
    name: '홍유나',
    initial: '홍',
    role: '승무원 · 20대',
    rating: 5,
    text: '다양한 튜터 성격이 실제 승객 대응 연습이 돼요',
  },
  // Row 3 (좌→우)
  {
    name: '문재영',
    initial: '문',
    role: '스타트업 대표 · 30대',
    rating: 5,
    text: '투자 피칭 영어를 AI랑 반복 연습하니까 자신감이 붙었어요',
  },
  {
    name: '양미래',
    initial: '양',
    role: '요리사 · 30대',
    rating: 5,
    text: '외국인 셰프와 소통이 편해졌어요. 주방 영어가 늘었다고 칭찬받음',
  },
  {
    name: '조은서',
    initial: '조',
    role: '중학생 · 10대',
    rating: 5,
    text: '학원 숙제보다 재밌어서 매일 자발적으로 해요. 엄마가 좋아해요',
  },
  {
    name: '류성민',
    initial: '류',
    role: '교수 · 50대',
    rating: 5,
    text: '국제학회 발표 준비할 때 유용해요. 문법 실수를 바로 잡아줘서',
  },
  {
    name: '차하늘',
    initial: '차',
    role: '유튜버 · 20대',
    rating: 4,
    text: '영어 콘텐츠 만들 때 표현 체크용으로 쓰고 있어요',
  },
  {
    name: '권도윤',
    initial: '권',
    role: '은퇴자 · 60대',
    rating: 5,
    text: '손주랑 영어로 대화하고 싶어서 시작했는데 6개월째 꾸준히 하고 있어요',
  },
  {
    name: '남지우',
    initial: '남',
    role: '마케터 · 30대',
    rating: 5,
    text: '글로벌 캠페인 회의에서 의견을 영어로 말할 수 있게 됐어요',
  },
];

// 3줄로 나누기
export const reviewRow1 = reviews.slice(0, 7);
export const reviewRow2 = reviews.slice(7, 14);
export const reviewRow3 = reviews.slice(14, 21);
