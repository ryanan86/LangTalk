/**
 * Lightweight product analytics — GA4 gtag wrapper with safe no-op fallback.
 * One funnel vocabulary for the whole app; add new event names here so the
 * funnel stays greppable.
 */

export type AnalyticsEvent =
  // Activation funnel
  | 'sign_up_complete'
  | 'onboarding_complete'
  | 'first_session_start'
  | 'first_session_complete'
  // Core usage
  | 'talk_session_start'
  | 'talk_session_complete'
  | 'debate_start'
  | 'review_complete'
  // Study mode
  | 'study_plan_created'
  | 'study_session_start'
  | 'study_block_complete'
  | 'study_session_complete'
  | 'study_weekly_test_complete'
  // Monetization
  | 'paywall_view'
  | 'checkout_start'
  | 'purchase_complete'
  | 'purchase_fail';

// Window.gtag is declared globally in src/components/GoogleAnalytics.tsx.

/** Fire-and-forget event. Never throws, safe on server (no-op). */
export function track(event: AnalyticsEvent, params?: Record<string, unknown>): void {
  try {
    if (typeof window === 'undefined') return;
    if (typeof window.gtag === 'function') {
      window.gtag('event', event, params);
    } else if (process.env.NODE_ENV === 'development') {
      console.debug('[analytics]', event, params ?? {});
    }
  } catch {
    // analytics must never break the app
  }
}
