type LevelDetails = {
  grammar: number;
  vocabulary: number;
  fluency: number;
  comprehension: number;
} | null;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function scoreFromGrade(grade?: string | null): number {
  if (!grade) return 45;
  const map: Record<string, number> = {
    K: 25,
    '1-2': 35,
    '3-4': 45,
    '5-6': 52,
    '7-8': 60,
    '9-10': 68,
    '11-12': 76,
    College: 84,
  };
  return map[grade] ?? 50;
}

/**
 * Calculate a learning position score for the user.
 * NOTE: This is a composite score (not a real statistical percentile).
 * Real percentile requires cohort-level data aggregation.
 */
export function calculateLearningRank(input: {
  levelDetails: LevelDetails;
  currentLevel?: string | null;
  sessionCount?: number;
  difficultyPreference?: 'easy' | 'medium' | 'hard' | 'adaptive' | null;
}) {
  const detailScore = input.levelDetails
    ? (input.levelDetails.grammar * 0.25) +
      (input.levelDetails.vocabulary * 0.3) +
      (input.levelDetails.fluency * 0.25) +
      (input.levelDetails.comprehension * 0.2)
    : scoreFromGrade(input.currentLevel);

  // Consistency bonus: caps at 10 points after 40 sessions (gentler curve)
  const consistencyBoost = Math.min(10, (input.sessionCount || 0) * 0.25);
  const compositeScore = clamp(Math.round(detailScore + consistencyBoost), 10, 100);

  // Band based on composite score (not labeled as "percentile")
  const band = compositeScore >= 85 ? 'Advanced'
    : compositeScore >= 70 ? 'Intermediate-High'
    : compositeScore >= 50 ? 'Intermediate'
    : compositeScore >= 30 ? 'Elementary'
    : 'Beginner';

  const targetDifficulty = input.difficultyPreference === 'easy' ? 2
    : input.difficultyPreference === 'medium' ? 3
    : input.difficultyPreference === 'hard' ? 4
    : compositeScore >= 85 ? 4
    : compositeScore >= 60 ? 3
    : 2;

  return {
    compositeScore,
    band,
    targetDifficulty,
  };
}
