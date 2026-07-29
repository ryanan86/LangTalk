import { withSentryConfig } from "@sentry/nextjs";

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: '*.googleusercontent.com',
      },
    ],
  },
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(self), geolocation=()',
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://accounts.google.com https://apis.google.com https://www.googletagmanager.com https://js.tosspayments.com https://*.tosspayments.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: blob: https://*.googleusercontent.com https://lh3.googleusercontent.com https://www.google-analytics.com https://www.googletagmanager.com https://*.tosspayments.com",
              "connect-src 'self' https://accounts.google.com https://apis.google.com https://api.elevenlabs.io https://api.deepgram.com https://*.sentry.io https://*.ingest.sentry.io https://www.google-analytics.com https://www.googletagmanager.com https://region1.google-analytics.com https://js.tosspayments.com https://*.tosspayments.com https://api.tosspayments.com",
              "frame-src https://accounts.google.com https://*.tosspayments.com",
              "media-src 'self' blob:",
              "worker-src 'self' blob:",
            ].join('; '),
          },
        ],
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  // Sentry webpack plugin options
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,

  // 빌드 로그에서 Sentry 플러그인 출력을 숨긴다 (업로드 여부와 무관).
  silent: true,

  // 이 토큰이 없으면 소스맵 업로드가 통째로 생략되고, 프로덕션 스택트레이스가
  // 난독화된 채로 남는다(<script>:2:69658 / 함수명 I·xm 형태).
  authToken: process.env.SENTRY_AUTH_TOKEN,

  // App Router 는 공유 청크에 코드가 흩어지므로, 이 옵션 없이는 일부 클라이언트
  // 번들의 소스맵이 업로드되지 않아 해당 프레임이 계속 해석되지 않는다.
  widenClientFileUpload: true,

  // 업로드 후 빌드 산출물에서 .map 을 삭제해 공개 배포본에 소스가 노출되지 않게
  // 한다. 구 옵션 hideSourceMaps 는 @sentry/nextjs v10 에서 제거됐다.
  sourcemaps: {
    deleteSourcemapsAfterUpload: true,
  },

  // Enable tunneling to avoid ad blockers
  tunnelRoute: "/monitoring",

  // Disable Sentry telemetry
  telemetry: false,
});
