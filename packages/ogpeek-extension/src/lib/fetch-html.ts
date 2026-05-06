import { FetchError, type FetchResult } from "ogpeek/fetch";

const DEFAULT_TIMEOUT_MS = 8000;
const DEFAULT_MAX_BYTES = 5 * 1024 * 1024;

// Browser-friendly fetcher for the extension.
//
// We can't reuse the engine's `fetchHtml` directly here: that fetcher
// drives a manual redirect loop with `redirect: "manual"` so the
// caller's SSRF guard runs on every hop. Browser fetch with
// `redirect: "manual"` returns an opaque-redirect response (status 0,
// no headers, no body), which makes the engine's loop bail out with a
// confusing `UPSTREAM_STATUS 502 "upstream responded 0"`.
//
// In a browser extension SSRF doesn't apply (single-user local
// context), so we let the browser follow redirects natively
// (`redirect: "follow"`) and read the final response. We lose the
// per-hop trace for now — capturing it would require the
// `webRequest` permission, which is intentionally out of scope for
// v1. `finalUrl` is taken from `Response.url`, which already reflects
// the post-redirect URL.
//
// Timeout, body-size cap, and content-type filtering match the
// engine's defaults so the popup's error UI stays consistent.
export async function fetchHtmlBrowser(
  rawUrl: string,
  opts: { timeoutMs?: number; maxBytes?: number } = {},
): Promise<FetchResult> {
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxBytes = opts.maxBytes ?? DEFAULT_MAX_BYTES;

  let target: URL;
  try {
    target = new URL(rawUrl);
  } catch {
    throw new FetchError("INVALID_URL", 400, "url is malformed");
  }
  if (target.protocol !== "http:" && target.protocol !== "https:") {
    throw new FetchError(
      "UNSUPPORTED_SCHEME",
      400,
      "only http and https urls are supported",
    );
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let res: Response;
  try {
    res = await fetch(target.toString(), {
      headers: { accept: "text/html,application/xhtml+xml" },
      redirect: "follow",
      signal: controller.signal,
      credentials: "omit",
    });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new FetchError(
        "TIMEOUT",
        504,
        `upstream did not respond within ${timeoutMs}ms`,
      );
    }
    const message = err instanceof Error ? err.message : String(err);
    throw new FetchError("NETWORK", 502, `upstream network error: ${message}`);
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    throw new FetchError(
      "UPSTREAM_STATUS",
      502,
      `upstream responded ${res.status}`,
    );
  }

  const contentType = res.headers.get("content-type") ?? "";
  if (!/\b(?:text\/html|application\/xhtml\+xml)\b/i.test(contentType)) {
    throw new FetchError(
      "NOT_HTML",
      415,
      `upstream content-type "${contentType}" is not html`,
    );
  }

  const reader = res.body?.getReader();
  if (!reader) {
    throw new FetchError("EMPTY_BODY", 502, "upstream body missing");
  }

  const decoder = new TextDecoder("utf-8");
  let received = 0;
  let buf = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      received += value.byteLength;
      if (received > maxBytes) {
        await reader.cancel();
        throw new FetchError(
          "TOO_LARGE",
          413,
          `upstream exceeded ${maxBytes} bytes`,
        );
      }
      buf += decoder.decode(value, { stream: true });
    }
  } catch (err) {
    if (err instanceof FetchError) {
      throw err;
    }
    const message = err instanceof Error ? err.message : String(err);
    throw new FetchError(
      "READ_ERROR",
      502,
      `failed reading upstream body: ${message}`,
    );
  }
  buf += decoder.decode();

  return {
    html: buf,
    finalUrl: res.url || target.toString(),
    status: res.status,
    redirects: [],
  };
}
