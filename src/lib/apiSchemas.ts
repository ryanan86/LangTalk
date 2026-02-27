/**
 * Zod validation schemas for API routes
 * Centralized input validation to replace scattered manual checks
 */

import { z } from 'zod';

// ============================================
// Shared primitives
// ============================================

const messageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().min(1).max(10000),
});

const correctionCategorySchema = z.enum([
  'grammar', 'vocabulary', 'sentence-structure', 'pronunciation', 'other',
]);

// ============================================
// /api/chat
// ============================================

export const chatBodySchema = z.object({
  messages: z.array(messageSchema).min(1).max(100),
  tutorId: z.string().min(1).max(50),
  mode: z.enum(['interview', 'analysis', 'feedback']).optional(),
  language: z.string().max(10).default('en'),
  stream: z.boolean().default(false),
  birthYear: z.number().int().min(1920).max(2025).optional(),
  userName: z.string().max(100).optional(),
  previousGrade: z.string().max(50).optional().nullable(),
  previousLevelDetails: z.object({
    grammar: z.number().min(0).max(10),
    vocabulary: z.number().min(0).max(10),
    fluency: z.number().min(0).max(10),
    comprehension: z.number().min(0).max(10),
  }).optional().nullable(),
  speechMetrics: z.object({
    wordsPerMinute: z.number().min(0).optional(),
    avgResponseTime: z.number().min(0).optional(),
    avgTurnLength: z.number().min(0).optional(),
    avgSentenceLength: z.number().min(0),
    vocabularyDiversity: z.number().min(0).max(1),
    fillerRatio: z.number().min(0).max(1).optional(),
    totalTurns: z.number().int().min(0).optional(),
    totalWords: z.number().int().min(0).optional(),
    totalSpeakingTime: z.number().min(0).optional(),
  }).optional().nullable(),
  selectedTopic: z.string().max(200).optional(),
  startMode: z.enum(['free-talk', 'topic-guided', 'tutor-first', 'warmup']).optional(),
});

export type ChatBody = z.infer<typeof chatBodySchema>;

// ============================================
// /api/user-profile (POST)
// ============================================

export const userProfileBodySchema = z.object({
  profileType: z.enum([
    'student_elementary', 'student_middle', 'student_high',
    'university', 'adult_beginner', 'adult_intermediate',
    'adult_advanced', 'business',
  ]).optional(),
  interests: z.array(z.string().max(100)).max(20).optional(),
  customContext: z.string().max(1000).optional(),
  preferredTopics: z.array(z.string().max(100)).max(20).optional(),
  grade: z.string().max(20).optional(),
  age: z.number().int().min(3).max(120).optional(),
  nativeLanguage: z.enum(['ko', 'en', 'other']).optional(),
  preferredTutors: z.array(z.string().max(50)).max(10).optional(),
  difficultyPreference: z.enum(['easy', 'medium', 'hard', 'adaptive']).optional(),
  correctionLevel: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]).optional(),
  schedule: z.object({
    enabled: z.boolean(),
    times: z.array(z.string().regex(/^\d{2}:\d{2}$/)).max(10),
    days: z.array(z.number().int().min(0).max(6)).max(7),
    preferredTutor: z.string().max(50).optional(),
    timezone: z.string().max(50).optional(),
  }).optional().nullable(),
});

export type UserProfileBody = z.infer<typeof userProfileBodySchema>;

// ============================================
// /api/lesson-history (POST)
// ============================================

export const lessonHistoryBodySchema = z.object({
  tutor: z.string().max(50).optional(),
  duration: z.number().min(0).max(3600).optional(),
  topicSummary: z.string().max(500).optional(),
  feedbackSummary: z.string().max(2000).optional(),
  keyCorrections: z.string().max(2000).optional(),
  level: z.string().max(50).optional(),
  levelDetails: z.object({
    grammar: z.number().min(0).max(10),
    vocabulary: z.number().min(0).max(10),
    fluency: z.number().min(0).max(10),
    comprehension: z.number().min(0).max(10),
  }).optional().nullable(),
  corrections: z.array(z.object({
    original: z.string().max(2000).optional(),
    corrected: z.string().max(2000).optional(),
    explanation: z.string().max(2000).optional(),
    category: z.string().max(50).optional(),
  })).max(50).optional(),
  language: z.string().max(10).optional(),
});

export type LessonHistoryBody = z.infer<typeof lessonHistoryBodySchema>;

// ============================================
// /api/corrections/review (POST)
// ============================================

export const correctionReviewBodySchema = z.object({
  correctionId: z.string().min(1).max(200),
  quality: z.number().int().min(0).max(5),
});

export type CorrectionReviewBody = z.infer<typeof correctionReviewBodySchema>;

// ============================================
// /api/corrections (POST)
// ============================================

export const correctionItemSchema = z.object({
  original: z.string().max(2000),
  corrected: z.string().max(2000),
  explanation: z.string().max(2000).optional().default(''),
  category: correctionCategorySchema.optional().default('grammar'),
});

export const correctionsPostBodySchema = z.union([
  correctionItemSchema,
  z.array(correctionItemSchema).min(1).max(50),
]);

export type CorrectionsPostBody = z.infer<typeof correctionsPostBodySchema>;

// ============================================
// /api/vocab-book (POST)
// ============================================

export const vocabBookPostBodySchema = z.object({
  items: z.array(z.object({
    id: z.string().min(1).max(200),
    term: z.string().min(1).max(200),
    sourceSentence: z.string().max(500).optional(),
    sourceSessionId: z.string().max(200).optional(),
    sourceDate: z.string().max(20),
    difficulty: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]),
    proficiency: z.number().min(0).max(100),
    nextReviewAt: z.string().max(20),
    reviewCount: z.number().int().min(0),
    status: z.enum(['active', 'mastered', 'archived']),
  })).min(1).max(100),
});

export type VocabBookPostBody = z.infer<typeof vocabBookPostBodySchema>;

// ============================================
// /api/text-to-speech (POST)
// ============================================

export const ttsBodySchema = z.object({
  text: z.string().min(1).max(5000),
  voice: z.string().min(1).max(50),
  speed: z.number().min(0.5).max(2.0).optional(),
});

export type TTSBody = z.infer<typeof ttsBodySchema>;

// ============================================
// Helper: parse and return 400 on failure
// ============================================

import { NextResponse } from 'next/server';

export function parseBody<T>(schema: z.ZodType<T>, body: unknown):
  { success: true; data: T } | { success: false; response: NextResponse } {
  const result = schema.safeParse(body);
  if (!result.success) {
    const errors = result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ');
    return {
      success: false,
      response: NextResponse.json(
        { error: 'Validation failed', details: errors },
        { status: 400 }
      ),
    };
  }
  return { success: true, data: result.data };
}
