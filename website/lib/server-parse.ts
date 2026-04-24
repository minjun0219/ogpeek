import { parse, type OgDebugResult } from "ogpeek";
import { FetchError, fetchHtml } from "ogpeek/fetch";

export type ServerParseSuccess = {
  ok: true;
  target: string;
  finalUrl: string;
  status: number;
  fetchedAt: string;
  result: OgDebugResult;
  // Raw HTML is opt-in: callers must pass { includeHtml: true } to avoid
  // turning public responses into an unbounded HTML proxy.
  html?: string;
};

export type ServerParseFailure = {
  ok: false;
  target: string;
  error: {
    code: string;
    status: number;
    message: string;
  };
};

export type ServerParseOutcome = ServerParseSuccess | ServerParseFailure;

export type RunParseOptions = {
  includeHtml?: boolean;
};

export async function runParse(
  rawUrl: string,
  opts: RunParseOptions = {},
): Promise<ServerParseOutcome> {
  const target = rawUrl.trim();
  const allowPrivateNetwork = process.env.OGPEEK_ALLOW_PRIVATE_NETWORK === "1";
  // When OGPEEK_USER_AGENT is unset we fall back to the engine's own
  // browser-like default — single source of truth lives in ogpeek/fetch.
  const userAgent = process.env.OGPEEK_USER_AGENT;

  try {
    const fetched = await fetchHtml(target, {
      ...(userAgent ? { userAgent } : {}),
      allowPrivateNetwork,
    });
    const result = parse(fetched.html, { url: fetched.finalUrl });

    const outcome: ServerParseSuccess = {
      ok: true,
      target,
      finalUrl: fetched.finalUrl,
      status: fetched.status,
      fetchedAt: new Date().toISOString(),
      result,
    };
    if (opts.includeHtml) outcome.html = fetched.html;
    return outcome;
  } catch (err) {
    if (err instanceof FetchError) {
      return {
        ok: false,
        target,
        error: { code: err.code, status: err.status, message: err.message },
      };
    }
    const message = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      target,
      error: { code: "UNKNOWN", status: 500, message },
    };
  }
}
