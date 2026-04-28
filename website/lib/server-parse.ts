import { type OgDebugResult, parse } from "ogpeek";
import { FetchError, fetchHtml, type RedirectHop } from "ogpeek/fetch";
import { ssrfGuard } from "./ssrf-guard";
import { normalizeUrlInput } from "./url-normalize";

export type ServerParseSuccess = {
  ok: true;
  target: string;
  finalUrl: string;
  status: number;
  redirects: RedirectHop[];
  fetchedAt: string;
  result: OgDebugResult;
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

export async function runParse(rawUrl: string): Promise<ServerParseOutcome> {
  const target = rawUrl.trim();
  const normalized = normalizeUrlInput(target);
  // When OGPEEK_USER_AGENT is unset we fall back to the engine's own
  // browser-like default — single source of truth lives in ogpeek/fetch.
  const userAgent = process.env.OGPEEK_USER_AGENT;

  try {
    const fetched = await fetchHtml(normalized, {
      ...(userAgent
        ? {
            userAgent,
          }
        : {}),
      guard: ssrfGuard,
    });
    const result = parse(fetched.html, {
      url: fetched.finalUrl,
    });

    return {
      ok: true,
      target,
      finalUrl: fetched.finalUrl,
      status: fetched.status,
      redirects: fetched.redirects,
      fetchedAt: new Date().toISOString(),
      result,
    };
  } catch (err) {
    if (err instanceof FetchError) {
      return {
        ok: false,
        target,
        error: {
          code: err.code,
          status: err.status,
          message: err.message,
        },
      };
    }
    const message = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      target,
      error: {
        code: "UNKNOWN",
        status: 500,
        message,
      },
    };
  }
}
