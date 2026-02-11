/**
 * Speech Metrics Analysis
 *
 * Provides quantitative metrics for evaluating English speaking ability.
 */

import type { Language } from './i18n';

// ===== Age Group & Adaptive Difficulty =====

export type AgeGroupKey = 'young_child' | 'older_child' | 'teenager' | 'adult';

export interface AgeGroupConfig {
  key: AgeGroupKey;
  ageRange: [number, number]; // [min, max] inclusive
  maxCorrectionWords: number;
  vocabularyLevel: string;
  useIdioms: boolean;
  useConjunctions: boolean;
  conjunctionExamples: string;
  grammarFocus: string[];
  correctionStyle: string;
  // i+1 stretch learning: slightly above current level to promote growth
  stretchTarget: string; // What to gradually introduce from the next level
  stretchMaxWords: number; // Slightly higher word limit for stretching
}

const AGE_GROUPS: AgeGroupConfig[] = [
  {
    key: 'young_child',
    ageRange: [3, 8],
    maxCorrectionWords: 8,
    vocabularyLevel: '기초 500단어 (sight words, 일상 사물, 간단한 동사)',
    useIdioms: false,
    useConjunctions: false,
    conjunctionExamples: '',
    grammarFocus: ['simple present tense', 'singular/plural', 'basic pronouns', 'simple questions'],
    correctionStyle: '매우 짧고 간단하게. 5-8세가 이해할 수 있는 단어만 사용. 예: "I goed" → "I went to school."',
    stretchTarget: '다음 단계 맛보기: and, but 같은 기본 접속사를 한두 개 슬쩍 넣어서 문장 연결 시도',
    stretchMaxWords: 10, // 기본 8 + 2 여유
  },
  {
    key: 'older_child',
    ageRange: [9, 12],
    maxCorrectionWords: 15,
    vocabularyLevel: '기초 + 초등 학술어휘 (describe, compare, explain)',
    useIdioms: false,
    useConjunctions: true,
    conjunctionExamples: 'and, but, because, so',
    grammarFocus: ['past tense', 'future tense', 'comparative/superlative', 'basic prepositions'],
    correctionStyle: '명확하고 격려하는 톤. 간단한 접속사 사용. 예: "I like it because is fun" → "I like it because it is really fun."',
    stretchTarget: '다음 단계 맛보기: 때때로 however, also 같은 중급 접속사 소개, 형용사를 2개 연결해서 표현력 강화',
    stretchMaxWords: 18, // 기본 15 + 3 여유
  },
  {
    key: 'teenager',
    ageRange: [13, 17],
    maxCorrectionWords: 25,
    vocabularyLevel: '중급 + 학술어휘 (analyze, significant, perspective)',
    useIdioms: true,
    useConjunctions: true,
    conjunctionExamples: 'however, although, therefore, moreover, while',
    grammarFocus: ['complex tenses', 'passive voice', 'conditional sentences', 'relative clauses'],
    correctionStyle: '자연스럽고 약간 도전적. 관용구 포함 가능. 예: "I think is good idea" → "I think this is a really good idea because it solves the main problem."',
    stretchTarget: '다음 단계 맛보기: 가끔 고급 연결어(furthermore, consequently) 소개, 수동태나 가정법 활용',
    stretchMaxWords: 30, // 기본 25 + 5 여유
  },
  {
    key: 'adult',
    ageRange: [18, 120],
    maxCorrectionWords: 35,
    vocabularyLevel: '상황에 맞는 자연스러운 표현 (캐주얼: 구어체/슬랭 OK, 포멀: 고급 어휘)',
    useIdioms: true,
    useConjunctions: true,
    conjunctionExamples: 'casual: but, so, actually, though, I mean / neutral: because, which, since / formal: however, although, therefore',
    grammarFocus: ['all tenses', 'natural contractions', 'conditional sentences', 'relative clauses', 'advanced modals'],
    correctionStyle: '대화 상황에 맞는 자연스러움. 캐주얼: "I think is good" → "I think that\'s pretty good, honestly." 포멀: "I think is good" → "I believe this is an excellent approach, particularly given the circumstances."',
    stretchTarget: '현재 수준에서 한 단계 위: 캐주얼에선 자연스러운 관용표현과 구어체, 포멀에선 정교한 연결과 뉘앙스',
    stretchMaxWords: 40, // 기본 35 + 5 여유
  },
];

/**
 * Determine age group from birth year
 */
export function getAgeGroup(birthYear: number): AgeGroupConfig {
  const age = new Date().getFullYear() - birthYear;
  const group = AGE_GROUPS.find(g => age >= g.ageRange[0] && age <= g.ageRange[1]);
  return group || AGE_GROUPS[AGE_GROUPS.length - 1]; // default to adult
}

export interface AdaptiveDifficultyResult {
  difficulty: number; // 1-5
  weakAreas: string[];
  description: string;
}

/** Partial speech metrics needed for adaptive difficulty calculation */
export interface SpeechMetricsPartial {
  avgSentenceLength: number;
  vocabularyDiversity: number;
}

/**
 * Calculate adaptive difficulty based on age group, previous performance, and speech metrics
 */
export function calculateAdaptiveDifficulty(
  ageGroup: AgeGroupConfig,
  previousGrade: string | null,
  levelDetails: { grammar: number; vocabulary: number; fluency: number; comprehension: number } | null,
  metrics: SpeechMetricsPartial | null,
): AdaptiveDifficultyResult {
  // Base difficulty by age group
  const baseDifficultyMap: Record<AgeGroupKey, number> = {
    young_child: 1,
    older_child: 2,
    teenager: 3,
    adult: 4,
  };

  let difficulty = baseDifficultyMap[ageGroup.key];

  // Expected grade ranges per age group
  const expectedGrades: Record<AgeGroupKey, string[]> = {
    young_child: ['K', '1-2'],
    older_child: ['3-4', '5-6'],
    teenager: ['7-8', '9-10'],
    adult: ['11-12', 'College'],
  };

  const gradeOrder = ['K', '1-2', '3-4', '5-6', '7-8', '9-10', '11-12', 'College'];

  // Adjust based on previous grade vs expected
  if (previousGrade) {
    const prevIndex = gradeOrder.indexOf(previousGrade);
    const expectedRange = expectedGrades[ageGroup.key];
    const expectedMinIndex = gradeOrder.indexOf(expectedRange[0]);
    const expectedMaxIndex = gradeOrder.indexOf(expectedRange[expectedRange.length - 1]);

    if (prevIndex > expectedMaxIndex) {
      difficulty = Math.min(5, difficulty + 1); // Above expectation → harder
    } else if (prevIndex < expectedMinIndex) {
      difficulty = Math.max(1, difficulty - 1); // Below expectation → easier
    }
  }

  // Identify weak areas from levelDetails
  const weakAreas: string[] = [];
  if (levelDetails) {
    if (levelDetails.grammar < 50) weakAreas.push(`grammar accuracy (${levelDetails.grammar}/100)`);
    if (levelDetails.vocabulary < 50) weakAreas.push(`vocabulary range (${levelDetails.vocabulary}/100)`);
    if (levelDetails.fluency < 50) weakAreas.push(`fluency (${levelDetails.fluency}/100)`);
    if (levelDetails.comprehension < 50) weakAreas.push(`comprehension (${levelDetails.comprehension}/100)`);
  }

  // Adjust from speech metrics
  if (metrics) {
    if (metrics.vocabularyDiversity < 0.3) {
      if (!weakAreas.some(w => w.startsWith('vocabulary'))) {
        weakAreas.push('vocabulary diversity (low)');
      }
    }
    if (metrics.avgSentenceLength < 4) {
      weakAreas.push('sentence length (too short)');
    }
  }

  const descriptions: Record<number, string> = {
    1: 'Very basic - simple words and short phrases',
    2: 'Elementary - simple sentences with basic grammar',
    3: 'Intermediate - varied sentences with some complexity',
    4: 'Upper-intermediate - natural flow with rich vocabulary',
    5: 'Advanced - native-level sophistication',
  };

  return {
    difficulty,
    weakAreas,
    description: descriptions[difficulty] || descriptions[3],
  };
}

export interface SpeechMetrics {
  // Basic metrics
  totalWords: number;
  totalSentences: number;
  uniqueWords: number;

  // Calculated metrics
  wordsPerMinute: number;        // WPM - speaking rate
  avgSentenceLength: number;     // Average words per sentence
  vocabularyDiversity: number;   // TTR (Type-Token Ratio) 0-1

  // Complexity metrics
  avgWordLength: number;         // Average characters per word
  complexSentenceRatio: number;  // Ratio of compound/complex sentences

  // Error metrics (to be filled by AI analysis)
  grammarErrorRate: number;      // Errors per sentence

  // Response metrics
  avgResponseTime: number;       // Average time to respond (seconds)
  totalSpeakingTime: number;     // Total speaking time (seconds)
}

export interface ResponseTiming {
  startTime: number;  // When AI finished speaking
  endTime: number;    // When user started responding
}

/**
 * Tokenize text into words
 */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9'\s-]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 0);
}

/**
 * Split text into sentences
 */
function splitSentences(text: string): string[] {
  return text
    .split(/[.!?]+/)
    .map(s => s.trim())
    .filter(s => s.length > 0);
}

/**
 * Check if a sentence is complex (contains subordinating conjunctions, relative pronouns, etc.)
 */
function isComplexSentence(sentence: string): boolean {
  const complexIndicators = [
    /\b(because|since|although|though|while|when|whenever|where|wherever|if|unless|until|before|after|as|that|which|who|whom|whose|what|how|why)\b/i,
    /,\s*(and|but|or|so|yet)\s+/i,  // Compound with comma
    /\b(however|therefore|moreover|furthermore|nevertheless|consequently)\b/i,
  ];

  return complexIndicators.some(pattern => pattern.test(sentence));
}

/**
 * Calculate speech metrics from user messages
 */
export function calculateSpeechMetrics(
  userMessages: string[],
  totalSpeakingTimeSeconds: number,
  responseTimes: number[] = [],
  grammarErrors: number = 0
): SpeechMetrics {
  const fullText = userMessages.join(' ');
  const words = tokenize(fullText);
  const sentences = splitSentences(fullText);
  const uniqueWords = new Set(words);

  const totalWords = words.length;
  const totalSentences = Math.max(sentences.length, 1);

  // Calculate complex sentence ratio
  const complexSentences = sentences.filter(isComplexSentence).length;

  // Calculate average word length
  const totalChars = words.reduce((sum, word) => sum + word.length, 0);

  // Calculate WPM (words per minute)
  const speakingTimeMinutes = Math.max(totalSpeakingTimeSeconds / 60, 0.1);
  const wpm = Math.round(totalWords / speakingTimeMinutes);

  // Calculate average response time
  const avgResponseTime = responseTimes.length > 0
    ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
    : 0;

  return {
    totalWords,
    totalSentences,
    uniqueWords: uniqueWords.size,
    wordsPerMinute: wpm,
    avgSentenceLength: Math.round((totalWords / totalSentences) * 10) / 10,
    vocabularyDiversity: Math.round((uniqueWords.size / Math.max(totalWords, 1)) * 100) / 100,
    avgWordLength: Math.round((totalChars / Math.max(totalWords, 1)) * 10) / 10,
    complexSentenceRatio: Math.round((complexSentences / totalSentences) * 100) / 100,
    grammarErrorRate: Math.round((grammarErrors / totalSentences) * 100) / 100,
    avgResponseTime: Math.round(avgResponseTime * 10) / 10,
    totalSpeakingTime: Math.round(totalSpeakingTimeSeconds),
  };
}

/**
 * Get performance level based on metrics
 */
export function getMetricLevel(
  metric: keyof SpeechMetrics,
  value: number
): 'low' | 'medium' | 'high' {
  const thresholds: Record<string, { low: number; high: number }> = {
    wordsPerMinute: { low: 80, high: 140 },
    avgSentenceLength: { low: 5, high: 12 },
    vocabularyDiversity: { low: 0.4, high: 0.7 },
    avgWordLength: { low: 3.5, high: 5 },
    complexSentenceRatio: { low: 0.2, high: 0.5 },
    grammarErrorRate: { low: 0.3, high: 0.1 }, // Lower is better
    avgResponseTime: { low: 5, high: 2 }, // Lower is better
  };

  const threshold = thresholds[metric];
  if (!threshold) return 'medium';

  // For metrics where lower is better
  if (metric === 'grammarErrorRate' || metric === 'avgResponseTime') {
    if (value <= threshold.high) return 'high';
    if (value >= threshold.low) return 'low';
    return 'medium';
  }

  // For metrics where higher is better
  if (value >= threshold.high) return 'high';
  if (value <= threshold.low) return 'low';
  return 'medium';
}

/**
 * Calculate overall score from metrics (0-100)
 */
export function calculateOverallScore(metrics: SpeechMetrics): number {
  // Weighted scoring
  const weights = {
    wordsPerMinute: 15,      // Speaking rate
    avgSentenceLength: 20,    // Sentence complexity
    vocabularyDiversity: 20,  // Vocabulary range
    complexSentenceRatio: 15, // Grammar complexity
    grammarErrorRate: 20,     // Accuracy (inverted)
    avgResponseTime: 10,      // Fluency (inverted)
  };

  let totalScore = 0;
  let totalWeight = 0;

  // WPM score (80-180 range, optimal around 120-150)
  const wpmScore = Math.min(100, Math.max(0,
    metrics.wordsPerMinute < 80 ? (metrics.wordsPerMinute / 80) * 60 :
    metrics.wordsPerMinute <= 150 ? 60 + ((metrics.wordsPerMinute - 80) / 70) * 40 :
    100 - ((metrics.wordsPerMinute - 150) / 50) * 20
  ));
  totalScore += wpmScore * weights.wordsPerMinute;
  totalWeight += weights.wordsPerMinute;

  // Sentence length score (3-15 range, optimal 8-12)
  const sentScore = Math.min(100, Math.max(0,
    metrics.avgSentenceLength < 3 ? 20 :
    metrics.avgSentenceLength <= 8 ? 20 + ((metrics.avgSentenceLength - 3) / 5) * 50 :
    metrics.avgSentenceLength <= 12 ? 70 + ((metrics.avgSentenceLength - 8) / 4) * 30 :
    100 - ((metrics.avgSentenceLength - 12) / 8) * 30
  ));
  totalScore += sentScore * weights.avgSentenceLength;
  totalWeight += weights.avgSentenceLength;

  // Vocabulary diversity score (0.3-0.8 range)
  const vocabScore = Math.min(100, Math.max(0,
    (metrics.vocabularyDiversity - 0.2) / 0.6 * 100
  ));
  totalScore += vocabScore * weights.vocabularyDiversity;
  totalWeight += weights.vocabularyDiversity;

  // Complex sentence ratio score (0-0.6 range)
  const complexScore = Math.min(100, Math.max(0,
    metrics.complexSentenceRatio / 0.6 * 100
  ));
  totalScore += complexScore * weights.complexSentenceRatio;
  totalWeight += weights.complexSentenceRatio;

  // Grammar error rate score (inverted, 0 = 100, 1+ = lower)
  const grammarScore = Math.max(0, 100 - metrics.grammarErrorRate * 100);
  totalScore += grammarScore * weights.grammarErrorRate;
  totalWeight += weights.grammarErrorRate;

  // Response time score (inverted, <2s = 100, >8s = lower)
  const responseScore = Math.min(100, Math.max(0,
    metrics.avgResponseTime <= 2 ? 100 :
    100 - ((metrics.avgResponseTime - 2) / 6) * 60
  ));
  totalScore += responseScore * weights.avgResponseTime;
  totalWeight += weights.avgResponseTime;

  return Math.round(totalScore / totalWeight);
}

/**
 * Map overall score to grade level
 */
export function scoreToGrade(score: number): string {
  if (score >= 95) return 'College';
  if (score >= 85) return '11-12';
  if (score >= 75) return '9-10';
  if (score >= 65) return '7-8';
  if (score >= 55) return '5-6';
  if (score >= 45) return '3-4';
  if (score >= 30) return '1-2';
  return 'K';
}

/**
 * Format metrics for display
 */
export function formatMetricsForDisplay(metrics: SpeechMetrics, language: Language = 'ko') {
  const labels = {
    ko: {
      wordsPerMinute: '말하기 속도',
      avgSentenceLength: '문장 구성력',
      vocabularyDiversity: '어휘 다양성',
      complexSentenceRatio: '표현 풍부도',
      grammarErrorRate: '문법 정확도',
      avgResponseTime: '응답 속도',
      totalWords: '총 단어 수',
      totalSpeakingTime: '총 발화 시간',
    },
    en: {
      wordsPerMinute: 'Speaking Speed',
      avgSentenceLength: 'Sentence Structure',
      vocabularyDiversity: 'Vocabulary Range',
      complexSentenceRatio: 'Expression Richness',
      grammarErrorRate: 'Grammar Accuracy',
      avgResponseTime: 'Response Speed',
      totalWords: 'Total Words',
      totalSpeakingTime: 'Total Speaking Time',
    },
  };

  const l = labels[language as 'ko' | 'en'] || labels['en'];

  // Grammar accuracy = 100% - error rate (positive framing)
  const grammarAccuracy = Math.max(0, Math.round((1 - metrics.grammarErrorRate) * 100));
  // Response speed: map 0-10s to 100-0% (faster = higher)
  const responseSpeed = Math.max(0, Math.min(100, Math.round((1 - Math.min(metrics.avgResponseTime, 10) / 10) * 100)));
  // WPM normalized to 0-100 (80-180 range mapped)
  const wpmPercent = Math.max(0, Math.min(100, Math.round(((metrics.wordsPerMinute - 40) / 160) * 100)));
  // Sentence length normalized (3-15 range)
  const sentLenPercent = Math.max(0, Math.min(100, Math.round(((metrics.avgSentenceLength - 2) / 13) * 100)));

  return [
    { label: l.wordsPerMinute, value: `${metrics.wordsPerMinute} WPM`, level: getMetricLevel('wordsPerMinute', metrics.wordsPerMinute), percent: wpmPercent },
    { label: l.avgSentenceLength, value: `${metrics.avgSentenceLength} words`, level: getMetricLevel('avgSentenceLength', metrics.avgSentenceLength), percent: sentLenPercent },
    { label: l.vocabularyDiversity, value: `${Math.round(metrics.vocabularyDiversity * 100)}%`, level: getMetricLevel('vocabularyDiversity', metrics.vocabularyDiversity), percent: Math.round(metrics.vocabularyDiversity * 100) },
    { label: l.complexSentenceRatio, value: `${Math.round(metrics.complexSentenceRatio * 100)}%`, level: getMetricLevel('complexSentenceRatio', metrics.complexSentenceRatio), percent: Math.round(metrics.complexSentenceRatio * 100) },
    { label: l.grammarErrorRate, value: `${grammarAccuracy}%`, level: getMetricLevel('grammarErrorRate', metrics.grammarErrorRate), percent: grammarAccuracy },
    { label: l.avgResponseTime, value: `${responseSpeed}%`, level: getMetricLevel('avgResponseTime', metrics.avgResponseTime), percent: responseSpeed },
  ];
}
