import { NextResponse } from 'next/server';

// ---------------------------------------------------------------------------
// Upstash Redis REST backend (durable across serverless instances)
// Falls back to in-memory Map when env vars are absent.
// ---------------------------------------------------------------------------

// Upstash 직접 연동(UPSTASH_*) 또는 Vercel Marketplace/KV 연동(KV_REST_API_*) 모두 지원
const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

/**
 * Atomically increment a key and set its TTL on first write.
 * Uses a Lua EVAL so the INCR + EXPIRE are a single round-trip.
 * Returns the new count, or null on any error (fail-open).
 */
async function upstashIncr(key: string, windowSeconds: number): Promise<number | null> {
  if (!UPSTASH_URL || !UPSTASH_TOKEN) return null;

  // EVAL script: INCR the key, then set EXPIRE only when the key is brand-new (count === 1)
  const script = `
    local n = redis.call("INCR", KEYS[1])
    if n == 1 then
      redis.call("EXPIRE", KEYS[1], ARGV[1])
    end
    return n
  `;

  try {
    const res = await fetch(`${UPSTASH_URL}/eval`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${UPSTASH_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([script, 1, key, String(windowSeconds)]),
    });

    if (!res.ok) {
      console.warn(`[rateLimit] Upstash EVAL returned ${res.status}, failing open`);
      return null;
    }

    const json = await res.json() as { result?: number };
    return typeof json.result === 'number' ? json.result : null;
  } catch (err) {
    console.warn('[rateLimit] Upstash fetch error, failing open:', err);
    return null;
  }
}

/**
 * Ops health check — reports which backend is active and whether Redis responds.
 * Never exposes URLs or tokens.
 */
export async function getRateLimitBackendStatus(): Promise<{
  backend: 'redis' | 'memory';
  redisOk: boolean | null; // null = not configured
}> {
  if (!UPSTASH_URL || !UPSTASH_TOKEN) {
    return { backend: 'memory', redisOk: null };
  }
  const probe = await upstashIncr(`health:probe:${new Date().toISOString().slice(0, 13)}`, 120);
  return { backend: probe !== null ? 'redis' : 'memory', redisOk: probe !== null };
}

// ---------------------------------------------------------------------------
// In-memory fallback (per-process — only effective for single-instance deploys)
// ---------------------------------------------------------------------------

// NOTE: When Upstash env vars are not set this in-memory store is used.
// In serverless environments (Vercel), each function instance has its own store.
interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Clean up expired entries periodically
const CLEANUP_INTERVAL = 60_000; // 1 minute
let lastCleanup = Date.now();

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;
  const keysToDelete: string[] = [];
  store.forEach((entry, key) => {
    if (entry.resetAt < now) {
      keysToDelete.push(key);
    }
  });
  keysToDelete.forEach(key => store.delete(key));
}

interface RateLimitConfig {
  /** Max requests per window */
  limit: number;
  /** Window size in seconds */
  windowSeconds: number;
}

/** Default rate limit configs per endpoint type */
export const RATE_LIMITS = {
  /** AI-heavy endpoints (chat, evaluate, debate) - expensive API calls */
  ai: { limit: 30, windowSeconds: 60 } as RateLimitConfig,
  /** Audio endpoints (STT, TTS) - moderate cost */
  audio: { limit: 40, windowSeconds: 60 } as RateLimitConfig,
  /** Light endpoints (topic generation, data reads) */
  light: { limit: 60, windowSeconds: 60 } as RateLimitConfig,
} as const;

/**
 * Check rate limit for a given identifier (usually user email or IP).
 * Returns null if allowed, or a NextResponse with 429 if rate limited.
 *
 * Uses Upstash Redis REST when UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN
 * are set (durable across serverless instances). Falls back to in-memory Map.
 * Upstash errors fail-open (allow the request) with a console.warn.
 */
export async function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): Promise<NextResponse | null> {
  // --- Upstash path ---
  if (UPSTASH_URL && UPSTASH_TOKEN) {
    const rlKey = `rl:${identifier}`;
    const count = await upstashIncr(rlKey, config.windowSeconds);

    if (count === null) {
      // Upstash error: fail-open
      return null;
    }

    if (count > config.limit) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(config.windowSeconds),
            'X-RateLimit-Limit': String(config.limit),
            'X-RateLimit-Remaining': '0',
          },
        }
      );
    }

    return null;
  }

  // --- In-memory fallback ---
  cleanup();

  const now = Date.now();
  const entry = store.get(identifier);

  if (!entry || entry.resetAt < now) {
    store.set(identifier, { count: 1, resetAt: now + config.windowSeconds * 1000 });
    return null;
  }

  entry.count++;
  if (entry.count > config.limit) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(retryAfter),
          'X-RateLimit-Limit': String(config.limit),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(entry.resetAt),
        },
      }
    );
  }

  return null;
}

/**
 * Get identifier for rate limiting from session email or request IP.
 */
export function getRateLimitId(email: string | null | undefined, request: Request): string {
  if (email) return `user:${email}`;
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded?.split(',')[0]?.trim() || 'unknown';
  return `ip:${ip}`;
}
