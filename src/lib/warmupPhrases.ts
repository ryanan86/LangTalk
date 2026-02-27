export interface WarmupPhrase {
  english: string;
  korean: string;
  difficulty: 'easy' | 'medium' | 'stretch';
}

const warmupSets: WarmupPhrase[][] = [
  // Set 1
  [
    { english: "Hi, how are you?", korean: "안녕, 어떻게 지내?", difficulty: 'easy' },
    { english: "I've been really into cooking lately.", korean: "나 요즘 요리에 진짜 빠져 있어.", difficulty: 'medium' },
    { english: "If I could travel anywhere, I'd probably go to Japan.", korean: "아무 데나 여행할 수 있다면, 아마 일본에 갈 거야.", difficulty: 'stretch' },
  ],
  // Set 2
  [
    { english: "What do you do for fun?", korean: "재미로 뭐 해?", difficulty: 'easy' },
    { english: "What's your favorite thing about weekends?", korean: "주말에 가장 좋아하는 게 뭐야?", difficulty: 'medium' },
    { english: "I've been meaning to try that restaurant everyone's been talking about.", korean: "다들 얘기하는 그 식당 가보려고 했어.", difficulty: 'stretch' },
  ],
  // Set 3
  [
    { english: "I like coffee.", korean: "나 커피 좋아해.", difficulty: 'easy' },
    { english: "I usually go for a walk after dinner.", korean: "나 보통 저녁 먹고 산책해.", difficulty: 'medium' },
    { english: "I'm thinking about picking up a new hobby, maybe something creative.", korean: "새 취미를 시작할까 생각 중이야, 뭔가 창의적인 거.", difficulty: 'stretch' },
  ],
  // Set 4
  [
    { english: "The weather is nice today.", korean: "오늘 날씨 좋다.", difficulty: 'easy' },
    { english: "I watched a really good movie last weekend.", korean: "지난 주말에 진짜 좋은 영화 봤어.", difficulty: 'medium' },
    { english: "Honestly, I think the best part of my day is when I finally get to relax at home.", korean: "솔직히, 하루 중 가장 좋은 건 집에서 드디어 쉴 수 있을 때야.", difficulty: 'stretch' },
  ],
  // Set 5
  [
    { english: "I'm a little tired today.", korean: "나 오늘 좀 피곤해.", difficulty: 'easy' },
    { english: "Have you ever tried making your own bread?", korean: "직접 빵 만들어 본 적 있어?", difficulty: 'medium' },
    { english: "One thing I really want to do this year is learn to play the guitar.", korean: "올해 진짜 하고 싶은 건 기타 치는 법 배우는 거야.", difficulty: 'stretch' },
  ],
  // Set 6
  [
    { english: "I had pizza for lunch.", korean: "나 점심에 피자 먹었어.", difficulty: 'easy' },
    { english: "I've been listening to a lot of music recently.", korean: "나 최근에 음악을 많이 듣고 있어.", difficulty: 'medium' },
    { english: "It's funny how the older you get, the more you appreciate simple things.", korean: "나이 들수록 단순한 것들을 더 감사하게 되는 게 재밌어.", difficulty: 'stretch' },
  ],
  // Set 7
  [
    { english: "Do you have any pets?", korean: "반려동물 있어?", difficulty: 'easy' },
    { english: "I think I need to start exercising more often.", korean: "운동을 더 자주 시작해야 할 것 같아.", difficulty: 'medium' },
    { english: "If I had more free time, I'd probably spend it exploring different neighborhoods in the city.", korean: "시간이 더 있으면, 아마 도시의 다른 동네들을 탐험하면서 보낼 거야.", difficulty: 'stretch' },
  ],
];

export function getWarmupSet(): WarmupPhrase[] {
  const index = Math.floor(Math.random() * warmupSets.length);
  return warmupSets[index];
}
