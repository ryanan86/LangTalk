/** In-memory TTS provider health tracker with circuit breaker. */

interface ProviderMetrics {
  totalRequests: number;
  successes: number;
  failures: number;
  totalLatencyMs: number;
  lastFailure: number | null;
  lastSuccess: number | null;
  recentLatencies: number[];   // last 20 latencies for P95 calc
  recentResults: boolean[];    // last 10 results for circuit breaker (true=success)
}

const MAX_RECENT_LATENCIES = 20;
const MAX_RECENT_RESULTS = 10;
const CIRCUIT_BREAK_FAILURE_RATE = 0.5;
const CIRCUIT_BREAK_COOLDOWN_MS = 60_000; // 60s

const metrics: Record<string, ProviderMetrics> = {};

function ensureProvider(provider: string): ProviderMetrics {
  if (!metrics[provider]) {
    metrics[provider] = {
      totalRequests: 0,
      successes: 0,
      failures: 0,
      totalLatencyMs: 0,
      lastFailure: null,
      lastSuccess: null,
      recentLatencies: [],
      recentResults: [],
    };
  }
  return metrics[provider];
}

export function recordSuccess(provider: string, latencyMs: number): void {
  const m = ensureProvider(provider);
  m.totalRequests++;
  m.successes++;
  m.totalLatencyMs += latencyMs;
  m.lastSuccess = Date.now();

  m.recentLatencies.push(latencyMs);
  if (m.recentLatencies.length > MAX_RECENT_LATENCIES) {
    m.recentLatencies.shift();
  }

  m.recentResults.push(true);
  if (m.recentResults.length > MAX_RECENT_RESULTS) {
    m.recentResults.shift();
  }
}

export function recordFailure(provider: string): void {
  const m = ensureProvider(provider);
  m.totalRequests++;
  m.failures++;
  m.lastFailure = Date.now();

  m.recentResults.push(false);
  if (m.recentResults.length > MAX_RECENT_RESULTS) {
    m.recentResults.shift();
  }
}

function calcP95(latencies: number[]): number {
  if (latencies.length === 0) return 0;
  const sorted = [...latencies].sort((a, b) => a - b);
  const idx = Math.ceil(sorted.length * 0.95) - 1;
  return sorted[Math.max(0, idx)];
}

export function getMetrics(): Record<string, ProviderMetrics & { p95Latency: number; successRate: number }> {
  const result: Record<string, ProviderMetrics & { p95Latency: number; successRate: number }> = {};
  for (const [name, m] of Object.entries(metrics)) {
    result[name] = {
      ...m,
      p95Latency: calcP95(m.recentLatencies),
      successRate: m.totalRequests > 0 ? m.successes / m.totalRequests : 1,
    };
  }
  return result;
}

/**
 * Circuit breaker: skip this provider if >50% of last 10 requests failed,
 * unless 60s cooldown has passed since last failure (allow retry).
 */
export function shouldCircuitBreak(provider: string): boolean {
  const m = metrics[provider];
  if (!m || m.recentResults.length < 3) return false; // not enough data

  const failures = m.recentResults.filter((r) => !r).length;
  const failureRate = failures / m.recentResults.length;

  if (failureRate <= CIRCUIT_BREAK_FAILURE_RATE) return false;

  // Allow retry after cooldown
  if (m.lastFailure && Date.now() - m.lastFailure > CIRCUIT_BREAK_COOLDOWN_MS) {
    return false;
  }

  return true;
}
