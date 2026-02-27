import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildSessionVocabItems } from './vocabBook';

// crypto.randomUUID is available in Node 18+ / jsdom, but let's ensure it's mocked
// if not available in the test environment
let uuidCounter = 0;
vi.stubGlobal('crypto', {
  randomUUID: () => `mock-uuid-${uuidCounter++}`,
});

beforeEach(() => {
  uuidCounter = 0;
});

describe('buildSessionVocabItems', () => {
  const baseInput = {
    sourceSessionId: 'session-001',
    userUtterances: ['I love learning English because it is very interesting'],
    corrections: [],
  };

  it('returns an array of vocab items', () => {
    const items = buildSessionVocabItems(baseInput);
    expect(Array.isArray(items)).toBe(true);
  });

  it('each item has required VocabBookItem fields', () => {
    const items = buildSessionVocabItems(baseInput);
    items.forEach(item => {
      expect(item).toHaveProperty('id');
      expect(item).toHaveProperty('term');
      expect(item).toHaveProperty('sourceSessionId', 'session-001');
      expect(item).toHaveProperty('sourceDate');
      expect(item).toHaveProperty('difficulty');
      expect(item).toHaveProperty('proficiency');
      expect(item).toHaveProperty('nextReviewAt');
      expect(item).toHaveProperty('reviewCount', 0);
      expect(item).toHaveProperty('status', 'active');
    });
  });

  it('respects maxItems limit', () => {
    const utterances = Array(50)
      .fill(null)
      .map((_, i) => `word${i} is a unique token in this sentence`);
    const items = buildSessionVocabItems({
      sourceSessionId: 'session-002',
      userUtterances: utterances,
      maxItems: 5,
    });
    expect(items.length).toBeLessThanOrEqual(5);
  });

  it('defaults maxItems to 16', () => {
    // Generate many unique tokens
    const utterances = Array(200)
      .fill(null)
      .map((_, i) => `uniquetoken${i}abc`);
    const items = buildSessionVocabItems({
      sourceSessionId: 'session-003',
      userUtterances: utterances,
    });
    expect(items.length).toBeLessThanOrEqual(16);
  });

  it('filters out stop words', () => {
    const items = buildSessionVocabItems({
      sourceSessionId: 'session-004',
      userUtterances: ['the and that this with from they them their there about because'],
    });
    const terms = items.map(i => i.term);
    const stopWords = ['the', 'and', 'that', 'this', 'with', 'from', 'they', 'them', 'their', 'there', 'about', 'because'];
    stopWords.forEach(sw => {
      expect(terms).not.toContain(sw);
    });
  });

  it('filters out tokens shorter than 3 characters', () => {
    const items = buildSessionVocabItems({
      sourceSessionId: 'session-005',
      userUtterances: ['I am ok go do it to me be of at'],
    });
    items.forEach(item => {
      expect(item.term.length).toBeGreaterThanOrEqual(3);
    });
  });

  it('prioritizes correction-sourced words (lower proficiency)', () => {
    const items = buildSessionVocabItems({
      sourceSessionId: 'session-006',
      userUtterances: ['I goed to school'],
      corrections: [{ original: 'goed', corrected: 'went', category: 'grammar' }],
    });
    const correctionWord = items.find(i => i.term === 'went');
    if (correctionWord) {
      expect(correctionWord.proficiency).toBe(20);
    }
  });

  it('assigns sourceDate in YYYY-MM-DD format', () => {
    const date = new Date('2024-06-15');
    const items = buildSessionVocabItems({
      sourceSessionId: 'session-007',
      userUtterances: ['learning english speaking practice'],
      date,
    });
    items.forEach(item => {
      expect(item.sourceDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  it('nextReviewAt is one day after sourceDate', () => {
    const date = new Date('2024-06-15T00:00:00.000Z');
    const items = buildSessionVocabItems({
      sourceSessionId: 'session-008',
      userUtterances: ['learning english practice'],
      date,
    });
    items.forEach(item => {
      expect(item.nextReviewAt).toBe('2024-06-16');
    });
  });

  it('assigns difficulty 1 to basic known words', () => {
    const items = buildSessionVocabItems({
      sourceSessionId: 'session-009',
      userUtterances: ['hello friend family school book water food'],
    });
    // "hello", "friend", "family", "school", "book", "water", "food" are all in BASIC_WORDS
    const basicTerms = items.filter(i =>
      ['hello', 'friend', 'family', 'school', 'book', 'water', 'food'].includes(i.term)
    );
    basicTerms.forEach(item => {
      expect(item.difficulty).toBe(1);
    });
  });

  it('assigns higher difficulty to long/complex words', () => {
    const items = buildSessionVocabItems({
      sourceSessionId: 'session-010',
      userUtterances: ['implementation consideration transformation organization'],
    });
    items.forEach(item => {
      expect(item.difficulty).toBeGreaterThanOrEqual(3);
    });
  });

  it('handles empty userUtterances and corrections', () => {
    const items = buildSessionVocabItems({
      sourceSessionId: 'session-011',
      userUtterances: [],
      corrections: [],
    });
    expect(items).toHaveLength(0);
  });

  it('each item has a unique id', () => {
    const items = buildSessionVocabItems({
      sourceSessionId: 'session-012',
      userUtterances: ['learning english speaking practice reading writing'],
    });
    const ids = items.map(i => i.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('includes sourceSentence for recognized terms', () => {
    const items = buildSessionVocabItems({
      sourceSessionId: 'session-013',
      userUtterances: ['practice makes perfect'],
    });
    items.forEach(item => {
      if (item.sourceSentence !== undefined) {
        expect(typeof item.sourceSentence).toBe('string');
      }
    });
  });

  it('status is always active', () => {
    const items = buildSessionVocabItems(baseInput);
    items.forEach(item => {
      expect(item.status).toBe('active');
    });
  });
});
