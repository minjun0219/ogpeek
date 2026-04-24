import { NextResponse } from "next/server";
import { runParse } from "@/lib/server-parse";
import { clientIp, isPublicMode, rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
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

type RequestInput = {
  target: string | null;
  includeHtml: boolean;
};

async function readRequest(req: Request): Promise<RequestInput> {
  if (req.method === "GET") {
    const u = new URL(req.url);
    return {
      target: u.searchParams.get("url"),
      includeHtml: u.searchParams.get("includeHtml") === "1",
    };
  }
  try {
    const body = (await req.json()) as { url?: unknown; includeHtml?: unknown };
    return {
      target: typeof body.url === "string" ? body.url : null,
      includeHtml: body.includeHtml === true || body.includeHtml === "1",
    };
  } catch {
    return { target: null, includeHtml: false };
  }
}

// In public mode the raw HTML body is suppressed unconditionally so the
// endpoint can't be abused as a general-purpose HTML proxy — no opt-in flag
// overrides this. Operators who need the raw body run in internal mode.
function shouldIncludeHtml(requestedInclude: boolean): boolean {
  if (isPublicMode()) return false;
  return requestedInclude;
}

async function handle(req: Request): Promise<Response> {
  const { target, includeHtml: requestedInclude } = await readRequest(req);
  if (!target) {
    return NextResponse.json(
      { ok: false, error: { code: "MISSING_URL", message: "url parameter is required" } },
      { status: 400 },
    );
  }

  const includeHtml = shouldIncludeHtml(requestedInclude);

  if (isPublicMode()) {
    const decision = rateLimit(clientIp(req));
    if (!decision.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "RATE_LIMITED",
            message: `too many requests, retry in ${decision.retryAfterSec}s`,
          },
        },
        { status: 429, headers: rateLimitHeaders(decision) },
      );
    }
    const outcome = await runParse(target, { includeHtml });
    return NextResponse.json(outcome, {
      status: outcome.ok ? 200 : outcome.error.status,
      headers: rateLimitHeaders(decision),
    });
  }

  const outcome = await runParse(target, { includeHtml });
  return NextResponse.json(outcome, {
    status: outcome.ok ? 200 : outcome.error.status,
  });
}

export async function GET(req: Request): Promise<Response> {
  return handle(req);
}

export async function POST(req: Request): Promise<Response> {
  return handle(req);
}
