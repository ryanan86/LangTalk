'use client';

import React from 'react';
import { cn } from '@/lib/cn';

// ─── Shape Map ────────────────────────────────────────────────────────────────

const shapeClasses = {
  line: 'rounded-md h-4',
  circle: 'rounded-full',
  rect: 'rounded-card',
} as const;

// ─── Props ────────────────────────────────────────────────────────────────────

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  shape?: keyof typeof shapeClasses;
  /** Inline width — number → px, string → passthrough (e.g. '60%') */
  width?: number | string;
  /** Inline height — number → px, string → passthrough */
  height?: number | string;
}

// ─── Component ───────────────────────────────────────────────────────────────
//
// Sized-to-content loading surface. Always give it a width/height (or size it
// via className) so it reserves the exact space of the content it replaces —
// this is what prevents layout shift when the real content mounts.

const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
  ({ shape = 'line', width, height, className, style, ...props }, ref) => {
    return (
      <div
        ref={ref}
        aria-hidden="true"
        className={cn('skeleton', shapeClasses[shape], className)}
        style={{
          width: typeof width === 'number' ? `${width}px` : width,
          height: typeof height === 'number' ? `${height}px` : height,
          ...style,
        }}
        {...props}
      />
    );
  }
);

Skeleton.displayName = 'Skeleton';

export default Skeleton;
