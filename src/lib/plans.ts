/**
 * Toss Payments subscription plan definitions
 */

export const PLANS = {
  monthly: {
    id: 'monthly' as const,
    name: '월간 이용권',
    price: 9900,
    durationDays: 30,
    label: '₩9,900/월',
  },
  yearly: {
    id: 'yearly' as const,
    name: '연간 이용권',
    price: 79000,
    durationDays: 365,
    label: '₩79,000/년',
  },
} as const;

export type PlanId = keyof typeof PLANS;
