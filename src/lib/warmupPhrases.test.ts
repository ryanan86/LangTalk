import { describe, it, expect } from 'vitest';
import { getWarmupSet, WarmupPhrase } from './warmupPhrases';

describe('getWarmupSet', () => {
  it('returns an array of phrases', () => {
    const set = getWarmupSet();
    expect(Array.isArray(set)).toBe(true);
    expect(set.length).toBeGreaterThan(0);
  });

  it('each phrase has english, korean, and difficulty fields', () => {
    const set = getWarmupSet();
    set.forEach((phrase: WarmupPhrase) => {
      expect(typeof phrase.english).toBe('string');
      expect(phrase.english.length).toBeGreaterThan(0);
      expect(typeof phrase.korean).toBe('string');
      expect(phrase.korean.length).toBeGreaterThan(0);
      expect(['easy', 'medium', 'stretch']).toContain(phrase.difficulty);
    });
  });

  it('each set contains exactly 3 phrases', () => {
    // All warmup sets in the source have 3 phrases
    const set = getWarmupSet();
    expect(set.length).toBe(3);
  });

  it('includes one phrase of each difficulty level', () => {
    const set = getWarmupSet();
    const difficulties = set.map(p => p.difficulty);
    expect(difficulties).toContain('easy');
    expect(difficulties).toContain('medium');
    expect(difficulties).toContain('stretch');
  });

  it('returns a random set (non-deterministic, but valid) over multiple calls', () => {
    // Run 10 times — every result should be valid even if the same index is picked
    for (let i = 0; i < 10; i++) {
      const set = getWarmupSet();
      expect(set.length).toBe(3);
      set.forEach(p => {
        expect(['easy', 'medium', 'stretch']).toContain(p.difficulty);
      });
    }
  });

  it('easy phrase is shorter or simpler than stretch phrase', () => {
    // Easy phrases should generally be shorter than stretch
    const set = getWarmupSet();
    const easy = set.find(p => p.difficulty === 'easy')!;
    const stretch = set.find(p => p.difficulty === 'stretch')!;
    // Stretch is expected to be longer in practice
    expect(stretch.english.length).toBeGreaterThanOrEqual(easy.english.length);
  });

  it('english and korean strings are non-empty for all phrases', () => {
    const set = getWarmupSet();
    set.forEach(p => {
      expect(p.english.trim().length).toBeGreaterThan(0);
      expect(p.korean.trim().length).toBeGreaterThan(0);
    });
  });

  it('returns different sets over many calls (randomness check)', () => {
    const results = new Set<string>();
    for (let i = 0; i < 50; i++) {
      const set = getWarmupSet();
      results.add(set[0].english); // Track the first phrase of each set
    }
    // With 7 sets and 50 calls, expect more than 1 unique set to have been returned
    expect(results.size).toBeGreaterThan(1);
  });
});
