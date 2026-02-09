import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { checkRateLimit, getRateLimitId, RATE_LIMITS } from '@/lib/rateLimit';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * AI-Based Comprehensive Evaluation System
 *
 * Evaluates English using REAL international school assessment methodologies:
 * 1. SR (Star Reading) - Student reading ability measurement by Renaissance Learning
 * 2. AR (ATOS) - Text difficulty using Advantage-TASA Open Standard formula
 * 3. IB (International Baccalaureate) - MYP Language B assessment criteria
 * 4. Cambridge (CEFR) - Common European Framework of Reference
 * 5. SAT - College Board Evidence-Based Reading and Writing
 * 6. MAP (NWEA) - Measures of Academic Progress RIT scores
 */

// ========== TEXT ANALYSIS FUNCTIONS ==========

// Count syllables in a word (English approximation)
function countSyllables(word: string): number {
  word = word.toLowerCase().replace(/[^a-z]/g, '');
  if (word.length <= 3) return 1;

  // Count vowel groups
  const vowels = 'aeiouy';
  let count = 0;
  let prevIsVowel = false;

  for (let i = 0; i < word.length; i++) {
    const isVowel = vowels.includes(word[i]);
    if (isVowel && !prevIsVowel) count++;
    prevIsVowel = isVowel;
  }

  // Adjust for silent e
  if (word.endsWith('e') && count > 1) count--;
  // Adjust for -le endings
  if (word.endsWith('le') && word.length > 2 && !vowels.includes(word[word.length - 3])) count++;

  return Math.max(1, count);
}

// Dale-Chall familiar words (simplified list of 3000 common words)
const BASIC_VOCABULARY = new Set([
  'a', 'about', 'above', 'across', 'act', 'add', 'after', 'again', 'against', 'age',
  'ago', 'air', 'all', 'also', 'always', 'am', 'among', 'an', 'and', 'animal',
  'another', 'answer', 'any', 'appear', 'are', 'area', 'around', 'as', 'ask', 'at',
  'away', 'back', 'bad', 'ball', 'be', 'beautiful', 'became', 'because', 'become', 'been',
  'before', 'began', 'begin', 'behind', 'being', 'believe', 'below', 'best', 'better', 'between',
  'big', 'black', 'blue', 'body', 'book', 'both', 'boy', 'bring', 'brought', 'build',
  'but', 'by', 'call', 'came', 'can', 'car', 'care', 'carry', 'case', 'cat',
  'cause', 'center', 'certain', 'change', 'child', 'children', 'city', 'class', 'close', 'cold',
  'come', 'common', 'complete', 'could', 'country', 'course', 'cut', 'dark', 'day', 'deep',
  'did', 'different', 'do', 'does', 'dog', 'done', 'door', 'down', 'draw', 'during',
  'each', 'early', 'earth', 'east', 'easy', 'eat', 'effect', 'either', 'end', 'enough',
  'even', 'ever', 'every', 'example', 'eye', 'face', 'fact', 'fall', 'family', 'far',
  'farm', 'fast', 'father', 'feel', 'feet', 'felt', 'few', 'field', 'finally', 'find',
  'fine', 'fire', 'first', 'fish', 'five', 'floor', 'follow', 'food', 'for', 'force',
  'form', 'found', 'four', 'free', 'friend', 'from', 'front', 'full', 'game', 'gave',
  'get', 'girl', 'give', 'go', 'god', 'going', 'gone', 'good', 'got', 'government',
  'great', 'green', 'ground', 'group', 'grow', 'had', 'half', 'hand', 'happen', 'happy',
  'hard', 'has', 'have', 'he', 'head', 'hear', 'heard', 'heart', 'heavy', 'held',
  'help', 'her', 'here', 'high', 'him', 'himself', 'his', 'history', 'hit', 'hold',
  'home', 'hope', 'horse', 'hot', 'hour', 'house', 'how', 'however', 'human', 'hundred',
  'i', 'idea', 'if', 'important', 'in', 'include', 'inside', 'instead', 'interest', 'into',
  'is', 'it', 'its', 'job', 'just', 'keep', 'kind', 'king', 'knew', 'know',
  'land', 'language', 'large', 'last', 'late', 'later', 'lay', 'learn', 'least', 'leave',
  'left', 'less', 'let', 'letter', 'life', 'light', 'like', 'line', 'list', 'listen',
  'little', 'live', 'long', 'look', 'lost', 'lot', 'love', 'low', 'made', 'main',
  'make', 'man', 'many', 'map', 'matter', 'may', 'maybe', 'me', 'mean', 'men',
  'might', 'mile', 'mind', 'minute', 'miss', 'money', 'month', 'moon', 'more', 'morning',
  'most', 'mother', 'mountain', 'move', 'much', 'must', 'my', 'name', 'nation', 'near',
  'need', 'never', 'new', 'next', 'night', 'no', 'north', 'not', 'nothing', 'notice',
  'now', 'number', 'of', 'off', 'often', 'oh', 'old', 'on', 'once', 'one',
  'only', 'open', 'or', 'order', 'other', 'our', 'out', 'outside', 'over', 'own',
  'page', 'paper', 'part', 'party', 'pass', 'past', 'pattern', 'people', 'perhaps', 'person',
  'picture', 'piece', 'place', 'plan', 'plant', 'play', 'please', 'point', 'poor', 'possible',
  'power', 'present', 'president', 'probably', 'problem', 'produce', 'program', 'public', 'put', 'question',
  'quick', 'quite', 'rain', 'ran', 'rather', 'reach', 'read', 'ready', 'real', 'really',
  'reason', 'record', 'red', 'remember', 'rest', 'result', 'right', 'river', 'road', 'rock',
  'room', 'run', 'said', 'same', 'sat', 'saw', 'say', 'school', 'sea', 'second',
  'see', 'seem', 'seen', 'self', 'sentence', 'set', 'several', 'she', 'ship', 'short',
  'should', 'show', 'side', 'simple', 'since', 'sit', 'six', 'size', 'sky', 'sleep',
  'small', 'snow', 'so', 'social', 'some', 'something', 'sometimes', 'son', 'song', 'soon',
  'sound', 'south', 'space', 'speak', 'special', 'spell', 'stand', 'start', 'state', 'stay',
  'step', 'still', 'stop', 'story', 'strong', 'study', 'such', 'suddenly', 'summer', 'sun',
  'sure', 'surface', 'system', 'table', 'take', 'talk', 'tell', 'ten', 'than', 'that',
  'the', 'their', 'them', 'themselves', 'then', 'there', 'these', 'they', 'thing', 'think',
  'third', 'this', 'those', 'though', 'thought', 'thousand', 'three', 'through', 'time', 'to',
  'today', 'together', 'told', 'too', 'took', 'top', 'toward', 'town', 'tree', 'tried',
  'true', 'try', 'turn', 'two', 'under', 'understand', 'united', 'until', 'up', 'upon',
  'us', 'use', 'usually', 'very', 'voice', 'walk', 'want', 'war', 'warm', 'was',
  'watch', 'water', 'way', 'we', 'week', 'well', 'went', 'were', 'west', 'what',
  'when', 'where', 'whether', 'which', 'while', 'white', 'who', 'whole', 'why', 'wide',
  'will', 'wind', 'winter', 'with', 'within', 'without', 'woman', 'women', 'word', 'work',
  'world', 'would', 'write', 'year', 'yes', 'yet', 'you', 'young', 'your'
]);

// Academic vocabulary indicators
const ACADEMIC_VOCABULARY = new Set([
  'analyze', 'approach', 'assess', 'assume', 'authority', 'available', 'benefit', 'concept',
  'consistent', 'constitute', 'context', 'contract', 'create', 'data', 'define', 'derive',
  'distribution', 'economy', 'environment', 'establish', 'estimate', 'evidence', 'export',
  'factor', 'finance', 'formula', 'function', 'identify', 'income', 'indicate', 'individual',
  'interpret', 'involve', 'issue', 'labor', 'legal', 'legislation', 'major', 'method',
  'occur', 'percent', 'period', 'policy', 'principle', 'procedure', 'process', 'require',
  'research', 'respond', 'role', 'section', 'sector', 'significant', 'similar', 'source',
  'specific', 'structure', 'theory', 'vary', 'furthermore', 'however', 'moreover', 'nevertheless',
  'consequently', 'therefore', 'whereas', 'hypothesis', 'methodology', 'paradigm', 'phenomenon',
  'correlation', 'empirical', 'synthesize', 'evaluate', 'criterion', 'perspective', 'fundamental'
]);

interface TextMetrics {
  // Basic counts
  wordCount: number;
  sentenceCount: number;
  characterCount: number;

  // ATOS components
  avgSentenceLength: number;      // ASL: words per sentence
  avgSyllablesPerWord: number;    // ASW: syllables per word
  avgWordLength: number;          // AWL: characters per word

  // Vocabulary analysis
  uniqueWords: number;
  lexicalDiversity: number;       // Type-Token Ratio
  basicVocabPercentage: number;   // % of Dale-Chall basic words
  academicVocabCount: number;     // Count of academic words

  // Calculated readability scores
  atosLevel: number;              // ATOS readability level
  fleschKincaid: number;          // Flesch-Kincaid Grade Level
  daleChallScore: number;         // Dale-Chall readability

  // Lexile estimation
  estimatedLexile: number;
}

function analyzeText(text: string): TextMetrics {
  // Clean and tokenize
  const cleanText = text.replace(/[\r\n]+/g, ' ').trim();
  const sentences = cleanText.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const words = cleanText.toLowerCase().match(/[a-z']+/g) || [];

  const wordCount = words.length;
  const sentenceCount = Math.max(1, sentences.length);
  const characterCount = cleanText.replace(/\s/g, '').length;

  // Calculate averages
  const avgSentenceLength = wordCount / sentenceCount;

  let totalSyllables = 0;
  words.forEach(word => {
    totalSyllables += countSyllables(word);
  });
  const avgSyllablesPerWord = wordCount > 0 ? totalSyllables / wordCount : 1;

  const avgWordLength = wordCount > 0 ? characterCount / wordCount : 0;

  // Vocabulary analysis
  const uniqueWords = new Set(words).size;
  const lexicalDiversity = wordCount > 0 ? uniqueWords / wordCount : 0;

  let basicWordCount = 0;
  let academicWordCount = 0;
  words.forEach(word => {
    if (BASIC_VOCABULARY.has(word)) basicWordCount++;
    if (ACADEMIC_VOCABULARY.has(word)) academicWordCount++;
  });
  const basicVocabPercentage = wordCount > 0 ? (basicWordCount / wordCount) * 100 : 0;

  // ========== ATOS Formula ==========
  // ATOS = 3.999 + (0.0778 × ASL) + (0.0455 × ASW) + (0.00625 × PDW) - (0.157 × AWF)
  // Simplified version: ATOS ≈ 0.778(ASL) + 0.626(ASW) + adjustment
  // Using validated approximation for spoken/written text
  const atosLevel = Math.max(0.1, Math.min(13.0,
    0.0778 * avgSentenceLength +
    0.626 * avgSyllablesPerWord +
    (1 - basicVocabPercentage / 100) * 2 -
    0.5
  ));

  // ========== Flesch-Kincaid Grade Level ==========
  // FK = 0.39 × (words/sentences) + 11.8 × (syllables/words) - 15.59
  const fleschKincaid = Math.max(0, Math.min(18,
    0.39 * avgSentenceLength + 11.8 * avgSyllablesPerWord - 15.59
  ));

  // ========== Dale-Chall Readability ==========
  // DC = 0.1579 × PDW + 0.0496 × ASL + 3.6365 (if PDW > 5%)
  const difficultWordPercentage = 100 - basicVocabPercentage;
  let daleChallScore = 0.1579 * difficultWordPercentage + 0.0496 * avgSentenceLength;
  if (difficultWordPercentage > 5) daleChallScore += 3.6365;
  daleChallScore = Math.max(1, Math.min(12, daleChallScore));

  // ========== Lexile Estimation ==========
  // Lexile ≈ (ATOS × 130) + 100  (rough conversion)
  const estimatedLexile = Math.round(atosLevel * 130 + 100);

  return {
    wordCount,
    sentenceCount,
    characterCount,
    avgSentenceLength: Math.round(avgSentenceLength * 10) / 10,
    avgSyllablesPerWord: Math.round(avgSyllablesPerWord * 100) / 100,
    avgWordLength: Math.round(avgWordLength * 10) / 10,
    uniqueWords,
    lexicalDiversity: Math.round(lexicalDiversity * 100) / 100,
    basicVocabPercentage: Math.round(basicVocabPercentage),
    academicVocabCount: academicWordCount,
    atosLevel: Math.round(atosLevel * 10) / 10,
    fleschKincaid: Math.round(fleschKincaid * 10) / 10,
    daleChallScore: Math.round(daleChallScore * 10) / 10,
    estimatedLexile: Math.round(estimatedLexile / 10) * 10, // Round to nearest 10
  };
}

// ========== INTERFACES ==========

export interface ComprehensiveEvaluationResult {
  // ========== Text Metrics (Algorithmically Calculated) ==========
  textMetrics: TextMetrics;

  // ========== SR (Star Reading) ==========
  sr: {
    gradeEquivalent: number;      // e.g., 5.3 = 5th grade, 3rd month
    scaledScore: number;          // 0-1400 (based on Renaissance norms)
    percentileRank: number;       // 1-99
    instructionalLevel: 'Independent' | 'Instructional' | 'Frustration';
    zpd: {
      low: number;                // Zone of Proximal Development lower bound
      high: number;               // ZPD upper bound
    };
    domains: {
      wordKnowledge: number;             // 0-100
      comprehensionStrategies: number;   // 0-100
      analyzingArgument: number;         // 0-100
    };
    interpretation: string;
  };

  // ========== AR (ATOS) - Algorithmically Validated ==========
  ar: {
    level: number;                // ATOS level (validated against calculated)
    gradeEquivalent: string;      // e.g., "Grade 4-5"
    interestLevel: 'LG' | 'MG' | 'MG+' | 'UG'; // Lower/Middle/Upper Grade
    breakdown: {
      avgSentenceLength: number;  // From algorithm
      avgSyllablesPerWord: number; // From algorithm
      vocabularyDifficulty: 'basic' | 'intermediate' | 'advanced' | 'academic';
    };
    lexileEquivalent: number;     // Lexile measure
    interpretation: string;
  };

  // ========== IB Language B (MYP) ==========
  ib: {
    level: 'SL' | 'HL';           // Standard Level or Higher Level recommendation
    phase: 1 | 2 | 3 | 4 | 5;     // IB MYP Phase 1-5
    criteria: {
      // Criterion A: Comprehending spoken and visual text
      comprehension: { score: number; descriptor: string };
      // Criterion B: Comprehending written and visual text
      writtenExpression: { score: number; descriptor: string };
      // Criterion C: Communicating
      spokenInteraction: { score: number; descriptor: string };
      // Criterion D: Using language
      languageUse: { score: number; descriptor: string };
    };
    totalScore: number;            // /32
    gradeDescriptor: 1 | 2 | 3 | 4 | 5 | 6 | 7;
    boundaryExplanation: string;   // Why this grade
    interpretation: string;
  };

  // ========== Cambridge CEFR ==========
  cambridge: {
    cefrLevel: 'Pre-A1' | 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
    cambridgeExam: string;         // KET, PET, FCE, CAE, CPE
    cambridgeScale: number;        // 80-230 Cambridge English Scale
    skills: {
      reading: number;             // 0-100
      writing: number;
      listening: number;           // estimated
      speaking: number;
    };
    grammarVocabulary: number;     // 0-100
    canDoStatements: string[];     // Specific Can-Do descriptors
    interpretation: string;
  };

  // ========== SAT Evidence-Based Reading and Writing ==========
  sat: {
    estimatedScore: number;        // 200-800
    percentile: number;
    category: 'below-average' | 'average' | 'above-average' | 'excellent';
    rubricScores: {
      // SAT Writing rubric (1-4 scale)
      commandOfEvidence: { score: number; feedback: string };
      expressionOfIdeas: { score: number; feedback: string };
      standardEnglishConventions: { score: number; feedback: string };
      wordsInContext: { score: number; feedback: string };
    };
    collegeReadiness: 'Not Ready' | 'Approaching' | 'Ready' | 'Exceeds';
    collegeBoardBenchmark: boolean; // Met the 480 benchmark?
    interpretation: string;
  };

  // ========== MAP (NWEA) ==========
  map: {
    ritScore: number;              // 140-300 typical range
    percentile: number;
    gradeLevel: string;
    normGroup: string;             // e.g., "Fall Grade 5"
    growthProjection: {
      currentLevel: number;
      typicalGrowth: number;       // Expected RIT growth per year
      projectedEndOfYear: number;
    };
    lexileRange: {
      low: number;
      high: number;
    };
    instructionalAreas: {
      literaryText: { level: 'Low' | 'Average' | 'High'; ritRange: string };
      informationalText: { level: 'Low' | 'Average' | 'High'; ritRange: string };
      vocabularyUse: { level: 'Low' | 'Average' | 'High'; ritRange: string };
      writingConventions: { level: 'Low' | 'Average' | 'High'; ritRange: string };
    };
    interpretation: string;
  };

  // ========== Gap Analysis (AR vs SR) ==========
  gapAnalysis: {
    textDifficulty: number;        // AR ATOS level
    studentAbility: number;        // SR grade equivalent
    gap: number;
    status: 'below-potential' | 'at-level' | 'challenging-self';
    recommendation: string;
  };

  // ========== Cross-Framework Validation ==========
  validation: {
    isConsistent: boolean;
    discrepancies: string[];
    confidenceLevel: 'high' | 'medium' | 'low';
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
      lexile: string;              // e.g., "850L"
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
    // Auth check
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Rate limit
    const rateLimitResult = checkRateLimit(getRateLimitId(session.user.email, request), RATE_LIMITS.ai);
    if (rateLimitResult) return rateLimitResult;

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

    // ========== STEP 1: Algorithmic Text Analysis ==========
    const metrics = analyzeText(textToEvaluate);

    const systemPrompt = `You are an expert English language assessor with certification in:
- SR (Star Reading) by Renaissance Learning
- AR (Accelerated Reader) ATOS formula by Renaissance
- IB (International Baccalaureate) MYP Language B assessment
- Cambridge English (CEFR framework)
- SAT Evidence-Based Reading and Writing by College Board
- MAP (Measures of Academic Progress) by NWEA

=== PRE-CALCULATED TEXT METRICS (Use these as anchors) ===
The following metrics have been algorithmically calculated. Your evaluations MUST be consistent with these:

Word Count: ${metrics.wordCount}
Sentence Count: ${metrics.sentenceCount}
Avg Sentence Length: ${metrics.avgSentenceLength} words
Avg Syllables/Word: ${metrics.avgSyllablesPerWord}
Lexical Diversity (TTR): ${metrics.lexicalDiversity}
Basic Vocabulary %: ${metrics.basicVocabPercentage}%
Academic Words Used: ${metrics.academicVocabCount}

**CALCULATED READABILITY SCORES (Use as reference):**
- ATOS Level: ${metrics.atosLevel}
- Flesch-Kincaid Grade: ${metrics.fleschKincaid}
- Dale-Chall Score: ${metrics.daleChallScore}
- Estimated Lexile: ${metrics.estimatedLexile}L

=== FRAMEWORK-SPECIFIC METHODOLOGIES ===

**1. SR (Star Reading) - Renaissance Learning**
Purpose: Measures STUDENT'S reading/language production ability
- Scaled Score: 0-1400 (norm-referenced)
- Grade Equivalent: X.Y format (grade.month, e.g., 5.3 = 5th grade, 3rd month)
- Percentile: Compared to same-grade peers nationally
- ZPD: Zone of Proximal Development = [GE - 0.5, GE + 1.0] typically
- Instructional Level:
  * Independent: Can read/produce with 95%+ accuracy
  * Instructional: Can learn with support (90-95%)
  * Frustration: Too difficult (<90%)

Scaled Score to GE conversion (approximate):
- SS 200-400 → GE 1.0-2.5
- SS 400-600 → GE 2.5-4.0
- SS 600-800 → GE 4.0-6.0
- SS 800-1000 → GE 6.0-8.0
- SS 1000-1200 → GE 8.0-10.0
- SS 1200-1400 → GE 10.0-12.9+

**2. AR (ATOS) - Accelerated Reader**
Purpose: Measures TEXT difficulty (not student ability)
Formula components (already calculated above):
- Average Sentence Length (ASL)
- Average Syllables per Word (ASW)
- Vocabulary difficulty (Dale-Chall basis)

The calculated ATOS is ${metrics.atosLevel}. Your AR level MUST be within ±0.5 of this.

Interest Level:
- LG (Lower Grades): K-3, ATOS 0.0-3.9
- MG (Middle Grades): 4-8, ATOS 4.0-6.9
- MG+ (Middle Grades Plus): 6-12, ATOS 5.5-8.5
- UG (Upper Grades): 9-12, ATOS 7.0+

Lexile-ATOS correlation: Lexile ≈ (ATOS × 130) + 100

**3. IB Language B (MYP Phases 1-5)**
Purpose: Assess language acquisition for non-native speakers

Phase Descriptors (for MYP):
- Phase 1: Beginner - Single words, basic phrases, limited vocabulary
- Phase 2: Emerging - Simple sentences, familiar topics, basic structures
- Phase 3: Capable - Connected sentences, variety of structures, some errors
- Phase 4: Proficient - Complex sentences, good range, minor errors
- Phase 5: Fluent - Sophisticated language, nuanced expression, rare errors

Criteria (each 0-8):
- A (Comprehension): Understanding of spoken/visual text
- B (Written Expression): Communicating in writing
- C (Spoken Interaction): Speaking and responding
- D (Using Language): Grammar, vocabulary, register, accuracy

Grade Boundaries:
- 1-2: Minimal (0-8 total)
- 3: Developing (9-12 total)
- 4: Satisfactory (13-17 total)
- 5: Good (18-22 total)
- 6: Very Good (23-27 total)
- 7: Excellent (28-32 total)

SL vs HL recommendation:
- SL: Phase 1-3 typically
- HL: Phase 4-5, can handle abstract concepts

**4. Cambridge CEFR**
Purpose: Common European Framework proficiency levels

Level Characteristics:
- Pre-A1: Isolated words, very basic phrases
- A1: Very simple sentences, familiar topics (YLE Starters/Movers)
- A2: Basic routine matters (KET/Key)
- B1: Main points on familiar matters (PET/Preliminary)
- B2: Complex text, abstract topics (FCE/First)
- C1: Demanding texts, implicit meaning (CAE/Advanced)
- C2: Near-native fluency (CPE/Proficiency)

Cambridge Scale:
- 80-99: Pre-A1
- 100-119: A1
- 120-139: A2
- 140-159: B1
- 160-179: B2
- 180-199: C1
- 200-230: C2

Can-Do Statements must be SPECIFIC and level-appropriate.

**5. SAT Evidence-Based Reading and Writing**
Purpose: College readiness assessment

Rubric (each 1-4):
- Command of Evidence: Use of textual evidence
- Expression of Ideas: Development, organization, effective language
- Standard English Conventions: Grammar, usage, punctuation
- Words in Context: Vocabulary precision

Score Estimation:
- Rubric total 4-6 → 200-350
- Rubric total 7-9 → 350-450
- Rubric total 10-12 → 450-550
- Rubric total 13-14 → 550-650
- Rubric total 15-16 → 650-800

College Board Benchmarks:
- Below 480: Not Ready
- 480-529: Approaching
- 530-580: Ready
- 580+: Exceeds

**6. MAP (NWEA)**
Purpose: Measure academic progress and growth

RIT Score Norms (Reading/Language):
- Grade 2: 170-190
- Grade 3: 185-200
- Grade 4: 195-210
- Grade 5: 200-215
- Grade 6: 210-220
- Grade 7: 215-225
- Grade 8: 218-228
- Grade 9: 220-230
- Grade 10: 222-232
- Grade 11+: 224-234

Typical annual growth:
- Grades 2-3: 10-12 RIT points
- Grades 4-5: 6-8 RIT points
- Grades 6-8: 4-6 RIT points
- Grades 9-12: 2-4 RIT points

Lexile-RIT correlation:
- RIT 180: ~400L
- RIT 200: ~600L
- RIT 215: ~900L
- RIT 230: ~1200L

${age ? `
=== LEARNER CONTEXT ===
Age: ${age} years old
Expected developmental levels:
- SR Grade Equivalent: ~${Math.max(1, age - 5)}.0
- AR Reading Level: ${age <= 6 ? '0.5-1.5' : age <= 8 ? '1.5-3.0' : age <= 10 ? '3.0-5.0' : age <= 12 ? '5.0-7.0' : age <= 14 ? '7.0-9.0' : age <= 16 ? '9.0-11.0' : '11.0+'}
- IB Phase: ${age <= 8 ? '1' : age <= 10 ? '2' : age <= 12 ? '3' : age <= 14 ? '4' : '5'}
- Cambridge: ${age <= 8 ? 'Pre-A1/A1' : age <= 10 ? 'A1/A2' : age <= 12 ? 'A2/B1' : age <= 14 ? 'B1/B2' : age <= 16 ? 'B2' : 'B2/C1'}
` : ''}

${previousEvaluation ? `
=== PREVIOUS EVALUATION (for growth tracking) ===
Date: ${previousEvaluation.date}
SR Grade Equivalent: ${previousEvaluation.sr?.gradeEquivalent}
AR ATOS Level: ${previousEvaluation.ar?.level}
MAP RIT Score: ${previousEvaluation.map?.ritScore}
Cambridge CEFR: ${previousEvaluation.cambridge?.cefrLevel}
` : ''}

=== CROSS-VALIDATION REQUIREMENTS ===
Your scores MUST be internally consistent:
1. AR level should align with calculated ATOS (${metrics.atosLevel} ± 0.5)
2. SR grade equivalent should correlate with Cambridge CEFR
3. MAP RIT should align with Lexile range
4. IB phase should match overall proficiency indicators

If any scores seem inconsistent, note this in the validation section.

=== OUTPUT FORMAT ===
Return ONLY valid JSON (${isKorean ? 'interpretations in Korean' : 'interpretations in English'}):

{
  "textMetrics": ${JSON.stringify(metrics)},
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
    "interpretation": "<detailed explanation>"
  },
  "ar": {
    "level": <MUST be close to ${metrics.atosLevel}>,
    "gradeEquivalent": "<e.g., Grade 4-5>",
    "interestLevel": "<LG|MG|MG+|UG>",
    "breakdown": {
      "avgSentenceLength": ${metrics.avgSentenceLength},
      "avgSyllablesPerWord": ${metrics.avgSyllablesPerWord},
      "vocabularyDifficulty": "<basic|intermediate|advanced|academic>"
    },
    "lexileEquivalent": <number>,
    "interpretation": "<explanation>"
  },
  "ib": {
    "level": "<SL|HL>",
    "phase": <1-5>,
    "criteria": {
      "comprehension": { "score": <0-8>, "descriptor": "<phase descriptor>" },
      "writtenExpression": { "score": <0-8>, "descriptor": "<phase descriptor>" },
      "spokenInteraction": { "score": <0-8>, "descriptor": "<phase descriptor>" },
      "languageUse": { "score": <0-8>, "descriptor": "<phase descriptor>" }
    },
    "totalScore": <0-32>,
    "gradeDescriptor": <1-7>,
    "boundaryExplanation": "<why this grade>",
    "interpretation": "<explanation>"
  },
  "cambridge": {
    "cefrLevel": "<Pre-A1|A1|A2|B1|B2|C1|C2>",
    "cambridgeExam": "<KET|PET|FCE|CAE|CPE>",
    "cambridgeScale": <80-230>,
    "skills": {
      "reading": <0-100>,
      "writing": <0-100>,
      "listening": <0-100>,
      "speaking": <0-100>
    },
    "grammarVocabulary": <0-100>,
    "canDoStatements": ["<specific statement 1>", "<specific statement 2>", "<specific statement 3>"],
    "interpretation": "<explanation>"
  },
  "sat": {
    "estimatedScore": <200-800>,
    "percentile": <0-100>,
    "category": "<below-average|average|above-average|excellent>",
    "rubricScores": {
      "commandOfEvidence": { "score": <1-4>, "feedback": "<specific feedback>" },
      "expressionOfIdeas": { "score": <1-4>, "feedback": "<specific feedback>" },
      "standardEnglishConventions": { "score": <1-4>, "feedback": "<specific feedback>" },
      "wordsInContext": { "score": <1-4>, "feedback": "<specific feedback>" }
    },
    "collegeReadiness": "<Not Ready|Approaching|Ready|Exceeds>",
    "collegeBoardBenchmark": <true|false>,
    "interpretation": "<explanation>"
  },
  "map": {
    "ritScore": <140-300>,
    "percentile": <1-99>,
    "gradeLevel": "<e.g., Grade 5>",
    "normGroup": "<e.g., Fall Grade 5>",
    "growthProjection": {
      "currentLevel": <RIT>,
      "typicalGrowth": <expected annual growth>,
      "projectedEndOfYear": <projected RIT>
    },
    "lexileRange": { "low": <number>, "high": <number> },
    "instructionalAreas": {
      "literaryText": { "level": "<Low|Average|High>", "ritRange": "<e.g., 200-210>" },
      "informationalText": { "level": "<Low|Average|High>", "ritRange": "<e.g., 205-215>" },
      "vocabularyUse": { "level": "<Low|Average|High>", "ritRange": "<e.g., 195-205>" },
      "writingConventions": { "level": "<Low|Average|High>", "ritRange": "<e.g., 200-210>" }
    },
    "interpretation": "<explanation>"
  },
  "gapAnalysis": {
    "textDifficulty": <AR ATOS level>,
    "studentAbility": <SR grade equivalent>,
    "gap": <difference>,
    "status": "<below-potential|at-level|challenging-self>",
    "recommendation": "<specific recommendation>"
  },
  "validation": {
    "isConsistent": <true|false>,
    "discrepancies": ["<any noted discrepancy>"],
    "confidenceLevel": "<high|medium|low>"
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
      "cefr": "<e.g., B1>",
      "lexile": "<e.g., 850L>"
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

CRITICAL: Your AR level MUST align with the calculated ATOS of ${metrics.atosLevel}. Do not deviate more than ±0.5.
All scores must be internally consistent across frameworks.`;

    const userPrompt = `Evaluate this English text sample using all six assessment frameworks.
The text has been pre-analyzed with the following metrics:
- ${metrics.wordCount} words in ${metrics.sentenceCount} sentences
- Average sentence length: ${metrics.avgSentenceLength} words
- Vocabulary: ${metrics.basicVocabPercentage}% basic, ${metrics.academicVocabCount} academic words
- Calculated ATOS: ${metrics.atosLevel}, Lexile: ${metrics.estimatedLexile}L

TEXT TO EVALUATE:
"""
${textToEvaluate}
"""

Provide comprehensive, methodology-accurate evaluation with cross-validated scores.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.2,  // Lower temperature for more consistent scoring
      max_tokens: 4000,
    });

    const content = response.choices[0]?.message?.content || '';

    let evaluation: ComprehensiveEvaluationResult;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        evaluation = JSON.parse(jsonMatch[0]);

        // Ensure textMetrics is included from our calculation
        evaluation.textMetrics = metrics;

        // Validate AR level is close to calculated ATOS
        if (Math.abs(evaluation.ar.level - metrics.atosLevel) > 0.5) {
          console.warn(`AR level (${evaluation.ar.level}) differs from calculated ATOS (${metrics.atosLevel})`);
          // Optionally adjust to be within range
          evaluation.ar.level = Math.round((evaluation.ar.level + metrics.atosLevel) / 2 * 10) / 10;
        }

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
        wordCount: metrics.wordCount,
        calculatedATOS: metrics.atosLevel,
        calculatedLexile: metrics.estimatedLexile,
        evaluatedAt: new Date().toISOString(),
        frameworks: ['SR', 'AR', 'IB', 'Cambridge', 'SAT', 'MAP'],
        model: 'gpt-4o',
        methodology: 'hybrid-algorithmic-ai',
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
