import { describe, it, expect } from 'vitest';
import { getTopicSuggestions, shuffleTopics, TopicCard } from './topicSuggestions';

// ===== getTopicSuggestions =====

describe('getTopicSuggestions', () => {
  it('returns all topics when called with no options', () => {
    const topics = getTopicSuggestions();
    expect(topics.length).toBeGreaterThan(0);
  });

  it('filters by category: worker', () => {
    const topics = getTopicSuggestions({ category: 'worker' });
    expect(topics.every(t => t.category === 'worker')).toBe(true);
    expect(topics.length).toBeGreaterThan(0);
  });

  it('filters by category: student', () => {
    const topics = getTopicSuggestions({ category: 'student' });
    expect(topics.every(t => t.category === 'student')).toBe(true);
    expect(topics.length).toBeGreaterThan(0);
  });

  it('filters by category: traveler', () => {
    const topics = getTopicSuggestions({ category: 'traveler' });
    expect(topics.every(t => t.category === 'traveler')).toBe(true);
    expect(topics.length).toBeGreaterThan(0);
  });

  it('filters by category: general', () => {
    const topics = getTopicSuggestions({ category: 'general' });
    expect(topics.every(t => t.category === 'general')).toBe(true);
    expect(topics.length).toBeGreaterThan(0);
  });

  it('limits results when count is specified', () => {
    const topics = getTopicSuggestions({ count: 3 });
    expect(topics.length).toBe(3);
  });

  it('returns all when count exceeds available', () => {
    const allTopics = getTopicSuggestions({ category: 'worker' });
    const limited = getTopicSuggestions({ category: 'worker', count: 9999 });
    expect(limited.length).toBe(allTopics.length);
  });

  it('returns topics with required fields', () => {
    const topics = getTopicSuggestions({ count: 1 });
    const topic = topics[0];
    expect(topic).toHaveProperty('id');
    expect(topic).toHaveProperty('titleKo');
    expect(topic).toHaveProperty('titleEn');
    expect(topic).toHaveProperty('starterHint');
    expect(topic).toHaveProperty('category');
    expect(topic).toHaveProperty('difficulty');
  });

  it('returns topics with valid difficulty values', () => {
    const topics = getTopicSuggestions();
    topics.forEach(t => {
      expect(['easy', 'medium']).toContain(t.difficulty);
    });
  });

  it('returns a new array (does not mutate internal state)', () => {
    const a = getTopicSuggestions();
    const b = getTopicSuggestions();
    expect(a).not.toBe(b);
  });

  it('combines category and count filters correctly', () => {
    const topics = getTopicSuggestions({ category: 'general', count: 2 });
    expect(topics.length).toBe(2);
    expect(topics.every(t => t.category === 'general')).toBe(true);
  });
});

// ===== shuffleTopics =====

describe('shuffleTopics', () => {
  const sampleTopics: TopicCard[] = [
    { id: 'a', titleKo: 'A', titleEn: 'A', starterHint: '', category: 'general', difficulty: 'easy' },
    { id: 'b', titleKo: 'B', titleEn: 'B', starterHint: '', category: 'general', difficulty: 'easy' },
    { id: 'c', titleKo: 'C', titleEn: 'C', starterHint: '', category: 'general', difficulty: 'easy' },
    { id: 'd', titleKo: 'D', titleEn: 'D', starterHint: '', category: 'general', difficulty: 'easy' },
    { id: 'e', titleKo: 'E', titleEn: 'E', starterHint: '', category: 'general', difficulty: 'easy' },
  ];

  it('returns the same number of items', () => {
    const shuffled = shuffleTopics(sampleTopics);
    expect(shuffled.length).toBe(sampleTopics.length);
  });

  it('contains all the same items', () => {
    const shuffled = shuffleTopics(sampleTopics);
    const originalIds = sampleTopics.map(t => t.id).sort();
    const shuffledIds = shuffled.map(t => t.id).sort();
    expect(shuffledIds).toEqual(originalIds);
  });

  it('does not mutate the original array', () => {
    const original = [...sampleTopics];
    shuffleTopics(sampleTopics);
    expect(sampleTopics).toEqual(original);
  });

  it('returns a new array reference', () => {
    const shuffled = shuffleTopics(sampleTopics);
    expect(shuffled).not.toBe(sampleTopics);
  });

  it('handles empty array', () => {
    const result = shuffleTopics([]);
    expect(result).toEqual([]);
  });

  it('handles single element array', () => {
    const single = [sampleTopics[0]];
    const result = shuffleTopics(single);
    expect(result).toEqual(single);
  });
});
