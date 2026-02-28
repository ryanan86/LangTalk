import { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import KakaoProvider from 'next-auth/providers/kakao';
import AppleProvider from 'next-auth/providers/apple';
import CredentialsProvider from 'next-auth/providers/credentials';
import { OAuth2Client } from 'google-auth-library';
import { createRemoteJWKSet, jwtVerify } from 'jose';

if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
  console.error('[auth] GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET is missing');
}
if (process.env.NEXTAUTH_SECRET === 'langtalk-secret-key-change-in-production') {
  console.warn('[auth] WARNING: NEXTAUTH_SECRET is using a placeholder value. Generate a secure secret for production!');
}

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Apple JWKS for verifying identity tokens from native Sign in with Apple
const appleJWKS = createRemoteJWKSet(new URL('https://appleid.apple.com/auth/keys'));

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      authorization: {
        params: {
          scope: 'openid email profile',
        },
      },
    }),
    KakaoProvider({
      clientId: process.env.KAKAO_CLIENT_ID!,
      clientSecret: process.env.KAKAO_CLIENT_SECRET!,
    }),
    // Apple OAuth (web flow) - requires APPLE_ID, APPLE_TEAM_ID, APPLE_KEY_ID, APPLE_PRIVATE_KEY env vars
    ...(process.env.APPLE_ID && process.env.APPLE_TEAM_ID && process.env.APPLE_KEY_ID && process.env.APPLE_PRIVATE_KEY
      ? [AppleProvider({
          clientId: process.env.APPLE_ID,
          clientSecret: '', // Generated dynamically by next-auth from the key
          authorization: { params: { scope: 'name email' } },
          profile(profile) {
            return {
              id: profile.sub,
              email: profile.email,
              name: profile.name || null,
              image: null,
            };
          },
        })]
      : []),
    CredentialsProvider({
      id: 'google-native',
      name: 'Google Native',
      credentials: {
        idToken: { label: 'ID Token', type: 'text' },
        email: { label: 'Email', type: 'email' },
        name: { label: 'Name', type: 'text' },
        image: { label: 'Image', type: 'text' },
      },
      async authorize(credentials) {
        if (!credentials?.idToken || !credentials?.email) {
          return null;
        }

        try {
          const ticket = await googleClient.verifyIdToken({
            idToken: credentials.idToken,
            audience: process.env.GOOGLE_CLIENT_ID,
          });
          const payload = ticket.getPayload();

          if (!payload || payload.email !== credentials.email) {
            return null;
          }

          return {
            id: payload.sub || credentials.email,
            email: credentials.email,
            name: credentials.name || payload.name,
            image: credentials.image || payload.picture,
          };
        } catch (error) {
          console.error('Google token verification failed:', error);
          return null;
        }
      },
    }),
    // Apple native (Capacitor iOS) - verifies Apple identity token via JWKS
    CredentialsProvider({
      id: 'apple-native',
      name: 'Apple Native',
      credentials: {
        identityToken: { label: 'Identity Token', type: 'text' },
        email: { label: 'Email', type: 'email' },
        name: { label: 'Name', type: 'text' },
        userId: { label: 'User ID', type: 'text' },
      },
      async authorize(credentials) {
        if (!credentials?.identityToken || !credentials?.userId) {
          return null;
        }

        try {
          // Verify Apple's identity token JWT
          const { payload } = await jwtVerify(credentials.identityToken, appleJWKS, {
            issuer: 'https://appleid.apple.com',
            audience: 'com.taptalk.app',
          });

          // Ensure the token subject matches the claimed user ID
          if (payload.sub !== credentials.userId) {
            console.error('[auth] Apple token sub mismatch');
            return null;
          }

          // Email: prefer from credentials (only sent on first login), fallback to token
          const email = credentials.email || (payload.email as string) || `${credentials.userId}@privaterelay.appleid.com`;

          return {
            id: credentials.userId,
            email,
            name: credentials.name || 'Apple User',
            image: null,
          };
        } catch (error) {
          console.error('Apple token verification failed:', error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub!;
      }
      return session;
    },
    async jwt({ token, account }) {
      if (account) {
        token.accessToken = account.access_token;
      }
      return token;
    },
  },
  pages: {
    signIn: '/login',
  },
};
