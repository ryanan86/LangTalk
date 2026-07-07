/**
 * Shadowing score — compares a target sentence with the learner's STT transcript.
 * Order-aware (LCS) with a set-overlap component so shuffled-but-complete
 * attempts still get partial credit.
 *
 * scoreShadowing("I've been learning English", "i been learning english")
 *   → accuracy ~80, missedWords: ["I've"]
 * scoreShadowing("It depends on the weather", "it depends on the weather")
 *   → accuracy 100, missedWords: []
 */

export interface ShadowingScore {
  accuracy: number;        // 0-100
  matchedWords: string[];
  missedWords: string[];
}

function normalize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9'\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

/** Longest common subsequence length (rolling array, O(n*m) time, O(m) space). */
function lcsLength(a: string[], b: string[]): number {
  if (a.length === 0 || b.length === 0) return 0;
  let prev = new Array<number>(b.length + 1).fill(0);
  let curr = new Array<number>(b.length + 1).fill(0);
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      curr[j] = a[i - 1] === b[j - 1] ? prev[j - 1] + 1 : Math.max(prev[j], curr[j - 1]);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[b.length];
}

export function scoreShadowing(targetSentence: string, transcript: string): ShadowingScore {
  const target = normalize(targetSentence);
  const spoken = normalize(transcript);

  if (target.length === 0) {
    return { accuracy: 0, matchedWords: [], missedWords: [] };
  }
  const uniqueTarget = Array.from(new Set(target));

  if (spoken.length === 0) {
    return { accuracy: 0, matchedWords: [], missedWords: uniqueTarget };
  }

  const spokenSet = new Set(spoken);
  const matchedWords: string[] = [];
  const missedWords: string[] = [];
  for (const w of uniqueTarget) {
    (spokenSet.has(w) ? matchedWords : missedWords).push(w);
  }

  const lcsScore = lcsLength(target, spoken) / target.length;             // order-aware
  const setScore = matchedWords.length / uniqueTarget.length;             // coverage
  const accuracy = Math.round(Math.min(1, lcsScore * 0.7 + setScore * 0.3) * 100);

  return { accuracy, matchedWords, missedWords };
}
