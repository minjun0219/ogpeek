type Bucket = {
  tokens: number[];
};

const WINDOW_MS = 60_000;
// Cap the number of tracked IP buckets so a long-running public deployment
// can't have its memory exhausted by a stream of unique client addresses.
// When full, the oldest key (by insertion order) is evicted — Map iteration
// order is insertion order in JS.
const MAX_BUCKETS = 10_000;

const buckets = new Map<string, Bucket>();

export type RateLimitDecision =
  | { ok: true; remaining: number; resetAt: number }
  | { ok: false; retryAfterSec: number; resetAt: number };

export function rateLimit(key: string): RateLimitDecision {
  const limit = readLimit();
  if (limit <= 0) {
    return { ok: true, remaining: Number.POSITIVE_INFINITY, resetAt: Date.now() };
  }

  const now = Date.now();
  const cutoff = now - WINDOW_MS;
  const bucket = buckets.get(key) ?? { tokens: [] };
  const kept = bucket.tokens.filter((t) => t > cutoff);

  if (kept.length >= limit) {
    const resetAt = (kept[0] ?? now) + WINDOW_MS;
    bucket.tokens = kept;
    touch(key, bucket);
    return {
      ok: false,
      retryAfterSec: Math.max(1, Math.ceil((resetAt - now) / 1000)),
      resetAt,
    };
  }

  kept.push(now);
  bucket.tokens = kept;
  touch(key, bucket);

  return {
    ok: true,
    remaining: limit - kept.length,
    resetAt: now + WINDOW_MS,
  };
}

function touch(key: string, bucket: Bucket): void {
  // Re-insert so this key moves to the tail (most-recently-used).
  if (buckets.has(key)) buckets.delete(key);
  buckets.set(key, bucket);

  // Opportunistic eviction: drop expired buckets (empty or all tokens past
  // the window) before resorting to LRU trim.
  if (buckets.size > MAX_BUCKETS) {
    const cutoff = Date.now() - WINDOW_MS;
    for (const [k, b] of buckets) {
      if (b.tokens.length === 0 || b.tokens[b.tokens.length - 1]! <= cutoff) {
        buckets.delete(k);
        if (buckets.size <= MAX_BUCKETS) return;
      }
    }
  }

  // Final safeguard: evict oldest entries until under cap.
  while (buckets.size > MAX_BUCKETS) {
    const oldest = buckets.keys().next().value;
    if (oldest === undefined) break;
    buckets.delete(oldest);
  }
}

export function clientIpFromHeaders(h: Headers): string {
  const xff = h.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  const real = h.get("x-real-ip");
  if (real) return real;
  return "unknown";
}

export function clientIp(req: Request): string {
  return clientIpFromHeaders(req.headers);
}

export function isPublicMode(): boolean {
  return (process.env.NEXT_PUBLIC_MODE ?? "public") === "public";
}

function readLimit(): number {
  const raw = process.env.OGPEEK_RATE_LIMIT_PER_MIN;
  if (!raw) return 20;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n)) return 20;
  return n;
}
