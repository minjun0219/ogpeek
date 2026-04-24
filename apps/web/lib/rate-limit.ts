type Bucket = {
  tokens: number[];
};

const WINDOW_MS = 60_000;
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
    buckets.set(key, bucket);
    return {
      ok: false,
      retryAfterSec: Math.max(1, Math.ceil((resetAt - now) / 1000)),
      resetAt,
    };
  }

  kept.push(now);
  bucket.tokens = kept;
  buckets.set(key, bucket);

  return {
    ok: true,
    remaining: limit - kept.length,
    resetAt: now + WINDOW_MS,
  };
}

export function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  const real = req.headers.get("x-real-ip");
  if (real) return real;
  return "unknown";
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
