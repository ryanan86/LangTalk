/**
 * Speech Metrics Analysis
 *
 * Provides quantitative metrics for evaluating English speaking ability.
 */

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
export function formatMetricsForDisplay(metrics: SpeechMetrics, language: 'ko' | 'en' = 'ko') {
  const labels = {
    ko: {
      wordsPerMinute: '분당 단어 수',
      avgSentenceLength: '평균 문장 길이',
      vocabularyDiversity: '어휘 다양성',
      complexSentenceRatio: '복합문 비율',
      grammarErrorRate: '문법 오류율',
      avgResponseTime: '평균 응답 시간',
      totalWords: '총 단어 수',
      totalSpeakingTime: '총 발화 시간',
    },
    en: {
      wordsPerMinute: 'Words Per Minute',
      avgSentenceLength: 'Avg Sentence Length',
      vocabularyDiversity: 'Vocabulary Diversity',
      complexSentenceRatio: 'Complex Sentence Ratio',
      grammarErrorRate: 'Grammar Error Rate',
      avgResponseTime: 'Avg Response Time',
      totalWords: 'Total Words',
      totalSpeakingTime: 'Total Speaking Time',
    },
  };

  const l = labels[language];

  return [
    { label: l.wordsPerMinute, value: `${metrics.wordsPerMinute} WPM`, level: getMetricLevel('wordsPerMinute', metrics.wordsPerMinute) },
    { label: l.avgSentenceLength, value: `${metrics.avgSentenceLength} words`, level: getMetricLevel('avgSentenceLength', metrics.avgSentenceLength) },
    { label: l.vocabularyDiversity, value: `${Math.round(metrics.vocabularyDiversity * 100)}%`, level: getMetricLevel('vocabularyDiversity', metrics.vocabularyDiversity) },
    { label: l.complexSentenceRatio, value: `${Math.round(metrics.complexSentenceRatio * 100)}%`, level: getMetricLevel('complexSentenceRatio', metrics.complexSentenceRatio) },
    { label: l.grammarErrorRate, value: `${Math.round(metrics.grammarErrorRate * 100)}%`, level: getMetricLevel('grammarErrorRate', metrics.grammarErrorRate) },
    { label: l.avgResponseTime, value: `${metrics.avgResponseTime}s`, level: getMetricLevel('avgResponseTime', metrics.avgResponseTime) },
  ];
}
