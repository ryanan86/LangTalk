import { randomUUID } from 'crypto';
import { VocabBookItem } from './sheetTypes';

const STOP_WORDS = new Set([
  'the', 'and', 'that', 'this', 'with', 'from', 'they', 'them', 'their', 'there', 'about', 'because',
  'would', 'could', 'should', 'have', 'has', 'had', 'were', 'was', 'been', 'being', 'into', 'than',
  'then', 'just', 'very', 'really', 'like', 'your', 'you', 'our', 'out', 'for', 'are', 'not', 'but',
  'what', 'when', 'where', 'which', 'while', 'who', 'whom', 'how', 'why', 'did', 'does', 'done', 'can',
  'will', 'shall', 'might', 'must', 'need', 'want', 'also', 'only', 'more', 'most', 'many', 'some',
]);

// CEFR-approximate basic words (A1-A2) - these get lower difficulty
const BASIC_WORDS = new Set([
  'hello', 'thank', 'please', 'sorry', 'yes', 'good', 'bad', 'big', 'small', 'happy', 'sad',
  'eat', 'drink', 'sleep', 'play', 'work', 'read', 'write', 'speak', 'listen', 'watch',
  'house', 'school', 'book', 'water', 'food', 'friend', 'family', 'time', 'day', 'night',
  'come', 'give', 'take', 'make', 'know', 'think', 'feel', 'look', 'find', 'tell',
  'name', 'year', 'people', 'child', 'woman', 'man', 'world', 'life', 'hand', 'part',
]);

// B2+ level words get higher difficulty
const ADVANCED_PATTERNS = [
  /tion$/, /sion$/, /ment$/, /ness$/, /ity$/, /ence$/, /ance$/, /ous$/, /ive$/, /able$/,
];

function normalizeToken(token: string): string {
  return token.toLowerCase().replace(/^[^a-z]+|[^a-z]+$/g, '');
}

function scoreDifficulty(term: string): 1 | 2 | 3 | 4 | 5 {
  if (BASIC_WORDS.has(term)) return 1;
  if (term.length <= 3) return 1;
  if (term.length <= 5) return 2;
  const isAdvanced = ADVANCED_PATTERNS.some(p => p.test(term));
  if (isAdvanced) return term.length >= 10 ? 5 : 4;
  if (term.length <= 7) return 3;
  if (term.length <= 9) return 4;
  return 5;
}

export function buildSessionVocabItems(input: {
  userUtterances?: string[];
  corrections?: Array<{ original?: string; corrected?: string; category?: string }>;
  sourceSessionId: string;
  maxItems?: number;
  date?: Date;
}): VocabBookItem[] {
  const maxItems = input.maxItems ?? 16;
  const date = input.date ?? new Date();
  const sourceDate = date.toISOString().slice(0, 10);
  const nextReviewAt = new Date(date.getTime() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const corpus: string[] = [];
  for (const text of input.userUtterances || []) corpus.push(text);
  for (const c of input.corrections || []) {
    if (c.corrected) corpus.push(c.corrected);
    if (c.original) corpus.push(c.original);
  }

  // Track correction-sourced words separately (higher learning value)
  const correctionWords = new Set<string>();
  for (const c of input.corrections || []) {
    if (c.corrected) {
      c.corrected.split(/\s+/).map(normalizeToken).filter(Boolean).forEach(t => correctionWords.add(t));
    }
  }

  const counts = new Map<string, number>();
  const sampleSentence = new Map<string, string>();

  for (const line of corpus) {
    if (!line) continue;
    const tokens = line.split(/\s+/).map(normalizeToken).filter(Boolean);
    for (const token of tokens) {
      if (token.length < 3) continue;
      if (STOP_WORDS.has(token)) continue;
      if (!/^[a-z]+$/.test(token)) continue;
      counts.set(token, (counts.get(token) || 0) + 1);
      if (!sampleSentence.has(token)) sampleSentence.set(token, line.trim());
    }
  }

  // Sort: prioritize correction-sourced words, then by frequency
  const sorted = Array.from(counts.entries())
    .sort((a, b) => {
      const aCorr = correctionWords.has(a[0]) ? 1 : 0;
      const bCorr = correctionWords.has(b[0]) ? 1 : 0;
      if (bCorr !== aCorr) return bCorr - aCorr;
      return b[1] - a[1];
    })
    .slice(0, maxItems);

  return sorted.map(([term, count]) => {
    // Proficiency: words from corrections start lower (less mastered),
    // frequently used words start higher (more familiar)
    const isFromCorrection = correctionWords.has(term);
    const baseProficiency = isFromCorrection ? 20 : Math.min(60, 30 + count * 5);

    return {
      id: randomUUID(),
      term,
      sourceSentence: sampleSentence.get(term),
      sourceSessionId: input.sourceSessionId,
      sourceDate,
      difficulty: scoreDifficulty(term),
      proficiency: baseProficiency,
      nextReviewAt,
      reviewCount: 0,
      status: 'active' as const,
    };
  });
}
