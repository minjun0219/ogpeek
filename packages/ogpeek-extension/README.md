# ogpeek-extension

> 한국어: [README.ko.md](./README.ko.md)

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

## Install (testers, Chrome)

Pre-merge testing happens through CI artifacts.

1. Open the latest **successful** CI run on the
   [Actions tab](https://github.com/minjun0219/ogpeek/actions/workflows/ci.yml?query=branch%3Amain+is%3Asuccess).
2. Scroll to the **Artifacts** section and click `ogpeek-chrome-<sha>` to
   download the zip.
3. Unzip it into a directory of your choice. Don't load the zip itself —
   Chrome needs the unpacked folder.
4. Visit `chrome://extensions`, toggle **Developer mode** on, click **Load
   unpacked**, and pick the folder you just unzipped (the one that
   contains `manifest.json` directly).

To use it:

- **Active tab**: click the ogpeek action — the popup grabs the live
  DOM via `chrome.scripting.executeScript` (no second HTTP request,
  matches your current auth state) and renders the result inline.
- **Different URL**: edit the input and press **검사** — that path goes
  through the background service worker's `fetch()`.
- **More room**: click **전체 화면으로 열기** in the popup header to
  open a tab-sized version (`app.html?url=…`). The full page is
  shareable / bookmarkable; refreshing keeps the same inspection.

Artifacts expire after 30 days. A real prerelease/release with the same
zip will be cut once this PR merges.

### Troubleshooting

- **"Manifest file is missing or unreadable."** — Make sure
  `manifest.json` is directly inside the folder you selected. One level
  too deep produces this error.
- **Empty popup or no result** — From `chrome://extensions`, click the
  ogpeek card's **service worker** link to open its DevTools and check
  for errors. A corporate proxy / firewall may be blocking the outbound
  request.
- **Internal hosts don't resolve** — Confirm your VPN is connected. The
  extension uses your OS network stack, so the host has to be reachable
  from your machine in the first place.
- **`TIMEOUT` / `NETWORK` codes** — The response didn't arrive in 8 s, or
  the network call itself failed. If a different URL works, it's
  usually transient.

### Permissions

Declared in `manifest/chrome.json`:

- `activeTab` — granted when you click the toolbar action, so the popup
  can read the current tab's URL and run a one-shot script to extract
  its live DOM.
- `scripting` — required by `chrome.scripting.executeScript`, which is
  how the popup pulls the active tab's HTML without re-fetching it.
- `host_permissions: <all_urls>` — the background service worker uses
  this to issue HTTP requests to arbitrary hosts when you inspect a
  URL that isn't the current tab. It's the key permission that lets
  the extension reach intranet pages. Outbound requests fire only when
  you click **검사** with a non-active-tab URL; the extension does not
  silently scrape pages in the background.

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

## Build (developers)

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

## Distribution

No web store. Ship the zip via GitHub Releases and load unpacked, or push
through Chrome enterprise policy (`ExtensionInstallForcelist` with a
self-hosted update manifest) for managed environments. The crx packaging
pipeline is intentionally out of scope for v1.

## Icons

The repo-wide brand master sits at `assets/logo.png` (1024×1024) at
the monorepo root. The script `scripts/render-icons.mjs` resamples it
into `public/icons/{16,32,48,128}.png` using sharp's `trim` to strip
whitespace, then pads ~8% safe-zone before resizing — re-run it
(`node scripts/render-icons.mjs`) whenever the master changes.
Manifests reference the four size-named PNGs; the rendered files are
the only icons that ship in the bundle.
