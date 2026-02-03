/**
 * SM-2 Spaced Repetition Algorithm (Simplified)
 *
 * Quality ratings:
 * 0 - Complete failure, no recall
 * 1 - Incorrect, but recognized when shown
 * 2 - Incorrect, but correct answer seemed easy to recall
 * 3 - Correct with serious difficulty
 * 4 - Correct with some hesitation
 * 5 - Perfect response
 */

export interface SM2Result {
  interval: number;       // Days until next review
  easeFactor: number;     // New ease factor
  repetitions: number;    // New repetition count
  nextReviewAt: Date;     // Next review date
}

export function calculateSM2(
  quality: number,        // 0-5 rating
  repetitions: number,    // Current repetition count
  easeFactor: number,     // Current ease factor (default 2.5)
  interval: number        // Current interval in days
): SM2Result {
  // Clamp quality to 0-5
  quality = Math.max(0, Math.min(5, quality));

  let newRepetitions: number;
  let newInterval: number;
  let newEaseFactor: number;

  if (quality < 3) {
    // Failed recall - reset
    newRepetitions = 0;
    newInterval = 1;
    newEaseFactor = easeFactor; // Keep ease factor unchanged on failure
  } else {
    // Successful recall
    newRepetitions = repetitions + 1;

    if (newRepetitions === 1) {
      newInterval = 1;
    } else if (newRepetitions === 2) {
      newInterval = 3;
    } else {
      newInterval = Math.round(interval * easeFactor);
    }

    // Update ease factor based on quality
    // EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
    newEaseFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));

    // Ease factor should not fall below 1.3
    newEaseFactor = Math.max(1.3, newEaseFactor);
  }

  // Cap interval at 180 days (6 months)
  newInterval = Math.min(newInterval, 180);

  // Calculate next review date
  const nextReviewAt = new Date();
  nextReviewAt.setDate(nextReviewAt.getDate() + newInterval);

  return {
    interval: newInterval,
    easeFactor: newEaseFactor,
    repetitions: newRepetitions,
    nextReviewAt,
  };
}

/**
 * Simple interval progression for users who prefer simpler system
 * Intervals: 1 -> 3 -> 7 -> 14 -> 30 -> 60 -> 90 -> 180 days
 */
export function calculateSimpleInterval(
  quality: number,
  currentInterval: number
): { interval: number; nextReviewAt: Date } {
  const intervals = [1, 3, 7, 14, 30, 60, 90, 180];

  let newInterval: number;

  if (quality < 3) {
    // Failed - reset to 1 day
    newInterval = 1;
  } else {
    // Success - move to next interval
    const currentIndex = intervals.indexOf(currentInterval);
    if (currentIndex === -1) {
      // Find closest interval
      const closestIndex = intervals.findIndex(i => i >= currentInterval);
      newInterval = intervals[Math.min(closestIndex + 1, intervals.length - 1)] || 180;
    } else {
      newInterval = intervals[Math.min(currentIndex + 1, intervals.length - 1)];
    }
  }

  const nextReviewAt = new Date();
  nextReviewAt.setDate(nextReviewAt.getDate() + newInterval);

  return { interval: newInterval, nextReviewAt };
}

/**
 * Get status based on repetitions and ease factor
 */
export function getCorrectionStatus(
  repetitions: number,
  easeFactor: number,
  interval: number
): 'active' | 'mastered' | 'difficult' {
  if (repetitions >= 5 && interval >= 30) {
    return 'mastered';
  }
  if (easeFactor < 1.8 || (repetitions > 3 && interval <= 3)) {
    return 'difficult';
  }
  return 'active';
}

/**
 * Format next review date for display
 */
export function formatNextReview(nextReviewAt: Date, language: 'en' | 'ko' = 'en'): string {
  const now = new Date();
  const diffTime = nextReviewAt.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) {
    return language === 'ko' ? '오늘 복습' : 'Review today';
  } else if (diffDays === 1) {
    return language === 'ko' ? '내일 복습' : 'Review tomorrow';
  } else if (diffDays <= 7) {
    return language === 'ko' ? `${diffDays}일 후 복습` : `Review in ${diffDays} days`;
  } else {
    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    const dateStr = nextReviewAt.toLocaleDateString(language === 'ko' ? 'ko-KR' : 'en-US', options);
    return language === 'ko' ? `${dateStr} 복습` : `Review on ${dateStr}`;
  }
}
