import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// Simple in-memory rate limiter: 1 token per 30 seconds per user
const rateLimitMap = new Map<string, number>();
const RATE_LIMIT_WINDOW_MS = 30_000;

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const lastRequest = rateLimitMap.get(userId);
  if (lastRequest && now - lastRequest < RATE_LIMIT_WINDOW_MS) {
    return false;
  }
  rateLimitMap.set(userId, now);
  // Clean up old entries periodically
  if (rateLimitMap.size > 1000) {
    const cutoff = now - RATE_LIMIT_WINDOW_MS;
    rateLimitMap.forEach((timestamp, key) => {
      if (timestamp < cutoff) rateLimitMap.delete(key);
    });
  }
  return true;
}

// Creates a temporary scoped Deepgram API key (60s TTL)
// Requires DEEPGRAM_PROJECT_ID env var. Falls back to raw key if not set.
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const apiKey = process.env.DEEPGRAM_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Deepgram not configured' }, { status: 503 });
    }

    // Rate limit per user
    if (!checkRateLimit(session.user.email)) {
      return NextResponse.json({ error: 'Rate limited. Try again shortly.' }, { status: 429 });
    }

    const projectId = process.env.DEEPGRAM_PROJECT_ID;
    if (!projectId) {
      console.warn(
        '[deepgram-token] DEEPGRAM_PROJECT_ID not set — falling back to raw API key. ' +
        'Set DEEPGRAM_PROJECT_ID to enable temporary scoped tokens.'
      );
      return NextResponse.json({ key: apiKey });
    }

    // Create a temporary scoped key via Deepgram REST API
    const response = await fetch(
      `https://api.deepgram.com/v1/projects/${projectId}/keys`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Token ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          comment: `langtalk-temp-${Date.now()}`,
          scopes: ['usage:write'],
          time_to_live_in_seconds: 60,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[deepgram-token] Failed to create temp key:', response.status, errorText);
      // Fall back to raw key on API failure
      console.warn('[deepgram-token] Falling back to raw API key');
      return NextResponse.json({ key: apiKey });
    }

    const data = await response.json();
    const tempKey = data.key;

    if (!tempKey) {
      console.error('[deepgram-token] No key in response:', data);
      return NextResponse.json({ key: apiKey });
    }

    return NextResponse.json({ key: tempKey });
  } catch (error) {
    console.error('Deepgram token error:', error);
    return NextResponse.json({ error: 'Failed to get token' }, { status: 500 });
  }
}
