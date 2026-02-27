'use client';

import React, { useId } from 'react';
import { cn } from '@/lib/cn';

// ─── Props ────────────────────────────────────────────────────────────────────

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'prefix'> {
  /** Visible label above the input */
  label?: string;
  /** Helper text below the input (shown when no error) */
  helperText?: string;
  /** Error message — triggers error styling */
  error?: string;
  /** Element rendered before the input (icon, currency symbol, etc.) */
  prefix?: React.ReactNode;
  /** Element rendered after the input (clear button, unit, etc.) */
  suffix?: React.ReactNode;
}

// ─── Component ───────────────────────────────────────────────────────────────

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      helperText,
      error,
      prefix,
      suffix,
      className,
      disabled,
      id: idProp,
      ...props
    },
    ref
  ) => {
    const autoId = useId();
    const id = idProp ?? autoId;
    const errorId = `${id}-error`;
    const helperId = `${id}-helper`;
    const hasError = Boolean(error);

    return (
      <div className="flex flex-col gap-1.5">
        {/* Label */}
        {label && (
          <label
            htmlFor={id}
            className="text-xs font-semibold text-neutral-700 dark:text-neutral-300"
          >
            {label}
          </label>
        )}

        {/* Input wrapper */}
        <div
          className={cn(
            'flex items-center gap-2',
            'h-10',
            'rounded-2xl',
            'px-3',
            'border',
            'transition-all duration-200',
            // Default state
            !hasError && [
              'bg-white dark:bg-white/[0.05]',
              'border-neutral-200 dark:border-white/[0.08]',
              'focus-within:border-violet-500 dark:focus-within:border-violet-400',
              'focus-within:ring-2 focus-within:ring-violet-500/20 dark:focus-within:ring-violet-400/20',
            ].join(' '),
            // Error state
            hasError && [
              'bg-red-50 dark:bg-red-500/[0.06]',
              'border-red-400 dark:border-red-500/50',
              'focus-within:ring-2 focus-within:ring-red-400/20',
            ].join(' '),
            // Disabled
            disabled && 'opacity-50 pointer-events-none bg-neutral-50 dark:bg-white/[0.02]',
          )}
        >
          {/* Prefix */}
          {prefix && (
            <span className="flex-shrink-0 text-neutral-400 dark:text-neutral-500">
              {prefix}
            </span>
          )}

          {/* Input */}
          <input
            ref={ref}
            id={id}
            disabled={disabled}
            aria-invalid={hasError}
            aria-describedby={
              hasError ? errorId : helperText ? helperId : undefined
            }
            className={cn(
              'flex-1 min-w-0 h-full',
              'bg-transparent',
              'text-sm text-neutral-900 dark:text-white',
              'placeholder:text-neutral-400 dark:placeholder:text-neutral-600',
              'focus:outline-none',
              className
            )}
            {...props}
          />

          {/* Suffix */}
          {suffix && (
            <span className="flex-shrink-0 text-neutral-400 dark:text-neutral-500">
              {suffix}
            </span>
          )}
        </div>

        {/* Error / Helper text */}
        {hasError ? (
          <p id={errorId} className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
            <svg className="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {error}
          </p>
        ) : helperText ? (
          <p id={helperId} className="text-xs text-neutral-400 dark:text-neutral-500">
            {helperText}
          </p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
