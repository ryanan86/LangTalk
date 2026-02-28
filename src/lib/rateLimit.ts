import { NextResponse } from 'next/server';

// NOTE: This in-memory rate limiter is per-process only.
// In serverless environments (Vercel), each function instance has its own store.
// For production, replace with a distributed store (e.g., Upstash Redis).
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
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): NextResponse | null {
  cleanup();

  const now = Date.now();
  const key = identifier;
  const entry = store.get(key);

  if (!entry || entry.resetAt < now) {
    store.set(key, { count: 1, resetAt: now + config.windowSeconds * 1000 });
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
