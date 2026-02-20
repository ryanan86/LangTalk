export type PerfTimings = Record<string, number>;

export function nowMs(): number {
  return typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now();
}

export function since(start: number): number {
  return Math.round(nowMs() - start);
}

export function makeRid(prefix = 'r'): string {
  return `${prefix}_${Math.random().toString(16).slice(2, 10)}${Date.now().toString(16).slice(-4)}`;
}

export async function withTimeoutAbort<T>(
  fn: (signal: AbortSignal) => Promise<T>,
  ms: number,
  label: string,
  timings?: PerfTimings
): Promise<T> {
  const start = nowMs();
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(new Error(`${label} timeout after ${ms}ms`)), ms);
  try {
    const out = await fn(ac.signal);
    if (timings) timings[`${label}.ms`] = since(start);
    return out;
  } finally {
    clearTimeout(t);
  }
}
