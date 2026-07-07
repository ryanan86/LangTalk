'use client';

import { cn } from '@/lib/cn';

// ─── Spark SVG icon ───────────────────────────────────────────────────────────

function SparkIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 12 12"
      fill="currentColor"
      aria-hidden="true"
    >
      {/* Simple 4-point spark / sparkle */}
      <path d="M6 0 L6.6 4.8 L12 6 L6.6 7.2 L6 12 L5.4 7.2 L0 6 L5.4 4.8 Z" />
    </svg>
  );
}

// ─── Variant map (neutral & violet low-saturation tones) ──────────────────────

const variantClasses = {
  neutral:
    'bg-neutral-100 dark:bg-white/[0.08] text-neutral-500 dark:text-neutral-400',
  violet:
    'bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400',
} as const;

// ─── Props ────────────────────────────────────────────────────────────────────

export interface AiBadgeProps {
  variant?: keyof typeof variantClasses;
  className?: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function AiBadge({
  variant = 'neutral',
  className,
}: AiBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 px-1.5 py-0.5',
        'text-[10px] font-semibold rounded-full',
        variantClasses[variant],
        className
      )}
      aria-label="생성형 AI가 생성한 콘텐츠"
    >
      <SparkIcon className="w-2 h-2 flex-shrink-0" />
      AI
    </span>
  );
}
