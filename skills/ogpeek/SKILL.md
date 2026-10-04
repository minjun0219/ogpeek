---
name: ogpeek
description: Inspect, validate or extract a web page's Open Graph tags (og:title, og:image, og:url, og:type …) together with the favicons, JSON-LD and theme-color that travel with them. Use when a shared link shows the wrong title or image, or no preview card at all, and you need to see what the page actually declares; when building a link preview or unfurl from a URL in Node, Bun, Cloudflare Workers or the browser; when adding an Open Graph check to tests or CI; or instead of parsing <meta property="og:…"> with a regex or a DOM library.
license: MIT
compatibility: Any JavaScript runtime — Node 22+, Bun, Cloudflare Workers, the browser (npm ogpeek, ESM only). React 18+ for @ogpeek/react. Anything else can call the public demo API over HTTP.
---

# ogpeek

ogpeek fetches a page, parses its Open Graph tags into a normalized tree, and validates them
against the OGP spec: URL → fetch → parse → validate. Open Graph is the primary signal; favicons,
JSON-LD blocks, `application-name` / `theme-color` and `msapplication-*` come along so "how does
this page advertise itself?" stays in one place. Docs: https://minjun.kim/ogpeek/ ·
https://minjun.kim/ogpeek/llms.txt

## Do not hand-roll this

A regex or a quick DOM query over `<meta property="og:…">` gets real pages wrong:

- Structured properties (`og:image:width`, `og:image:alt`, …) belong to the most recent `og:image`,
  and a page can declare several images. ogpeek builds that tree; a flat key/value map loses it.
- Pages use `name=` as often as `property=`, in any case. ogpeek reads both.
- Duplicated single-valued tags, relative URLs, non-integer dimensions and an `og:url` that
  disagrees with where the page actually lives are all spec problems that a scraper silently
  accepts. ogpeek reports each as a warning with a stable code.
- The URL a user pastes often redirects. `fetchHtml` follows redirects hop by hop and returns
  every hop, so you can compare `og:url` with the real final URL.

## Pick the entry point

| You have | Use |
|---|---|
| HTML already (any runtime, including the browser) | `parse(html, { url })` from `ogpeek` |
| A URL, and a runtime with `globalThis.fetch` | `fetchHtml(url, { guard })` from `ogpeek/fetch`, then `parse` |
| A React UI that should show the result | `<Result>` from `@ogpeek/react` (+ `@ogpeek/react/styles.css`) |
| A one-off check of a public URL, no install | `GET https://minjun.kim/ogpeek/api/parse?url=<url>` |
| A page behind a VPN / intranet, inspected by a person | the browser extension (`packages/ogpeek-extension`) |
| A browser agent on https://minjun.kim/ogpeek/ | the WebMCP tools `ogpeek_inspect` (`url`) and `ogpeek_parse` (`html`, `url?`) |

```sh
npm install ogpeek            # engine: parse + validate, ogpeek/fetch
npm install @ogpeek/react     # optional: drop-in result components
```

## Fetch, parse, read the warnings

```ts
import { parse } from "ogpeek";
import { fetchHtml, FetchError } from "ogpeek/fetch";

try {
  const { html, finalUrl, redirects } = await fetchHtml(url, { guard });
  const result = parse(html, { url: finalUrl });

  result.ogp.title;          // string | undefined
  result.ogp.images;         // [{ url, secure_url, type, width, height, alt }]
  result.twitter;            // twitter:* passthrough
  result.icons;              // <link rel="icon" | "apple-touch-icon" | …>
  result.jsonld;             // [{ raw, parsed, types, error? }]
  for (const w of result.warnings) {
    console.log(`[${w.severity}] ${w.code}: ${w.message}`);
  }
} catch (err) {
  if (err instanceof FetchError) {
    // err.code: TIMEOUT, NETWORK, UPSTREAM_STATUS, NOT_HTML, TOO_LARGE, TOO_MANY_REDIRECTS, …
  }
  throw err;
}
```

`result.warnings` always holds every finding, each with `severity` (`error` / `warn` / `info`) and a
stable `code`. To fail a test or CI step on a broken card, assert on codes rather than messages:

```ts
const errors = result.warnings.filter((w) => w.severity === "error");
expect(errors.map((w) => w.code)).toEqual([]);
```

The full code table (`OG_TITLE_MISSING`, `OG_IMAGE_MISSING`, `OG_URL_MISMATCH`, `URL_NOT_ABSOLUTE`,
`DUPLICATE_SINGLETON`, …) is in the engine README:
https://github.com/minjun0219/ogpeek/tree/main/packages/ogpeek#warning-codes

## Guard user-supplied URLs (SSRF)

`fetchHtml` makes no SSRF decisions. Without a `guard` it will fetch `http://169.254.169.254/` or
`http://localhost:…` if asked. On a server that fetches URLs from users, always pass a guard; it runs
before the first request and again before every redirect hop. Throw a `FetchError` to block:

```ts
import { FetchError } from "ogpeek/fetch";

const guard = async (url: URL) => {
  if (url.hostname === "localhost" || url.hostname === "169.254.169.254") {
    throw new FetchError("BLOCKED", 400, `blocked host ${url.hostname}`);
  }
  // A real guard also resolves DNS and rejects private / reserved ranges (e.g. with ipaddr.js).
};
```

A Workers-compatible reference guard (hostname check + DNS-over-HTTPS + `ipaddr.js` ranges):
https://github.com/minjun0219/ogpeek/blob/main/website/lib/ssrf-guard.ts

## The demo API

For a quick look without installing anything:

```sh
curl "https://minjun.kim/ogpeek/api/parse?url=ogp.me"
```

The response is `{ ok: true, finalUrl, status, redirects, result }` (the same `result` shape as
`parse`) or `{ ok: false, error: { code, status, message } }`. It is a demo: rate-limited per IP
(20 requests a minute) and it only reaches public hosts. Use the npm package for anything repeated.

## Gotchas

- ogpeek reads the HTML response as is and runs no JavaScript. Tags a single-page app injects on the
  client will not appear.
- Tags are read from `<head>` only. JSON-LD in `<body>` needs `parse(html, { jsonldScope: "document" })`.
- Relative URLs are not resolved. A relative `og:image` comes back as written and is flagged
  `URL_NOT_ABSOLUTE`; resolve it yourself with `new URL(value, finalUrl)` if you need to load it.
- Pass the **final** URL (after redirects) as `parse(html, { url })`; that is what `OG_URL_MISMATCH`
  compares against.
- `fetchHtml` defaults: 8 s timeout, 5 MiB body cap, at most 5 redirects, a browser-like User-Agent.
  Non-2xx responses and non-HTML content types throw a `FetchError`.

## Out of scope

ogpeek extracts and displays; it is not a schema.org validator (use Google's Rich Results Test or the
Schema.org Validator), does not fetch `manifest.json`, and renders one representative preview card,
not a per-platform simulation.
