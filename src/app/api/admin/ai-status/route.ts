import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const ADMIN_EMAILS = ['ryan@nuklabs.com', 'taewoongan@gmail.com'];

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ProviderStatus {
  id: string;
  name: string;
  role: 'LLM' | 'TTS' | 'STT';
  balanceUsd?: number;
  quotaUsed?: number;
  quotaLimit?: number;
  status: 'ok' | 'low' | 'error' | 'no-permission' | 'info';
  note?: string;
  dashboardUrl?: string;
}

interface AiStatusResponse {
  providers: ProviderStatus[];
  checkedAt: string;
}

// ─── In-module cache (5 min) ──────────────────────────────────────────────────

let cachedResult: AiStatusResponse | null = null;
let cacheExpiry = 0;
const CACHE_TTL_MS = 5 * 60 * 1000;

// ─── Fetch helpers (8 s timeout each) ────────────────────────────────────────

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('timeout')), ms)
    ),
  ]);
}

async function checkFishAudio(): Promise<ProviderStatus> {
  const key = process.env.FISH_AUDIO_API_KEY;
  if (!key) {
    return {
      id: 'fish-audio',
      name: 'Fish Audio',
      role: 'TTS',
      status: 'error',
      note: 'FISH_AUDIO_API_KEY 환경변수 미설정',
      dashboardUrl: 'https://fish.audio/dashboard',
    };
  }
  try {
    const res = await withTimeout(
      fetch('https://api.fish.audio/wallet/self/api-credit', {
        headers: { Authorization: `Bearer ${key}` },
        cache: 'no-store',
      }),
      8000
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json() as { credit: number };
    const credit = Number(data.credit ?? 0);
    return {
      id: 'fish-audio',
      name: 'Fish Audio',
      role: 'TTS',
      balanceUsd: credit,
      status: credit < 10 ? 'low' : 'ok',
      note: credit < 10 ? `잔액 $${credit.toFixed(2)} — 충전 필요` : undefined,
      dashboardUrl: 'https://fish.audio/dashboard',
    };
  } catch (err) {
    return {
      id: 'fish-audio',
      name: 'Fish Audio',
      role: 'TTS',
      status: 'error',
      note: `API 오류: ${err instanceof Error ? err.message : String(err)}`,
      dashboardUrl: 'https://fish.audio/dashboard',
    };
  }
}

async function checkDeepSeek(): Promise<ProviderStatus> {
  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) {
    return {
      id: 'deepseek',
      name: 'DeepSeek',
      role: 'LLM',
      status: 'error',
      note: 'DEEPSEEK_API_KEY 환경변수 미설정',
      dashboardUrl: 'https://platform.deepseek.com/',
    };
  }
  try {
    const res = await withTimeout(
      fetch('https://api.deepseek.com/user/balance', {
        headers: { Authorization: `Bearer ${key}` },
        cache: 'no-store',
      }),
      8000
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json() as { balance_infos?: { total_balance?: string | number }[] };
    const raw = data.balance_infos?.[0]?.total_balance;
    const balance = raw !== undefined ? Number(raw) : NaN;
    if (isNaN(balance)) throw new Error('예상치 못한 응답 형식');
    return {
      id: 'deepseek',
      name: 'DeepSeek',
      role: 'LLM',
      balanceUsd: balance,
      status: balance < 5 ? 'low' : 'ok',
      note: balance < 5 ? `잔액 $${balance.toFixed(4)} — 충전 필요` : undefined,
      dashboardUrl: 'https://platform.deepseek.com/',
    };
  } catch (err) {
    return {
      id: 'deepseek',
      name: 'DeepSeek',
      role: 'LLM',
      status: 'error',
      note: `API 오류: ${err instanceof Error ? err.message : String(err)}`,
      dashboardUrl: 'https://platform.deepseek.com/',
    };
  }
}

async function checkDeepgram(): Promise<ProviderStatus> {
  const key = process.env.DEEPGRAM_API_KEY;
  if (!key) {
    return {
      id: 'deepgram',
      name: 'Deepgram',
      role: 'STT',
      status: 'error',
      note: 'DEEPGRAM_API_KEY 환경변수 미설정',
      dashboardUrl: 'https://console.deepgram.com/',
    };
  }
  try {
    // Step 1: get first project id
    const projRes = await withTimeout(
      fetch('https://api.deepgram.com/v1/projects', {
        headers: { Authorization: `Token ${key}` },
        cache: 'no-store',
      }),
      8000
    );
    if (projRes.status === 403) {
      return {
        id: 'deepgram',
        name: 'Deepgram',
        role: 'STT',
        status: 'no-permission',
        note: '키에 billing 권한 없음 — 콘솔에서 billing:read 스코프 키로 교체 시 표시됨',
        dashboardUrl: 'https://console.deepgram.com/',
      };
    }
    if (!projRes.ok) throw new Error(`HTTP ${projRes.status}`);
    const projData = await projRes.json() as { projects?: { project_id: string }[] };
    const projectId = projData.projects?.[0]?.project_id;
    if (!projectId) throw new Error('프로젝트를 찾을 수 없음');

    // Step 2: get balances
    const balRes = await withTimeout(
      fetch(`https://api.deepgram.com/v1/projects/${projectId}/balances`, {
        headers: { Authorization: `Token ${key}` },
        cache: 'no-store',
      }),
      8000
    );
    if (balRes.status === 403) {
      return {
        id: 'deepgram',
        name: 'Deepgram',
        role: 'STT',
        status: 'no-permission',
        note: '키에 billing 권한 없음 — 콘솔에서 billing:read 스코프 키로 교체 시 표시됨',
        dashboardUrl: 'https://console.deepgram.com/',
      };
    }
    if (!balRes.ok) throw new Error(`HTTP ${balRes.status}`);
    const balData = await balRes.json() as { balances?: { amount: number }[] };
    const amount = balData.balances?.[0]?.amount;
    const balance = amount !== undefined ? Number(amount) : NaN;
    if (isNaN(balance)) throw new Error('예상치 못한 잔액 형식');

    return {
      id: 'deepgram',
      name: 'Deepgram',
      role: 'STT',
      balanceUsd: balance,
      status: balance < 20 ? 'low' : 'ok',
      note: balance < 20 ? `잔액 $${balance.toFixed(2)} — 충전 필요` : undefined,
      dashboardUrl: 'https://console.deepgram.com/',
    };
  } catch (err) {
    return {
      id: 'deepgram',
      name: 'Deepgram',
      role: 'STT',
      status: 'error',
      note: `API 오류: ${err instanceof Error ? err.message : String(err)}`,
      dashboardUrl: 'https://console.deepgram.com/',
    };
  }
}

async function checkElevenLabs(): Promise<ProviderStatus> {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) {
    return {
      id: 'elevenlabs',
      name: 'ElevenLabs',
      role: 'TTS',
      status: 'error',
      note: 'ELEVENLABS_API_KEY 환경변수 미설정',
      dashboardUrl: 'https://elevenlabs.io/subscription',
    };
  }
  try {
    const res = await withTimeout(
      fetch('https://api.elevenlabs.io/v1/user/subscription', {
        headers: { 'xi-api-key': key },
        cache: 'no-store',
      }),
      8000
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json() as {
      tier?: string;
      character_count?: number;
      character_limit?: number;
      status?: string;
    };
    const used = data.character_count ?? 0;
    const limit = data.character_limit ?? 0;
    const pct = limit > 0 ? Math.round((used / limit) * 100) : 0;
    const isLow = pct > 90;
    return {
      id: 'elevenlabs',
      name: 'ElevenLabs',
      role: 'TTS',
      quotaUsed: used,
      quotaLimit: limit,
      status: isLow ? 'low' : 'ok',
      note: [
        `플랜: ${data.tier ?? '알 수 없음'}`,
        `구독 상태: ${data.status ?? '알 수 없음'}`,
        isLow ? `할당량 ${pct}% 사용 — 한도 임박` : undefined,
      ].filter(Boolean).join(' / '),
      dashboardUrl: 'https://elevenlabs.io/subscription',
    };
  } catch (err) {
    return {
      id: 'elevenlabs',
      name: 'ElevenLabs',
      role: 'TTS',
      status: 'error',
      note: `API 오류: ${err instanceof Error ? err.message : String(err)}`,
      dashboardUrl: 'https://elevenlabs.io/subscription',
    };
  }
}

async function checkOpenAI(): Promise<ProviderStatus> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    return {
      id: 'openai',
      name: 'OpenAI',
      role: 'LLM',
      status: 'error',
      note: 'OPENAI_API_KEY 환경변수 미설정',
      dashboardUrl: 'https://platform.openai.com/account/usage',
    };
  }
  try {
    const res = await withTimeout(
      fetch('https://api.openai.com/v1/models', {
        headers: { Authorization: `Bearer ${key}` },
        cache: 'no-store',
      }),
      8000
    );
    const isAuthOk = res.ok;
    return {
      id: 'openai',
      name: 'OpenAI',
      role: 'LLM',
      status: isAuthOk ? 'info' : 'error',
      note: isAuthOk
        ? '잔액은 platform.openai.com에서 확인'
        : `인증 실패 (HTTP ${res.status}) — API 키를 확인하세요`,
      dashboardUrl: 'https://platform.openai.com/account/usage',
    };
  } catch (err) {
    return {
      id: 'openai',
      name: 'OpenAI',
      role: 'LLM',
      status: 'error',
      note: `API 오류: ${err instanceof Error ? err.message : String(err)}`,
      dashboardUrl: 'https://platform.openai.com/account/usage',
    };
  }
}

async function checkGemini(): Promise<ProviderStatus> {
  const key = process.env.GOOGLE_AI_API_KEY ?? process.env.GEMINI_API_KEY;
  if (!key) {
    return {
      id: 'gemini',
      name: 'Gemini',
      role: 'LLM',
      status: 'error',
      note: 'GOOGLE_AI_API_KEY 또는 GEMINI_API_KEY 환경변수 미설정',
      dashboardUrl: 'https://aistudio.google.com/',
    };
  }
  try {
    const res = await withTimeout(
      fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${key}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: 'hi' }] }],
            generationConfig: { maxOutputTokens: 4 },
          }),
          cache: 'no-store',
        }
      ),
      8000
    );
    if (res.ok) {
      return {
        id: 'gemini',
        name: 'Gemini',
        role: 'LLM',
        status: 'info',
        note: '모델 응답 정상 — 잔액은 Google AI Studio에서 확인',
        dashboardUrl: 'https://aistudio.google.com/',
      };
    }
    const body = await res.json().catch(() => ({})) as { error?: { message?: string } };
    const msg = body?.error?.message ?? `HTTP ${res.status}`;
    return {
      id: 'gemini',
      name: 'Gemini',
      role: 'LLM',
      status: 'error',
      note: `모델 응답 실패: ${msg}`,
      dashboardUrl: 'https://aistudio.google.com/',
    };
  } catch (err) {
    return {
      id: 'gemini',
      name: 'Gemini',
      role: 'LLM',
      status: 'error',
      note: `API 오류: ${err instanceof Error ? err.message : String(err)}`,
      dashboardUrl: 'https://aistudio.google.com/',
    };
  }
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  // Admin auth check — same pattern as /api/admin/users/route.ts
  const session = await getServerSession(authOptions);
  if (!session?.user?.email || !ADMIN_EMAILS.includes(session.user.email)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = Date.now();
  const fresh = request.nextUrl.searchParams.get('fresh') === '1';

  // Return cached result if still valid and not bypassed
  if (!fresh && cachedResult && now < cacheExpiry) {
    return NextResponse.json(cachedResult);
  }

  // Run all provider checks in parallel
  const results = await Promise.allSettled([
    checkFishAudio(),
    checkDeepSeek(),
    checkDeepgram(),
    checkElevenLabs(),
    checkOpenAI(),
    checkGemini(),
  ]);

  const providers: ProviderStatus[] = results.map((r, i) => {
    if (r.status === 'fulfilled') return r.value;
    const ids = ['fish-audio', 'deepseek', 'deepgram', 'elevenlabs', 'openai', 'gemini'];
    const names = ['Fish Audio', 'DeepSeek', 'Deepgram', 'ElevenLabs', 'OpenAI', 'Gemini'];
    const roles: ProviderStatus['role'][] = ['TTS', 'LLM', 'STT', 'TTS', 'LLM', 'LLM'];
    return {
      id: ids[i],
      name: names[i],
      role: roles[i],
      status: 'error',
      note: `점검 실패: ${r.reason instanceof Error ? r.reason.message : String(r.reason)}`,
    } satisfies ProviderStatus;
  });

  const response: AiStatusResponse = {
    providers,
    checkedAt: new Date().toISOString(),
  };

  cachedResult = response;
  cacheExpiry = now + CACHE_TTL_MS;

  return NextResponse.json(response);
}
