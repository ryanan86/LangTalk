export type ShopIcon =
  | 'lightbulb'
  | 'bolt'
  | 'snowflake'
  | 'target'
  | 'graduation-cap';

export interface ShopItem {
  id: string;
  name: { ko: string; en: string };
  description: { ko: string; en: string };
  icon: ShopIcon;
  xpCost: number;
  category: 'hint' | 'boost' | 'cosmetic';
  effect?: { type: string; value: number; duration?: string };
}

export const SHOP_ITEMS: ShopItem[] = [
  {
    id: 'hint_token',
    name: { ko: '힌트 토큰', en: 'Hint Token' },
    description: { ko: '세션 중 AI 힌트 1회 사용', en: 'Use AI hint once during session' },
    icon: 'lightbulb',
    xpCost: 50,
    category: 'hint',
    effect: { type: 'hint', value: 1 },
  },
  {
    id: 'double_xp_boost',
    name: { ko: '더블 XP 부스트', en: 'Double XP Boost' },
    description: { ko: '다음 세션에서 XP 2배 획득', en: 'Earn 2x XP in your next session' },
    icon: 'bolt',
    xpCost: 200,
    category: 'boost',
    effect: { type: 'double_xp', value: 2, duration: '1session' },
  },
  {
    id: 'streak_freeze',
    name: { ko: '스트릭 프리즈', en: 'Streak Freeze' },
    description: { ko: '하루 스트릭을 유지시켜 줍니다', en: 'Protect your streak for one day' },
    icon: 'snowflake',
    xpCost: 150,
    category: 'boost',
    effect: { type: 'streak_freeze', value: 1 },
  },
  {
    id: 'extra_daily_challenge',
    name: { ko: '추가 일일 챌린지', en: 'Extra Daily Challenge' },
    description: { ko: '오늘 일일 챌린지 1회 추가', en: 'Get one extra daily challenge today' },
    icon: 'target',
    xpCost: 100,
    category: 'boost',
    effect: { type: 'extra_quest', value: 1 },
  },
  {
    id: 'premium_tutor_unlock',
    name: { ko: '튜터 잠금해제', en: 'Tutor Unlock' },
    description: { ko: '24시간 프리미엄 튜터 이용', en: 'Access premium tutor for 1 day' },
    icon: 'graduation-cap',
    xpCost: 300,
    category: 'boost',
    effect: { type: 'premium_tutor', value: 1, duration: '1day' },
  },
];
