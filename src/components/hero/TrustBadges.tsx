'use client';

import type { Language } from '@/lib/i18n';
import { reviews, type Review } from './reviewData';

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg
          key={i}
          className={`w-2.5 h-2.5 ${i < rating ? 'text-yellow-400' : 'text-neutral-200 dark:text-white/10'}`}
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
    <div className="flex-shrink-0 w-[260px] p-3 rounded-xl bg-white dark:bg-white/[0.07] border border-neutral-200 dark:border-white/10 shadow-sm dark:shadow-none hover:shadow-md dark:hover:bg-white/10 transition-all">
      <div className="flex items-center gap-2 mb-1.5">
        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-[10px] text-white font-bold">
          {review.initial}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-medium text-neutral-800 dark:text-white/90">{review.name}</div>
        </div>
        <StarRating rating={review.rating} />
      </div>
      <p className="text-[11px] leading-relaxed text-neutral-500 dark:text-white/60">&ldquo;{review.text}&rdquo;</p>
    </div>
  );
}

export default function TrustBadges({ language }: { language: Language }) {
  return (
    <div className="mt-12 sm:mt-16">
      {/* Stats badges */}
      <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-8 mb-8">
        <div className="flex items-center gap-2">
          <div className="flex -space-x-1.5">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-rose-400 to-pink-500 border-2 border-[var(--background)] flex items-center justify-center text-[9px] font-bold text-white">E</div>
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 border-2 border-[var(--background)] flex items-center justify-center text-[9px] font-bold text-white">J</div>
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-400 to-purple-500 border-2 border-[var(--background)] flex items-center justify-center text-[9px] font-bold text-white">C</div>
          </div>
          <div>
            <div className="text-xs font-bold text-[var(--text-primary)]">3{language === 'ko' ? '명의 AI 튜터' : ' AI Tutors'}</div>
          </div>
        </div>

        <div className="w-px h-6 bg-[var(--border)] hidden sm:block" />

        <div className="text-center">
          <div className="text-xs font-bold text-[var(--text-primary)]">
            <span className="text-yellow-500">★</span> 4.9
          </div>
        </div>

        <div className="w-px h-6 bg-[var(--border)] hidden sm:block" />

        <div className="text-center">
          <div className="text-xs font-bold text-[var(--text-primary)]">50K+</div>
          <div className="text-[10px] text-[var(--text-muted)]">{language === 'ko' ? '대화 세션' : 'Conversations'}</div>
        </div>

        <div className="w-px h-6 bg-[var(--border)] hidden sm:block" />

        <div className="text-center">
          <div className="text-xs font-bold text-[var(--text-primary)]">24/7</div>
        </div>
      </div>

      {/* Single row review carousel */}
      <div className="relative overflow-hidden">
        {/* Fade edges */}
        <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-[var(--background)] to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-[var(--background)] to-transparent z-10 pointer-events-none" />

        <div
          className="flex gap-3 animate-[scroll-left_60s_linear_infinite]"
        >
          {/* All 21 reviews duplicated once for seamless loop — 60s duration ensures no visible repetition */}
          {[...reviews, ...reviews].map((review, i) => (
            <ReviewCard key={`${review.name}-${i}`} review={review} />
          ))}
        </div>
      </div>
    </div>
  );
}
