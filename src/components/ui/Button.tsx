'use client';

import React from 'react';
import { cn } from '@/lib/cn';

// ─── Variant & Size Maps ──────────────────────────────────────────────────────

const variantClasses = {
  primary: [
    'bg-gradient-to-r from-violet-600 to-indigo-500',
    'text-white',
    'shadow-lg shadow-violet-500/20',
    'hover:opacity-90 hover:shadow-violet-500/30',
    'active:scale-[0.98]',
    'border border-transparent',
  ].join(' '),

  secondary: [
    'bg-neutral-100 dark:bg-white/[0.06]',
    'text-neutral-700 dark:text-white',
    'border border-neutral-200 dark:border-white/[0.08]',
    'hover:bg-neutral-200 dark:hover:bg-white/[0.10]',
    'active:scale-[0.98]',
  ].join(' '),

  ghost: [
    'bg-transparent',
    'text-neutral-600 dark:text-neutral-400',
    'border border-transparent',
    'hover:bg-neutral-100 dark:hover:bg-white/[0.05]',
    'hover:text-neutral-900 dark:hover:text-white',
    'active:scale-[0.98]',
  ].join(' '),

  danger: [
    'bg-red-500/10 dark:bg-red-500/10',
    'text-red-600 dark:text-red-400',
    'border border-red-200 dark:border-red-500/20',
    'hover:bg-red-500/20 dark:hover:bg-red-500/20',
    'active:scale-[0.98]',
  ].join(' '),
} as const;

const sizeClasses = {
  sm: 'h-8 px-3 text-xs gap-1.5 rounded-xl',
  md: 'h-10 px-4 text-sm gap-2 rounded-2xl',
  lg: 'h-12 px-6 text-base gap-2.5 rounded-2xl',
} as const;

// ─── Spinner ──────────────────────────────────────────────────────────────────

function Spinner({ size }: { size: 'sm' | 'md' | 'lg' }) {
  const dim = { sm: 'w-3 h-3', md: 'w-4 h-4', lg: 'w-5 h-5' }[size];
  return (
    <svg
      className={cn(dim, 'animate-spin')}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof variantClasses;
  size?: keyof typeof sizeClasses;
  fullWidth?: boolean;
  loading?: boolean;
  /** Render as a different element, e.g. pass a Next.js Link component */
  asChild?: boolean;
}

// ─── Component ───────────────────────────────────────────────────────────────

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      fullWidth = false,
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
          // Base
          'inline-flex items-center justify-center font-semibold',
          'transition-all duration-200 ease-out',
          'select-none cursor-pointer',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-neutral-900',
          // Variants & Sizes
          variantClasses[variant],
          sizeClasses[size],
          // Modifiers
          fullWidth && 'w-full',
          isDisabled && 'opacity-50 pointer-events-none',
          className
        )}
        aria-busy={loading}
        {...props}
      >
        {loading && <Spinner size={size} />}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;
