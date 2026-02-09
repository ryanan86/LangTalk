/**
 * Speaking Metrics Analysis Library
 *
 * Measures spoken English against US/UK native speaker grade-level standards
 * Based on:
 * - US Common Core Speaking & Listening Standards (K-12)
 * - UK National Curriculum Spoken Language Requirements
 * - WIDA Speaking Rubric (ELD Standards)
 */

// ========== VOCABULARY TIERS ==========
// Tier 1: Basic, everyday words (all grades)
// Tier 2: High-frequency academic words (academic success)
// Tier 3: Domain-specific, low-frequency words

const TIER1_WORDS = new Set([
  // Basic verbs
  'go', 'come', 'get', 'make', 'take', 'see', 'know', 'think', 'want', 'use',
  'find', 'give', 'tell', 'ask', 'work', 'seem', 'feel', 'try', 'leave', 'call',
  'keep', 'let', 'begin', 'show', 'hear', 'play', 'run', 'move', 'like', 'live',
  'believe', 'hold', 'bring', 'happen', 'write', 'sit', 'stand', 'lose', 'pay', 'meet',
  'include', 'continue', 'set', 'learn', 'change', 'lead', 'understand', 'watch', 'follow', 'stop',
  'create', 'speak', 'read', 'spend', 'grow', 'open', 'walk', 'win', 'teach', 'offer',
  'remember', 'love', 'consider', 'appear', 'buy', 'wait', 'serve', 'die', 'send', 'build',
  'stay', 'fall', 'cut', 'reach', 'kill', 'remain', 'suggest', 'raise', 'pass', 'sell',
  'require', 'report', 'decide', 'pull', 'am', 'is', 'are', 'was', 'were', 'be', 'been',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might',
  'must', 'can', 'need', 'say', 'said',
  // Basic nouns
  'time', 'year', 'people', 'way', 'day', 'man', 'woman', 'child', 'world', 'life',
  'hand', 'part', 'place', 'case', 'week', 'company', 'system', 'program', 'question', 'work',
  'government', 'number', 'night', 'point', 'home', 'water', 'room', 'mother', 'area', 'money',
  'story', 'fact', 'month', 'lot', 'right', 'study', 'book', 'eye', 'job', 'word',
  'business', 'issue', 'side', 'kind', 'head', 'house', 'service', 'friend', 'father', 'power',
  'hour', 'game', 'line', 'end', 'member', 'law', 'car', 'city', 'community', 'name',
  'president', 'team', 'minute', 'idea', 'kid', 'body', 'information', 'back', 'parent', 'face',
  'others', 'level', 'office', 'door', 'health', 'person', 'art', 'war', 'history', 'party',
  'result', 'change', 'morning', 'reason', 'research', 'girl', 'guy', 'moment', 'air', 'teacher',
  'force', 'education', 'food', 'boy', 'dog', 'cat', 'school', 'family', 'thing', 'stuff',
  // Basic adjectives
  'good', 'new', 'first', 'last', 'long', 'great', 'little', 'own', 'other', 'old',
  'right', 'big', 'high', 'different', 'small', 'large', 'next', 'early', 'young', 'important',
  'few', 'public', 'bad', 'same', 'able', 'nice', 'happy', 'sad', 'hard', 'easy',
  'fast', 'slow', 'hot', 'cold', 'beautiful', 'ugly', 'funny', 'serious', 'free', 'full',
  // Basic adverbs
  'very', 'really', 'just', 'also', 'now', 'then', 'here', 'there', 'always', 'never',
  'sometimes', 'often', 'usually', 'maybe', 'probably', 'actually', 'well', 'too', 'so', 'still',
  // Common prepositions, conjunctions, pronouns
  'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them',
  'my', 'your', 'his', 'its', 'our', 'their', 'this', 'that', 'these', 'those',
  'who', 'what', 'where', 'when', 'why', 'how', 'which',
  'the', 'a', 'an', 'and', 'or', 'but', 'if', 'because', 'so', 'that',
  'in', 'on', 'at', 'to', 'for', 'with', 'from', 'by', 'about', 'of',
  'up', 'down', 'out', 'into', 'over', 'under', 'after', 'before', 'between',
]);

const TIER2_WORDS = new Set([
  // Academic verbs (cross-curricular)
  'analyze', 'evaluate', 'synthesize', 'interpret', 'compare', 'contrast', 'examine',
  'investigate', 'determine', 'establish', 'demonstrate', 'illustrate', 'distinguish',
  'identify', 'recognize', 'categorize', 'classify', 'organize', 'summarize', 'conclude',
  'infer', 'predict', 'hypothesize', 'assume', 'estimate', 'calculate', 'measure',
  'observe', 'describe', 'explain', 'define', 'justify', 'support', 'argue', 'claim',
  'assert', 'maintain', 'contend', 'propose', 'recommend', 'suggest', 'imply',
  'indicate', 'represent', 'symbolize', 'signify', 'convey', 'express', 'communicate',
  'elaborate', 'clarify', 'specify', 'emphasize', 'highlight', 'focus', 'address',
  'acknowledge', 'appreciate', 'recognize', 'realize', 'perceive', 'comprehend',
  'grasp', 'acquire', 'obtain', 'achieve', 'accomplish', 'succeed', 'excel',
  'develop', 'evolve', 'progress', 'advance', 'improve', 'enhance', 'strengthen',
  'modify', 'adjust', 'adapt', 'transform', 'convert', 'alter', 'revise',
  'generate', 'produce', 'construct', 'formulate', 'devise', 'design', 'compose',
  'integrate', 'incorporate', 'combine', 'merge', 'unify', 'connect', 'relate',
  'associate', 'correlate', 'correspond', 'parallel', 'resemble', 'differ',
  'exclude', 'eliminate', 'remove', 'omit', 'ignore', 'neglect', 'overlook',
  'affect', 'influence', 'impact', 'determine', 'shape', 'control', 'regulate',
  'restrict', 'limit', 'constrain', 'enable', 'facilitate', 'promote', 'encourage',
  'motivate', 'inspire', 'stimulate', 'provoke', 'trigger', 'cause', 'result',
  'contribute', 'participate', 'engage', 'involve', 'collaborate', 'cooperate',
  // Academic nouns
  'analysis', 'evaluation', 'assessment', 'interpretation', 'explanation', 'description',
  'definition', 'concept', 'theory', 'principle', 'hypothesis', 'assumption', 'premise',
  'conclusion', 'inference', 'implication', 'significance', 'relevance', 'importance',
  'evidence', 'data', 'information', 'knowledge', 'understanding', 'insight', 'perspective',
  'viewpoint', 'opinion', 'belief', 'attitude', 'value', 'norm', 'standard', 'criterion',
  'factor', 'element', 'component', 'aspect', 'feature', 'characteristic', 'attribute',
  'quality', 'property', 'function', 'role', 'purpose', 'objective', 'goal', 'aim',
  'method', 'approach', 'strategy', 'technique', 'procedure', 'process', 'mechanism',
  'structure', 'system', 'framework', 'model', 'pattern', 'trend', 'tendency',
  'relationship', 'connection', 'link', 'association', 'correlation', 'interaction',
  'effect', 'impact', 'influence', 'consequence', 'outcome', 'result', 'response',
  'solution', 'resolution', 'answer', 'option', 'alternative', 'choice', 'decision',
  'challenge', 'issue', 'problem', 'difficulty', 'obstacle', 'barrier', 'limitation',
  'opportunity', 'possibility', 'potential', 'capacity', 'ability', 'skill', 'competence',
  'development', 'growth', 'progress', 'improvement', 'advancement', 'achievement',
  'context', 'situation', 'circumstance', 'condition', 'environment', 'setting', 'background',
  // Academic adjectives
  'significant', 'substantial', 'considerable', 'major', 'primary', 'secondary', 'fundamental',
  'essential', 'critical', 'crucial', 'vital', 'key', 'central', 'main', 'principal',
  'relevant', 'appropriate', 'suitable', 'adequate', 'sufficient', 'effective', 'efficient',
  'accurate', 'precise', 'specific', 'detailed', 'comprehensive', 'thorough', 'extensive',
  'complex', 'complicated', 'sophisticated', 'advanced', 'basic', 'simple', 'straightforward',
  'obvious', 'apparent', 'evident', 'clear', 'distinct', 'explicit', 'implicit',
  'consistent', 'constant', 'stable', 'variable', 'diverse', 'varied', 'various',
  'similar', 'comparable', 'equivalent', 'identical', 'distinct', 'different', 'unique',
  'positive', 'negative', 'neutral', 'objective', 'subjective', 'biased', 'fair',
  'logical', 'rational', 'reasonable', 'valid', 'reliable', 'credible', 'legitimate',
  'potential', 'possible', 'probable', 'likely', 'unlikely', 'inevitable', 'unavoidable',
  'previous', 'prior', 'former', 'subsequent', 'following', 'current', 'present',
  'initial', 'preliminary', 'final', 'ultimate', 'overall', 'general', 'particular',
  // Academic discourse markers
  'however', 'therefore', 'furthermore', 'moreover', 'nevertheless', 'nonetheless',
  'consequently', 'accordingly', 'hence', 'thus', 'meanwhile', 'subsequently',
  'alternatively', 'conversely', 'similarly', 'likewise', 'specifically', 'particularly',
  'especially', 'notably', 'significantly', 'importantly', 'essentially', 'basically',
  'generally', 'typically', 'usually', 'normally', 'commonly', 'frequently', 'occasionally',
  'initially', 'eventually', 'ultimately', 'finally', 'primarily', 'predominantly',
]);

const TIER3_WORDS = new Set([
  // Domain-specific: Science
  'photosynthesis', 'mitochondria', 'chromosome', 'ecosystem', 'biodiversity', 'metabolism',
  'catalyst', 'isotope', 'molecule', 'electron', 'neutron', 'proton', 'nucleus',
  'gravity', 'velocity', 'acceleration', 'momentum', 'friction', 'thermodynamics',
  'electromagnetic', 'wavelength', 'frequency', 'amplitude', 'refraction', 'diffraction',
  // Domain-specific: Math
  'algorithm', 'polynomial', 'coefficient', 'derivative', 'integral', 'logarithm',
  'exponential', 'asymptote', 'parabola', 'hyperbola', 'theorem', 'axiom', 'postulate',
  'congruent', 'perpendicular', 'tangent', 'circumference', 'diameter', 'radius',
  // Domain-specific: Social Studies
  'democracy', 'autocracy', 'oligarchy', 'sovereignty', 'imperialism', 'colonialism',
  'nationalism', 'capitalism', 'socialism', 'communism', 'federalism', 'constitution',
  'legislation', 'judiciary', 'executive', 'amendment', 'ratification', 'referendum',
  // Domain-specific: Literature
  'protagonist', 'antagonist', 'metaphor', 'simile', 'alliteration', 'onomatopoeia',
  'personification', 'hyperbole', 'irony', 'satire', 'allegory', 'symbolism',
  'foreshadowing', 'flashback', 'narrative', 'exposition', 'climax', 'denouement',
]);

// ========== DISCOURSE MARKERS ==========
const DISCOURSE_MARKERS = {
  // Level 1: Basic (Elementary)
  basic: new Set(['and', 'but', 'so', 'because', 'then', 'also', 'or', 'like', 'well', 'okay']),

  // Level 2: Intermediate (Middle School)
  intermediate: new Set([
    'however', 'although', 'therefore', 'for example', 'for instance', 'in addition',
    'on the other hand', 'in contrast', 'as a result', 'in fact', 'actually',
    'first', 'second', 'third', 'finally', 'next', 'lastly', 'besides', 'anyway',
    'instead', 'otherwise', 'meanwhile', 'afterwards', 'before that', 'since then',
  ]),

  // Level 3: Advanced (High School+)
  advanced: new Set([
    'furthermore', 'moreover', 'nevertheless', 'nonetheless', 'consequently',
    'hence', 'thus', 'accordingly', 'subsequently', 'alternatively', 'conversely',
    'specifically', 'particularly', 'notably', 'significantly', 'essentially',
    'in other words', 'that is to say', 'to put it differently', 'more precisely',
    'in summary', 'to conclude', 'in conclusion', 'all things considered',
    'given that', 'provided that', 'assuming that', 'in light of', 'with regard to',
    'as far as', 'insofar as', 'notwithstanding', 'irrespective of', 'regardless of',
  ]),
};

// ========== SENTENCE COMPLEXITY PATTERNS ==========
const SUBORDINATING_CONJUNCTIONS = new Set([
  'after', 'although', 'as', 'because', 'before', 'if', 'once', 'since', 'than',
  'that', 'though', 'till', 'until', 'when', 'where', 'whether', 'while',
  'unless', 'whereas', 'whereby', 'wherein', 'wherever', 'whenever',
  'provided', 'supposing', 'assuming', 'considering', 'given',
]);

const COORDINATING_CONJUNCTIONS = new Set(['and', 'but', 'or', 'nor', 'for', 'yet', 'so']);

const RELATIVE_PRONOUNS = new Set(['who', 'whom', 'whose', 'which', 'that', 'where', 'when', 'why']);

// ========== US GRADE LEVEL BENCHMARKS ==========
export interface GradeBenchmark {
  grade: string;
  usGrade: string;
  ukYear: string;
  ageRange: string;
  avgWordsPerTurn: [number, number];  // [min, max]
  sentenceComplexity: {
    simpleRatio: [number, number];     // % of simple sentences
    compoundRatio: [number, number];   // % of compound sentences
    complexRatio: [number, number];    // % of complex sentences
  };
  vocabularyProfile: {
    tier1Max: number;      // Maximum % of Tier 1 words expected
    tier2Min: number;      // Minimum % of Tier 2 words expected
    tier3Expected: boolean; // Whether Tier 3 words are expected
  };
  discourseMarkers: {
    basicMin: number;      // Minimum basic markers per 100 words
    intermediateMin: number;
    advancedMin: number;
  };
  grammarErrorRate: number;  // Acceptable errors per 100 words
  lexicalDiversity: [number, number];  // TTR range
}

export const GRADE_BENCHMARKS: GradeBenchmark[] = [
  {
    grade: 'K',
    usGrade: 'Kindergarten',
    ukYear: 'Reception',
    ageRange: '5-6',
    avgWordsPerTurn: [3, 10],
    sentenceComplexity: {
      simpleRatio: [85, 100],
      compoundRatio: [0, 15],
      complexRatio: [0, 5],
    },
    vocabularyProfile: { tier1Max: 98, tier2Min: 0, tier3Expected: false },
    discourseMarkers: { basicMin: 0, intermediateMin: 0, advancedMin: 0 },
    grammarErrorRate: 15,
    lexicalDiversity: [0.3, 0.5],
  },
  {
    grade: '1-2',
    usGrade: 'Grade 1-2',
    ukYear: 'Year 1-2',
    ageRange: '6-8',
    avgWordsPerTurn: [8, 18],
    sentenceComplexity: {
      simpleRatio: [70, 90],
      compoundRatio: [10, 25],
      complexRatio: [0, 10],
    },
    vocabularyProfile: { tier1Max: 95, tier2Min: 2, tier3Expected: false },
    discourseMarkers: { basicMin: 1, intermediateMin: 0, advancedMin: 0 },
    grammarErrorRate: 12,
    lexicalDiversity: [0.35, 0.55],
  },
  {
    grade: '3-4',
    usGrade: 'Grade 3-4',
    ukYear: 'Year 3-4',
    ageRange: '8-10',
    avgWordsPerTurn: [15, 30],
    sentenceComplexity: {
      simpleRatio: [50, 70],
      compoundRatio: [20, 35],
      complexRatio: [10, 25],
    },
    vocabularyProfile: { tier1Max: 90, tier2Min: 8, tier3Expected: false },
    discourseMarkers: { basicMin: 2, intermediateMin: 0.5, advancedMin: 0 },
    grammarErrorRate: 8,
    lexicalDiversity: [0.4, 0.6],
  },
  {
    grade: '5-6',
    usGrade: 'Grade 5-6',
    ukYear: 'Year 5-6',
    ageRange: '10-12',
    avgWordsPerTurn: [25, 45],
    sentenceComplexity: {
      simpleRatio: [35, 55],
      compoundRatio: [25, 40],
      complexRatio: [20, 35],
    },
    vocabularyProfile: { tier1Max: 85, tier2Min: 12, tier3Expected: false },
    discourseMarkers: { basicMin: 2, intermediateMin: 1, advancedMin: 0 },
    grammarErrorRate: 6,
    lexicalDiversity: [0.45, 0.65],
  },
  {
    grade: '7-8',
    usGrade: 'Grade 7-8 (Middle School)',
    ukYear: 'Year 7-8',
    ageRange: '12-14',
    avgWordsPerTurn: [35, 60],
    sentenceComplexity: {
      simpleRatio: [25, 45],
      compoundRatio: [25, 40],
      complexRatio: [30, 45],
    },
    vocabularyProfile: { tier1Max: 78, tier2Min: 18, tier3Expected: true },
    discourseMarkers: { basicMin: 2, intermediateMin: 1.5, advancedMin: 0.3 },
    grammarErrorRate: 4,
    lexicalDiversity: [0.5, 0.7],
  },
  {
    grade: '9-10',
    usGrade: 'Grade 9-10 (High School)',
    ukYear: 'Year 9-10 (GCSE)',
    ageRange: '14-16',
    avgWordsPerTurn: [45, 80],
    sentenceComplexity: {
      simpleRatio: [20, 35],
      compoundRatio: [25, 40],
      complexRatio: [35, 50],
    },
    vocabularyProfile: { tier1Max: 72, tier2Min: 22, tier3Expected: true },
    discourseMarkers: { basicMin: 2, intermediateMin: 2, advancedMin: 0.5 },
    grammarErrorRate: 3,
    lexicalDiversity: [0.55, 0.75],
  },
  {
    grade: '11-12',
    usGrade: 'Grade 11-12 (High School)',
    ukYear: 'Year 11-12 (A-Level)',
    ageRange: '16-18',
    avgWordsPerTurn: [55, 100],
    sentenceComplexity: {
      simpleRatio: [15, 30],
      compoundRatio: [25, 40],
      complexRatio: [40, 55],
    },
    vocabularyProfile: { tier1Max: 68, tier2Min: 26, tier3Expected: true },
    discourseMarkers: { basicMin: 2, intermediateMin: 2, advancedMin: 1 },
    grammarErrorRate: 2,
    lexicalDiversity: [0.6, 0.8],
  },
  {
    grade: 'College',
    usGrade: 'College/University',
    ukYear: 'University',
    ageRange: '18+',
    avgWordsPerTurn: [70, 150],
    sentenceComplexity: {
      simpleRatio: [10, 25],
      compoundRatio: [25, 35],
      complexRatio: [45, 60],
    },
    vocabularyProfile: { tier1Max: 62, tier2Min: 30, tier3Expected: true },
    discourseMarkers: { basicMin: 2, intermediateMin: 2.5, advancedMin: 1.5 },
    grammarErrorRate: 1.5,
    lexicalDiversity: [0.65, 0.85],
  },
];

// ========== METRICS CALCULATION ==========

export interface SpeakingMetricsResult {
  // Raw measurements
  totalWords: number;
  totalSentences: number;
  totalTurns: number;
  avgWordsPerTurn: number;
  avgWordsPerSentence: number;

  // Sentence complexity
  sentenceComplexity: {
    simple: number;       // count
    compound: number;
    complex: number;
    simpleRatio: number;  // percentage
    compoundRatio: number;
    complexRatio: number;
  };

  // Vocabulary analysis
  vocabulary: {
    uniqueWords: number;
    lexicalDiversity: number;  // TTR
    tier1Count: number;
    tier2Count: number;
    tier3Count: number;
    tier1Percentage: number;
    tier2Percentage: number;
    tier3Percentage: number;
  };

  // Discourse markers
  discourseMarkers: {
    basic: string[];
    intermediate: string[];
    advanced: string[];
    basicPer100: number;
    intermediatePer100: number;
    advancedPer100: number;
  };

  // Grammar (estimated from patterns)
  grammarIndicators: {
    subjectVerbAgreementIssues: number;
    articleIssues: number;
    tenseConsistencyIssues: number;
    estimatedErrorsPer100: number;
  };

  // Grade matching
  gradeMatch: {
    bestMatch: string;
    usGrade: string;
    ukYear: string;
    confidence: 'high' | 'medium' | 'low';
    matchScores: { grade: string; score: number }[];
    strengths: string[];
    weaknesses: string[];
  };
}

function classifyWord(word: string): 'tier1' | 'tier2' | 'tier3' | 'unknown' {
  const lower = word.toLowerCase();
  if (TIER1_WORDS.has(lower)) return 'tier1';
  if (TIER2_WORDS.has(lower)) return 'tier2';
  if (TIER3_WORDS.has(lower)) return 'tier3';
  return 'unknown';  // Treat unknown as Tier 1 for non-native speakers
}

function analyzeSentenceComplexity(sentence: string): 'simple' | 'compound' | 'complex' {
  const lowerSentence = sentence.toLowerCase();
  const words = lowerSentence.split(/\s+/);

  // Check for subordinating conjunctions (complex)
  const hasSubordinating = words.some(w => SUBORDINATING_CONJUNCTIONS.has(w));
  const hasRelativePronoun = words.some(w => RELATIVE_PRONOUNS.has(w));

  // Check for coordinating conjunctions (compound)
  const hasCoordinating = words.some(w => COORDINATING_CONJUNCTIONS.has(w));

  // Check for multiple clauses
  const clauseIndicators = [',', ';', ':'].filter(c => sentence.includes(c)).length;

  if (hasSubordinating || hasRelativePronoun) {
    return 'complex';
  } else if (hasCoordinating && clauseIndicators > 0) {
    return 'compound';
  } else if (hasCoordinating && words.length > 10) {
    return 'compound';
  }

  return 'simple';
}

function findDiscourseMarkers(text: string): { basic: string[]; intermediate: string[]; advanced: string[] } {
  const lowerText = text.toLowerCase();
  const found = { basic: [] as string[], intermediate: [] as string[], advanced: [] as string[] };

  // Check multi-word markers first (convert Set to Array for iteration)
  Array.from(DISCOURSE_MARKERS.advanced).forEach(marker => {
    if (lowerText.includes(marker)) {
      found.advanced.push(marker);
    }
  });

  Array.from(DISCOURSE_MARKERS.intermediate).forEach(marker => {
    if (lowerText.includes(marker)) {
      found.intermediate.push(marker);
    }
  });

  const words = lowerText.split(/\s+/);
  words.forEach(word => {
    if (DISCOURSE_MARKERS.basic.has(word) && !found.basic.includes(word)) {
      found.basic.push(word);
    }
  });

  return found;
}

function estimateGrammarIssues(text: string): {
  subjectVerbAgreementIssues: number;
  articleIssues: number;
  tenseConsistencyIssues: number;
} {
  const issues = {
    subjectVerbAgreementIssues: 0,
    articleIssues: 0,
    tenseConsistencyIssues: 0,
  };

  const lowerText = text.toLowerCase();

  // Common subject-verb agreement errors
  const svPatterns = [
    /\b(i|you|we|they)\s+(is|was|has)\b/g,
    /\b(he|she|it)\s+(are|were|have)\b/g,
    /\bhe\s+don't\b/g,
    /\bshe\s+don't\b/g,
    /\bit\s+don't\b/g,
  ];

  for (const pattern of svPatterns) {
    const matches = lowerText.match(pattern);
    if (matches) issues.subjectVerbAgreementIssues += matches.length;
  }

  // Common article issues
  const articlePatterns = [
    /\ba\s+[aeiou]/g,  // "a apple" instead of "an apple"
    /\ban\s+[^aeiou\s]/g,  // "an book"
  ];

  for (const pattern of articlePatterns) {
    const matches = lowerText.match(pattern);
    if (matches) issues.articleIssues += matches.length;
  }

  return issues;
}

function calculateGradeMatch(metrics: Omit<SpeakingMetricsResult, 'gradeMatch'>): SpeakingMetricsResult['gradeMatch'] {
  const scores: { grade: string; score: number; details: string[] }[] = [];

  for (const benchmark of GRADE_BENCHMARKS) {
    let score = 0;
    // Max score is 100 (20 + 25 + 25 + 15 + 15)
    const details: string[] = [];

    // 1. Words per turn (20 points)
    const [minWpt, maxWpt] = benchmark.avgWordsPerTurn;
    if (metrics.avgWordsPerTurn >= minWpt && metrics.avgWordsPerTurn <= maxWpt) {
      score += 20;
    } else if (metrics.avgWordsPerTurn < minWpt) {
      score += Math.max(0, 20 - (minWpt - metrics.avgWordsPerTurn) * 2);
      details.push('Shorter responses than expected');
    } else {
      score += 20;  // Exceeding is good
    }

    // 2. Sentence complexity (25 points)
    const { simpleRatio, compoundRatio, complexRatio } = metrics.sentenceComplexity;
    const [simpleMin, simpleMax] = benchmark.sentenceComplexity.simpleRatio;
    const [compoundMin, compoundMax] = benchmark.sentenceComplexity.compoundRatio;
    const [complexMin, complexMax] = benchmark.sentenceComplexity.complexRatio;

    let complexityScore = 0;
    if (simpleRatio >= simpleMin && simpleRatio <= simpleMax) complexityScore += 8;
    else if (simpleRatio < simpleMin) complexityScore += 10;  // Less simple = more advanced
    if (compoundRatio >= compoundMin && compoundRatio <= compoundMax) complexityScore += 8;
    if (complexRatio >= complexMin && complexRatio <= complexMax) complexityScore += 9;
    else if (complexRatio > complexMax) complexityScore += 9;  // More complex = more advanced

    score += complexityScore;

    // 3. Vocabulary profile (25 points)
    const tier2Pct = metrics.vocabulary.tier2Percentage;
    const tier1Pct = metrics.vocabulary.tier1Percentage;

    let vocabScore = 0;
    if (tier1Pct <= benchmark.vocabularyProfile.tier1Max) vocabScore += 12;
    if (tier2Pct >= benchmark.vocabularyProfile.tier2Min) vocabScore += 13;
    else vocabScore += (tier2Pct / benchmark.vocabularyProfile.tier2Min) * 13;

    if (tier2Pct < benchmark.vocabularyProfile.tier2Min) {
      details.push('Academic vocabulary below grade level');
    }

    score += vocabScore;

    // 4. Discourse markers (15 points)
    const { basicPer100, intermediatePer100, advancedPer100 } = metrics.discourseMarkers;
    let discourseScore = 0;

    if (basicPer100 >= benchmark.discourseMarkers.basicMin) discourseScore += 5;
    if (intermediatePer100 >= benchmark.discourseMarkers.intermediateMin) discourseScore += 5;
    else if (benchmark.discourseMarkers.intermediateMin > 0) {
      discourseScore += (intermediatePer100 / benchmark.discourseMarkers.intermediateMin) * 5;
    } else {
      discourseScore += 5;
    }
    if (advancedPer100 >= benchmark.discourseMarkers.advancedMin) discourseScore += 5;
    else if (benchmark.discourseMarkers.advancedMin > 0) {
      discourseScore += (advancedPer100 / benchmark.discourseMarkers.advancedMin) * 5;
    } else {
      discourseScore += 5;
    }

    score += discourseScore;

    // 5. Grammar (15 points)
    const errorRate = metrics.grammarIndicators.estimatedErrorsPer100;
    if (errorRate <= benchmark.grammarErrorRate) {
      score += 15;
    } else {
      score += Math.max(0, 15 - (errorRate - benchmark.grammarErrorRate) * 3);
      if (errorRate > benchmark.grammarErrorRate * 1.5) {
        details.push('Grammar accuracy needs improvement');
      }
    }

    scores.push({ grade: benchmark.grade, score: Math.round(score), details });
  }

  // Sort by score descending
  scores.sort((a, b) => b.score - a.score);

  const bestMatch = scores[0];
  const benchmark = GRADE_BENCHMARKS.find(b => b.grade === bestMatch.grade)!;

  // Determine confidence
  const scoreDiff = scores[0].score - (scores[1]?.score || 0);
  let confidence: 'high' | 'medium' | 'low';
  if (scoreDiff >= 15 && scores[0].score >= 70) {
    confidence = 'high';
  } else if (scoreDiff >= 8 && scores[0].score >= 55) {
    confidence = 'medium';
  } else {
    confidence = 'low';
  }

  // Identify strengths and weaknesses
  const strengths: string[] = [];
  const weaknesses: string[] = [];

  if (metrics.vocabulary.tier2Percentage >= benchmark.vocabularyProfile.tier2Min) {
    strengths.push('Academic vocabulary at or above grade level');
  } else {
    weaknesses.push('Academic vocabulary below grade level');
  }

  if (metrics.sentenceComplexity.complexRatio >= benchmark.sentenceComplexity.complexRatio[0]) {
    strengths.push('Good use of complex sentences');
  } else {
    weaknesses.push('Could use more complex sentence structures');
  }

  if (metrics.discourseMarkers.intermediatePer100 >= benchmark.discourseMarkers.intermediateMin) {
    strengths.push('Good use of discourse markers');
  } else if (benchmark.discourseMarkers.intermediateMin > 0) {
    weaknesses.push('Could use more transition words and connectors');
  }

  if (metrics.grammarIndicators.estimatedErrorsPer100 <= benchmark.grammarErrorRate) {
    strengths.push('Good grammatical accuracy');
  } else {
    weaknesses.push('Grammar accuracy needs improvement');
  }

  return {
    bestMatch: bestMatch.grade,
    usGrade: benchmark.usGrade,
    ukYear: benchmark.ukYear,
    confidence,
    matchScores: scores.slice(0, 4).map(s => ({ grade: s.grade, score: s.score })),
    strengths,
    weaknesses,
  };
}

export function analyzeSpeaking(userMessages: string[]): SpeakingMetricsResult {
  // Combine all user messages
  const allText = userMessages.join(' ');
  const words = allText.toLowerCase().match(/[a-z']+/g) || [];
  const sentences = allText.split(/[.!?]+/).filter(s => s.trim().length > 0);

  const totalWords = words.length;
  const totalSentences = sentences.length;
  const totalTurns = userMessages.length;
  const avgWordsPerTurn = totalTurns > 0 ? totalWords / totalTurns : 0;
  const avgWordsPerSentence = totalSentences > 0 ? totalWords / totalSentences : 0;

  // Sentence complexity
  let simple = 0, compound = 0, complex = 0;
  for (const sentence of sentences) {
    const type = analyzeSentenceComplexity(sentence);
    if (type === 'simple') simple++;
    else if (type === 'compound') compound++;
    else complex++;
  }

  const sentenceComplexity = {
    simple,
    compound,
    complex,
    simpleRatio: totalSentences > 0 ? Math.round((simple / totalSentences) * 100) : 100,
    compoundRatio: totalSentences > 0 ? Math.round((compound / totalSentences) * 100) : 0,
    complexRatio: totalSentences > 0 ? Math.round((complex / totalSentences) * 100) : 0,
  };

  // Vocabulary analysis
  const uniqueWords = new Set(words);
  let tier1 = 0, tier2 = 0, tier3 = 0;
  for (const word of words) {
    const tier = classifyWord(word);
    if (tier === 'tier1' || tier === 'unknown') tier1++;
    else if (tier === 'tier2') tier2++;
    else tier3++;
  }

  const vocabulary = {
    uniqueWords: uniqueWords.size,
    lexicalDiversity: totalWords > 0 ? Math.round((uniqueWords.size / totalWords) * 100) / 100 : 0,
    tier1Count: tier1,
    tier2Count: tier2,
    tier3Count: tier3,
    tier1Percentage: totalWords > 0 ? Math.round((tier1 / totalWords) * 100) : 100,
    tier2Percentage: totalWords > 0 ? Math.round((tier2 / totalWords) * 100) : 0,
    tier3Percentage: totalWords > 0 ? Math.round((tier3 / totalWords) * 100) : 0,
  };

  // Discourse markers
  const markers = findDiscourseMarkers(allText);
  const per100Multiplier = totalWords > 0 ? 100 / totalWords : 0;

  const discourseMarkers = {
    ...markers,
    basicPer100: Math.round(markers.basic.length * per100Multiplier * 10) / 10,
    intermediatePer100: Math.round(markers.intermediate.length * per100Multiplier * 10) / 10,
    advancedPer100: Math.round(markers.advanced.length * per100Multiplier * 10) / 10,
  };

  // Grammar indicators
  const grammarIssues = estimateGrammarIssues(allText);
  const totalGrammarIssues = grammarIssues.subjectVerbAgreementIssues +
                             grammarIssues.articleIssues +
                             grammarIssues.tenseConsistencyIssues;

  const grammarIndicators = {
    ...grammarIssues,
    estimatedErrorsPer100: totalWords > 0 ? Math.round(totalGrammarIssues * per100Multiplier * 10) / 10 : 0,
  };

  // Build intermediate result for grade matching
  const intermediateResult = {
    totalWords,
    totalSentences,
    totalTurns,
    avgWordsPerTurn: Math.round(avgWordsPerTurn * 10) / 10,
    avgWordsPerSentence: Math.round(avgWordsPerSentence * 10) / 10,
    sentenceComplexity,
    vocabulary,
    discourseMarkers,
    grammarIndicators,
  };

  // Calculate grade match
  const gradeMatch = calculateGradeMatch(intermediateResult);

  return {
    ...intermediateResult,
    gradeMatch,
  };
}

// ========== COMPARISON WITH PREVIOUS SESSION ==========

export interface ProgressComparison {
  wordsPerTurnChange: number;
  tier2VocabChange: number;
  complexSentenceChange: number;
  discourseMarkerChange: number;
  overallTrend: 'improving' | 'stable' | 'declining';
  insights: string[];
}

export function compareProgress(
  current: SpeakingMetricsResult,
  previous: SpeakingMetricsResult
): ProgressComparison {
  const wordsPerTurnChange = Math.round((current.avgWordsPerTurn - previous.avgWordsPerTurn) * 10) / 10;
  const tier2VocabChange = current.vocabulary.tier2Percentage - previous.vocabulary.tier2Percentage;
  const complexSentenceChange = current.sentenceComplexity.complexRatio - previous.sentenceComplexity.complexRatio;
  const discourseMarkerChange =
    (current.discourseMarkers.intermediatePer100 + current.discourseMarkers.advancedPer100) -
    (previous.discourseMarkers.intermediatePer100 + previous.discourseMarkers.advancedPer100);

  // Calculate overall trend
  let positiveChanges = 0;
  let negativeChanges = 0;

  if (wordsPerTurnChange > 2) positiveChanges++;
  else if (wordsPerTurnChange < -2) negativeChanges++;

  if (tier2VocabChange > 2) positiveChanges++;
  else if (tier2VocabChange < -2) negativeChanges++;

  if (complexSentenceChange > 3) positiveChanges++;
  else if (complexSentenceChange < -3) negativeChanges++;

  if (discourseMarkerChange > 0.3) positiveChanges++;
  else if (discourseMarkerChange < -0.3) negativeChanges++;

  let overallTrend: 'improving' | 'stable' | 'declining';
  if (positiveChanges >= 2 && positiveChanges > negativeChanges) {
    overallTrend = 'improving';
  } else if (negativeChanges >= 2 && negativeChanges > positiveChanges) {
    overallTrend = 'declining';
  } else {
    overallTrend = 'stable';
  }

  // Generate insights
  const insights: string[] = [];

  if (wordsPerTurnChange > 5) {
    insights.push('Speaking in longer, more developed responses');
  } else if (wordsPerTurnChange < -5) {
    insights.push('Responses are shorter than previous session');
  }

  if (tier2VocabChange > 3) {
    insights.push('Using more academic vocabulary');
  } else if (tier2VocabChange < -3) {
    insights.push('Academic vocabulary usage decreased');
  }

  if (complexSentenceChange > 5) {
    insights.push('Using more complex sentence structures');
  }

  if (discourseMarkerChange > 0.5) {
    insights.push('Better use of transition words and connectors');
  }

  return {
    wordsPerTurnChange,
    tier2VocabChange,
    complexSentenceChange,
    discourseMarkerChange: Math.round(discourseMarkerChange * 10) / 10,
    overallTrend,
    insights,
  };
}

// ========== TEST SCORE CONVERSIONS ==========
// Based on grade level and performance metrics

/**
 * Grade to standardized test score conversion tables
 * Based on:
 * - IELTS Speaking Band Descriptors (0-9)
 * - TOEFL iBT Speaking Rubric (0-30)
 * - TOEIC Speaking Score (0-200, Levels 1-8)
 * - CEFR Levels (Pre-A1 to C2)
 */

export interface StandardizedScores {
  // IELTS Speaking (0-9 band)
  ielts: {
    band: number;           // 0-9 (0.5 increments)
    descriptor: string;     // Band descriptor
    fluency: number;        // Fluency & Coherence sub-score
    vocabulary: number;     // Lexical Resource sub-score
    grammar: number;        // Grammatical Range & Accuracy
    pronunciation: number;  // Pronunciation (estimated)
  };

  // TOEFL iBT Speaking (0-30)
  toefl: {
    score: number;          // 0-30
    level: 'Basic' | 'Limited' | 'Fair' | 'Good' | 'Advanced';
    descriptor: string;
  };

  // TOEIC Speaking (0-200)
  toeic: {
    score: number;          // 0-200
    level: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
    descriptor: string;
  };

  // CEFR Level
  cefr: {
    level: 'Pre-A1' | 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
    descriptor: string;
  };
}

// Grade to score conversion maps
const GRADE_TO_IELTS: Record<string, number> = {
  'K': 2.0,
  '1-2': 2.5,
  '3-4': 3.5,
  '5-6': 4.5,
  '7-8': 5.5,
  '9-10': 6.0,
  '11-12': 6.5,
  'College': 7.5,
};

const GRADE_TO_TOEFL: Record<string, number> = {
  'K': 5,
  '1-2': 8,
  '3-4': 12,
  '5-6': 16,
  '7-8': 20,
  '9-10': 23,
  '11-12': 26,
  'College': 28,
};

const GRADE_TO_TOEIC: Record<string, number> = {
  'K': 40,
  '1-2': 60,
  '3-4': 90,
  '5-6': 120,
  '7-8': 140,
  '9-10': 160,
  '11-12': 180,
  'College': 190,
};

const GRADE_TO_CEFR: Record<string, StandardizedScores['cefr']['level']> = {
  'K': 'Pre-A1',
  '1-2': 'A1',
  '3-4': 'A2',
  '5-6': 'B1',
  '7-8': 'B1',
  '9-10': 'B2',
  '11-12': 'B2',
  'College': 'C1',
};

const IELTS_DESCRIPTORS: Record<number, string> = {
  2.0: 'Extremely limited communication',
  2.5: 'Intermittent communication',
  3.0: 'Very limited range of language',
  3.5: 'Limited ability to communicate',
  4.0: 'Basic competence limited to familiar situations',
  4.5: 'Modest ability in familiar contexts',
  5.0: 'Partial command, handles basic communication',
  5.5: 'Modest user with frequent inaccuracies',
  6.0: 'Competent user despite some inaccuracies',
  6.5: 'Good command with occasional errors',
  7.0: 'Good user with minor occasional inaccuracies',
  7.5: 'Very good user with rare errors',
  8.0: 'Expert user with only occasional unsystematic errors',
  8.5: 'Near-native proficiency',
  9.0: 'Expert, fully operational command',
};

const TOEFL_LEVELS: { min: number; max: number; level: StandardizedScores['toefl']['level']; descriptor: string }[] = [
  { min: 0, max: 9, level: 'Basic', descriptor: 'Speech is largely unintelligible' },
  { min: 10, max: 15, level: 'Limited', descriptor: 'Basic ideas communicated with frequent pauses' },
  { min: 16, max: 19, level: 'Fair', descriptor: 'Generally intelligible but with noticeable errors' },
  { min: 20, max: 25, level: 'Good', descriptor: 'Generally clear and coherent speech' },
  { min: 26, max: 30, level: 'Advanced', descriptor: 'Clear, well-organized, coherent speech' },
];

const TOEIC_LEVELS: { min: number; max: number; level: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8; descriptor: string }[] = [
  { min: 0, max: 29, level: 1, descriptor: 'No effective ability' },
  { min: 30, max: 59, level: 2, descriptor: 'Minimal ability' },
  { min: 60, max: 89, level: 3, descriptor: 'Limited ability' },
  { min: 90, max: 109, level: 4, descriptor: 'Basic working ability' },
  { min: 110, max: 129, level: 5, descriptor: 'Limited working proficiency' },
  { min: 130, max: 159, level: 6, descriptor: 'Working proficiency' },
  { min: 160, max: 179, level: 7, descriptor: 'Advanced working proficiency' },
  { min: 180, max: 200, level: 8, descriptor: 'Professional proficiency' },
];

const CEFR_DESCRIPTORS: Record<StandardizedScores['cefr']['level'], string> = {
  'Pre-A1': 'Can use isolated words and basic phrases',
  'A1': 'Can interact in a simple way with clear, slow speech',
  'A2': 'Can describe immediate environment and basic needs',
  'B1': 'Can deal with most situations in travel and daily life',
  'B2': 'Can interact with fluency and spontaneity',
  'C1': 'Can express ideas fluently and spontaneously',
  'C2': 'Can express with precision, differentiate finer shades',
};

export function convertToStandardizedScores(
  metrics: SpeakingMetricsResult
): StandardizedScores {
  const grade = metrics.gradeMatch.bestMatch;
  const matchScore = metrics.gradeMatch.matchScores[0]?.score || 50;

  // Adjust base scores based on match score (0-100)
  // If match score is high (80+), they might be at the upper end of that grade
  // If match score is low (50-), they might be at the lower end
  const scoreMultiplier = matchScore >= 70 ? 1.1 : matchScore <= 50 ? 0.9 : 1.0;

  // ===== IELTS =====
  let baseIelts = GRADE_TO_IELTS[grade] || 4.0;
  baseIelts = Math.min(9, Math.max(2, baseIelts * scoreMultiplier));
  // Round to nearest 0.5
  const ieltsBand = Math.round(baseIelts * 2) / 2;

  // Calculate sub-scores based on metrics
  const fluencyScore = Math.min(9, Math.max(2,
    ieltsBand + (metrics.avgWordsPerTurn > 30 ? 0.5 : metrics.avgWordsPerTurn < 15 ? -0.5 : 0)
  ));
  const vocabScore = Math.min(9, Math.max(2,
    ieltsBand + (metrics.vocabulary.tier2Percentage > 15 ? 0.5 : metrics.vocabulary.tier2Percentage < 5 ? -0.5 : 0)
  ));
  const grammarScore = Math.min(9, Math.max(2,
    ieltsBand + (metrics.sentenceComplexity.complexRatio > 25 ? 0.5 : metrics.sentenceComplexity.simpleRatio > 80 ? -0.5 : 0)
  ));
  const pronScore = ieltsBand; // Cannot estimate from text

  // ===== TOEFL =====
  let baseToefl = GRADE_TO_TOEFL[grade] || 15;
  baseToefl = Math.min(30, Math.max(0, Math.round(baseToefl * scoreMultiplier)));
  const toeflLevel = TOEFL_LEVELS.find(l => baseToefl >= l.min && baseToefl <= l.max) || TOEFL_LEVELS[0];

  // ===== TOEIC =====
  let baseToeic = GRADE_TO_TOEIC[grade] || 100;
  baseToeic = Math.min(200, Math.max(0, Math.round(baseToeic * scoreMultiplier)));
  const toeicLevel = TOEIC_LEVELS.find(l => baseToeic >= l.min && baseToeic <= l.max) || TOEIC_LEVELS[0];

  // ===== CEFR =====
  const cefrLevel = GRADE_TO_CEFR[grade] || 'A2';

  return {
    ielts: {
      band: ieltsBand,
      descriptor: IELTS_DESCRIPTORS[ieltsBand] || IELTS_DESCRIPTORS[Math.floor(ieltsBand)],
      fluency: Math.round(fluencyScore * 2) / 2,
      vocabulary: Math.round(vocabScore * 2) / 2,
      grammar: Math.round(grammarScore * 2) / 2,
      pronunciation: Math.round(pronScore * 2) / 2,
    },
    toefl: {
      score: baseToefl,
      level: toeflLevel.level,
      descriptor: toeflLevel.descriptor,
    },
    toeic: {
      score: baseToeic,
      level: toeicLevel.level,
      descriptor: toeicLevel.descriptor,
    },
    cefr: {
      level: cefrLevel,
      descriptor: CEFR_DESCRIPTORS[cefrLevel],
    },
  };
}

// ========== IMPROVEMENT GUIDE ==========

export interface ImprovementGuideItem {
  area: string;
  icon: string;
  currentLevel: string;
  targetLevel: string;
  priority: 'high' | 'medium' | 'low';
  tips: string[];
  examplePhrases: string[];
  miniChallenge: string;
}

export function generateImprovementGuide(
  metrics: SpeakingMetricsResult,
  language: string = 'en'
): ImprovementGuideItem[] {
  const isKo = language === 'ko';
  const guide: ImprovementGuideItem[] = [];
  const grade = metrics.gradeMatch.bestMatch;
  const benchmark = GRADE_BENCHMARKS.find(b => b.grade === grade);
  if (!benchmark) return guide;

  // 1. Vocabulary Diversity
  if (metrics.vocabulary.tier2Percentage < benchmark.vocabularyProfile.tier2Min) {
    const gap = benchmark.vocabularyProfile.tier2Min - metrics.vocabulary.tier2Percentage;
    guide.push({
      area: isKo ? '학술 어휘력' : 'Academic Vocabulary',
      icon: '📚',
      currentLevel: isKo
        ? `학술 어휘 ${metrics.vocabulary.tier2Percentage}%`
        : `Academic words: ${metrics.vocabulary.tier2Percentage}%`,
      targetLevel: isKo
        ? `${benchmark.vocabularyProfile.tier2Min}% 이상`
        : `${benchmark.vocabularyProfile.tier2Min}%+`,
      priority: gap > 10 ? 'high' : 'medium',
      tips: isKo ? [
        `'good' 대신 'excellent, outstanding, remarkable' 사용해보기`,
        `'think' 대신 'believe, consider, assume' 사용해보기`,
        `'important' 대신 'significant, crucial, essential' 사용해보기`,
      ] : [
        `Replace 'good' with 'excellent, outstanding, remarkable'`,
        `Replace 'think' with 'believe, consider, assume'`,
        `Replace 'important' with 'significant, crucial, essential'`,
      ],
      examplePhrases: [
        `"I believe this is a significant issue" (not "I think this is important")`,
        `"That's an excellent point" (not "That's a good point")`,
        `"I'd like to emphasize that..." (not "I want to say that...")`,
      ],
      miniChallenge: isKo
        ? '다음 대화에서 Tier 2 단어 3개 이상 사용해보세요!'
        : 'Use at least 3 academic words in your next conversation!',
    });
  }

  // 2. Sentence Complexity
  if (metrics.sentenceComplexity.complexRatio < benchmark.sentenceComplexity.complexRatio[0]) {
    guide.push({
      area: isKo ? '문장 복잡도' : 'Sentence Complexity',
      icon: '🔗',
      currentLevel: isKo
        ? `복문 비율 ${metrics.sentenceComplexity.complexRatio}%`
        : `Complex sentences: ${metrics.sentenceComplexity.complexRatio}%`,
      targetLevel: isKo
        ? `${benchmark.sentenceComplexity.complexRatio[0]}% 이상`
        : `${benchmark.sentenceComplexity.complexRatio[0]}%+`,
      priority: metrics.sentenceComplexity.complexRatio < 10 ? 'high' : 'medium',
      tips: isKo ? [
        `because/since로 이유 연결: "I like it because..."`,
        `although/even though로 대조: "Although it was hard, I..."`,
        `which/that으로 설명 추가: "The book, which I read yesterday,..."`,
      ] : [
        `Connect reasons with because/since: "I like it because..."`,
        `Show contrast with although/even though: "Although it was hard, I..."`,
        `Add descriptions with which/that: "The book, which I read yesterday,..."`,
      ],
      examplePhrases: [
        `"I enjoy cooking because it helps me relax after work"`,
        `"Although I was tired, I decided to finish the project"`,
        `"The movie, which came out last week, was really interesting"`,
      ],
      miniChallenge: isKo
        ? '다음 대화에서 because, although, which 중 2개 이상 사용해보세요!'
        : 'Use at least 2 of: because, although, which in your next conversation!',
    });
  }

  // 3. Discourse Markers
  if (metrics.discourseMarkers.intermediatePer100 < benchmark.discourseMarkers.intermediateMin) {
    guide.push({
      area: isKo ? '연결어 사용' : 'Discourse Markers',
      icon: '🔀',
      currentLevel: isKo
        ? `중급 연결어 ${metrics.discourseMarkers.intermediatePer100}/100단어`
        : `Intermediate markers: ${metrics.discourseMarkers.intermediatePer100}/100 words`,
      targetLevel: isKo
        ? `${benchmark.discourseMarkers.intermediateMin}/100단어 이상`
        : `${benchmark.discourseMarkers.intermediateMin}/100 words+`,
      priority: 'medium',
      tips: isKo ? [
        `의견 전환: "However, on the other hand..."`,
        `예시 들기: "For example, for instance..."`,
        `추가하기: "In addition, furthermore, moreover..."`,
      ] : [
        `Shift opinions: "However, on the other hand..."`,
        `Give examples: "For example, for instance..."`,
        `Add points: "In addition, furthermore, moreover..."`,
      ],
      examplePhrases: [
        `"I like summer. However, the heat can be too much sometimes"`,
        `"There are many benefits. For example, it improves health"`,
        `"First, it's convenient. In addition, it saves time"`,
      ],
      miniChallenge: isKo
        ? '다음 대화에서 however, for example, in addition 중 하나 이상 써보세요!'
        : 'Try using however, for example, or in addition in your next chat!',
    });
  }

  // 4. Grammar Accuracy
  if (metrics.grammarIndicators.estimatedErrorsPer100 > benchmark.grammarErrorRate) {
    const issues: string[] = [];
    if (metrics.grammarIndicators.subjectVerbAgreementIssues > 0) {
      issues.push(isKo ? '주어-동사 일치' : 'Subject-verb agreement');
    }
    if (metrics.grammarIndicators.articleIssues > 0) {
      issues.push(isKo ? '관사 (a/an/the)' : 'Articles (a/an/the)');
    }

    guide.push({
      area: isKo ? '문법 정확도' : 'Grammar Accuracy',
      icon: '✏️',
      currentLevel: isKo
        ? `오류율 ${metrics.grammarIndicators.estimatedErrorsPer100}/100단어`
        : `Error rate: ${metrics.grammarIndicators.estimatedErrorsPer100}/100 words`,
      targetLevel: isKo
        ? `${benchmark.grammarErrorRate}/100단어 이하`
        : `${benchmark.grammarErrorRate}/100 words or less`,
      priority: metrics.grammarIndicators.estimatedErrorsPer100 > benchmark.grammarErrorRate * 2 ? 'high' : 'medium',
      tips: metrics.grammarIndicators.articleIssues > 0 ? (isKo ? [
        `처음 언급하는 것 → a/an: "I saw a movie"`,
        `이미 언급한 것 → the: "The movie was great"`,
        `유일한 것 → the: "the sun, the president"`,
      ] : [
        `First mention → a/an: "I saw a movie"`,
        `Already mentioned → the: "The movie was great"`,
        `Unique things → the: "the sun, the president"`,
      ]) : (isKo ? [
        `he/she/it + 동사s: "She likes coffee" (not "She like")`,
        `I/you/we/they + 동사: "They like coffee" (not "They likes")`,
        `과거형 일관성 유지: 한 이야기에서 시제 섞지 않기`,
      ] : [
        `he/she/it + verb-s: "She likes coffee" (not "She like")`,
        `I/you/we/they + base verb: "They like coffee" (not "They likes")`,
        `Keep tenses consistent within one story`,
      ]),
      examplePhrases: metrics.grammarIndicators.articleIssues > 0 ? [
        `"I bought a book. The book was about history" (a → the)`,
        `"She is a teacher at the university"`,
        `"I had an interesting experience yesterday"`,
      ] : [
        `"She works at a hospital" (not "She work")`,
        `"He doesn't like coffee" (not "He don't like")`,
        `"Yesterday I went to the store and bought groceries" (consistent past)`,
      ],
      miniChallenge: isKo
        ? `다음 대화에서 ${issues[0] || '문법'}에 특히 신경 써보세요!`
        : `Pay extra attention to ${issues[0] || 'grammar'} in your next conversation!`,
    });
  }

  // 5. Response Length
  if (metrics.avgWordsPerTurn < benchmark.avgWordsPerTurn[0]) {
    guide.push({
      area: isKo ? '응답 길이' : 'Response Length',
      icon: '📏',
      currentLevel: isKo
        ? `평균 ${metrics.avgWordsPerTurn}단어/응답`
        : `Avg ${metrics.avgWordsPerTurn} words/response`,
      targetLevel: isKo
        ? `${benchmark.avgWordsPerTurn[0]}단어 이상`
        : `${benchmark.avgWordsPerTurn[0]}+ words`,
      priority: metrics.avgWordsPerTurn < benchmark.avgWordsPerTurn[0] / 2 ? 'high' : 'low',
      tips: isKo ? [
        `답변 후 이유 추가: "I like it because..."`,
        `예시 덧붙이기: "For example, last week I..."`,
        `감정/의견 추가: "I feel that... / I think..."`,
      ] : [
        `Add a reason after your answer: "I like it because..."`,
        `Include an example: "For example, last week I..."`,
        `Share your feelings/opinions: "I feel that... / I think..."`,
      ],
      examplePhrases: [
        `Short: "I like pizza" → Extended: "I really enjoy pizza, especially margherita, because the fresh basil and mozzarella remind me of my trip to Italy"`,
      ],
      miniChallenge: isKo
        ? '다음 대화에서 모든 답변을 2문장 이상으로 해보세요!'
        : 'Make every answer at least 2 sentences in your next conversation!',
    });
  }

  // Sort by priority
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  guide.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return guide.slice(0, 4); // Max 4 items
}

// ========== FULL EVALUATION RESULT ==========

export interface FullSpeakingEvaluation {
  metrics: SpeakingMetricsResult;
  standardizedScores: StandardizedScores;
  comparison?: ProgressComparison;
  improvementGuide?: ImprovementGuideItem[];
}
