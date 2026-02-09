import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { checkRateLimit, getRateLimitId, RATE_LIMITS } from '@/lib/rateLimit';
import {
  analyzeSpeaking,
  convertToStandardizedScores,
  generateImprovementGuide,
  SpeakingMetricsResult,
  StandardizedScores,
  ImprovementGuideItem,
  GRADE_BENCHMARKS,
} from '@/lib/speakingMetrics';

/**
 * Speaking Evaluation API
 *
 * Evaluates spoken English against US/UK native speaker grade-level standards
 * and converts to international test scores (IELTS, TOEFL, TOEIC)
 *
 * Key Features:
 * 1. Algorithmic analysis (not AI guessing)
 * 2. US Common Core / UK National Curriculum standards
 * 3. Measurable metrics with clear criteria
 * 4. IELTS/TOEFL/TOEIC/CEFR score conversion
 */

export interface SpeakingEvaluationResponse {
  success: boolean;
  evaluation: {
    // Primary grade-level assessment
    gradeLevel: {
      grade: string;           // K, 1-2, 3-4, etc.
      usGrade: string;         // Full US grade name
      ukYear: string;          // UK equivalent
      confidence: 'high' | 'medium' | 'low';
      matchScore: number;      // 0-100
    };

    // Standardized test equivalents
    testScores: StandardizedScores;

    // Detailed metrics (the "why" behind the grade)
    metrics: {
      // Response characteristics
      avgWordsPerTurn: number;
      avgWordsPerSentence: number;

      // Sentence complexity breakdown
      sentenceComplexity: {
        simple: number;
        compound: number;
        complex: number;
        simpleRatio: number;
        compoundRatio: number;
        complexRatio: number;
      };

      // Vocabulary analysis
      vocabulary: {
        lexicalDiversity: number;   // TTR
        tier1Percentage: number;    // Basic words
        tier2Percentage: number;    // Academic words
        tier3Percentage: number;    // Domain-specific
      };

      // Discourse markers used
      discourseMarkers: {
        basicUsed: string[];
        intermediateUsed: string[];
        advancedUsed: string[];
        totalPer100Words: number;
      };

      // Grammar indicators
      grammar: {
        estimatedErrorRate: number;
        issues: string[];
      };
    };

    // Strengths and areas for improvement
    feedback: {
      strengths: string[];
      improvements: string[];
      nextSteps: string[];
    };

    // Specific improvement guide with actionable tips
    improvementGuide: ImprovementGuideItem[];

    // Grade expectation comparison
    comparison: {
      expectedForAge: string | null;
      performanceVsExpected: 'above' | 'at' | 'below' | null;
      gradeGap: number | null;
    };
  };

  // Metadata
  metadata: {
    totalWords: number;
    totalTurns: number;
    evaluatedAt: string;
    methodology: string;
  };
}

function getExpectedGradeForAge(birthYear: number | null): string | null {
  if (!birthYear) return null;
  const age = new Date().getFullYear() - birthYear;

  if (age <= 5) return 'K';
  if (age <= 7) return '1-2';
  if (age <= 9) return '3-4';
  if (age <= 11) return '5-6';
  if (age <= 13) return '7-8';
  if (age <= 15) return '9-10';
  if (age <= 17) return '11-12';
  return 'College';
}

function getGradeIndex(grade: string): number {
  const grades = ['K', '1-2', '3-4', '5-6', '7-8', '9-10', '11-12', 'College'];
  return grades.indexOf(grade);
}

function generateFeedback(
  metrics: SpeakingMetricsResult,
  language: string
): { strengths: string[]; improvements: string[]; nextSteps: string[] } {
  const isKorean = language === 'ko';
  const strengths: string[] = [];
  const improvements: string[] = [];
  const nextSteps: string[] = [];

  // Copy from grade match analysis
  metrics.gradeMatch.strengths.forEach(s => strengths.push(s));
  metrics.gradeMatch.weaknesses.forEach(w => improvements.push(w));

  // Add specific metrics-based feedback
  if (metrics.avgWordsPerTurn >= 30) {
    strengths.push(isKorean
      ? '충분한 길이의 응답으로 의견을 잘 전달함'
      : 'Provides well-developed, extended responses');
  } else if (metrics.avgWordsPerTurn < 15) {
    improvements.push(isKorean
      ? '더 길고 자세한 응답 연습 필요'
      : 'Work on providing longer, more detailed responses');
  }

  if (metrics.vocabulary.tier2Percentage >= 20) {
    strengths.push(isKorean
      ? '학술적/전문적 어휘를 잘 활용함'
      : 'Good use of academic vocabulary');
  }

  if (metrics.sentenceComplexity.complexRatio >= 30) {
    strengths.push(isKorean
      ? '복잡한 문장 구조를 잘 사용함'
      : 'Uses complex sentence structures effectively');
  }

  if (metrics.discourseMarkers.advancedPer100 >= 1) {
    strengths.push(isKorean
      ? '고급 담화 표지어(however, therefore 등)를 적절히 사용함'
      : 'Good use of advanced discourse markers');
  }

  // Generate next steps
  const grade = metrics.gradeMatch.bestMatch;
  const benchmark = GRADE_BENCHMARKS.find(b => b.grade === grade);

  if (benchmark) {
    if (metrics.vocabulary.tier2Percentage < benchmark.vocabularyProfile.tier2Min) {
      nextSteps.push(isKorean
        ? `학술 어휘(Tier 2) 비율을 ${benchmark.vocabularyProfile.tier2Min}% 이상으로 높이기`
        : `Increase academic vocabulary to ${benchmark.vocabularyProfile.tier2Min}%+ of words used`);
    }

    if (metrics.sentenceComplexity.complexRatio < benchmark.sentenceComplexity.complexRatio[0]) {
      nextSteps.push(isKorean
        ? '종속절(because, although, when 등)을 사용한 복문 연습하기'
        : 'Practice using complex sentences with subordinate clauses');
    }

    if (metrics.discourseMarkers.intermediatePer100 < benchmark.discourseMarkers.intermediateMin) {
      nextSteps.push(isKorean
        ? '연결어(however, therefore, for example) 더 많이 사용하기'
        : 'Use more transition words like however, therefore, for example');
    }
  }

  // Ensure we have at least some feedback
  if (strengths.length === 0) {
    strengths.push(isKorean
      ? '영어로 의사소통을 시도하고 있음'
      : 'Attempting to communicate in English');
  }

  if (nextSteps.length === 0) {
    nextSteps.push(isKorean
      ? '매일 조금씩 더 긴 문장으로 말하기 연습하기'
      : 'Practice speaking in slightly longer sentences each day');
  }

  return { strengths, improvements, nextSteps };
}

export async function POST(request: NextRequest) {
  try {
    // Auth check
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Authentication required', success: false }, { status: 401 });
    }

    // Rate limit
    const rateLimitResult = checkRateLimit(getRateLimitId(session.user.email, request), RATE_LIMITS.light);
    if (rateLimitResult) return rateLimitResult;

    const body = await request.json();
    const {
      userMessages,      // Array of user message strings
      birthYear,         // Optional: for age-appropriate comparison
      language = 'en',   // 'en' or 'ko' for feedback language
    } = body;

    if (!userMessages || userMessages.length === 0) {
      return NextResponse.json(
        { error: 'userMessages array is required', success: false },
        { status: 400 }
      );
    }

    // Filter to only string messages
    const messages = userMessages.filter((m: unknown) => typeof m === 'string' && m.trim().length > 0);

    if (messages.length === 0) {
      return NextResponse.json(
        { error: 'No valid messages to evaluate', success: false },
        { status: 400 }
      );
    }

    // ===== STEP 1: Algorithmic Analysis =====
    const metrics = analyzeSpeaking(messages);

    // ===== STEP 2: Convert to Standardized Scores =====
    const standardizedScores = convertToStandardizedScores(metrics);

    // ===== STEP 3: Age Comparison =====
    const expectedGrade = getExpectedGradeForAge(birthYear);
    let performanceVsExpected: 'above' | 'at' | 'below' | null = null;
    let gradeGap: number | null = null;

    if (expectedGrade) {
      const expectedIndex = getGradeIndex(expectedGrade);
      const actualIndex = getGradeIndex(metrics.gradeMatch.bestMatch);
      gradeGap = actualIndex - expectedIndex;

      if (gradeGap > 0) {
        performanceVsExpected = 'above';
      } else if (gradeGap < 0) {
        performanceVsExpected = 'below';
      } else {
        performanceVsExpected = 'at';
      }
    }

    // ===== STEP 4: Generate Feedback =====
    const feedback = generateFeedback(metrics, language);

    // ===== STEP 4.5: Generate Improvement Guide =====
    const improvementGuide = generateImprovementGuide(metrics, language);

    // ===== STEP 5: Build Response =====
    const response: SpeakingEvaluationResponse = {
      success: true,
      evaluation: {
        gradeLevel: {
          grade: metrics.gradeMatch.bestMatch,
          usGrade: metrics.gradeMatch.usGrade,
          ukYear: metrics.gradeMatch.ukYear,
          confidence: metrics.gradeMatch.confidence,
          matchScore: metrics.gradeMatch.matchScores[0]?.score || 0,
        },
        testScores: standardizedScores,
        metrics: {
          avgWordsPerTurn: metrics.avgWordsPerTurn,
          avgWordsPerSentence: metrics.avgWordsPerSentence,
          sentenceComplexity: {
            simple: metrics.sentenceComplexity.simple,
            compound: metrics.sentenceComplexity.compound,
            complex: metrics.sentenceComplexity.complex,
            simpleRatio: metrics.sentenceComplexity.simpleRatio,
            compoundRatio: metrics.sentenceComplexity.compoundRatio,
            complexRatio: metrics.sentenceComplexity.complexRatio,
          },
          vocabulary: {
            lexicalDiversity: metrics.vocabulary.lexicalDiversity,
            tier1Percentage: metrics.vocabulary.tier1Percentage,
            tier2Percentage: metrics.vocabulary.tier2Percentage,
            tier3Percentage: metrics.vocabulary.tier3Percentage,
          },
          discourseMarkers: {
            basicUsed: metrics.discourseMarkers.basic,
            intermediateUsed: metrics.discourseMarkers.intermediate,
            advancedUsed: metrics.discourseMarkers.advanced,
            totalPer100Words: Math.round(
              (metrics.discourseMarkers.basicPer100 +
               metrics.discourseMarkers.intermediatePer100 +
               metrics.discourseMarkers.advancedPer100) * 10
            ) / 10,
          },
          grammar: {
            estimatedErrorRate: metrics.grammarIndicators.estimatedErrorsPer100,
            issues: [
              ...(metrics.grammarIndicators.subjectVerbAgreementIssues > 0
                ? [`Subject-verb agreement: ${metrics.grammarIndicators.subjectVerbAgreementIssues} issue(s)`]
                : []),
              ...(metrics.grammarIndicators.articleIssues > 0
                ? [`Article usage: ${metrics.grammarIndicators.articleIssues} issue(s)`]
                : []),
            ],
          },
        },
        feedback,
        improvementGuide,
        comparison: {
          expectedForAge: expectedGrade,
          performanceVsExpected,
          gradeGap,
        },
      },
      metadata: {
        totalWords: metrics.totalWords,
        totalTurns: metrics.totalTurns,
        evaluatedAt: new Date().toISOString(),
        methodology: 'algorithmic-grade-level-analysis',
      },
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Speaking evaluation error:', error);
    return NextResponse.json(
      { error: 'Evaluation failed', success: false },
      { status: 500 }
    );
  }
}
