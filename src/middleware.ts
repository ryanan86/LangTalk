import { NextRequest, NextResponse } from 'next/server';

const ALLOWED_ORIGINS = [
  'https://taptalk.apps.tossmini.com',
  'https://taptalk.private-apps.tossmini.com',
  'http://localhost:5173',
];

const CORS_METHODS = 'GET,POST,PUT,DELETE,OPTIONS';
// X-TTS-Stream: TTS 라우트가 스트리밍 응답 여부를 결정하는 요청 헤더.
// 허용 목록에 없으면 미니앱의 프리플라이트가 실패해 TTS 호출 자체가 막힌다.
const CORS_HEADERS = 'Content-Type,Authorization,X-TTS-Stream';
// 브라우저는 기본적으로 소수의 안전 헤더만 JS 에 노출한다. 커스텀 헤더는
// Expose-Headers 에 명시해야 cross-origin 응답에서 읽을 수 있다.
// X-TapTalk-Meta: TTS 응답의 provider 정보 — 미니앱이 이걸 읽어야 한 세션 안에서
// 같은 음성(provider)을 유지할 수 있다. 없으면 문장마다 목소리가 바뀔 수 있다.
const CORS_EXPOSE_HEADERS = 'X-TapTalk-Meta,X-TTS-Streaming';
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
    response.headers.set('Access-Control-Expose-Headers', CORS_EXPOSE_HEADERS);
  }
  return response;
}

export const config = {
  matcher: '/api/:path*',
};
