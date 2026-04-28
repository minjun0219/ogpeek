# ogpeek — agent notes

> Korean translation (reference only): [AGENTS.ko.md](./AGENTS.ko.md) (not consulted by agents)

ogpeek has one focused purpose: "peek into any page's Open Graph tags
right away." Open Graph stays the **primary** signal — auxiliary head
metadata that travels with OG (favicons / apple-touch-icon / mask-icon,
msapplication tiles, `application-name` / `theme-color`, JSON-LD blocks)
is exposed alongside OG so that "how does this page advertise itself
elsewhere?" debugging stays in one place. Hold to that framing — primary
OG, thin auxiliary surface — and the principles below when you work on
it.

## Layout

- `packages/ogpeek` — the parser/fetcher/validator engine. **The body of this
  repo.** **Published publicly to npm** as `ogpeek` — change it with public
  API compatibility in mind. Only one external dependency: `htmlparser2`.
- `packages/ogpeek-react` — drop-in React components that render parser
  results (`<Result>`, `<Preview>`, `<TagTable>`, `<ValidationPanel>`,
  `<RedirectFlow>`). **Published publicly to npm** as `@ogpeek/react`.
  Depends on `ogpeek` via `workspace:^` peer dep; no client-only React
  hooks, so the components are SSR-safe.
- `website` — Next.js 15 App Router + TypeScript strict + Tailwind. The
  engine's **example / introductory demo site**. It's not a production tool —
  it's a place to show how the package is used. Deployed only to Cloudflare
  Workers.
- Inside the workspace, both libraries are referenced as `workspace:*`.
  Their exports point at `dist/*.js` / `dist/*.d.ts`, so any consumer
  (the website, or `@ogpeek/react` consuming `ogpeek`) needs the upstream
  built first. The root `pnpm libs:build` script runs that build chain in
  topological order; the website's `dev` / `build` / `typecheck` /
  `cf:build` scripts each call it. If you change library source, re-run
  `pnpm libs:build` or run `tsc --watch` alongside.
- The engine exposes two entry points: the root `ogpeek` (portable
  parse/validate) and `ogpeek/fetch` (Node-friendly fetcher). Do not pull
  Node-only modules into the portable path.
- Local development targets **Node 24 LTS** (see `.nvmrc`). `engines.node`
  is `>=22.19.0`, but new code is only verified on Node 24.

## Principles

1. **The engine is pure logic.** Do not import DOM, React, or Next types.
   The single external dependency is `htmlparser2`, and Node built-ins are
   not used either — the engine does not make SSRF decisions, so there is no
   reason to depend on `node:dns` / `node:net`.
2. **No wholesale rewrites.** Bug fixes and feature additions ship as the
   smallest reasonable change. The parser is defended by unit tests. Read
   the tests first and stay within what they protect.
3. **SSRF is the caller's responsibility.** The ogpeek engine does not make
   SSRF policy decisions. It exposes a single `guard` hook that runs right
   before every request hop (the initial URL plus every redirect target) —
   `throw` a `FetchError` to block, `return` to allow. Resolver behavior and
   the definition of "private range" differ across deployment environments
   (cloud / on-prem / edge), so the guard implementation belongs to the
   caller. The website implements its own guard in `lib/ssrf-guard.ts` and
   injects it via `fetchHtml({ guard: ssrfGuard })`. SSR page visits
   (`/{lang}?url=...`) must share the same guard + rate limiter as
   `/api/parse`. Redirects must always be received with `redirect: "manual"`
   so the guard runs again on every hop.
4. **Korean UI.** All user-facing strings are Korean. Error codes and API
   response keys are English. Developer- and agent-facing material —
   comments, READMEs, `AGENTS.md`, pull request titles and descriptions —
   is in English. PR bodies end with a collapsed
   `<details><summary>Korean</summary>…</details>` block translating the
   summary. After opening a PR, follow up in chat with a short Korean
   recap.
5. **Conservative about new dependencies.** Before adding a package, check
   whether the standard library, an existing utility, or a primitive
   Tailwind style can do the job.
6. **Expose only one preview.** OG cards look largely the same across
   platforms, so a single representative preview is enough. Do not add
   per-platform variants or tag previews with social-network names — that
   dilutes the tool's single-purpose framing.
7. **Auxiliary stays thin.** The auxiliary metadata surface (icons,
   JSON-LD, `application-name` / `theme-color` / `msapplication-*`) is a
   debugging viewport, not a validator. Keep it to "extract + display +
   parse-error reporting." Deep schema.org rule checking, manifest.json
   fetching, or per-platform icon resolution are out of scope — those
   tools already exist (Google Rich Results Test, Schema.org Validator)
   and pulling them in would dilute the OG-primary framing. The
   `parse()` `jsonldScope` option exists so that callers can opt into
   `<body>` JSON-LD without making it the default cost.

## Frequently used commands

```bash
pnpm libs:build             # build both libs in topo order (ogpeek -> @ogpeek/react)
pnpm libs:typecheck         # typecheck both libs
pnpm -F ogpeek test         # engine unit tests
pnpm -F @ogpeek/react test  # React component tests
pnpm -F website typecheck   # type-check the demo site (chains libs:build)
pnpm -F website dev         # local dev server (Node 24, chains libs:build)
pnpm -F website cf:build    # OpenNext + Workers bundle (chains libs:build)
pnpm -F website cf:preview  # local wrangler preview
pnpm -F website cf:deploy   # deploy to Workers
pnpm check                  # biome format + lint check (CI runs `biome ci`)
pnpm check:fix              # biome auto-fix (format + safe lint fixes)
```

## Directory conventions

- API routes live at `website/app/api/<name>/route.ts`. We do not pin a
  runtime — `lib/ssrf-guard.ts` fetches DoH (`cloudflare-dns.com/dns-query`),
  so the same code runs identically on Node and on Workers.
- Previews live under `website/components/previews/`. Keep exactly one
  representative variant (see principle 6).
- Server-only logic lives in `website/lib/*.ts`; client components put the
  `"use client"` directive at the top of the file.
- When you add a warning code, update all four sites in lockstep:
  ① the union in `packages/ogpeek/src/types.ts`,
  ② the implementation in `validate.ts`,
  ③ a covering test in `test/validate.test.ts`,
  ④ the table in `packages/ogpeek/README.md`.
  Missing any one of the four means the PR will not be accepted.
- SSR page visits (`/{lang}?url=...`) must share the same per-IP rate
  limiter as `/api/parse`. Do not build a bypass path.

## Deployment

The demo site is deployed **only to Cloudflare Workers (via OpenNext)**.
The Docker / Vercel / self-hosted options have all been removed — the
website is the engine's introduction site, not a production tool, so a
single deployment path is enough.

### Cloudflare Workers

Builds use `@opennextjs/cloudflare`. The configuration set:

- `website/wrangler.json` — `compatibility_flags: ["nodejs_compat"]` is
  required. `compatibility_date` is `2025-09-23`.
- `website/open-next.config.ts` — OpenNext adapter configuration. In-memory
  cache by default.
- `website/package.json` — the `cf:build` / `cf:preview` / `cf:deploy`
  scripts.

### SSRF guard and runtime

`website/lib/ssrf-guard.ts` does a hostname string check plus a Cloudflare
DoH JSON API (`cloudflare-dns.com/dns-query`) lookup of A/AAAA records, then
uses `ipaddr.js`'s `range()` to block all private/reserved ranges in one
sweep. It only uses a single `fetch()` call, so it runs identically on Node
and on Workers — Node-only dependencies (`node:dns`, undici Agent) have all
been removed.

A DNS-rebinding TOCTOU window remains open (between the IP we validated and
the IP `fetch()` actually connects to). Workers does not let us open raw
TCP, so connect-time IP pinning is impossible — at the demo level we
intentionally stop at this shallow defence. This is an agreed-upon trade-off
given the site's positioning as an engine showcase rather than a production
tool.

The engine does not make SSRF policy decisions (principle 3). When you
touch the guard, edit `ssrf-guard.ts` only, and do not let SSRF logic leak
into the engine (`packages/ogpeek`).

## Out of scope

- Turborepo: still not adopted. Three workspaces with a linear build DAG
  (`ogpeek` → `@ogpeek/react` → `website`); `pnpm -r --filter 'website^...'`
  already handles topological ordering, and the publish jobs must do
  fresh builds for npm provenance attestation, so a remote-cache layer
  has limited payoff. Revisit when **(a) a 4th workspace appears**,
  **(b) a 3rd npm-published package appears** (release-please grows a
  3rd entry), **(c) `pnpm -F website dev` cold start exceeds ~15s**, or
  **(d) cross-job CI cache sharing becomes worth a remote cache**.
- TypeScript project references (`composite: true` + `tsc -b`): not
  enabled. Same trigger as Turborepo's (c) — adopt when warm-pass
  typecheck/dev start times become a real friction point.
- CLI: out of scope for v1.
- Auth / SSO: not needed for a tool of this shape.

## npm publishing

Two packages publish publicly to npm: the engine as `ogpeek`, and the
React component layer as `@ogpeek/react`. Versioning is handled by
[release-please](https://github.com/googleapis/release-please) — do **not**
hand-edit either `package.json#version`.

- `.github/workflows/release-please.yml` runs on every push to `main`. It
  reads commit messages since the last tag and opens (or updates) a
  `chore: release main` PR that bumps each affected package's version and
  updates `CHANGELOG.md`. Merging that PR creates a GitHub Release + tag
  per package and publishes to npm in the same workflow run via separate
  `publish-ogpeek` / `publish-ogpeek-react` jobs.
- `release-please-config.json` + `.release-please-manifest.json` hold the
  release-please configuration and the current version of record. The
  manifest is the source of truth for "what was last released"; release-please
  rewrites both `package.json#version` and the manifest in the release PR.
  `ogpeek-react` carries `include-component-in-tag: true` so its tags
  (`ogpeek-react-vX.Y.Z`) don't collide with `ogpeek`'s `vX.Y.Z` namespace.
- Bump levels follow [Conventional Commits](https://www.conventionalcommits.org/)
  on squash-merge titles: `fix:` → patch, `feat:` → minor, `feat!:` or a
  `BREAKING CHANGE:` footer → major. To force a specific version, add a
  `Release-As: 1.2.3` footer to a commit on `main`. There is intentionally
  no `workflow_dispatch` manual fallback — if release-please ever jams
  enough to need one, weigh the trade-offs first and add it back then.
- Authentication uses npm Trusted Publisher (OIDC), so no secrets are
  required. Both packages set `publishConfig.access: "public"` and
  `publishConfig.provenance: true`, and only the build output ships
  (`files: ["dist", "README.md", "LICENSE"]`). The `prepack` hook forces
  a build right before publish.
