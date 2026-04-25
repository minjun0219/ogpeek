# ogpeek

> peek into any page's Open Graph tags

> 한국어: [README.ko.md](./README.ko.md)

A small engine that handles parsing, fetching, and validating OpenGraph
tags in a single package. Single external dependency: `htmlparser2`. Runs
on Node 20+, Bun, Workers, and the browser.

## Install

```bash
npm install ogpeek
# or
pnpm add ogpeek
# or
yarn add ogpeek
```

## Two entry points

| entry | purpose | runtime | dependencies |
| --- | --- | --- | --- |
| `ogpeek` | `parse`, `validate`, types | Node · Bun · Workers · browser | `htmlparser2` |
| `ogpeek/fetch` | fetch a remote URL (timeout / size cap / redirect tracing) | anywhere `globalThis.fetch` exists | none (no Node built-ins) |

The root entry is pure logic, so as long as you do not import
`ogpeek/fetch` no runtime dependency comes along for the ride. The fetch
subpath also avoids Node built-ins, so it loads as-is on edge and browser
runtimes — SSRF policy decisions have been pushed out of the engine
specifically to make this possible.

## Quick start

```ts
import { parse } from "ogpeek";
import { fetchHtml } from "ogpeek/fetch";

const { html, finalUrl } = await fetchHtml("https://ogp.me");
const result = parse(html, { url: finalUrl });

console.log(result.ogp.title);
console.log(result.ogp.images);
for (const w of result.warnings) {
  console.log(`[${w.severity}] ${w.code}: ${w.message}`);
}
```

## API

### `parse(html: string, options?: ParseOptions): OgDebugResult`

- `html` — the raw HTML string.
- `options.url` — the base used to resolve relative URLs to absolute URLs.
  If omitted, the `og:url` declared in the document is used as the base.

The return shape:

```ts
type OgDebugResult = {
  ogp: OpenGraph;                  // normalized OG tree
  typed: TypedObject | null;       // article / book / profile / music.* / video.*
  twitter: Record<string, string>; // twitter:* passthrough
  raw: Array<{ property: string; content: string }>; // declaration order
  warnings: Warning[];
  meta: {
    title: string | null;
    canonical: string | null;      // <link rel="canonical">
    prefixDeclared: boolean;       // <html prefix="og: https://ogp.me/ns#">
    charset: string | null;
  };
};
```

Each structured property (`og:image:width` and friends) attaches to the
most recent parent (`og:image`). If one appears before any parent, it is
reported as an `ORPHAN_STRUCTURED_PROPERTY` warning.

### `fetchHtml(url: string, options?: FetchOptions): Promise<FetchResult>`

Fetches a remote URL and returns the HTML as a string. Timeout, response
size cap, and redirect tracing are built in. Redirects are received with
`redirect: "manual"` so `options.guard` runs again on every hop. The result
includes `redirects: { from, to, status }[]` containing every redirect hop
in occurrence order — the UI can replay the "URL entered → 302 → final"
flow exactly.

- `options.userAgent` — User-Agent for outbound requests. Default is a
  browser-like UA.
- `options.timeoutMs` — request timeout. Default 8000.
- `options.maxBytes` — response size cap. Default 5 MiB. The stream is
  cancelled when exceeded.
- `options.guard` — `(url: URL) => Promise<void> | void`. **Called right
  before the initial request and before every redirect hop.** Throw a
  `FetchError` to block, just `return` to allow. If unset, no checks are
  performed — ogpeek does not make SSRF policy decisions.
- `options.fetch` — `(url: string, init: RequestInit) => Promise<Response>`.
  A function that performs the HTTP transport for a single hop only.
  `fetchHtml` calls this for each redirect hop and reads back one response.
  Redirect tracing, timeout, maxBytes, content-type judgement, and guard
  invocation stay owned by `fetchHtml`, so this injection point is a narrow
  slot for "transport policy only" — custom dispatcher, DoH resolver, mTLS,
  etc. Default is `globalThis.fetch`.

On failure it throws a `FetchError` (fields: `code`, `status`, `message`).
The main codes: `INVALID_URL`, `UNSUPPORTED_SCHEME`, `TIMEOUT`, `NETWORK`,
`UPSTREAM_STATUS`, `NOT_HTML`, `TOO_LARGE`, `REDIRECT_LOOP`,
`TOO_MANY_REDIRECTS`, `BAD_REDIRECT`, `GUARD_FAILED` (when the guard threw
something other than a `FetchError`).

### SSRF is the caller's responsibility

The engine does not make SSRF policy decisions. The definitions of "private
range" and the behaviour of resolvers vary across cloud / on-prem / edge,
so making the library own this responsibility leads to a combinatorial
explosion. Instead a single `guard` hook lets the caller inject a guard
appropriate to its deployment environment.

```ts
import { fetchHtml, FetchError } from "ogpeek/fetch";

await fetchHtml(userInput, {
  guard(url) {
    if (url.hostname === "169.254.169.254") {
      throw new FetchError("BLOCKED_METADATA", 400, "cloud metadata blocked");
    }
  },
});
```

A real-world guard layers hostname check → DNS resolve → IP-range
classification. Use `ipaddr.js` to classify ranges; on Node, the canonical
approach is to use undici's `Agent({ connect: { lookup } })` to connect
directly to the validated IP, which also defends against DNS rebinding.
Edge runtimes (Cloudflare Workers and friends) do not let you open raw
TCP, so the practical ceiling there is DoH (`cloudflare-dns.com/dns-query`)
plus a hostname check. For the full threat model and reference
implementations, see the [OWASP SSRF Prevention Cheat
Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html).
This repo's `website/lib/ssrf-guard.ts` is a concrete example of a
Workers-compatible DoH guard.

## Warning codes

| code | severity | description |
| --- | --- | --- |
| `OG_TITLE_MISSING` | error | `og:title` is missing |
| `OG_TITLE_TOO_LONG` | warn | `og:title` exceeds 60 characters — truncated by KakaoTalk |
| `OG_TYPE_MISSING` | error | `og:type` is missing |
| `OG_IMAGE_MISSING` | error | `og:image` is missing |
| `OG_URL_MISSING` | error | `og:url` is missing |
| `OG_URL_MISMATCH` | warn | `og:url` host/path disagrees with the actual request URL |
| `OG_TYPE_UNKNOWN` | warn | `og:type` value is not in the OGP-spec whitelist |
| `URL_NOT_ABSOLUTE` | warn | a URL-typed property is not absolute |
| `DUPLICATE_SINGLETON` | warn | a single-valued property is declared more than once |
| `ORPHAN_STRUCTURED_PROPERTY` | warn | a structured property appears with no parent |
| `INVALID_DIMENSION` | warn | width/height failed integer parsing |
| `MISSING_PREFIX_ATTR` | info | `<html prefix>` is not declared |

## Related projects

The web tool built on this engine: <https://github.com/minjun0219/ogpeek>

## License

MIT.
