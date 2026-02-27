'use client';

import React from 'react';
import { cn } from '@/lib/cn';

// ─── Variant & Size Maps ──────────────────────────────────────────────────────

const variantClasses = {
  default: 'bg-neutral-100 dark:bg-white/[0.08] text-neutral-600 dark:text-neutral-300',
  success: 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300',
  warning: 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300',
  error:   'bg-red-100   dark:bg-red-500/20   text-red-700   dark:text-red-300',
  info:    'bg-sky-100   dark:bg-sky-500/20   text-sky-700   dark:text-sky-300',
} as const;

const dotVariantClasses = {
  default: 'bg-neutral-400',
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  error:   'bg-red-500',
  info:    'bg-sky-500',
} as const;

const sizeClasses = {
  sm: 'px-2 py-0.5 text-[10px] gap-1',
  md: 'px-2.5 py-1 text-xs gap-1.5',
} as const;

const dotSizeClasses = {
  sm: 'w-1.5 h-1.5',
  md: 'w-2 h-2',
} as const;

// ─── Props ────────────────────────────────────────────────────────────────────

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: keyof typeof variantClasses;
  size?: keyof typeof sizeClasses;
  /** Show a coloured dot indicator on the left */
  dot?: boolean;
}

// ─── Component ───────────────────────────────────────────────────────────────

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  (
    {
      variant = 'default',
      size = 'md',
      dot = false,
      className,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center font-semibold rounded-full',
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        {...props}
      >
        {dot && (
          <span
            className={cn(
              'rounded-full flex-shrink-0',
              dotVariantClasses[variant],
              dotSizeClasses[size]
            )}
            aria-hidden="true"
          />
        )}
        {children}
      </span>
    );
  }
);

Badge.displayName = 'Badge';

export default Badge;
