import { NextRequest, NextResponse } from 'next/server';

const ALLOWED_ORIGINS = [
  'https://taptalk.apps.tossmini.com',
  'https://taptalk.private-apps.tossmini.com',
  'http://localhost:5173',
];

const CORS_METHODS = 'GET,POST,PUT,DELETE,OPTIONS';
const CORS_HEADERS = 'Content-Type,Authorization';
const CORS_MAX_AGE = '86400';

function getCorsOrigin(origin: string | null): string | null {
  if (!origin) return null;
  return ALLOWED_ORIGINS.includes(origin) ? origin : null;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only apply CORS logic to /api/* routes
  if (!pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  const origin = request.headers.get('origin');
  const allowedOrigin = getCorsOrigin(origin);

  // Handle OPTIONS preflight immediately
  if (request.method === 'OPTIONS') {
    const response = new NextResponse(null, { status: 204 });
    response.headers.set('Vary', 'Origin');
    if (allowedOrigin) {
      response.headers.set('Access-Control-Allow-Origin', allowedOrigin);
      response.headers.set('Access-Control-Allow-Methods', CORS_METHODS);
      response.headers.set('Access-Control-Allow-Headers', CORS_HEADERS);
      response.headers.set('Access-Control-Max-Age', CORS_MAX_AGE);
    }
    return response;
  }

  // For non-OPTIONS requests, attach CORS headers to the response
  const response = NextResponse.next();
  response.headers.set('Vary', 'Origin');
  if (allowedOrigin) {
    response.headers.set('Access-Control-Allow-Origin', allowedOrigin);
    response.headers.set('Access-Control-Allow-Methods', CORS_METHODS);
    response.headers.set('Access-Control-Allow-Headers', CORS_HEADERS);
  }
  return response;
}

export const config = {
  matcher: '/api/:path*',
};
