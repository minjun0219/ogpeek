import { FetchError, fetchHtml } from "ogpeek/fetch";
import { browser } from "../lib/browser.js";
import { type FetchResponse, isFetchRequest } from "../lib/messaging.js";

// Background fetch runs on the browser's own network stack with the
// extension's host_permissions, so cross-origin CORS does not apply. The
// engine's `redirect: "manual"` per-hop loop runs unchanged here.
//
// SSRF guard intentionally unset (AGENTS.md principle 3): the extension
// runs in a single user's local context, not on shared infrastructure, so
// guarding outbound traffic is the user's network layer's job, not the
// engine's.
browser.runtime.onMessage.addListener(async (raw: unknown) => {
  if (!isFetchRequest(raw)) {
    return undefined;
  }
  try {
    const result = await fetchHtml(raw.url);
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
