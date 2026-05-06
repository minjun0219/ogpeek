import { FetchError } from "ogpeek/fetch";
import { browser } from "../lib/browser.js";
import { fetchHtmlBrowser } from "../lib/fetch-html.js";
import { type FetchResponse, isFetchRequest } from "../lib/messaging.js";

// Background fetch runs on the browser's own network stack with the
// extension's host_permissions, so cross-origin CORS does not apply.
// We use a browser-friendly fetcher (see lib/fetch-html.ts) instead of
// the engine's `fetchHtml`: browser `fetch` with `redirect: "manual"`
// returns an opaque-redirect response that breaks the engine's manual
// hop loop. The per-hop redirect trace is dropped here as a result;
// the popup still gets `finalUrl`, `status`, and `html` for parsing.
browser.runtime.onMessage.addListener(async (raw: unknown) => {
  if (!isFetchRequest(raw)) {
    return undefined;
  }
  try {
    const result = await fetchHtmlBrowser(raw.url);
    const response: FetchResponse = { ok: true, result };
    return response;
  } catch (err) {
    if (err instanceof FetchError) {
      const response: FetchResponse = {
        ok: false,
        code: err.code,
        status: err.status,
        message: err.message,
      };
      return response;
    }
    const message = err instanceof Error ? err.message : String(err);
    const response: FetchResponse = {
      ok: false,
      code: "UNKNOWN",
      status: 500,
      message,
    };
    return response;
  }
});
