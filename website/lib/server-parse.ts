import { parse, type OgDebugResult } from "ogpeek";
import { FetchError, fetchHtml } from "ogpeek/fetch";

export type ServerParseSuccess = {
  ok: true;
  target: string;
  finalUrl: string;
  status: number;
  fetchedAt: string;
  result: OgDebugResult;
  html: string;
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

// Browser-like UA so corporate sites and CDNs (Cloudflare, Akamai) don't 403
// an obvious bot identifier. Operators can override via OGPEEK_USER_AGENT.
const DEFAULT_USER_AGENT =
  "Mozilla/5.0 (compatible; ogpeek/0.2; +https://github.com/) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";

export async function runParse(rawUrl: string): Promise<ServerParseOutcome> {
  const target = rawUrl.trim();
  const allowPrivateNetwork = process.env.OGPEEK_ALLOW_PRIVATE_NETWORK === "1";

  try {
    const fetched = await fetchHtml(target, {
      userAgent: process.env.OGPEEK_USER_AGENT ?? DEFAULT_USER_AGENT,
      allowPrivateNetwork,
    });
    const result = parse(fetched.html, { url: fetched.finalUrl });

    return {
      ok: true,
      target,
      finalUrl: fetched.finalUrl,
      status: fetched.status,
      fetchedAt: new Date().toISOString(),
      result,
      html: fetched.html,
    };
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
