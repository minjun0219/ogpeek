# ogpeek — agent notes

> Korean translation (reference only): [AGENTS.ko.md](./AGENTS.ko.md) (not consulted by agents)

ogpeek has exactly one purpose: "peek into any page's Open Graph tags right
away." Hold to that identity and the principles below when you work on it.

## Layout

- `packages/ogpeek` — the parser/fetcher/validator engine. **The body of this
  repo.** **Published publicly to npm** as `ogpeek` — change it with public
  API compatibility in mind. Only one external dependency: `htmlparser2`.
- `website` — Next.js 15 App Router + TypeScript strict + Tailwind. The
  engine's **example / introductory demo site**. It's not a production tool —
  it's a place to show how the package is used. Deployed only to Cloudflare
  Workers.
- Inside the workspace, `ogpeek` is referenced as `workspace:*`. Its exports
  point at `dist/*.js` / `dist/*.d.ts`, so the website scripts (`dev` /
  `typecheck` / `cf:build`) chain `pnpm --filter ogpeek run build` first. If
  you change ogpeek source, rebuild manually or run `tsc --watch` alongside.
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
   `<details><summary>Korean</summary>…</details>` block that translates
   the summary only — leave the test plan English-only. After opening a
   PR, follow up in chat with a short Korean recap.
5. **Conservative about new dependencies.** Before adding a package, check
   whether the standard library, an existing utility, or a primitive
   Tailwind style can do the job.
6. **Expose only one preview.** OG cards look largely the same across
   platforms, so a single representative preview is enough. Do not add
   per-platform variants or tag previews with social-network names — that
   dilutes the tool's single-purpose framing.

## Frequently used commands

```bash
pnpm -F ogpeek test        # engine unit tests
pnpm -F ogpeek build       # build dist/ (tsc)
pnpm -F website typecheck  # type-check the demo site (chains ogpeek build)
pnpm -F website dev        # local dev server (Node 24, chains ogpeek build)
pnpm -F website cf:build   # OpenNext + Workers bundle (chains ogpeek build)
pnpm -F website cf:preview # local wrangler preview
pnpm -F website cf:deploy  # deploy to Workers
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

- Turborepo: only two workspaces today, so we are not adopting it. Revisit
  when a third one appears.
- CLI: out of scope for v1.
- Auth / SSO: not needed for a tool of this shape.

## npm publishing

The engine is published publicly to npm as `ogpeek`. Versioning is handled
by [release-please](https://github.com/googleapis/release-please) — do **not**
hand-edit `packages/ogpeek/package.json#version`.

- `.github/workflows/release-please.yml` runs on every push to `main`. It
  reads commit messages since the last tag, opens (or updates) a
  `chore: release ogpeek <version>` PR that bumps the version and updates
  `CHANGELOG.md`. Merging that PR creates a GitHub Release + tag and
  publishes to npm in the same workflow run.
- `release-please-config.json` + `.release-please-manifest.json` hold the
  release-please configuration and the current version of record. The
  manifest is the source of truth for "what was last released"; release-please
  rewrites both `package.json#version` and the manifest in the release PR.
- Bump levels follow [Conventional Commits](https://www.conventionalcommits.org/)
  on squash-merge titles: `fix:` → patch, `feat:` → minor, `feat!:` or a
  `BREAKING CHANGE:` footer → major. To force a specific version, add a
  `Release-As: 1.2.3` footer to a commit on `main`.
- The same workflow also exposes a `workflow_dispatch` trigger as a manual
  fallback. Running it from the Actions UI skips release-please and
  publishes whatever version sits in `packages/ogpeek/package.json` (with
  optional `tag` / `dry-run` inputs) — use it only when release-please is
  jammed or you need to attach a non-`latest` dist-tag.
- Authentication uses npm Trusted Publisher (OIDC), so no secrets are
  required. `packages/ogpeek/package.json` sets
  `publishConfig.access: "public"` and `publishConfig.provenance: true`,
  and only the build output ships
  (`files: ["dist", "README.md", "LICENSE"]`). The `prepack` hook forces a
  build right before publish.
