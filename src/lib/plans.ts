/**
 * Toss Payments subscription plan definitions — single source of truth for pricing.
 * 가격 변경은 이 파일만 수정하면 됨 (subscribe 페이지 / Toss confirm 양쪽에서 참조).
 */

export const PLANS = {
  monthly: {
    id: 'monthly' as const,
    name: '월간 이용권',
    price: 9900,
    durationDays: 30,
    label: '₩9,900/월',
    maxMembers: 1,
  },
  yearly: {
    id: 'yearly' as const,
    name: '연간 이용권',
    price: 79000,
    durationDays: 365,
    label: '₩79,000/년',
    maxMembers: 1,
  },
  'family-monthly': {
    id: 'family-monthly' as const,
    name: '가족 월간 이용권',
    price: 19900,
    durationDays: 30,
    label: '₩19,900/월',
    maxMembers: 4,
  },
  'family-yearly': {
    id: 'family-yearly' as const,
    name: '가족 연간 이용권',
    price: 149000,
    durationDays: 365,
    label: '₩149,000/년',
    maxMembers: 4,
  },
} as const;

export type PlanId = keyof typeof PLANS;

/** 가족 플랜 여부 */
export function isFamilyPlan(plan?: string): boolean {
  return plan === 'family-monthly' || plan === 'family-yearly';
}

/** 가족 구성원 수 상한 (결제자 본인 제외) */
export const MAX_FAMILY_MEMBERS = 3;
