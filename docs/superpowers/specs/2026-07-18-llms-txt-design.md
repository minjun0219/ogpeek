# ogpeek `llms.txt` — design

**Date:** 2026-07-18
**Status:** approved, ready for implementation plan
**Scope:** Serve `llms.txt` + `llms-full.txt` from the demo website, generated
at build time from the repository READMEs. Human-facing `/docs` pages and a
Hono website migration are explicitly out of scope (tracked as follow-ups).

## Goal

Give LLMs a standard entry point for understanding the `ogpeek` library.
Follow the [llmstxt.org](https://llmstxt.org) convention: a small **map**
(`llms.txt`) that points at the canonical docs, plus a **full inline** copy
(`llms-full.txt`) that concatenates every README into one fetch.

The library's source of truth for documentation is its READMEs. These files
must never drift from them, so they are **generated at build time** rather
than hand-maintained.

## Decisions

| Question | Decision |
| --- | --- |
| Priority | `llms.txt` first; human `/docs` pages are a later, separate spec. |
| Serving location | The website root: `ogpeek.minjun.dev/llms.txt` and `/llms-full.txt`. |
| Map link targets | GitHub **raw** README URLs (`raw.githubusercontent.com/...`, markdown, `text/plain`). |
| Tiers | Two: `llms.txt` (map) + `llms-full.txt` (inline). No `llms-tiny.txt` — the corpus is already small enough that `full` doubles as tiny. Revisit if the doc corpus grows large. |
| Coverage | Engine (`ogpeek`), React (`@ogpeek/react`), and the root project overview + validation rules. The **extension is excluded** (unpublished, product-not-API). |
| Generation | Build-time script; READMEs are the single source of truth (no drift). |
| Framework coupling | None. The generator writes static files into `public/`; static serving survives a future Hono migration unchanged. |

## Architecture

### A. Files & serving

- Outputs: `website/public/llms.txt`, `website/public/llms-full.txt`.
  Cloudflare Workers serves files under `public/` at the site root as
  `text/plain`.
- Both files are **build artifacts** — added to `website/.gitignore`
  (alongside `.next/` / `out/`), not committed. The READMEs are the source.
- **No middleware change.** `website/middleware.ts`'s matcher already excludes
  any dotted path (`.*\..*`) from the `[lang]` Accept-Language redirect, so
  `/llms.txt` and `/llms-full.txt` fall through to static serving. Verified
  against the current matcher:
  `["/((?!_next/|api/|favicon\\.ico|.*\\..*).*)"]`.

### B. Generator — `website/scripts/gen-llms.mjs`

- **Plain Node ESM.** Uses only `node:fs` / `node:path`. **No new
  dependency** (AGENTS.md principle 5). `.mjs` (not `.ts`) so it runs on the
  full supported Node range (`>=22.19.0`) without a TS runner or
  `--experimental-strip-types` gating on Node version.
- Reads three repo-relative sources:
  - `README.md` (root overview + "Validation rules at a glance")
  - `packages/ogpeek/README.md`
  - `packages/ogpeek-react/README.md`
- Top-of-file constants: `REPO = "minjun0219/ogpeek"`, `BRANCH = "main"`,
  `SITE = "https://ogpeek.minjun.dev"`.
- Composition logic is factored into **pure, exported functions** —
  `buildIndex(readmes)` and `buildFull(readmes)` — so the test suite can
  verify them against fixtures without touching the filesystem. A thin CLI
  wrapper reads the files, calls the pure functions, and writes the outputs.
- If a source README is missing (renamed/moved), the generator **throws** —
  this is the drift guard, and the build fails loudly rather than shipping a
  stale file.

**`llms.txt` shape (llmstxt.org format):**

```
# ogpeek
> peek into any page's Open Graph tags — a dependency-light engine
> (parse · fetch · validate) plus drop-in React components.

<one-paragraph orientation: primary-OG framing, thin auxiliary surface>

## Docs
- [ogpeek engine](https://raw.githubusercontent.com/minjun0219/ogpeek/main/packages/ogpeek/README.md): parse/validate/fetch API, two entry points, warning codes
- [@ogpeek/react](https://raw.githubusercontent.com/minjun0219/ogpeek/main/packages/ogpeek-react/README.md): drop-in components that render engine results
- [Project overview](https://raw.githubusercontent.com/minjun0219/ogpeek/main/README.md): monorepo layout, quick start, validation rules

## Optional
- [Full docs, inlined](https://ogpeek.minjun.dev/llms-full.txt): every README concatenated into one file
```

**`llms-full.txt` shape:**

- Header line + `> Generated from repository READMEs. Source of truth:
  https://github.com/minjun0219/ogpeek`.
- Root overview → engine → React, joined with `---` separators.
- The root README's centered logo block (`<p align="center"><img ...></p>`)
  is stripped; text content is preserved as-is.

### C. Build wiring — `website/package.json`

- Add script: `"gen:llms": "node scripts/gen-llms.mjs"`.
- Insert `pnpm gen:llms` into the three chains so the files exist in
  `public/` before Next collects static assets:
  - `dev`: `pnpm -w libs:build && pnpm gen:llms && next dev -p 3000`
  - `build`: `pnpm -w libs:build && pnpm gen:llms && next build`
  - `cf:build`: `pnpm -w libs:build && pnpm gen:llms && opennextjs-cloudflare build`

### D. Test — `website/test/gen-llms.test.ts` (vitest)

- Unit-test `buildIndex` / `buildFull` against small fixture strings.
- Smoke-test the real READMEs:
  - `llms.txt` contains `# ogpeek`, the blockquote summary, and all three
    `raw.githubusercontent.com` URLs.
  - `llms-full.txt` contains `@ogpeek/react` and the warning code
    `OG_TITLE_MISSING` (proves the engine + validation content made it in).
- A missing source README makes the generator throw → test fails = drift
  guard at test time as well as build time.

## Verification gates

- `pnpm check` — biome format + lint (CI runs `biome ci`).
- `pnpm -F website test` — the new generator test.
- `pnpm -F website typecheck` — website still type-checks.

## Out of scope (follow-ups)

- Extension coverage in the map.
- `llms-tiny.txt` (add if `llms-full.txt` grows large).
- Human-facing `/docs` pages on the website.
- Hono website migration (its own brainstorm — parked, not rejected).
