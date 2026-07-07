'use client';

import React from 'react';
import { cn } from '@/lib/cn';

// ─── Variant & Size Maps ──────────────────────────────────────────────────────

const fillVariantClasses = {
  brand: 'bg-brand-gradient',
  solid: 'bg-primary-500',
  amber: 'bg-amber-400',
  emerald: 'bg-emerald-500',
} as const;

const sizeClasses = {
  sm: 'h-1.5',
  md: 'h-2.5',
  lg: 'h-3.5',
} as const;

// ─── Props ────────────────────────────────────────────────────────────────────

export interface ProgressBarProps extends React.HTMLAttributes<HTMLDivElement> {
  /** 0–100 */
  value: number;
  variant?: keyof typeof fillVariantClasses;
  size?: keyof typeof sizeClasses;
  /** Animate the fill growing in on mount */
  animated?: boolean;
  /** Optional accessible label for the track */
  label?: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

const ProgressBar = React.forwardRef<HTMLDivElement, ProgressBarProps>(
  (
    { value, variant = 'brand', size = 'md', animated = true, label, className, ...props },
    ref
  ) => {
    const clamped = Math.max(0, Math.min(100, value));

    return (
      <div
        ref={ref}
        role="progressbar"
        aria-valuenow={Math.round(clamped)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
        className={cn(
          'relative w-full overflow-hidden rounded-full',
          'bg-neutral-200/80 dark:bg-white/[0.08]',
          sizeClasses[size],
          className
        )}
        {...props}
      >
        <div
          className={cn(
            'h-full rounded-full',
            fillVariantClasses[variant],
            animated && 'transition-[width] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none'
          )}
          style={{ width: `${clamped}%` }}
        />
      </div>
    );
  }
);

ProgressBar.displayName = 'ProgressBar';

export default ProgressBar;
