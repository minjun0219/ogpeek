# ogpeek — website (demo)

> Korean: [README.ko.md](./README.ko.md)

The **example / introductory demo site** for the `packages/ogpeek` engine.
Built on Next.js 15 (App Router) and deployed only to Cloudflare Workers.
This is not a production tool — it is a place to show how the package is
used.

## Development

```bash
pnpm -F website dev         # http://localhost:3000 (Node 24)
pnpm -F website typecheck
```

## Deployment — Cloudflare Workers only

Built and deployed via the `@opennextjs/cloudflare` adapter. `wrangler.json`
keeps the `nodejs_compat` flag enabled.

```bash
pnpm -F website cf:build    # OpenNext build → .open-next/worker.js
pnpm -F website cf:preview  # local wrangler preview
pnpm -F website cf:deploy   # actual deploy (requires wrangler login)
```

## SSRF guard

`lib/ssrf-guard.ts` runs in two stages:

1. **Hostname check** — block `localhost` / `*.localhost` / literal private
   IPs.
2. **DoH (DNS-over-HTTPS) lookup** — resolve A/AAAA via Cloudflare's
   `cloudflare-dns.com/dns-query` JSON API, then block every range where
   `ipaddr.js`'s `range()` returns anything other than `unicast`.

Because it only uses a single `fetch()` call, it runs identically on Node
and Workers — same code path, no runtime branch.

Full DNS-rebinding defence requires connect-time IP pinning (connect
directly to the IP that was validated), but Workers does not let you open
raw TCP. As the site is positioned as a demo, the shallow defence is an
intentional stopping point — for production usage, write a separate
connect-time guard on top of undici's Agent + node:dns in a self-hosted
instance.

## Environment variables

| variable | default | description |
| --- | --- | --- |
| `NEXT_PUBLIC_MODE` | `public` | `public` or `internal`. `internal` hides the landing page and lifts the rate limit |
| `OGPEEK_USER_AGENT` | browser-like UA | User-Agent used when fetching upstream pages |
| `OGPEEK_RATE_LIMIT_PER_MIN` | `20` | per-IP requests per minute in public mode. Zero or below means unlimited |
