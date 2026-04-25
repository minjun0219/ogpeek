import { NextResponse } from "next/server";
import { runParse } from "@/lib/server-parse";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

function rateLimitHeaders(
  decision: ReturnType<typeof rateLimit>,
): Record<string, string> {
  const headers: Record<string, string> = {};
  if (decision.ok) {
    headers["x-ratelimit-remaining"] = String(decision.remaining);
  } else {
    headers["retry-after"] = String(decision.retryAfterSec);
  }
  headers["x-ratelimit-reset"] = String(Math.floor(decision.resetAt / 1000));
  return headers;
}

async function readTarget(req: Request): Promise<string | null> {
  if (req.method === "GET") {
    return new URL(req.url).searchParams.get("url");
  }
  try {
    const body = (await req.json()) as { url?: unknown };
    return typeof body.url === "string" ? body.url : null;
  } catch {
    return null;
  }
}

async function handle(req: Request): Promise<Response> {
  const target = await readTarget(req);
  if (!target) {
    return NextResponse.json(
      {
        ok: false,
        error: { code: "MISSING_URL", status: 400, message: "url parameter is required" },
      },
      { status: 400 },
    );
  }

  const decision = rateLimit(clientIp(req));
  if (!decision.ok) {
    return NextResponse.json(
      {
        ok: false,
        target,
        error: {
          code: "RATE_LIMITED",
          status: 429,
          message: `too many requests, retry in ${decision.retryAfterSec}s`,
        },
      },
      { status: 429, headers: rateLimitHeaders(decision) },
    );
  }

  const outcome = await runParse(target);
  return NextResponse.json(outcome, {
    status: outcome.ok ? 200 : outcome.error.status,
    headers: rateLimitHeaders(decision),
  });
}

export async function GET(req: Request): Promise<Response> {
  return handle(req);
}

export async function POST(req: Request): Promise<Response> {
  return handle(req);
}
