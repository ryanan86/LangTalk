import { NextRequest, NextResponse } from 'next/server';
import https from 'https';
import { SignJWT } from 'jose';
import { getUserData, saveUserData } from '@/lib/dataHelper';
import { UserRow } from '@/lib/sheetTypes';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs'; // mTLS client certs require the Node runtime (not Edge)

const TOSS_TOKEN_URL = 'https://apps-in-toss-api.toss.im/api-partner/v1/apps-in-toss/user/oauth2/generate-token';
const TOSS_ME_URL = 'https://apps-in-toss-api.toss.im/api-partner/v1/apps-in-toss/user/oauth2/login-me';

function httpsRequest(
  urlStr: string,
  options: https.RequestOptions,
  body?: string
): Promise<{ status: number; data: unknown }> {
  return new Promise((resolve, reject) => {
    const url = new URL(urlStr);
    const reqOptions: https.RequestOptions = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      ...options,
    };
    const req = https.request(reqOptions, (res) => {
      let raw = '';
      res.on('data', (chunk: Buffer) => { raw += chunk.toString(); });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode ?? 0, data: JSON.parse(raw) });
        } catch {
          resolve({ status: res.statusCode ?? 0, data: raw });
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

export async function POST(request: NextRequest) {
  // Require mTLS certificates
  // Normalize literal "\n" sequences (common when PEMs are stored as single-line env vars)
  const certPem = process.env.TOSS_MTLS_CERT_PEM?.replace(/\\n/g, '\n');
  const keyPem = process.env.TOSS_MTLS_KEY_PEM?.replace(/\\n/g, '\n');
  if (!certPem || !keyPem) {
    return NextResponse.json({ error: 'TOSS_MTLS_NOT_CONFIGURED' }, { status: 503 });
  }

  let authorizationCode: string;
  let referrer: 'DEFAULT' | 'SANDBOX';
  try {
    const body = await request.json() as { authorizationCode?: string; referrer?: string };
    if (!body.authorizationCode) {
      return NextResponse.json({ error: 'authorizationCode is required' }, { status: 400 });
    }
    authorizationCode = body.authorizationCode;
    referrer = (body.referrer === 'SANDBOX' ? 'SANDBOX' : 'DEFAULT');
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const mtlsOptions: https.RequestOptions = {
    method: 'POST',
    cert: certPem,
    key: keyPem,
    headers: {
      'Content-Type': 'application/json',
    },
  };

  // Step 1: Exchange authorization code for Toss access token
  let accessToken: string;
  try {
    const tokenBody = JSON.stringify({ authorizationCode, referrer });
    const tokenRes = await httpsRequest(TOSS_TOKEN_URL, mtlsOptions, tokenBody);

    if (tokenRes.status !== 200) {
      console.error('[toss-auth] token exchange failed', tokenRes.status, tokenRes.data);
      return NextResponse.json({ error: 'Toss token exchange failed' }, { status: 502 });
    }

    const tokenData = tokenRes.data as {
      resultType?: string;
      success?: { accessToken: string; refreshToken: string; tokenType: string; expiresIn: number; scope: string };
      error?: { errorCode?: string; reason?: string } | string;
    };

    if (tokenData.resultType !== 'SUCCESS' || tokenData.error) {
      console.error('[toss-auth] token exchange error', tokenData);
      return NextResponse.json({ error: 'Toss auth rejected' }, { status: 401 });
    }

    if (!tokenData.success?.accessToken) {
      console.error('[toss-auth] no accessToken in response', tokenData);
      return NextResponse.json({ error: 'Toss token missing' }, { status: 502 });
    }

    accessToken = tokenData.success.accessToken;
  } catch (err) {
    console.error('[toss-auth] token request error', err);
    return NextResponse.json({ error: 'Toss token request failed' }, { status: 502 });
  }

  // Step 2: Fetch Toss user info
  let userKey: number;
  try {
    const meRes = await httpsRequest(TOSS_ME_URL, {
      method: 'GET',
      cert: certPem,
      key: keyPem,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (meRes.status !== 200) {
      console.error('[toss-auth] login-me failed', meRes.status, meRes.data);
      return NextResponse.json({ error: 'Toss user info fetch failed' }, { status: 502 });
    }

    const meData = meRes.data as {
      resultType?: string;
      success?: { userKey: number; scope: string; agreedTerms: string[]; email?: string | null };
      error?: unknown;
    };

    if (meData.resultType !== 'SUCCESS' || meData.success?.userKey == null) {
      console.error('[toss-auth] login-me error response', meData);
      return NextResponse.json({ error: 'Toss user info invalid' }, { status: 502 });
    }

    userKey = meData.success.userKey;

    // Guard against silent precision loss on very large IDs (would collapse two
    // distinct Toss users into the same derived email)
    if (!Number.isSafeInteger(userKey)) {
      console.error('[toss-auth] userKey exceeds safe integer range', userKey);
      return NextResponse.json({ error: 'Toss user info invalid' }, { status: 502 });
    }
  } catch (err) {
    console.error('[toss-auth] login-me request error', err);
    return NextResponse.json({ error: 'Toss user info request failed' }, { status: 502 });
  }

  // Step 3: Find or create user in our DB
  const email = `toss_${userKey}@miniapp.taptalk`;

  let existingUser = await getUserData(email);
  if (!existingUser) {
    // New user: create with 7-day trial (same as getDefaultSubscription in supabaseHelper)
    const trialExpiry = new Date();
    trialExpiry.setDate(trialExpiry.getDate() + 7);
    const now = new Date().toISOString();

    const newUser: UserRow = {
      email,
      subscription: {
        status: 'active' as const,
        expiryDate: trialExpiry.toISOString(),
        signupDate: now,
        name: `Toss User ${userKey}`,
        plan: 'trial' as const,
      },
      profile: {
        type: 'adult_beginner' as const,
        interests: [] as string[],
        nativeLanguage: 'ko' as const,
      },
      stats: {
        sessionCount: 0,
        totalMinutes: 0,
        debateCount: 0,
        currentStreak: 0,
        longestStreak: 0,
        xp: 0,
        level: 1,
        achievements: [] as string[],
        tutorsUsed: [] as string[],
        perfectSessions: 0,
        dailyChallengeStreak: 0,
        weeklyXp: [0, 0, 0, 0, 0, 0, 0] as number[],
      },
      updatedAt: now,
    };

    const saved = await saveUserData(newUser);
    if (!saved) {
      console.error('[toss-auth] failed to create new user', email);
      return NextResponse.json({ error: 'User creation failed' }, { status: 500 });
    }

    existingUser = newUser;
  }

  // Step 4: Issue our own JWT
  const jwtSecretStr = process.env.MINIAPP_JWT_SECRET || process.env.NEXTAUTH_SECRET || '';
  if (!jwtSecretStr) {
    console.error('[toss-auth] no JWT secret configured');
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  const secret = new TextEncoder().encode(jwtSecretStr);
  const token = await new SignJWT({ email, userKey, provider: 'toss' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(secret);

  return NextResponse.json({
    token,
    user: {
      email,
      plan: existingUser?.subscription?.plan,
    },
  });
}
