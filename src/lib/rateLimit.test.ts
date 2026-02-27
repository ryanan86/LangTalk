import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock next/server before importing the module under test
vi.mock('next/server', () => {
  return {
    NextResponse: {
      json: vi.fn((body: unknown, init?: ResponseInit) => ({ body, init })),
    },
  };
});

import { checkRateLimit, getRateLimitId, RATE_LIMITS } from './rateLimit';

// ===== RATE_LIMITS constants =====

describe('RATE_LIMITS', () => {
  it('has ai config with limit and windowSeconds', () => {
    expect(RATE_LIMITS.ai.limit).toBe(30);
    expect(RATE_LIMITS.ai.windowSeconds).toBe(60);
  });

  it('has audio config', () => {
    expect(RATE_LIMITS.audio.limit).toBe(40);
    expect(RATE_LIMITS.audio.windowSeconds).toBe(60);
  });

  it('has light config with highest limit', () => {
    expect(RATE_LIMITS.light.limit).toBe(60);
    expect(RATE_LIMITS.light.windowSeconds).toBe(60);
  });
});

// ===== getRateLimitId =====

describe('getRateLimitId', () => {
  function makeRequest(headers: Record<string, string>): Request {
    return {
      headers: {
        get: (key: string) => headers[key] ?? null,
      },
    } as unknown as Request;
  }

  it('uses user:email when email is provided', () => {
    const req = makeRequest({});
    const id = getRateLimitId('test@example.com', req);
    expect(id).toBe('user:test@example.com');
  });

  it('uses ip:address when email is null', () => {
    const req = makeRequest({ 'x-forwarded-for': '192.168.1.1' });
    const id = getRateLimitId(null, req);
    expect(id).toBe('ip:192.168.1.1');
  });

  it('uses the first IP from x-forwarded-for list', () => {
    const req = makeRequest({ 'x-forwarded-for': '10.0.0.1, 10.0.0.2, 10.0.0.3' });
    const id = getRateLimitId(null, req);
    expect(id).toBe('ip:10.0.0.1');
  });

  it('falls back to ip:unknown when no email and no forwarded header', () => {
    const req = makeRequest({});
    const id = getRateLimitId(null, req);
    expect(id).toBe('ip:unknown');
  });

  it('falls back to ip:unknown when email is undefined', () => {
    const req = makeRequest({});
    const id = getRateLimitId(undefined, req);
    expect(id).toBe('ip:unknown');
  });

  it('prefers email over IP even when forwarded header is present', () => {
    const req = makeRequest({ 'x-forwarded-for': '1.2.3.4' });
    const id = getRateLimitId('user@test.com', req);
    expect(id).toBe('user:user@test.com');
  });
});

// ===== checkRateLimit =====

describe('checkRateLimit', () => {
  // Use unique identifiers per test so tests don't bleed into each other
  let counter = 0;
  function uniqueId() {
    return `test-user-${Date.now()}-${counter++}`;
  }

  it('returns null (allowed) for the first request', () => {
    const result = checkRateLimit(uniqueId(), { limit: 5, windowSeconds: 60 });
    expect(result).toBeNull();
  });

  it('returns null when under the limit', () => {
    const id = uniqueId();
    const config = { limit: 5, windowSeconds: 60 };
    for (let i = 0; i < 5; i++) {
      const result = checkRateLimit(id, config);
      expect(result).toBeNull();
    }
  });

  it('returns a response when over the limit', () => {
    const id = uniqueId();
    const config = { limit: 2, windowSeconds: 60 };
    // First 2 allowed
    checkRateLimit(id, config);
    checkRateLimit(id, config);
    // 3rd exceeds limit
    const result = checkRateLimit(id, config);
    expect(result).not.toBeNull();
  });

  it('the returned response has status 429', () => {
    const id = uniqueId();
    const config = { limit: 1, windowSeconds: 60 };
    checkRateLimit(id, config); // first OK
    const result = checkRateLimit(id, config) as any;
    expect(result).not.toBeNull();
    // Our mock returns { body, init } — check init.status
    expect(result.init?.status).toBe(429);
  });

  it('different identifiers have separate rate limit buckets', () => {
    const config = { limit: 1, windowSeconds: 60 };
    const id1 = uniqueId();
    const id2 = uniqueId();
    checkRateLimit(id1, config); // exhaust id1
    checkRateLimit(id1, config); // id1 over limit

    // id2 should still be allowed
    const result = checkRateLimit(id2, config);
    expect(result).toBeNull();
  });
});
