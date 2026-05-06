// Single import surface for the WebExtensions API. Use `browser.*`
// everywhere — the polyfill maps Chrome's callback-based runtime onto the
// promise-based `browser` namespace from Firefox/Safari, so the same code
// runs on every target without per-browser branches.
import browser from "webextension-polyfill";

export { browser };
