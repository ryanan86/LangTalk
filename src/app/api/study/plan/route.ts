import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getAuthUser } from '@/lib/miniappAuth';
import { checkRateLimit, getRateLimitId, RATE_LIMITS } from '@/lib/rateLimit';
import { getUserData, updateUserFields } from '@/lib/dataHelper';
import { makeRid, nowMs, since, withTimeoutAbort } from '@/lib/perf';
import type {
  GeneratePlanRequest,
  GeneratePlanResponse,
  StudyPlan,
  StudyWeek,
  GrammarPattern,
} from '@/lib/studyTypes';
import { STUDY_PATTERNS } from '@/data/studyPatterns';

export const preferredRegion = 'icn1';

/**
 * GET /api/study/plan — read current study plan + progress stats.
 * Frontend contract: { plan: StudyPlan | null, stats: StudyStats | null }
 */
export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser?.email) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    const userData = await getUserData(authUser.email);
    return NextResponse.json({
      plan: userData?.profile?.study ?? null,
      stats: userData?.stats?.study ?? null,
    });
  } catch (error) {
    console.error('Study plan GET error:', error);
    return NextResponse.json({ error: 'Failed to load study plan' }, { status: 500 });
  }
}

let _openai: OpenAI | null = null;
function getOpenAI() {
  if (!_openai) _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return _openai;
}

const gemini = process.env.GEMINI_API_KEY
  ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  : null;

// -----------------------------------------------
// Pattern distribution — purely deterministic, no AI
// -----------------------------------------------
function distributePatterns(patterns: GrammarPattern[], selfLevel: string, assessedCEFR?: string): string[][] {
  const cefr = assessedCEFR || (
    selfLevel === 'beginner' ? 'A2' :
    selfLevel === 'intermediate' ? 'B1' : 'B2'
  );

  const a2 = patterns.filter(p => p.level === 'A2');
  const b1 = patterns.filter(p => p.level === 'B1');
  const b2 = patterns.filter(p => p.level === 'B2');

  // Weeks 1-12 — each gets ~2-3 pattern ids
  // beginner/A2: A2-heavy early, B1 intro mid, small B2 late
  // intermediate/B1: mixed A2+B1 early, B1+B2 later
  // advanced/B2: B1+B2 throughout
  const weekPatterns: string[][] = [];

  if (cefr === 'A2') {
    // weeks 1-4 A2 only, 5-8 A2+B1, 9-12 B1+some B2
    for (let w = 1; w <= 12; w++) {
      const ids: string[] = [];
      if (w <= 4) {
        const slice = a2.slice((w - 1) * 2, (w - 1) * 2 + 2);
        ids.push(...slice.map(p => p.id));
      } else if (w <= 8) {
        const aSlice = a2.slice((w - 1) * 1, (w - 1) * 1 + 1);
        const bSlice = b1.slice((w - 5) * 2, (w - 5) * 2 + 2);
        ids.push(...aSlice.map(p => p.id), ...bSlice.map(p => p.id));
      } else {
        const bSlice = b1.slice((w - 9) * 2, (w - 9) * 2 + 2);
        const b2Slice = b2.slice((w - 9), (w - 9) + 1);
        ids.push(...bSlice.map(p => p.id), ...b2Slice.map(p => p.id));
      }
      weekPatterns.push(ids.filter(Boolean));
    }
  } else if (cefr === 'B1') {
    for (let w = 1; w <= 12; w++) {
      const ids: string[] = [];
      if (w <= 3) {
        const aSlice = a2.slice((w - 1) * 1, (w - 1) * 1 + 1);
        const bSlice = b1.slice((w - 1) * 2, (w - 1) * 2 + 2);
        ids.push(...aSlice.map(p => p.id), ...bSlice.map(p => p.id));
      } else if (w <= 9) {
        const bSlice = b1.slice((w - 1) * 2, (w - 1) * 2 + 2);
        ids.push(...bSlice.map(p => p.id));
      } else {
        const bSlice = b1.slice((w - 1), w);
        const b2Slice = b2.slice((w - 10) * 2, (w - 10) * 2 + 2);
        ids.push(...bSlice.map(p => p.id), ...b2Slice.map(p => p.id));
      }
      weekPatterns.push(ids.filter(Boolean));
    }
  } else {
    // B2 or advanced
    for (let w = 1; w <= 12; w++) {
      const ids: string[] = [];
      if (w <= 4) {
        const bSlice = b1.slice((w - 1) * 2, (w - 1) * 2 + 2);
        const b2Slice = b2.slice((w - 1), w);
        ids.push(...bSlice.map(p => p.id), ...b2Slice.map(p => p.id));
      } else {
        const b2Slice = b2.slice((w - 5) * 2, (w - 5) * 2 + 2);
        ids.push(...b2Slice.map(p => p.id));
      }
      weekPatterns.push(ids.filter(Boolean));
    }
  }

  return weekPatterns;
}

// -----------------------------------------------
// Static fallback plan (AI-independent)
// -----------------------------------------------
const STATIC_THEMES = [
  { theme: '자기소개와 스몰토크', themeEn: 'Self-Introduction & Small Talk', mission: '하루에 원어민 유튜브 1편 듣고 핵심 표현 2개 따라 말하기', testTopic: '자신을 영어로 소개하고 관심사 3가지 말하기' },
  { theme: '일상 루틴과 습관', themeEn: 'Daily Routines & Habits', mission: '오늘 한 일을 영어로 음성 메모로 녹음하기 (3문장 이상)', testTopic: '내 하루 일과를 이야기하기' },
  { theme: '음식과 식문화', themeEn: 'Food & Dining Culture', mission: '좋아하는 음식을 추천하는 짧은 영어 리뷰 쓰고 말해보기', testTopic: '나의 최애 음식을 설명하고 추천하기' },
  { theme: '여행: 공항과 호텔', themeEn: 'Travel: Airport & Hotel', mission: '유명 여행지 영어 여행 블로그 1편 읽고 새 표현 3개 모아두기', testTopic: '여행 경험 또는 꿈의 여행지 말하기' },
  { theme: '쇼핑과 가격 협상', themeEn: 'Shopping & Bargaining', mission: '영어로 된 쇼핑 앱에서 물건 찾아보고 리뷰 3개 읽기', testTopic: '물건을 사고 싶다고 설명하고 가격 물어보기' },
  { theme: '건강과 병원', themeEn: 'Health & Medical', mission: '증상을 설명하는 영어 문장 5개 만들어 소리내어 읽기', testTopic: '몸이 아픈 상황을 영어로 설명하기' },
  { theme: '직장과 업무 커뮤니케이션', themeEn: 'Work & Professional Communication', mission: '영어로 이메일 1통 쓰거나 업무 상황 롤플레이 녹음하기', testTopic: '나의 직업과 하는 일 설명하기' },
  { theme: '취미와 여가', themeEn: 'Hobbies & Leisure', mission: '내 취미를 소개하는 영어 유튜브 쇼츠 시청하고 말투 따라 하기', testTopic: '취미를 소개하고 왜 좋아하는지 설명하기' },
  { theme: '감정과 의견 표현', themeEn: 'Expressing Feelings & Opinions', mission: '오늘 느낀 감정을 영어로 일기 3문장 쓰기', testTopic: '최근에 인상 깊었던 일과 그때 감정 말하기' },
  { theme: '기술과 소셜미디어', themeEn: 'Technology & Social Media', mission: '좋아하는 앱이나 기기를 영어로 소개하는 글 읽거나 쓰기', testTopic: '즐겨 쓰는 앱 또는 기기를 소개하기' },
  { theme: '환경과 사회 이슈', themeEn: 'Environment & Social Issues', mission: '환경 관련 영어 뉴스 헤드라인 5개 읽고 의미 파악하기', testTopic: '환경 문제에 대한 내 의견 말하기' },
  { theme: '미래 계획과 꿈', themeEn: 'Future Plans & Dreams', mission: '5년 후 내 모습을 영어로 말하는 30초 스피치 녹음하기', testTopic: '나의 미래 계획과 꿈 이야기하기' },
];

function buildStaticPlan(req: GeneratePlanRequest, patternDist: string[][]): StudyPlan {
  const weeks: StudyWeek[] = STATIC_THEMES.map((t, i) => ({
    week: i + 1,
    theme: t.theme,
    themeEn: t.themeEn,
    patternIds: patternDist[i] ?? [],
    vocabTier: (i < 5 ? 1 : i < 9 ? 2 : 3) as 1 | 2 | 3,
    immersionMission: t.mission,
    weeklyTestTopic: t.testTopic,
  }));

  return {
    profile: req.profile,
    weeks,
    createdAt: new Date().toISOString(),
  };
}

// -----------------------------------------------
// Extract JSON robustly (mirrors chat route pattern)
// -----------------------------------------------
function extractJSON(text: string): unknown {
  try { return JSON.parse(text); } catch { /* continue */ }
  const codeBlock = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlock) { try { return JSON.parse(codeBlock[1].trim()); } catch { /* continue */ } }
  const first = text.indexOf('[');
  const last = text.lastIndexOf(']');
  if (first !== -1 && last > first) { try { return JSON.parse(text.slice(first, last + 1)); } catch { /* continue */ } }
  return null;
}

interface AIWeek {
  week: number;
  theme?: string;
  themeEn?: string;
  immersionMission?: string;
  weeklyTestTopic?: string;
}

// -----------------------------------------------
// POST /api/study/plan
// -----------------------------------------------
export async function POST(request: NextRequest) {
  const rid = makeRid('study-plan');
  const t0 = nowMs();
  const timings: Record<string, number> = {};

  try {
    const authUser = await getAuthUser(request);
    if (!authUser?.email) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    const rateLimitResult = await checkRateLimit(
      getRateLimitId(authUser.email, request),
      RATE_LIMITS.ai
    );
    if (rateLimitResult) return rateLimitResult;

    const rawBody = await request.json() as GeneratePlanRequest;
    const { profile, interests } = rawBody;

    if (!profile || !profile.goal || !profile.selfLevel || !profile.dailyMinutes || !profile.startDate) {
      return NextResponse.json({ error: '필수 학습 설정이 누락되었습니다.' }, { status: 400 });
    }

    // Deterministic pattern distribution
    const patternDist = distributePatterns(
      STUDY_PATTERNS as GrammarPattern[],
      profile.selfLevel,
      profile.assessedCEFR
    );

    // AI prompt — only themes/missions/test topics
    const goalLabels: Record<string, string> = {
      travel: '여행',
      business: '비즈니스',
      relocation: '해외 이민/거주',
      exam: '시험 준비',
      'daily-conversation': '일상 회화',
    };
    const goalLabel = goalLabels[profile.goal] ?? profile.goal;
    const interestStr = interests?.length ? interests.join(', ') : '없음';
    const detailStr = profile.goalDetail ? ` (구체적 목표: ${profile.goalDetail})` : '';

    const aiPrompt = `당신은 영어 학습 코치입니다. 다음 학습자를 위한 12주 영어 학습 계획을 만들어 주세요.

학습자 정보:
- 학습 목표: ${goalLabel}${detailStr}
- 현재 수준: ${profile.selfLevel} (CEFR: ${profile.assessedCEFR || '미측정'})
- 관심사: ${interestStr}
- 하루 학습 시간: ${profile.dailyMinutes}분

아래 JSON 배열을 반환하세요 (마크다운 없이 순수 JSON만):
[
  {
    "week": 1,
    "theme": "주제 (한국어, 예: 자기소개와 스몰토크)",
    "themeEn": "Theme in English",
    "immersionMission": "이번 주 몰입 미션 (한국어, 구체적이고 학습자 관심사 반영, 2-3문장)",
    "weeklyTestTopic": "주말 스피킹 테스트 주제 (한국어, 1문장)"
  },
  ... (week 2 ~ 12도 동일 형식)
]

요구사항:
- 12주 전체가 자연스럽게 난이도가 올라가야 합니다.
- 주제는 학습자의 목표(${goalLabel})와 관심사(${interestStr})에 맞게 개인화하세요.
- immersionMission은 집에서 혼자 할 수 있는 구체적 활동이어야 합니다.
- JSON 배열 12개 항목만 반환하세요.`;

    let aiWeeks: AIWeek[] | null = null;

    // Gemini primary
    if (gemini) {
      try {
        const model = gemini.getGenerativeModel({
          model: 'gemini-3-flash-preview',
          generationConfig: { temperature: 0.7, maxOutputTokens: 2048 },
        });
        const result = await withTimeoutAbort(
          () => model.generateContent(aiPrompt),
          15000,
          'gemini.plan',
          timings
        );
        const raw = result.response.text();
        const parsed = extractJSON(raw);
        if (Array.isArray(parsed) && parsed.length === 12) {
          aiWeeks = parsed as AIWeek[];
        }
      } catch (e) {
        console.error('[study/plan] Gemini failed:', e);
      }
    }

    // OpenAI fallback
    if (!aiWeeks) {
      try {
        const response = await withTimeoutAbort(
          (signal) => getOpenAI().chat.completions.create({
            model: 'gpt-5.4-mini',
            max_tokens: 2048,
            temperature: 0.7,
            messages: [{ role: 'user', content: aiPrompt }],
          }, { signal }),
          20000,
          'openai.plan',
          timings
        );
        const raw = response.choices[0]?.message?.content || '';
        const parsed = extractJSON(raw);
        if (Array.isArray(parsed) && parsed.length === 12) {
          aiWeeks = parsed as AIWeek[];
        }
      } catch (e) {
        console.error('[study/plan] OpenAI fallback failed:', e);
      }
    }

    let plan: StudyPlan;

    if (aiWeeks) {
      const weeks: StudyWeek[] = aiWeeks.map((w, i) => ({
        week: i + 1,
        theme: w.theme ?? STATIC_THEMES[i]?.theme ?? `Week ${i + 1}`,
        themeEn: w.themeEn ?? STATIC_THEMES[i]?.themeEn ?? `Week ${i + 1}`,
        patternIds: patternDist[i] ?? [],
        vocabTier: (i < 5 ? 1 : i < 9 ? 2 : 3) as 1 | 2 | 3,
        immersionMission: w.immersionMission ?? STATIC_THEMES[i]?.mission ?? '',
        weeklyTestTopic: w.weeklyTestTopic ?? STATIC_THEMES[i]?.testTopic ?? '',
      }));
      plan = { profile, weeks, createdAt: new Date().toISOString() };
    } else {
      // Full static fallback — setup never dead-ends
      plan = buildStaticPlan({ profile, interests }, patternDist);
    }

    // Persist to profile.study
    await updateUserFields(authUser.email, { profile: { study: plan } });

    timings['total.ms'] = since(t0);

    const response: GeneratePlanResponse = { plan };
    return NextResponse.json({ ...response, meta: { rid, timings } });
  } catch (error) {
    console.error('[study/plan] error:', error);
    const timingsOut: Record<string, number> = { 'total.ms': since(t0) };
    return NextResponse.json(
      { error: '학습 계획 생성 중 오류가 발생했습니다.', meta: { rid, timings: timingsOut } },
      { status: 500 }
    );
  }
}
