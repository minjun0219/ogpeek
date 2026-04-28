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
    return {
      ok: true,
      remaining: Number.POSITIVE_INFINITY,
      resetAt: Date.now(),
    };
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

  // resetAt reflects when the oldest token in the sliding window expires —
  // same basis as the 429 path, so x-ratelimit-reset stays accurate whether
  // the request was allowed or blocked.
  const resetAt = (kept[0] ?? now) + WINDOW_MS;
  return {
    ok: true,
    remaining: limit - kept.length,
    resetAt,
  };
}

function touch(key: string, bucket: Bucket): void {
  // Re-insert so this key moves to the tail (most-recently-used).
  if (buckets.has(key)) {
    buckets.delete(key);
  }
  buckets.set(key, bucket);

  // Opportunistic eviction: drop expired buckets (empty or all tokens past
  // the window) before resorting to LRU trim.
  if (buckets.size > MAX_BUCKETS) {
    const cutoff = Date.now() - WINDOW_MS;
    for (const [k, b] of buckets) {
      if (b.tokens.length === 0 || b.tokens[b.tokens.length - 1]! <= cutoff) {
        buckets.delete(k);
        if (buckets.size <= MAX_BUCKETS) {
          return;
        }
      }
    }
  }

  // Final safeguard: evict oldest entries until under cap.
  while (buckets.size > MAX_BUCKETS) {
    const oldest = buckets.keys().next().value;
    if (oldest === undefined) {
      break;
    }
    buckets.delete(oldest);
  }
}

// Structural type so we accept both the standard fetch `Headers` and Next's
// ReadonlyHeaders (from next/headers), and stay decoupled from runtime-
// specific types.
export type HeaderBag = { get(name: string): string | null };

// Platform-specific "real client" headers we'll trust before falling back to
// the proxy chain. Order matters — most specific first. If none of these and
// no x-forwarded-for/x-real-ip are present, we give up and return "unknown";
// that means the limiter effectively becomes a global throttle, which is the
// safest default for a misconfigured proxy. Operators that terminate TLS
// elsewhere should ensure at least one of these is forwarded.
const TRUSTED_CLIENT_IP_HEADERS = [
  "cf-connecting-ip", // Cloudflare
  "true-client-ip", // Akamai / Cloudflare Enterprise
  "fly-client-ip", // Fly.io
  "fastly-client-ip", // Fastly
  "x-real-ip", // nginx
];

export function clientIpFromHeaders(h: HeaderBag): string {
  for (const name of TRUSTED_CLIENT_IP_HEADERS) {
    const v = h.get(name);
    if (v) {
      const trimmed = v.trim();
      if (trimmed) {
        return trimmed;
      }
    }
  }
  const xff = h.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) {
      return first;
    }
  }
  return "unknown";
}

export function clientIp(req: Request): string {
  return clientIpFromHeaders(req.headers);
}

function readLimit(): number {
  const raw = process.env.OGPEEK_RATE_LIMIT_PER_MIN;
  if (!raw) {
    return 20;
  }
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n)) {
    return 20;
  }
  return n;
}
