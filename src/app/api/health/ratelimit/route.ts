import { NextResponse } from 'next/server';
import { getRateLimitBackendStatus } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

/**
 * GET /api/health/ratelimit — rate-limit backend health (ops check).
 * Reveals only backend type + connectivity; no secrets.
 */
export async function GET() {
  const status = await getRateLimitBackendStatus();
  return NextResponse.json({
    ...status,
    note:
      status.backend === 'redis'
        ? 'Upstash Redis 사용 중 (인스턴스 간 공유 rate limit)'
        : status.redisOk === null
          ? 'Redis env 미설정 — in-memory fallback (인스턴스별 독립)'
          : 'Redis env는 있으나 연결 실패 — in-memory fallback 동작 중',
  });
}
