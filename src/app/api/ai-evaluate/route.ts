import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * AI-Based Dual Evaluation System
 *
 * Evaluates English speaking/writing using two standards:
 * 1. AR (Accelerated Reader) ATOS Level - Grade level equivalent
 * 2. SAT Writing Standards - College readiness evaluation
 */

export interface DualEvaluationResult {
  // AR (ATOS) Evaluation
  ar: {
    level: number;           // e.g., 4.5 = 4th grade, 5th month
    gradeEquivalent: string; // e.g., "Grade 4-5"
    readabilityScore: number; // 0-100
    breakdown: {
      avgSentenceLength: number;
      avgWordLength: number;
      avgSyllablesPerWord: number;
      vocabularyDifficulty: 'basic' | 'intermediate' | 'advanced' | 'academic';
    };
    interpretation: string;  // AI explanation
  };

  // SAT Writing Evaluation
  sat: {
    estimatedScore: number;  // 200-800 scale
    percentile: number;      // Estimated percentile
    category: 'below-average' | 'average' | 'above-average' | 'excellent';
    rubricScores: {
      commandOfEvidence: number;      // 1-4 scale
      expressionOfIdeas: number;      // 1-4 scale
      standardEnglishConventions: number; // 1-4 scale
      wordsInContext: number;         // 1-4 scale
    };
    strengths: string[];
    areasForImprovement: string[];
    sampleCorrections: Array<{
      original: string;
      improved: string;
      satReason: string;  // Why this matters for SAT
    }>;
  };

  // Combined Analysis
  combined: {
    overallAssessment: string;
    currentLevel: string;      // e.g., "High School Sophomore"
    targetLevel: string;       // Next goal
    priorityFocus: string[];   // What to work on first
    estimatedTimeToImprove: string;
    personalizedTips: string[];
  };

  // Comparison with previous (if provided)
  growth?: {
    arLevelChange: number;
    satScoreChange: number;
    improvedAreas: string[];
    consistency: string;
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      text,           // User's spoken/written text
      userMessages,   // Array of user messages (for conversation context)
      birthYear,      // For age-appropriate evaluation
      previousEvaluation, // For growth tracking
      language = 'en' // Response language
    } = body;

    if (!text && (!userMessages || userMessages.length === 0)) {
      return NextResponse.json(
        { error: 'Text or userMessages required' },
        { status: 400 }
      );
    }

    const textToEvaluate = text || userMessages.join(' ');
    const age = birthYear ? new Date().getFullYear() - birthYear : null;
    const isKorean = language === 'ko';

    const systemPrompt = `You are an expert English language assessor with deep knowledge of:
1. AR (Accelerated Reader) ATOS readability formula
2. SAT Writing and Language test standards

Your task is to evaluate the following English text using BOTH standards and provide a comprehensive assessment.

=== AR (ATOS) EVALUATION GUIDELINES ===
The ATOS (Advantage-TASA Open Standard) formula considers:
- Average Sentence Length (ASL): Words per sentence
- Average Word Length (AWL): Characters per word
- Vocabulary difficulty based on word frequency lists
- Grade level ranges from K (0.0) to College (13.0+)

Grade Level Interpretation:
- 0.0-1.0: Kindergarten
- 1.0-2.0: 1st Grade
- 2.0-3.0: 2nd Grade
- 3.0-4.0: 3rd Grade
- 4.0-5.0: 4th Grade
- 5.0-6.0: 5th Grade
- 6.0-7.0: 6th Grade
- 7.0-8.0: 7th Grade (Middle School)
- 8.0-9.0: 8th Grade
- 9.0-10.0: 9th Grade (High School)
- 10.0-11.0: 10th Grade
- 11.0-12.0: 11th Grade
- 12.0-13.0: 12th Grade
- 13.0+: College Level

=== SAT WRITING EVALUATION GUIDELINES ===
SAT Writing & Language scores range from 200-800.
Evaluate based on the official College Board rubric:

1. Command of Evidence (1-4):
   - How well does the text use information to support claims?
   - Are examples relevant and effectively integrated?

2. Expression of Ideas (1-4):
   - Organization and logical flow
   - Effective use of transitions
   - Precision of word choice
   - Sentence variety

3. Standard English Conventions (1-4):
   - Grammar and usage
   - Punctuation
   - Sentence structure

4. Words in Context (1-4):
   - Appropriate vocabulary choices
   - Understanding of nuance and tone

Score Interpretation:
- 200-400: Below Average (needs significant improvement)
- 400-500: Average (meeting basic standards)
- 500-600: Above Average (good command)
- 600-700: Excellent (strong skills)
- 700-800: Outstanding (exceptional mastery)

${age ? `
=== LEARNER CONTEXT ===
Age: ${age} years old
Expected AR Level for age: ${age <= 6 ? '0.5-1.5' : age <= 8 ? '1.5-3.0' : age <= 10 ? '3.0-5.0' : age <= 12 ? '5.0-7.0' : age <= 14 ? '7.0-9.0' : age <= 16 ? '9.0-11.0' : '11.0-13.0+'}
Consider age-appropriate expectations in your feedback.
` : ''}

${previousEvaluation ? `
=== PREVIOUS EVALUATION (for growth comparison) ===
Previous AR Level: ${previousEvaluation.arLevel}
Previous SAT Score: ${previousEvaluation.satScore}
Date: ${previousEvaluation.date}
` : ''}

=== OUTPUT FORMAT ===
Return ONLY valid JSON matching this structure (${isKorean ? 'explanations in Korean' : 'explanations in English'}):

{
  "ar": {
    "level": <number like 4.5>,
    "gradeEquivalent": "<string like 'Grade 4-5'>",
    "readabilityScore": <0-100>,
    "breakdown": {
      "avgSentenceLength": <number>,
      "avgWordLength": <number>,
      "avgSyllablesPerWord": <number>,
      "vocabularyDifficulty": "<basic|intermediate|advanced|academic>"
    },
    "interpretation": "<${isKorean ? '한국어로' : 'in English'} explain what this AR level means>"
  },
  "sat": {
    "estimatedScore": <200-800>,
    "percentile": <0-100>,
    "category": "<below-average|average|above-average|excellent>",
    "rubricScores": {
      "commandOfEvidence": <1-4>,
      "expressionOfIdeas": <1-4>,
      "standardEnglishConventions": <1-4>,
      "wordsInContext": <1-4>
    },
    "strengths": ["<strength 1>", "<strength 2>"],
    "areasForImprovement": ["<area 1>", "<area 2>"],
    "sampleCorrections": [
      {
        "original": "<original phrase>",
        "improved": "<SAT-level improvement>",
        "satReason": "<why this matters for SAT>"
      }
    ]
  },
  "combined": {
    "overallAssessment": "<${isKorean ? '종합 평가 (한국어)' : 'overall assessment'}>",
    "currentLevel": "<e.g., 'Middle School' or 'High School Sophomore'>",
    "targetLevel": "<next goal level>",
    "priorityFocus": ["<focus area 1>", "<focus area 2>"],
    "estimatedTimeToImprove": "<realistic timeframe>",
    "personalizedTips": ["<specific tip 1>", "<specific tip 2>", "<specific tip 3>"]
  }${previousEvaluation ? `,
  "growth": {
    "arLevelChange": <positive or negative number>,
    "satScoreChange": <positive or negative number>,
    "improvedAreas": ["<area that improved>"],
    "consistency": "<assessment of learning consistency>"
  }` : ''}
}

BE ACCURATE AND HONEST. Do not inflate scores. This is for genuine learning assessment.`;

    const userPrompt = `Evaluate this English text:

"""
${textToEvaluate}
"""

Analyze thoroughly and return the JSON evaluation.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.3,  // Lower temperature for more consistent evaluation
      max_tokens: 2000,
    });

    const content = response.choices[0]?.message?.content || '';

    // Extract JSON from response
    let evaluation: DualEvaluationResult;
    try {
      // Try to find JSON in the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        evaluation = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      return NextResponse.json(
        { error: 'Failed to parse evaluation', raw: content },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      evaluation,
      metadata: {
        textLength: textToEvaluate.length,
        wordCount: textToEvaluate.split(/\s+/).length,
        evaluatedAt: new Date().toISOString(),
        model: 'gpt-4o',
      }
    });

  } catch (error) {
    console.error('AI Evaluate error:', error);
    return NextResponse.json(
      { error: 'Evaluation failed', details: String(error) },
      { status: 500 }
    );
  }
}
