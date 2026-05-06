// Tiny offscreen document used solely to detect the system's
// `prefers-color-scheme` and report it to the background service
// worker. Service workers can't call `matchMedia`, and Chrome's
// `action` manifest doesn't support `theme_icons`, so this is the
// canonical way to drive a theme-aware toolbar icon on Chrome.
//
// Firefox / Safari use `action.theme_icons` natively (see the
// per-browser manifests under manifest/), so this file is loaded only
// in the Chrome build.

import { browser } from "../lib/browser.js";

const mql = window.matchMedia("(prefers-color-scheme: dark)");

function report() {
  void browser.runtime.sendMessage({
    type: "ogpeek:theme",
    dark: mql.matches,
  });
}

report();
mql.addEventListener("change", report);
