export interface TopicCard {
  id: string;
  titleKo: string;
  titleEn: string;
  starterHint: string;
  category: 'worker' | 'student' | 'traveler' | 'general';
  difficulty: 'easy' | 'medium';
}

const topics: TopicCard[] = [
  // Worker (직장인)
  {
    id: 'worker-lunch',
    titleKo: '오늘 점심',
    titleEn: 'Today\'s Lunch',
    starterHint: 'For lunch today, I had...',
    category: 'worker',
    difficulty: 'easy',
  },
  {
    id: 'worker-commute',
    titleKo: '출퇴근',
    titleEn: 'Commute',
    starterHint: 'My commute to work is...',
    category: 'worker',
    difficulty: 'easy',
  },
  {
    id: 'worker-meetings',
    titleKo: '회의',
    titleEn: 'Meetings',
    starterHint: 'I had a meeting today about...',
    category: 'worker',
    difficulty: 'medium',
  },
  {
    id: 'worker-weekend',
    titleKo: '주말 계획',
    titleEn: 'Weekend Plans',
    starterHint: 'This weekend, I\'m planning to...',
    category: 'worker',
    difficulty: 'easy',
  },
  {
    id: 'worker-hobbies',
    titleKo: '퇴근 후 취미',
    titleEn: 'After-Work Hobbies',
    starterHint: 'After work, I usually...',
    category: 'worker',
    difficulty: 'medium',
  },
  {
    id: 'worker-coworkers',
    titleKo: '동료',
    titleEn: 'Coworkers',
    starterHint: 'My coworker and I were talking about...',
    category: 'worker',
    difficulty: 'medium',
  },

  // Student (학생)
  {
    id: 'student-class',
    titleKo: '좋아하는 수업',
    titleEn: 'Favorite Class',
    starterHint: 'My favorite class is...',
    category: 'student',
    difficulty: 'easy',
  },
  {
    id: 'student-school-life',
    titleKo: '학교생활',
    titleEn: 'School Life',
    starterHint: 'At school today...',
    category: 'student',
    difficulty: 'easy',
  },
  {
    id: 'student-friends',
    titleKo: '친구',
    titleEn: 'Friends',
    starterHint: 'My friend and I like to...',
    category: 'student',
    difficulty: 'easy',
  },
  {
    id: 'student-study-tips',
    titleKo: '공부 팁',
    titleEn: 'Study Tips',
    starterHint: 'When I study, I usually...',
    category: 'student',
    difficulty: 'medium',
  },
  {
    id: 'student-future',
    titleKo: '장래 희망',
    titleEn: 'Future Plans',
    starterHint: 'In the future, I want to...',
    category: 'student',
    difficulty: 'medium',
  },

  // Traveler (여행자)
  {
    id: 'traveler-last-trip',
    titleKo: '최근 여행',
    titleEn: 'Last Trip',
    starterHint: 'The last place I traveled to was...',
    category: 'traveler',
    difficulty: 'easy',
  },
  {
    id: 'traveler-plans',
    titleKo: '여행 계획',
    titleEn: 'Travel Plans',
    starterHint: 'I\'m planning to visit...',
    category: 'traveler',
    difficulty: 'medium',
  },
  {
    id: 'traveler-destinations',
    titleKo: '꿈의 여행지',
    titleEn: 'Dream Destinations',
    starterHint: 'If I could go anywhere, I\'d go to...',
    category: 'traveler',
    difficulty: 'medium',
  },
  {
    id: 'traveler-food',
    titleKo: '여행지 음식',
    titleEn: 'Travel Food',
    starterHint: 'The best food I had while traveling was...',
    category: 'traveler',
    difficulty: 'easy',
  },

  // General (공통)
  {
    id: 'general-food',
    titleKo: '좋아하는 음식',
    titleEn: 'Favorite Food',
    starterHint: 'My favorite food is...',
    category: 'general',
    difficulty: 'easy',
  },
  {
    id: 'general-weather',
    titleKo: '날씨',
    titleEn: 'Weather',
    starterHint: 'The weather today is...',
    category: 'general',
    difficulty: 'easy',
  },
  {
    id: 'general-movies',
    titleKo: '영화',
    titleEn: 'Movies',
    starterHint: 'I recently watched...',
    category: 'general',
    difficulty: 'easy',
  },
  {
    id: 'general-music',
    titleKo: '음악',
    titleEn: 'Music',
    starterHint: 'I\'ve been listening to...',
    category: 'general',
    difficulty: 'easy',
  },
  {
    id: 'general-pets',
    titleKo: '반려동물',
    titleEn: 'Pets',
    starterHint: 'I have a pet... / I wish I had a...',
    category: 'general',
    difficulty: 'easy',
  },
  {
    id: 'general-cooking',
    titleKo: '요리',
    titleEn: 'Cooking',
    starterHint: 'I tried cooking...',
    category: 'general',
    difficulty: 'medium',
  },
  {
    id: 'general-exercise',
    titleKo: '운동',
    titleEn: 'Exercise',
    starterHint: 'I like to exercise by...',
    category: 'general',
    difficulty: 'easy',
  },
  {
    id: 'general-seasons',
    titleKo: '좋아하는 계절',
    titleEn: 'Favorite Season',
    starterHint: 'My favorite season is...',
    category: 'general',
    difficulty: 'easy',
  },
];

export function getTopicSuggestions(options?: { category?: string; count?: number }): TopicCard[] {
  let filtered = [...topics];

  if (options?.category) {
    filtered = filtered.filter((t) => t.category === options.category);
  }

  if (options?.count && options.count < filtered.length) {
    const shuffled = shuffleTopics(filtered);
    return shuffled.slice(0, options.count);
  }

  return filtered;
}

export function shuffleTopics(topics: TopicCard[]): TopicCard[] {
  const arr = [...topics];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
