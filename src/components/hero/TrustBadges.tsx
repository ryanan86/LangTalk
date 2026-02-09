'use client';

import { reviewRow1, reviewRow2, reviewRow3, type Review } from './reviewData';

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg
          key={i}
          className={`w-3 h-3 ${i < rating ? 'text-yellow-400' : 'text-white/10'}`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

function ReviewCard({ review }: { review: Review }) {
  return (
    <div className="flex-shrink-0 w-[280px] sm:w-[300px] p-4 rounded-2xl bg-white/[0.03] dark:bg-white/[0.03] border border-white/[0.06] dark:border-white/[0.06] backdrop-blur-sm
      light:bg-neutral-50 light:border-neutral-200
      hover:bg-white/[0.06] dark:hover:bg-white/[0.06] transition-colors">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500/80 to-pink-500/80 flex items-center justify-center text-xs text-white font-bold">
          {review.initial}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-white/90 dark:text-white/90">{review.name}</div>
          <div className="text-xs text-white/40 dark:text-white/40">{review.role}</div>
        </div>
        <StarRating rating={review.rating} />
      </div>
      <p className="text-xs leading-relaxed text-white/60 dark:text-white/60">&ldquo;{review.text}&rdquo;</p>
    </div>
  );
}

function ScrollingRow({
  reviews,
  direction,
  duration,
}: {
  reviews: Review[];
  direction: 'left' | 'right';
  duration: string;
}) {
  const animClass = direction === 'left' ? 'animate-[scroll-left_var(--duration)_linear_infinite]' : 'animate-[scroll-right_var(--duration)_linear_infinite]';

  return (
    <div className="relative overflow-hidden">
      {/* Fade edges */}
      <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-[var(--background)] to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-[var(--background)] to-transparent z-10 pointer-events-none" />

      <div
        className={`flex gap-4 ${animClass}`}
        style={{ '--duration': duration } as React.CSSProperties}
      >
        {/* Duplicate for infinite loop */}
        {[...reviews, ...reviews].map((review, i) => (
          <ReviewCard key={`${review.name}-${i}`} review={review} />
        ))}
      </div>
    </div>
  );
}

export default function TrustBadges({ language }: { language: 'ko' | 'en' }) {
  return (
    <div className="mt-16 sm:mt-20">
      {/* Stats badges */}
      <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-8 mb-10 sm:mb-14">
        <div className="flex items-center gap-2">
          <div className="flex -space-x-1.5">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 border-2 border-[var(--background)] flex items-center justify-center text-[10px]">👩🏼</div>
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-cyan-400 border-2 border-[var(--background)] flex items-center justify-center text-[10px]">👨🏻</div>
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-400 to-purple-400 border-2 border-[var(--background)] flex items-center justify-center text-[10px]">👩🏽</div>
          </div>
          <div>
            <div className="text-sm font-bold text-[var(--text-primary)]">3{language === 'ko' ? '명의 AI 튜터' : ' AI Tutors'}</div>
            <div className="text-xs text-[var(--text-muted)]">{language === 'ko' ? '원어민 수준 대화' : 'Native-level conversation'}</div>
          </div>
        </div>

        <div className="w-px h-8 bg-[var(--border)] hidden sm:block" />

        <div className="text-center">
          <div className="text-sm font-bold text-[var(--text-primary)]">
            <span className="text-yellow-500">★</span> 4.9
          </div>
          <div className="text-xs text-[var(--text-muted)]">{language === 'ko' ? '평균 만족도' : 'Avg. rating'}</div>
        </div>

        <div className="w-px h-8 bg-[var(--border)] hidden sm:block" />

        <div className="text-center">
          <div className="text-sm font-bold text-[var(--text-primary)]">50K+</div>
          <div className="text-xs text-[var(--text-muted)]">{language === 'ko' ? '대화 세션' : 'Conversations'}</div>
        </div>

        <div className="w-px h-8 bg-[var(--border)] hidden sm:block" />

        <div className="text-center">
          <div className="text-sm font-bold text-[var(--text-primary)]">24/7</div>
          <div className="text-xs text-[var(--text-muted)]">{language === 'ko' ? '언제든 연습' : 'Practice anytime'}</div>
        </div>
      </div>

      {/* Review carousel - 3 rows */}
      <div className="space-y-4">
        <ScrollingRow reviews={reviewRow1} direction="left" duration="30s" />
        <ScrollingRow reviews={reviewRow2} direction="right" duration="35s" />
        <div className="hidden md:block">
          <ScrollingRow reviews={reviewRow3} direction="left" duration="40s" />
        </div>
      </div>
    </div>
  );
}
