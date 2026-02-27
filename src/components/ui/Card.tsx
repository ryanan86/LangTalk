'use client';

import React from 'react';
import { cn } from '@/lib/cn';

// ─── Variant & Padding Maps ───────────────────────────────────────────────────

const variantClasses = {
  /**
   * Glass morphism card — matches the existing dark:bg-white/[0.04] / backdrop-blur
   * pattern used throughout the app (e.g. QuickActions, BottomNav).
   */
  default: [
    'bg-white/80 dark:bg-white/[0.04]',
    'border border-black/[0.06] dark:border-white/[0.06]',
    'backdrop-blur-xl',
    'shadow-card dark:shadow-none',
  ].join(' '),

  outlined: [
    'bg-white dark:bg-neutral-900',
    'border-2 border-neutral-200 dark:border-neutral-700',
  ].join(' '),

  flat: [
    'bg-neutral-50 dark:bg-neutral-800/50',
    'border border-transparent',
  ].join(' '),
} as const;

const paddingClasses = {
  none: '',
  sm: 'p-3',
  md: 'p-5',
  lg: 'p-7',
} as const;

// ─── Props ────────────────────────────────────────────────────────────────────

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: keyof typeof variantClasses;
  padding?: keyof typeof paddingClasses;
  /** Adds hover lift + cursor pointer — use for clickable cards */
  interactive?: boolean;
}

// ─── Component ───────────────────────────────────────────────────────────────

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  (
    {
      variant = 'default',
      padding = 'md',
      interactive = false,
      className,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={cn(
          'rounded-3xl',
          variantClasses[variant],
          paddingClasses[padding],
          interactive && [
            'cursor-pointer',
            'transition-all duration-300',
            'hover:scale-[1.01]',
            'hover:shadow-card-hover dark:hover:bg-white/[0.06]',
          ].join(' '),
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

export default Card;
