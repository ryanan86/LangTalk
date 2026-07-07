'use client';

import React from 'react';
import { cn } from '@/lib/cn';

// ─── Props ────────────────────────────────────────────────────────────────────

export interface SectionHeaderProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  title: React.ReactNode;
  /** Optional supporting line under the title */
  subtitle?: React.ReactNode;
  /** Optional trailing slot — a link, badge or button aligned to the right */
  action?: React.ReactNode;
  /** Optional leading accent icon (violet chip) */
  icon?: React.ReactNode;
}

// ─── Component ───────────────────────────────────────────────────────────────
//
// The single source of truth for section rhythm. Titles use the display-2 scale
// (tighter tracking) so mixed Korean + Latin headings read as one confident block.

const SectionHeader = React.forwardRef<HTMLDivElement, SectionHeaderProps>(
  ({ title, subtitle, action, icon, className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('flex items-center justify-between gap-3 mb-4', className)}
        {...props}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          {icon && (
            <span
              aria-hidden="true"
              className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-xl bg-primary-100 dark:bg-primary-500/15 text-primary-600 dark:text-primary-400"
            >
              {icon}
            </span>
          )}
          <div className="min-w-0">
            <h2 className="text-display-2 text-neutral-900 dark:text-white truncate">
              {title}
            </h2>
            {subtitle && (
              <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5 truncate">
                {subtitle}
              </p>
            )}
          </div>
        </div>
        {action && <div className="flex-shrink-0">{action}</div>}
      </div>
    );
  }
);

SectionHeader.displayName = 'SectionHeader';

export default SectionHeader;
