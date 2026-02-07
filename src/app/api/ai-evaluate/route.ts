import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * AI-Based Comprehensive Evaluation System
 *
 * Evaluates English using international school standards:
 * 1. SR (Star Reading) - Student reading ability measurement
 * 2. AR (Accelerated Reader) - Text difficulty measurement (ATOS)
 * 3. IB (International Baccalaureate) - Language B assessment criteria
 * 4. Cambridge (CEFR) - A1-C2 proficiency levels
 * 5. SAT - College Board Writing standards
 * 6. MAP (NWEA) - Measures of Academic Progress
 */

export interface ComprehensiveEvaluationResult {
  // ========== SR (Star Reading) ==========
  sr: {
    gradeEquivalent: number;      // e.g., 5.3 = 5th grade, 3rd month
    scaledScore: number;          // 0-1400
    percentileRank: number;       // 1-99
    instructionalLevel: 'Independent' | 'Instructional' | 'Frustration';
    zpd: {
      low: number;
      high: number;
    };
    domains: {
      wordKnowledge: number;
      comprehensionStrategies: number;
      analyzingArgument: number;
    };
    interpretation: string;
  };

  // ========== AR (ATOS) ==========
  ar: {
    level: number;                // e.g., 4.5
    gradeEquivalent: string;      // e.g., "Grade 4-5"
    interestLevel: 'LG' | 'MG' | 'MG+' | 'UG'; // Lower/Middle/Upper Grade
    breakdown: {
      avgSentenceLength: number;
      avgWordLength: number;
      vocabularyDifficulty: 'basic' | 'intermediate' | 'advanced' | 'academic';
    };
    interpretation: string;
  };

  // ========== IB Language B ==========
  ib: {
    level: 'SL' | 'HL';           // Standard Level or Higher Level recommendation
    phase: 1 | 2 | 3 | 4 | 5;     // IB MYP Phase 1-5
    criteria: {
      comprehension: number;       // Criterion A: 0-8
      writtenExpression: number;   // Criterion B: 0-8
      spokenInteraction: number;   // Criterion C: 0-8
      languageUse: number;         // Criterion D: 0-8
    };
    totalScore: number;            // /32
    gradeDescriptor: 1 | 2 | 3 | 4 | 5 | 6 | 7;
    interpretation: string;
  };

  // ========== Cambridge CEFR ==========
  cambridge: {
    cefrLevel: 'Pre-A1' | 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
    cambridgeExam: string;         // e.g., "KET", "PET", "FCE", "CAE", "CPE"
    skills: {
      reading: number;             // 0-100
      writing: number;
      listening: number;           // estimated
      speaking: number;
    };
    grammarVocabulary: number;     // 0-100
    canDoStatements: string[];     // What the learner can do at this level
    interpretation: string;
  };

  // ========== SAT Writing ==========
  sat: {
    estimatedScore: number;        // 200-800
    percentile: number;
    category: 'below-average' | 'average' | 'above-average' | 'excellent';
    rubricScores: {
      commandOfEvidence: number;   // 1-4
      expressionOfIdeas: number;
      standardEnglishConventions: number;
      wordsInContext: number;
    };
    collegeReadiness: 'Not Ready' | 'Approaching' | 'Ready' | 'Exceeds';
    interpretation: string;
  };

  // ========== MAP (NWEA) ==========
  map: {
    ritScore: number;              // 140-300 typical range
    percentile: number;
    gradeLevel: string;
    growthProjection: {
      currentLevel: number;
      typicalGrowth: number;       // Expected growth per year
      projectedEndOfYear: number;
    };
    lexileRange: {
      low: number;
      high: number;
    };
    instructionalAreas: {
      literaryText: 'Low' | 'Average' | 'High';
      informationalText: 'Low' | 'Average' | 'High';
      vocabularyUse: 'Low' | 'Average' | 'High';
      writingConventions: 'Low' | 'Average' | 'High';
    };
    interpretation: string;
  };

  // ========== Gap Analysis (AR vs SR) ==========
  gapAnalysis: {
    textDifficulty: number;        // AR level
    studentAbility: number;        // SR grade equivalent
    gap: number;
    status: 'below-potential' | 'at-level' | 'challenging-self';
    recommendation: string;
  };

  // ========== Combined Summary ==========
  summary: {
    overallAssessment: string;
    strongestAreas: string[];
    priorityImprovement: string[];
    recommendedFocus: string;
    nextSteps: string[];
    equivalentLevel: {
      usGrade: string;             // e.g., "6th Grade"
      ukYear: string;              // e.g., "Year 7"
      ibPhase: string;             // e.g., "MYP Phase 3"
      cefr: string;                // e.g., "B1"
    };
  };

  // ========== Growth Tracking ==========
  growth?: {
    previousEvalDate: string;
    srChange: number;
    arChange: number;
    mapRitChange: number;
    overallProgress: 'declining' | 'stable' | 'improving' | 'accelerating';
    analysis: string;
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      text,
      userMessages,
      birthYear,
      previousEvaluation,
      language = 'en'
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

    const systemPrompt = `You are an expert English language assessor certified in multiple international assessment frameworks:
- SR (Star Reading) by Renaissance Learning
- AR (Accelerated Reader) ATOS formula
- IB (International Baccalaureate) Language B criteria
- Cambridge English (CEFR framework)
- SAT Writing by College Board
- MAP (Measures of Academic Progress) by NWEA

=== SR (STAR READING) ===
PURPOSE: Measures STUDENT'S reading/language ability
- Scaled Score: 0-1400
- Grade Equivalent: e.g., 5.3 = 5th grade, 3rd month
- Percentile Rank: 1-99 (compared to same-grade peers)
- ZPD (Zone of Proximal Development): Optimal learning range
- Instructional Level: Independent (>95%), Instructional (90-95%), Frustration (<90%)

=== AR (ATOS) ===
PURPOSE: Measures TEXT difficulty level
- Level: 0.0 (K) to 13.0+ (College)
- Based on: sentence length, word length, vocabulary frequency
- Interest Level: LG (K-3), MG (4-8), MG+ (6+), UG (9-12)

=== IB LANGUAGE B ===
PURPOSE: International Baccalaureate assessment criteria
MYP Phases: 1 (beginner) to 5 (advanced)
Criteria (each 0-8):
- A: Comprehending spoken and visual text
- B: Comprehending written and visual text
- C: Communicating (speaking)
- D: Using language (accuracy, vocabulary, register)

DP Level: SL (Standard Level) or HL (Higher Level)
Grade Descriptors: 1-7 scale

=== CAMBRIDGE CEFR ===
PURPOSE: Common European Framework proficiency levels
- Pre-A1, A1, A2: Basic user
- B1, B2: Independent user
- C1, C2: Proficient user

Cambridge Exams mapping:
- A2: KET (Key)
- B1: PET (Preliminary)
- B2: FCE (First)
- C1: CAE (Advanced)
- C2: CPE (Proficiency)

=== SAT WRITING ===
PURPOSE: College readiness assessment (College Board)
Score: 200-800
Rubric (1-4 each):
1. Command of Evidence
2. Expression of Ideas
3. Standard English Conventions
4. Words in Context

College Readiness: 480+ approaching, 530+ ready

=== MAP (NWEA) ===
PURPOSE: Measures academic progress and growth
RIT Score: Typically 140-300
- Grade 3: ~188-200
- Grade 5: ~206-214
- Grade 8: ~217-227
- Grade 11: ~224-234

Lexile correlation for reading placement
Growth norms for tracking progress over time

${age ? `
=== LEARNER CONTEXT ===
Age: ${age} years old
Expected levels:
- AR: ${age <= 6 ? '0.5-1.5' : age <= 8 ? '1.5-3.0' : age <= 10 ? '3.0-5.0' : age <= 12 ? '5.0-7.0' : age <= 14 ? '7.0-9.0' : age <= 16 ? '9.0-11.0' : '11.0+'}
- IB Phase: ${age <= 8 ? '1' : age <= 10 ? '2' : age <= 12 ? '3' : age <= 14 ? '4' : '5'}
- Cambridge: ${age <= 8 ? 'Pre-A1/A1' : age <= 10 ? 'A1/A2' : age <= 12 ? 'A2/B1' : age <= 14 ? 'B1/B2' : age <= 16 ? 'B2' : 'B2/C1'}
` : ''}

${previousEvaluation ? `
=== PREVIOUS EVALUATION ===
Date: ${previousEvaluation.date}
SR: ${previousEvaluation.sr?.gradeEquivalent}
AR: ${previousEvaluation.ar?.level}
MAP RIT: ${previousEvaluation.map?.ritScore}
` : ''}

=== OUTPUT REQUIREMENTS ===
Return ONLY valid JSON (${isKorean ? 'interpretations in Korean' : 'interpretations in English'}):

{
  "sr": {
    "gradeEquivalent": <number like 5.3>,
    "scaledScore": <0-1400>,
    "percentileRank": <1-99>,
    "instructionalLevel": "<Independent|Instructional|Frustration>",
    "zpd": { "low": <number>, "high": <number> },
    "domains": {
      "wordKnowledge": <0-100>,
      "comprehensionStrategies": <0-100>,
      "analyzingArgument": <0-100>
    },
    "interpretation": "<explanation>"
  },
  "ar": {
    "level": <number like 4.5>,
    "gradeEquivalent": "<e.g., Grade 4-5>",
    "interestLevel": "<LG|MG|MG+|UG>",
    "breakdown": {
      "avgSentenceLength": <number>,
      "avgWordLength": <number>,
      "vocabularyDifficulty": "<basic|intermediate|advanced|academic>"
    },
    "interpretation": "<explanation>"
  },
  "ib": {
    "level": "<SL|HL>",
    "phase": <1-5>,
    "criteria": {
      "comprehension": <0-8>,
      "writtenExpression": <0-8>,
      "spokenInteraction": <0-8>,
      "languageUse": <0-8>
    },
    "totalScore": <0-32>,
    "gradeDescriptor": <1-7>,
    "interpretation": "<explanation>"
  },
  "cambridge": {
    "cefrLevel": "<Pre-A1|A1|A2|B1|B2|C1|C2>",
    "cambridgeExam": "<KET|PET|FCE|CAE|CPE>",
    "skills": {
      "reading": <0-100>,
      "writing": <0-100>,
      "listening": <0-100>,
      "speaking": <0-100>
    },
    "grammarVocabulary": <0-100>,
    "canDoStatements": ["<what learner can do>", "<...>"],
    "interpretation": "<explanation>"
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
    "collegeReadiness": "<Not Ready|Approaching|Ready|Exceeds>",
    "interpretation": "<explanation>"
  },
  "map": {
    "ritScore": <140-300>,
    "percentile": <1-99>,
    "gradeLevel": "<e.g., Grade 5>",
    "growthProjection": {
      "currentLevel": <RIT>,
      "typicalGrowth": <expected annual growth>,
      "projectedEndOfYear": <projected RIT>
    },
    "lexileRange": { "low": <number>, "high": <number> },
    "instructionalAreas": {
      "literaryText": "<Low|Average|High>",
      "informationalText": "<Low|Average|High>",
      "vocabularyUse": "<Low|Average|High>",
      "writingConventions": "<Low|Average|High>"
    },
    "interpretation": "<explanation>"
  },
  "gapAnalysis": {
    "textDifficulty": <AR level>,
    "studentAbility": <SR grade equivalent>,
    "gap": <difference>,
    "status": "<below-potential|at-level|challenging-self>",
    "recommendation": "<specific recommendation>"
  },
  "summary": {
    "overallAssessment": "<comprehensive assessment>",
    "strongestAreas": ["<area1>", "<area2>"],
    "priorityImprovement": ["<area1>", "<area2>"],
    "recommendedFocus": "<what to focus on next>",
    "nextSteps": ["<step1>", "<step2>", "<step3>"],
    "equivalentLevel": {
      "usGrade": "<e.g., 6th Grade>",
      "ukYear": "<e.g., Year 7>",
      "ibPhase": "<e.g., MYP Phase 3>",
      "cefr": "<e.g., B1>"
    }
  }${previousEvaluation ? `,
  "growth": {
    "previousEvalDate": "${previousEvaluation.date}",
    "srChange": <change in SR grade equivalent>,
    "arChange": <change in AR level>,
    "mapRitChange": <change in MAP RIT>,
    "overallProgress": "<declining|stable|improving|accelerating>",
    "analysis": "<growth analysis>"
  }` : ''}
}

BE ACCURATE AND CONSISTENT. Base assessments on actual evidence in the text.
Cross-reference scores across frameworks for consistency.`;

    const userPrompt = `Evaluate this English text using all six assessment frameworks (SR, AR, IB, Cambridge, SAT, MAP):

"""
${textToEvaluate}
"""

Provide comprehensive evaluation with all scores and interpretations.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.3,
      max_tokens: 3500,
    });

    const content = response.choices[0]?.message?.content || '';

    let evaluation: ComprehensiveEvaluationResult;
    try {
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
        frameworks: ['SR', 'AR', 'IB', 'Cambridge', 'SAT', 'MAP'],
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
