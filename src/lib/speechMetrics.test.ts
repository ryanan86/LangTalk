import { describe, it, expect } from 'vitest';
import {
  calculateSpeechMetrics,
  getAgeGroup,
  calculateAdaptiveDifficulty,
  getMetricLevel,
  calculateOverallScore,
  scoreToCefr,
} from './speechMetrics';

// ===== getAgeGroup =====

describe('getAgeGroup', () => {
  it('returns young_child for ages 3-8', () => {
    const currentYear = new Date().getFullYear();
    const birthYear = currentYear - 5; // age 5
    const result = getAgeGroup(birthYear);
    expect(result.key).toBe('young_child');
  });

  it('returns older_child for ages 9-12', () => {
    const currentYear = new Date().getFullYear();
    const birthYear = currentYear - 10;
    const result = getAgeGroup(birthYear);
    expect(result.key).toBe('older_child');
  });

  it('returns teenager for ages 13-17', () => {
    const currentYear = new Date().getFullYear();
    const birthYear = currentYear - 15;
    const result = getAgeGroup(birthYear);
    expect(result.key).toBe('teenager');
  });

  it('returns adult for ages 18+', () => {
    const currentYear = new Date().getFullYear();
    const birthYear = currentYear - 30;
    const result = getAgeGroup(birthYear);
    expect(result.key).toBe('adult');
  });

  it('defaults to adult for very old birth years', () => {
    const result = getAgeGroup(1900);
    expect(result.key).toBe('adult');
  });

  it('returns correct maxCorrectionWords per group', () => {
    const currentYear = new Date().getFullYear();
    const youngChild = getAgeGroup(currentYear - 5);
    const adult = getAgeGroup(currentYear - 25);
    expect(youngChild.maxCorrectionWords).toBe(8);
    expect(adult.maxCorrectionWords).toBe(35);
  });

  it('young_child does not use idioms', () => {
    const currentYear = new Date().getFullYear();
    const group = getAgeGroup(currentYear - 6);
    expect(group.useIdioms).toBe(false);
  });

  it('adult uses idioms', () => {
    const currentYear = new Date().getFullYear();
    const group = getAgeGroup(currentYear - 25);
    expect(group.useIdioms).toBe(true);
  });
});

// ===== calculateAdaptiveDifficulty =====

describe('calculateAdaptiveDifficulty', () => {
  const currentYear = new Date().getFullYear();

  it('returns base difficulty 1 for young_child with no prior grade', () => {
    const group = getAgeGroup(currentYear - 5);
    const result = calculateAdaptiveDifficulty(group, null, null, null);
    expect(result.difficulty).toBe(1);
    expect(result.weakAreas).toHaveLength(0);
  });

  it('returns base difficulty 4 for adult with no prior grade', () => {
    const group = getAgeGroup(currentYear - 25);
    const result = calculateAdaptiveDifficulty(group, null, null, null);
    expect(result.difficulty).toBe(4);
  });

  it('increases difficulty when CEFR level is above expected range for age group', () => {
    const group = getAgeGroup(currentYear - 5); // young_child, expected Pre-A1 or A1
    const result = calculateAdaptiveDifficulty(group, 'B2', null, null);
    expect(result.difficulty).toBeGreaterThan(1);
  });

  it('decreases difficulty when CEFR level is below expected range', () => {
    const group = getAgeGroup(currentYear - 25); // adult, expected B1 or B2
    const result = calculateAdaptiveDifficulty(group, 'Pre-A1', null, null);
    expect(result.difficulty).toBeLessThan(4);
  });

  it('flags grammar weak area when grammar < 50', () => {
    const group = getAgeGroup(currentYear - 25);
    const result = calculateAdaptiveDifficulty(
      group,
      null,
      { grammar: 30, vocabulary: 70, fluency: 70, comprehension: 70 },
      null
    );
    expect(result.weakAreas.some(w => w.startsWith('grammar'))).toBe(true);
  });

  it('flags vocabulary weak area from metrics when vocabularyDiversity < 0.3', () => {
    const group = getAgeGroup(currentYear - 25);
    const result = calculateAdaptiveDifficulty(
      group,
      null,
      null,
      { avgSentenceLength: 8, vocabularyDiversity: 0.2 }
    );
    expect(result.weakAreas.some(w => w.startsWith('vocabulary'))).toBe(true);
  });

  it('flags sentence length weak area when avgSentenceLength < 4', () => {
    const group = getAgeGroup(currentYear - 25);
    const result = calculateAdaptiveDifficulty(
      group,
      null,
      null,
      { avgSentenceLength: 2, vocabularyDiversity: 0.5 }
    );
    expect(result.weakAreas.some(w => w.startsWith('sentence length'))).toBe(true);
  });

  it('returns a description string', () => {
    const group = getAgeGroup(currentYear - 25);
    const result = calculateAdaptiveDifficulty(group, null, null, null);
    expect(typeof result.description).toBe('string');
    expect(result.description.length).toBeGreaterThan(0);
  });

  it('handles legacy grade levels', () => {
    const group = getAgeGroup(currentYear - 25); // adult
    // College is above B1/B2 range for adult gradeOrder path
    const result = calculateAdaptiveDifficulty(group, 'College', null, null);
    expect(result.difficulty).toBeGreaterThanOrEqual(1);
    expect(result.difficulty).toBeLessThanOrEqual(5);
  });

  it('does not exceed difficulty 5 or go below 1', () => {
    const group = getAgeGroup(currentYear - 5); // young_child base=1
    const result = calculateAdaptiveDifficulty(
      group,
      'C2',
      null,
      null
    );
    expect(result.difficulty).toBeGreaterThanOrEqual(1);
    expect(result.difficulty).toBeLessThanOrEqual(5);
  });
});

// ===== calculateSpeechMetrics =====

describe('calculateSpeechMetrics', () => {
  it('calculates basic word count', () => {
    const result = calculateSpeechMetrics(['Hello world how are you'], 60);
    expect(result.totalWords).toBe(5);
  });

  it('calculates unique words with TTR', () => {
    const result = calculateSpeechMetrics(['cat cat dog dog bird'], 60);
    expect(result.uniqueWords).toBe(3);
    expect(result.vocabularyDiversity).toBe(0.6); // 3/5
  });

  it('calculates words per minute', () => {
    // 120 words in 60 seconds => 120 WPM
    const words = Array(120).fill('word').join(' ');
    const result = calculateSpeechMetrics([words], 60);
    expect(result.wordsPerMinute).toBe(120);
  });

  it('calculates average sentence length', () => {
    // 2 sentences: "I am happy." (3 words) and "This is good." (3 words)
    const result = calculateSpeechMetrics(['I am happy. This is good.'], 60);
    expect(result.avgSentenceLength).toBe(3);
  });

  it('calculates average response time from timing array', () => {
    const result = calculateSpeechMetrics(['Hello'], 60, [2, 4, 6]);
    expect(result.avgResponseTime).toBe(4);
  });

  it('sets avgResponseTime to 0 when no response times', () => {
    const result = calculateSpeechMetrics(['Hello'], 60, []);
    expect(result.avgResponseTime).toBe(0);
  });

  it('calculates complex sentence ratio', () => {
    const result = calculateSpeechMetrics([
      'I went there because I wanted to. I also went home.',
    ], 60);
    expect(result.complexSentenceRatio).toBeGreaterThan(0);
  });

  it('includes grammar error rate', () => {
    const result = calculateSpeechMetrics(['I am happy. This is good.'], 60, [], 2);
    // 2 errors, 2 sentences => 1.0
    expect(result.grammarErrorRate).toBe(1);
  });

  it('handles multiple messages joined together', () => {
    const result = calculateSpeechMetrics(['Hello world', 'foo bar baz'], 60);
    expect(result.totalWords).toBe(5);
  });

  it('handles empty messages gracefully', () => {
    const result = calculateSpeechMetrics([''], 10);
    expect(result.totalWords).toBe(0);
    expect(result.totalSentences).toBe(1); // Math.max(0, 1)
  });

  it('returns totalSpeakingTime rounded', () => {
    const result = calculateSpeechMetrics(['hello'], 45.7);
    expect(result.totalSpeakingTime).toBe(46);
  });
});

// ===== getMetricLevel =====

describe('getMetricLevel', () => {
  it('returns high for WPM >= 140', () => {
    expect(getMetricLevel('wordsPerMinute', 150)).toBe('high');
  });

  it('returns low for WPM <= 80', () => {
    expect(getMetricLevel('wordsPerMinute', 60)).toBe('low');
  });

  it('returns medium for WPM between 80 and 140', () => {
    expect(getMetricLevel('wordsPerMinute', 100)).toBe('medium');
  });

  it('returns high for low grammarErrorRate (inverted metric)', () => {
    expect(getMetricLevel('grammarErrorRate', 0.05)).toBe('high');
  });

  it('returns low for high grammarErrorRate (inverted metric)', () => {
    expect(getMetricLevel('grammarErrorRate', 0.5)).toBe('low');
  });

  it('returns medium for unknown metric', () => {
    expect(getMetricLevel('totalWords' as any, 100)).toBe('medium');
  });
});

// ===== scoreToCefr =====

describe('scoreToCefr', () => {
  it('returns C2 for score >= 93', () => {
    expect(scoreToCefr(95)).toBe('C2');
    expect(scoreToCefr(93)).toBe('C2');
  });

  it('returns C1 for score 80-92', () => {
    expect(scoreToCefr(85)).toBe('C1');
  });

  it('returns B2 for score 65-79', () => {
    expect(scoreToCefr(70)).toBe('B2');
  });

  it('returns B1 for score 50-64', () => {
    expect(scoreToCefr(55)).toBe('B1');
  });

  it('returns A2 for score 35-49', () => {
    expect(scoreToCefr(40)).toBe('A2');
  });

  it('returns A1 for score 20-34', () => {
    expect(scoreToCefr(25)).toBe('A1');
  });

  it('returns Pre-A1 for score < 20', () => {
    expect(scoreToCefr(10)).toBe('Pre-A1');
    expect(scoreToCefr(0)).toBe('Pre-A1');
  });
});

// ===== calculateOverallScore =====

describe('calculateOverallScore', () => {
  const baseMetrics = {
    totalWords: 100,
    totalSentences: 10,
    uniqueWords: 60,
    wordsPerMinute: 120,
    avgSentenceLength: 10,
    vocabularyDiversity: 0.6,
    avgWordLength: 4.5,
    complexSentenceRatio: 0.4,
    grammarErrorRate: 0.1,
    avgResponseTime: 2,
    totalSpeakingTime: 120,
  };

  it('returns a number between 0 and 100', () => {
    const score = calculateOverallScore(baseMetrics);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  it('gives higher score for better metrics', () => {
    const goodMetrics = { ...baseMetrics, grammarErrorRate: 0, avgResponseTime: 1, vocabularyDiversity: 0.8 };
    const badMetrics = { ...baseMetrics, grammarErrorRate: 1, avgResponseTime: 10, vocabularyDiversity: 0.2 };
    expect(calculateOverallScore(goodMetrics)).toBeGreaterThan(calculateOverallScore(badMetrics));
  });

  it('returns integer', () => {
    const score = calculateOverallScore(baseMetrics);
    expect(Number.isInteger(score)).toBe(true);
  });
});
