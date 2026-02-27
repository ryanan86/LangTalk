'use client';

import React from 'react';
import { cn } from '@/lib/cn';

// ─── Variant & Size Maps ──────────────────────────────────────────────────────

const variantClasses = {
  default: [
    'bg-neutral-100 dark:bg-white/[0.06]',
    'text-neutral-600 dark:text-neutral-300',
    'border border-neutral-200 dark:border-white/[0.08]',
    'hover:bg-neutral-200 dark:hover:bg-white/[0.10]',
    'hover:text-neutral-900 dark:hover:text-white',
  ].join(' '),

  ghost: [
    'bg-transparent',
    'text-neutral-500 dark:text-neutral-400',
    'hover:bg-neutral-100 dark:hover:bg-white/[0.05]',
    'hover:text-neutral-900 dark:hover:text-white',
  ].join(' '),

  primary: [
    'bg-gradient-to-br from-violet-600 to-indigo-500',
    'text-white',
    'shadow-lg shadow-violet-500/20',
    'hover:opacity-90 hover:shadow-violet-500/30',
  ].join(' '),
} as const;

const sizeClasses = {
  sm: 'w-8 h-8',
  md: 'w-10 h-10',
  lg: 'w-12 h-12',
} as const;

const iconSizeClasses = {
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6',
} as const;

// ─── Spinner ──────────────────────────────────────────────────────────────────

function Spinner({ size }: { size: 'sm' | 'md' | 'lg' }) {
  return (
    <svg
      className={cn(iconSizeClasses[size], 'animate-spin')}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Accessible label — required for icon-only buttons */
  'aria-label': string;
  variant?: keyof typeof variantClasses;
  size?: keyof typeof sizeClasses;
  loading?: boolean;
}

// ─── Component ───────────────────────────────────────────────────────────────

const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    {
      variant = 'default',
      size = 'md',
      loading = false,
      disabled = false,
      className,
      children,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={cn(
          'inline-flex items-center justify-center',
          'rounded-full',
          'transition-all duration-200 ease-out',
          'active:scale-[0.92]',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-neutral-900',
          variantClasses[variant],
          sizeClasses[size],
          isDisabled && 'opacity-50 pointer-events-none',
          className
        )}
        aria-busy={loading}
        {...props}
      >
        {loading ? (
          <Spinner size={size} />
        ) : (
          // Wrap children to enforce icon size via className on the child
          <span className={cn(iconSizeClasses[size], 'flex items-center justify-center')}>
            {children}
          </span>
        )}
      </button>
    );
  }
);

IconButton.displayName = 'IconButton';

export default IconButton;
