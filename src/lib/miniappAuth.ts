import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { jwtVerify } from 'jose';

export interface AuthUser {
  email: string;
}

/**
 * Unified auth resolution for both web sessions and miniapp Bearer tokens.
 *
 * Priority:
 *   1. Authorization: Bearer <jwt> header — verified with MINIAPP_JWT_SECRET || NEXTAUTH_SECRET
 *   2. NextAuth session cookie (getServerSession)
 *
 * Returns { email } on success, null on failure.
 */
export async function getAuthUser(req: NextRequest): Promise<AuthUser | null> {
  // 1. Bearer token (miniapp JWT)
  const authHeader = req.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    const jwtSecretStr = process.env.MINIAPP_JWT_SECRET || process.env.NEXTAUTH_SECRET || '';
    if (jwtSecretStr) {
      try {
        const secret = new TextEncoder().encode(jwtSecretStr);
        const { payload } = await jwtVerify(token, secret, { algorithms: ['HS256'] });
        if (payload.email && typeof payload.email === 'string') {
          return { email: payload.email };
        }
      } catch {
        // Invalid or expired JWT — fall through to session check
      }
    }
  }

  // 2. NextAuth session
  const session = await getServerSession(authOptions);
  if (session?.user?.email) {
    return { email: session.user.email };
  }

  return null;
}
