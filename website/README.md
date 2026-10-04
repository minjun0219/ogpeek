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
keeps the `nodejs_compat` flag enabled and mounts the site at
`minjun.kim/ogpeek/` (Next `basePath`) through zone routes. `worker.ts` wraps
the OpenNext output: it 301s the former hosts (`ogpeek.minjun.dev`,
`ogpeek.dev`) to `minjun.kim/ogpeek/` and gives the app root its trailing
slash.

**Pushing to `main` is the deploy** — Workers Builds builds every `main`
commit from a fresh clone. The commands below are for local verification;
`cf:deploy` is a bootstrap / emergency path only.

```bash
pnpm -F website cf:build    # OpenNext build → .open-next/worker.js
pnpm -F website cf:preview  # local wrangler preview
pnpm -F website cf:deploy   # manual deploy (bootstrap/emergency, needs wrangler login)
```

`NEXT_PUBLIC_POSTHOG_KEY` / `NEXT_PUBLIC_POSTHOG_HOST` are inlined at build time (`NEXT_PUBLIC_*`) and set only on production: they live in the Workers Builds
production trigger's build variables (not a Worker secret, not a repo file).
Without the key the app skips PostHog init. `cf:build` refuses to run without
it only on the production build (`WORKERS_CI_BRANCH=main`); set
`OGPEEK_ALLOW_NO_ANALYTICS=1` to ship without analytics on purpose.

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
| `OGPEEK_USER_AGENT` | browser-like UA | User-Agent used when fetching upstream pages |
| `OGPEEK_RATE_LIMIT_PER_MIN` | `20` | per-IP requests per minute. Zero or below means unlimited |
