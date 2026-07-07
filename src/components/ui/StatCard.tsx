'use client';

import React, { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/cn';

// ─── Count-up hook ────────────────────────────────────────────────────────────
//
// Animates 0 → target with requestAnimationFrame. Respects reduced-motion by
// jumping straight to the target. Pure presentation — never blocks render.

function useCountUp(target: number, run: boolean, durationMs = 900) {
  const [display, setDisplay] = useState(run ? 0 : target);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!run) {
      setDisplay(target);
      return;
    }
    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced || target === 0) {
      setDisplay(target);
      return;
    }

    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      // easeOutCubic
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(eased * target));
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [target, run, durationMs]);

  return display;
}

// ─── Trend chip ───────────────────────────────────────────────────────────────

type Trend = { direction: 'up' | 'down' | 'flat'; label: string };

function TrendChip({ trend }: { trend: Trend }) {
  const color =
    trend.direction === 'up'
      ? 'text-emerald-600 dark:text-emerald-400'
      : trend.direction === 'down'
        ? 'text-red-500 dark:text-red-400'
        : 'text-neutral-400 dark:text-neutral-500';
  return (
    <span className={cn('inline-flex items-center gap-0.5 text-xs font-semibold', color)}>
      {trend.direction !== 'flat' && (
        <svg
          className={cn('w-3 h-3', trend.direction === 'down' && 'rotate-180')}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M7 14l5-5 5 5" />
        </svg>
      )}
      {trend.label}
    </span>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

export interface StatCardProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  /**
   * Numeric value — animates a count-up on mount. For non-numeric values
   * (e.g. a CEFR level "B2"), pass `display` instead.
   */
  value?: number;
  /** Rendered verbatim in place of the animated number (e.g. "B2", "—") */
  display?: React.ReactNode;
  /** Text after the number, e.g. "일", "%", "개" */
  suffix?: string;
  /** Small leading icon slot */
  icon?: React.ReactNode;
  trend?: Trend;
  /** Tint the value in the brand colour for emphasis */
  accent?: boolean;
  /** Disable the count-up (renders final value immediately) */
  animate?: boolean;
}

// ─── Component ───────────────────────────────────────────────────────────────

const StatCard = React.forwardRef<HTMLDivElement, StatCardProps>(
  (
    {
      label,
      value,
      display,
      suffix,
      icon,
      trend,
      accent = false,
      animate = true,
      className,
      ...props
    },
    ref
  ) => {
    const shouldCount = display == null && typeof value === 'number' && animate;
    const counted = useCountUp(typeof value === 'number' ? value : 0, shouldCount);

    return (
      <div
        ref={ref}
        className={cn(
          'p-4 rounded-card-lg',
          'bg-white/80 dark:bg-white/[0.04] backdrop-blur-xl',
          'border border-black/[0.05] dark:border-white/[0.06]',
          'shadow-card dark:shadow-card-dark',
          className
        )}
        {...props}
      >
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 truncate">
            {label}
          </p>
          {icon && (
            <span className="text-neutral-400 dark:text-neutral-500 flex-shrink-0" aria-hidden="true">
              {icon}
            </span>
          )}
        </div>
        <div className="mt-1.5 flex items-end justify-between gap-2">
          <p
            className={cn(
              'text-2xl font-extrabold tabular-nums tracking-tight leading-none',
              accent ? 'text-primary-600 dark:text-primary-400' : 'text-neutral-900 dark:text-white'
            )}
          >
            {display != null ? display : counted}
            {suffix && <span className="text-base font-bold ml-0.5">{suffix}</span>}
          </p>
          {trend && <TrendChip trend={trend} />}
        </div>
      </div>
    );
  }
);

StatCard.displayName = 'StatCard';

export default StatCard;
