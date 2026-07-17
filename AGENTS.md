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
- `packages/ogpeek-extension` — cross-browser MV3 extension that runs the
  engine inside the user's own browser, so it can fetch intranet / VPN
  hosts the Workers demo can't reach. **Not published to npm** — shipped
  as a zipped unpacked extension via GitHub Releases. The same source
  builds Chrome / Firefox / Safari (chosen by `BROWSER=` env var); v1
  pipeline only emits Chrome, the other manifests are scaffolded.
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
   (`/{lang}/inspect?url=...`) must share the same guard + rate limiter as
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
- SSR page visits (`/{lang}/inspect?url=...`) must share the same per-IP rate
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

- Turborepo: still not adopted. The build DAG is `ogpeek` → `@ogpeek/react` →
  `website`, with `packages/ogpeek-extension` as a leaf consumer of both
  libraries; `pnpm -r --filter 'website^...'` already handles topological
  ordering for the publish-relevant subgraph, and the publish jobs must do
  fresh builds for npm provenance attestation, so a remote-cache layer
  has limited payoff. Trigger (a) (a 4th workspace appears) has now fired
  — revisit if any of these tightens further: **(b) a 3rd npm-published
  package appears** (the changesets fixed group grows a 3rd npm entry),
  **(c) `pnpm -F
  website dev` cold start exceeds ~15s**, or **(d) cross-job CI cache
  sharing becomes worth a remote cache**.
- TypeScript project references (`composite: true` + `tsc -b`): not
  enabled. Same trigger as Turborepo's (c) — adopt when warm-pass
  typecheck/dev start times become a real friction point.
- CLI: out of scope for v1.
- Auth / SSO: not needed for a tool of this shape.

## Releases

Two packages publish publicly to npm — the engine as `ogpeek` and the
React component layer as `@ogpeek/react` — and one is shipped as a
GitHub Release zip: `ogpeek-extension` (Chrome MV3). All three are
versioned **in lockstep** as a single product through
[changesets](https://github.com/changesets/changesets) with a single
`fixed` group. Do **not** hand-edit any `package.json#version` or the
extension `manifest/*.json` versions.

- A change that should ship needs a **changeset file** in the same PR:
  run `pnpm changeset`, pick any of the three packages (the fixed group
  bumps them together anyway), choose the bump level (patch / minor /
  major), and describe the change — that description becomes the
  CHANGELOG entry, so write it for release-note readers. Docs/CI-only
  changes simply ship no changeset and trigger no release.
- `.github/workflows/release.yml` runs on every push to `main`. While
  changeset files exist, `changesets/action` opens (or updates) a
  single `chore(release): Version Packages` PR whose `version` command
  is `pnpm changeset:version` — `changeset version` bumps the three
  workspace `package.json` files and per-package `CHANGELOG.md`s, then
  `scripts/sync-versions.mjs` stamps the same version into the root
  `package.json` and `packages/ogpeek-extension/manifest/*.json` (the
  Chrome Web Store rejects re-uploads without a version increase, so
  the manifest stamp is load-bearing). Merging that PR makes
  `scripts/release-github.mjs` (idempotent — keyed on GitHub Release
  existence, so a partial failure is retried on the next `main` push)
  cut **one** `vX.Y.Z` tag + **one** GitHub Release whose notes are the
  matching CHANGELOG sections, and its `release_created` output drives
  three publish jobs in the same workflow run: `publish-ogpeek` (npm),
  `publish-ogpeek-react` (npm), and `publish-ogpeek-extension` (builds
  the Chrome zip and uploads it to the GitHub Release).
- `.changeset/config.json` holds the changesets configuration: the
  `fixed` group `["ogpeek", "@ogpeek/react", "ogpeek-extension"]` keeps
  the lockstep, `website` is `ignore`d (deploy-only, never released),
  and the changelog format is `@changesets/changelog-github` (needs
  `GITHUB_TOKEN` when running `changeset version` locally). The version
  of record is `packages/ogpeek/package.json#version`; git tags stay
  plain `vX.Y.Z` with no component prefix.
- Known trade-off of `changesets/action`: the Version PR is created
  with the workflow's `GITHUB_TOKEN`, and PRs created by that token do
  **not** trigger the CI workflow. The PR only touches version/CHANGELOG
  files, so merge it on the strength of the `main` CI run it was cut
  from. There is intentionally no `workflow_dispatch` manual fallback —
  if the release flow ever jams enough to need one, weigh the
  trade-offs first and add it back then.
- Authentication: the two npm publishes use npm Trusted Publisher
  (OIDC) — no secrets needed. Both publish targets set
  `publishConfig.access: "public"` + `publishConfig.provenance: true`,
  and only the build output ships (`files: ["dist", "README.md",
  "LICENSE"]`). The `prepack` hook forces a build right before publish.
  The extension publish uses `GITHUB_TOKEN` only (no npm credentials —
  it never touches npm) to run `gh release upload --clobber` against
  the cut tag.
- Lockstep trade-off: a patch changeset against `ogpeek` cuts a new
  version of `@ogpeek/react` and `ogpeek-extension` too, even when
  their content hasn't changed. Acceptable because the three move
  together in practice and the umbrella tag/Release matches reality.
  CHANGELOG entries live per package (`packages/*/CHANGELOG.md`, written
  by changesets); the root `CHANGELOG.md` era under release-please
  (≤ v0.5.0) is history in git only.

### Chrome Web Store auto-publish

The same `publish-ogpeek-extension` job that uploads the zip to a GitHub
Release also pushes the same zip to the Chrome Web Store via
[`chrome-webstore-upload-cli`](https://github.com/fregante/chrome-webstore-upload-cli)
and submits it for review (`--auto-publish`). The step is gated by
`vars.CHROME_AUTOPUBLISH == 'true'`, so it stays a no-op until the
auto-publish path is fully wired — releases keep working through the
GitHub Release zip on their own.

What the step needs:

| Kind | Name | Purpose |
| --- | --- | --- |
| Variable | `CHROME_AUTOPUBLISH` | `'true'` to enable the step. Anything else (or unset) skips it. |
| Secret | `CHROME_EXTENSION_ID` | Item ID assigned after the first manual upload. |
| Secret | `CHROME_CLIENT_ID` | Google Cloud OAuth 2.0 *Desktop* client ID with the Chrome Web Store API enabled. |
| Secret | `CHROME_CLIENT_SECRET` | Companion secret to `CHROME_CLIENT_ID`. |
| Secret | `CHROME_REFRESH_TOKEN` | Long-lived OAuth refresh token. Generate once with `npx chrome-webstore-upload-keys` (or any equivalent flow that asks for `https://www.googleapis.com/auth/chromewebstore` scope) on a workstation, paste the result here. |

Bootstrap (one-time, manual — the API can only update an existing item):

1. Pay the one-time $5 developer registration fee at the
   [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole).
2. Build a release-quality zip locally:
   `pnpm -F ogpeek-extension package:chrome` →
   `packages/ogpeek-extension/dist/ogpeek-chrome.zip`.
3. In the dashboard, **New item** → upload the zip → fill the store
   listing (description, screenshots, category, language, privacy
   policy URL, single-purpose justification, host-permission
   justification for `<all_urls>`) → submit for review.
4. After Google approves the first version, copy the assigned item ID
   into `CHROME_EXTENSION_ID` and create the OAuth client + refresh
   token. Set `CHROME_AUTOPUBLISH=true` last, so the change is atomic.

From that point on, every release tag cut by `release.yml` triggers the
step; only
the listing copy / screenshots stay a dashboard task. Adding a new
permission to `manifest/chrome.json` extends the review window but does
not change the workflow.
