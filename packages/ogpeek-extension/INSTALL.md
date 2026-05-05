# Installing the ogpeek Chrome extension

> 한국어 가이드: [INSTALL.ko.md](./INSTALL.ko.md)

The ogpeek extension inspects a page's Open Graph tags from inside your
own browser, so it can reach intranet / VPN hosts that the public demo on
Cloudflare Workers cannot.

## 1. Download the build

Pre-merge testing happens through CI artifacts.

1. Open the most recent **successful** CI run on the
   [Actions tab for this branch](https://github.com/minjun0219/ogpeek/actions?query=branch%3Aclaude%2Fdesktop-app-alternatives-V2coN).
2. Scroll to the **Artifacts** section and click `ogpeek-chrome-<sha>` to
   download the zip.
3. Unzip it into a directory of your choice. Do **not** load the zip
   itself — Chrome needs the unpacked folder.

> Artifacts expire after 30 days. Once this PR merges we'll cut a real
> prerelease/release attaching the same zip.

## 2. Load it unpacked into Chrome

1. Visit `chrome://extensions`.
2. Toggle **Developer mode** on (top-right).
3. Click **Load unpacked** (top-left).
4. Pick the folder you unzipped in step 1 — the one that contains
   `manifest.json` directly.

The browser adds an ogpeek action to the toolbar. v1 ships without
custom icons, so it appears as the default puzzle glyph; pin it from the
extensions menu if you'll use it often.

## 3. Use it

1. On any page, click the ogpeek icon in the toolbar.
2. The URL field is pre-filled with the active tab's URL — click
   **검사** to run.
3. The popup renders validation results, the redirect flow, the meta-tag
   table, and the OG card preview.

You can also paste a different absolute URL (`https://example.com`).
Schemes other than `http` / `https` are rejected.

## Troubleshooting

- **"Manifest file is missing or unreadable."** — Make sure the folder
  you select has `manifest.json` directly inside it. Selecting one level
  too deep produces this error.
- **Empty popup or no result** — From `chrome://extensions`, click the
  ogpeek card's **service worker** link to open its DevTools and check
  for errors. A corporate proxy or firewall may be blocking the outbound
  request.
- **Internal hosts don't resolve** — Confirm your VPN is connected. The
  extension goes through your OS network stack, so the host has to be
  reachable from your machine in the first place.
- **`TIMEOUT` / `NETWORK` error codes** — The response didn't arrive in
  8 seconds, or the network call itself failed. If it doesn't reproduce
  on a different URL, it's usually a transient network blip.

## Removing it

`chrome://extensions` → click **Remove** on the ogpeek card.

## Permissions this extension requests

Declared in `manifest/chrome.json`:

- `activeTab` — used only to read the current tab's URL when you open
  the popup, so it can be pre-filled.
- `host_permissions: <all_urls>` — the background service worker uses
  this to issue HTTP requests to arbitrary hosts. This is the key
  permission that lets the extension bypass page-level CORS and reach
  intranet hosts. Requests fire only when you click the **검사** button;
  the extension does not silently scrape pages in the background.
