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
  if (isFetchRequest(raw)) {
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
  }
  if (isThemeMessage(raw)) {
    void setThemeIcon(raw.dark);
    return undefined;
  }
  return undefined;
});

// Toolbar icon theming on Chrome.
//
// Chrome's `action` manifest doesn't honor `theme_icons` (Firefox /
// Safari only). To swap the toolbar icon for dark themes, we spin up a
// hidden offscreen document that runs `matchMedia(prefers-color-scheme)`
// and posts the result back here, then call `chrome.action.setIcon` to
// switch between the colored and white-silhouette PNGs. Firefox /
// Safari ignore this entirely — they pick the right icon from
// `action.theme_icons` directly.

type ThemeMessage = { type: "ogpeek:theme"; dark: boolean };

function isThemeMessage(value: unknown): value is ThemeMessage {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as { type?: unknown }).type === "ogpeek:theme" &&
    typeof (value as { dark?: unknown }).dark === "boolean"
  );
}

async function setThemeIcon(dark: boolean): Promise<void> {
  if (typeof chrome === "undefined" || !chrome.action?.setIcon) {
    return;
  }
  const path = dark
    ? { 16: "icons/16-dark.png", 32: "icons/32-dark.png" }
    : { 16: "icons/16.png", 32: "icons/32.png" };
  try {
    await chrome.action.setIcon({ path });
  } catch {
    // Non-Chromium runtimes (e.g. Firefox during dev) may reject the
    // call shape; the manifest's theme_icons covers them anyway.
  }
}

async function ensureThemeOffscreen(): Promise<void> {
  if (typeof chrome === "undefined" || !chrome.offscreen) {
    return;
  }
  try {
    if (await chrome.offscreen.hasDocument()) {
      return;
    }
    await chrome.offscreen.createDocument({
      url: chrome.runtime.getURL("offscreen.html"),
      reasons: [chrome.offscreen.Reason.MATCH_MEDIA],
      justification: "Detect prefers-color-scheme to swap the toolbar icon.",
    });
  } catch {
    // Offscreen is Chrome-only; ignore on other browsers.
  }
}

if (typeof chrome !== "undefined" && chrome.runtime?.onInstalled) {
  chrome.runtime.onInstalled.addListener(() => {
    void ensureThemeOffscreen();
  });
}
if (typeof chrome !== "undefined" && chrome.runtime?.onStartup) {
  chrome.runtime.onStartup.addListener(() => {
    void ensureThemeOffscreen();
  });
}
// Service workers can be revived by a message arriving while no event
// has fired yet (e.g. user opens the popup right after install). Make
// sure the offscreen doc exists so the next theme report can land.
void ensureThemeOffscreen();
