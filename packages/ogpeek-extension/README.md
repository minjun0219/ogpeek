# ogpeek-extension

> Korean install guide for testers: [INSTALL.ko.md](./INSTALL.ko.md)

Cross-browser MV3 extension that runs the ogpeek engine inside the user's
own browser. Built so the same source compiles for Chrome, Firefox, and
Safari; the v1 build pipeline only ships **Chrome** — the other manifests
are scaffolded for follow-up work.

## Why an extension

The demo site (`website/`) runs the OG fetcher on Cloudflare Workers, which
cannot reach hosts behind a corporate VPN or a private k8s ingress. A
browser extension's background service worker can `fetch()` arbitrary URLs
through the browser's own network stack with `host_permissions`, bypassing
page-level CORS — the request leaves the user's machine, not a server. That
is what we need to inspect intranet pages.

## Layout

```
packages/ogpeek-extension/
├── manifest/
│   ├── chrome.json     # MV3, background.service_worker — built in v1
│   ├── firefox.json    # MV3, background.scripts (FF SW support partial) — scaffolded
│   └── safari.json     # MV3 base; macOS Xcode wrapper required for distribution — scaffolded
├── popup.html          # popup entry (Vite multi-page input)
├── src/
│   ├── popup/          # React UI (App, styles, entry)
│   ├── background/     # Service worker that runs `fetchHtml`
│   └── lib/            # `browser` polyfill re-export, message types
├── scripts/zip.mjs     # packages dist/<browser>/ as dist/ogpeek-<browser>.zip
└── vite.config.ts      # BROWSER=<target> vite build
```

## Cross-browser approach

- All extension API access goes through `webextension-polyfill` (`browser.*`).
  Do not call `chrome.*` directly — the polyfill normalizes Chrome's
  callback shape onto the promise-based `browser` namespace, so the same
  module works on Chrome, Firefox, and Safari.
- Each browser has its own manifest under `manifest/`. The Vite build
  copies one of them into `dist/<browser>/manifest.json`. Firefox needs
  `background.scripts` instead of `service_worker`; Safari uses the same
  shape as Chrome but ships through an Xcode app wrapper (`xcrun
  safari-web-extension-converter`) — a follow-up task.
- The popup and the background entry are stable filenames
  (`popup.html`, `background.js`), so the manifest does not need build-time
  rewriting.

## Build

The build chains the workspace libraries first.

```bash
pnpm libs:build                          # ensures ogpeek + @ogpeek/react dist exists
pnpm -F ogpeek-extension build           # alias for build:chrome
pnpm -F ogpeek-extension package:chrome  # build + zip
```

Output:

- `dist/chrome/` — unpacked extension (ready for `chrome://extensions` →
  *Load unpacked*).
- `dist/ogpeek-chrome.zip` — distributable archive.

`build:firefox` and `build:safari` are wired up but disabled in CI for v1.

## Loading the unpacked build (Chrome)

1. `pnpm -F ogpeek-extension build`
2. Open `chrome://extensions`, enable Developer mode.
3. *Load unpacked* → pick `packages/ogpeek-extension/dist/chrome/`.
4. Click the toolbar action; the popup is pre-filled with the active tab's
   URL. Press *검사* to run.

## Distribution

No web store. Ship the zip via GitHub Releases and load unpacked, or push
through Chrome enterprise policy (`ExtensionInstallForcelist` with a
self-hosted update manifest) for managed environments. The crx packaging
pipeline is intentionally out of scope for v1.

## Icons

The current build does not ship custom icons; Chrome falls back to the
default puzzle-piece glyph. Adding `public/icons/{16,32,48,128}.png` and
referencing them from each manifest is a v1.1 cleanup item.

## SSRF

The engine's `guard` hook is intentionally unset here. Per `AGENTS.md`
principle 3, SSRF policy is the caller's responsibility, and an extension
runs in a single user's local context — there is no shared infrastructure
to protect, only the user's own machine. If you ever embed this code in a
shared deployment, inject a guard via `fetchHtml({ guard })`.
