import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { checkRateLimit, getRateLimitId, RATE_LIMITS } from '@/lib/rateLimit';
import { getUserData, updateUserFields } from '@/lib/dataHelper';
import { makeRid, nowMs, since, withTimeoutAbort } from '@/lib/perf';
import {
  EXAM_FORMS,
} from '@/data/examForms';
import {
  OPIC_GRADES,
  TOEIC_SPEAKING_LEVELS,
  MAX_EXAM_HISTORY,
} from '@/lib/examTypes';
import type {
  GradeExamRequest,
  GradeExamResponse,
  ExamGradeResult,
  ExamSubscores,
  ExamHistoryItem,
} from '@/lib/examTypes';

export const preferredRegion = 'icn1';

let _openai: OpenAI | null = null;
function getOpenAI() {
  if (!_openai) _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return _openai;
}

const gemini = process.env.GEMINI_API_KEY
  ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  : null;

// -----------------------------------------------
// Robust JSON extraction (mirrors existing pattern)
// -----------------------------------------------
function extractJSON(text: string): unknown {
  try { return JSON.parse(text); } catch { /* continue */ }
  const codeBlock = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlock) { try { return JSON.parse(codeBlock[1].trim()); } catch { /* continue */ } }
  const first = text.indexOf('{');
  const last = text.lastIndexOf('}');
  if (first !== -1 && last > first) { try { return JSON.parse(text.slice(first, last + 1)); } catch { /* continue */ } }
  return null;
}

// -----------------------------------------------
// AI grading response shape
// -----------------------------------------------
interface AIGradeRaw {
  subscores: {
    fluency: number;
    grammar: number;
    vocabulary: number;
    coherence: number;
    taskCompletion: number;
  };
  gradeIndex: number;
  overallFeedbackKo: string;
  perTaskFeedback: Array<{
    taskId: string;
    feedbackKo: string;
    strong?: string;
    weak?: string;
  }>;
}

function buildGradingPrompt(
  examType: 'toeic-speaking' | 'opic',
  taskLines: string
): string {
  const scaleDesc =
    examType === 'toeic-speaking'
      ? 'TOEIC Speaking levels 0-5 where 0=Level 3 (60-70), 1=Level 4 (80-100), 2=Level 5 (110-120), 3=Level 6 (130-150), 4=Level 7 (160-180), 5=Level 8 (190-200)'
      : 'OPIc grades 0-8 where 0=NL, 1=NM, 2=NH, 3=IL, 4=IM1, 5=IM2, 6=IM3, 7=IH, 8=AL';

  return `You are a certified ${examType === 'toeic-speaking' ? 'TOEIC Speaking' : 'OPIc'} examiner with extensive test-rating experience. Grade the following speaking exam responses objectively and strictly.

CALIBRATION RULES (must follow):
- If the average transcript length is fewer than 5 words, assign gradeIndex 0 or 1 (bottom two grades). Do not be lenient with near-empty responses.
- Reserve the top grade (index 5 for TOEIC-Speaking, index 8 for OPIc) only for answers that are long, fully on-task, grammatically accurate, and show wide vocabulary range.
- Consider how much of the allotted answerSeconds the speaker actually used. Low utilization is penalized.
- Be consistent: the subscores should reflect the predictedGrade.

EXAM TASKS AND TRANSCRIPTS:
${taskLines}

GRADE SCALE: ${scaleDesc}

Return ONLY valid JSON in this exact shape (no markdown, no extra keys):
{
  "subscores": {
    "fluency": <0-100>,
    "grammar": <0-100>,
    "vocabulary": <0-100>,
    "coherence": <0-100>,
    "taskCompletion": <0-100>
  },
  "gradeIndex": <integer 0-${examType === 'toeic-speaking' ? '5' : '8'}>,
  "overallFeedbackKo": "<3-4 sentences in Korean, specific and constructive>",
  "perTaskFeedback": [
    { "taskId": "<id>", "feedbackKo": "<1-2 sentences in Korean>", "strong": "<optional English phrase>", "weak": "<optional English phrase>" }
  ]
}`;
}

// -----------------------------------------------
// POST /api/exam/grade
// -----------------------------------------------
export async function POST(request: NextRequest) {
  const rid = makeRid('exam-grade');
  const t0 = nowMs();
  const timings: Record<string, number> = {};

  try {
    // Auth
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    // Rate limit
    const rateLimitResult = await checkRateLimit(
      getRateLimitId(session.user.email, request),
      RATE_LIMITS.ai
    );
    if (rateLimitResult) return rateLimitResult;

    // Parse + validate body
    let body: GradeExamRequest;
    try {
      body = await request.json() as GradeExamRequest;
    } catch {
      return NextResponse.json({ error: '요청 형식이 올바르지 않습니다.' }, { status: 400 });
    }

    const { examType, formId, answers } = body;

    if (!examType || !formId || !Array.isArray(answers) || answers.length === 0) {
      return NextResponse.json({ error: '필수 항목(examType, formId, answers)이 누락되었습니다.' }, { status: 400 });
    }

    // Find form
    const form = EXAM_FORMS.find(f => f.formId === formId && f.examType === examType);
    if (!form) {
      return NextResponse.json({ error: `존재하지 않는 시험 폼입니다: ${formId}`, }, { status: 400 });
    }

    // Validate that all answer taskIds exist in this form
    const formTaskIds = new Set(form.tasks.map(t => t.id));
    const invalidIds = answers.filter(a => !formTaskIds.has(a.taskId)).map(a => a.taskId);
    if (invalidIds.length > 0) {
      return NextResponse.json(
        { error: `유효하지 않은 taskId가 포함되어 있습니다: ${invalidIds.join(', ')}` },
        { status: 400 }
      );
    }

    // Build per-task input for AI
    const taskLines = form.tasks
      .map(task => {
        const answer = answers.find(a => a.taskId === task.id);
        const transcript = answer?.transcript?.trim() || '(no response)';
        const secondsUsed = answer?.answerSeconds ?? 0;
        const words = answer?.wordsSpoken ?? 0;
        return [
          `--- Task ${task.order} [${task.type}] id=${task.id} ---`,
          `Question: ${task.promptEn}`,
          `Transcript: ${transcript}`,
          `Seconds used: ${secondsUsed} / ${task.answerSeconds}`,
          `Words spoken: ${words}`,
        ].join('\n');
      })
      .join('\n\n');

    const gradingPrompt = buildGradingPrompt(examType, taskLines);

    let raw: AIGradeRaw | null = null;

    // Gemini 2.0 Flash primary
    if (gemini) {
      try {
        const model = gemini.getGenerativeModel({
          model: 'gemini-2.0-flash',
          generationConfig: { temperature: 0.2, maxOutputTokens: 2048 },
        });
        const result = await withTimeoutAbort(
          () => model.generateContent(gradingPrompt),
          20000,
          'gemini.grade',
          timings
        );
        const text = result.response.text();
        const parsed = extractJSON(text);
        if (isValidAIGrade(parsed, examType)) {
          raw = parsed as AIGradeRaw;
        } else {
          console.warn('[exam/grade] Gemini returned invalid grade shape:', text.slice(0, 300));
        }
      } catch (e) {
        console.error('[exam/grade] Gemini failed:', e);
      }
    }

    // GPT-4o-mini fallback
    if (!raw) {
      try {
        const response = await withTimeoutAbort(
          (signal) =>
            getOpenAI().chat.completions.create(
              {
                model: 'gpt-4o-mini',
                max_tokens: 2048,
                temperature: 0.2,
                messages: [
                  { role: 'system', content: 'You are a professional language test examiner. Always return valid JSON only.' },
                  { role: 'user', content: gradingPrompt },
                ],
              },
              { signal }
            ),
          25000,
          'openai.grade',
          timings
        );
        const text = response.choices[0]?.message?.content || '';
        const parsed = extractJSON(text);
        if (isValidAIGrade(parsed, examType)) {
          raw = parsed as AIGradeRaw;
        } else {
          console.warn('[exam/grade] OpenAI returned invalid grade shape:', text.slice(0, 300));
        }
      } catch (e) {
        console.error('[exam/grade] OpenAI fallback failed:', e);
      }
    }

    // Total AI failure — do NOT fabricate; return 502 so client can retry
    if (!raw) {
      timings['total.ms'] = since(t0);
      return NextResponse.json(
        {
          error: 'AI 채점에 실패했습니다. 응답이 저장되지 않았으니 잠시 후 다시 시도해 주세요.',
          meta: { rid, timings },
        },
        { status: 502 }
      );
    }

    // Map gradeIndex → predictedGrade + predictedScoreRange
    const clampedIndex = Math.max(0, Math.min(raw.gradeIndex, examType === 'toeic-speaking' ? 5 : 8));
    let predictedGrade: string;
    let predictedScoreRange: string | undefined;

    if (examType === 'toeic-speaking') {
      const level = TOEIC_SPEAKING_LEVELS[clampedIndex];
      predictedGrade = level.level;
      predictedScoreRange = level.range;
    } else {
      predictedGrade = OPIC_GRADES[clampedIndex];
    }

    const subscores: ExamSubscores = {
      fluency: clamp(raw.subscores.fluency),
      grammar: clamp(raw.subscores.grammar),
      vocabulary: clamp(raw.subscores.vocabulary),
      coherence: clamp(raw.subscores.coherence),
      taskCompletion: clamp(raw.subscores.taskCompletion),
    };

    const today = new Date().toISOString().slice(0, 10);
    const gradeResult: ExamGradeResult = {
      examType,
      formId,
      date: today,
      predictedGrade,
      ...(predictedScoreRange ? { predictedScoreRange } : {}),
      subscores,
      overallFeedbackKo: raw.overallFeedbackKo ?? '',
      perTaskFeedback: Array.isArray(raw.perTaskFeedback) ? raw.perTaskFeedback : [],
    };

    // Persist + award XP (awaited — required)
    const userData = await getUserData(session.user.email);
    const existingHistory: ExamHistoryItem[] = userData?.stats?.examHistory ?? [];
    const newHistory: ExamHistoryItem[] = [gradeResult, ...existingHistory].slice(0, MAX_EXAM_HISTORY);
    const currentXp = userData?.stats?.xp ?? 0;

    await updateUserFields(session.user.email, {
      stats: {
        examHistory: newHistory,
        xp: currentXp + 80,
      },
    });

    timings['total.ms'] = since(t0);

    const responseBody: GradeExamResponse = { result: gradeResult };
    return NextResponse.json({ ...responseBody, meta: { rid, timings } });
  } catch (error) {
    console.error('[exam/grade] error:', error);
    const timingsOut = { 'total.ms': since(t0) };
    return NextResponse.json(
      { error: '채점 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.', meta: { rid, timings: timingsOut } },
      { status: 500 }
    );
  }
}

// -----------------------------------------------
// Helpers
// -----------------------------------------------
function clamp(n: unknown): number {
  if (typeof n !== 'number' || isNaN(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function isValidAIGrade(parsed: unknown, examType: 'toeic-speaking' | 'opic'): boolean {
  if (!parsed || typeof parsed !== 'object') return false;
  const p = parsed as Record<string, unknown>;
  if (!p.subscores || typeof p.subscores !== 'object') return false;
  const ss = p.subscores as Record<string, unknown>;
  for (const k of ['fluency', 'grammar', 'vocabulary', 'coherence', 'taskCompletion']) {
    if (typeof ss[k] !== 'number') return false;
  }
  if (typeof p.gradeIndex !== 'number') return false;
  const maxIdx = examType === 'toeic-speaking' ? 5 : 8;
  if (p.gradeIndex < 0 || p.gradeIndex > maxIdx) return false;
  if (typeof p.overallFeedbackKo !== 'string') return false;
  if (!Array.isArray(p.perTaskFeedback)) return false;
  return true;
}
