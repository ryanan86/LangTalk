import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Performance Monitoring
  tracesSampleRate: 0.1, // 10% of transactions for performance monitoring

  // Session Replay
  replaysSessionSampleRate: 0.1, // 10% of sessions
  replaysOnErrorSampleRate: 1.0, // 100% of sessions with errors

  // Only enable in production
  enabled: process.env.NODE_ENV === 'production',

  // Set environment
  environment: process.env.NODE_ENV,

  // Filter out common non-actionable errors
  ignoreErrors: [
    // Network errors
    'Network request failed',
    'Failed to fetch',
    'Load failed',
    // Browser extensions
    /^chrome-extension:\/\//,
    /^moz-extension:\/\//,
    // User aborted
    'AbortError',
    'The operation was aborted',
    // Resize observer
    'ResizeObserver loop',
  ],

  beforeSend(event) {
    // Don't send events in development
    if (process.env.NODE_ENV !== 'production') {
      return null;
    }
    return event;
  },
});

// App Router 내비게이션 계측. 이 훅이 없으면 라우터 전환(<Link> 이동·프리페치)
// 구간이 트랜잭션으로 잡히지 않아, 전환 도중 터진 오류의 발생 경로가 스택트레이스
// 밖에서 사라진다. @sentry/nextjs v10 이 빌드 시 ACTION REQUIRED 로 요구한다.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
