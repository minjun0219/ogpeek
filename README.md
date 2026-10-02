<p align="center">
  <img src="./assets/logo.png" alt="ogpeek" width="128" height="128">
</p>

# ogpeek

> peek into any page's Open Graph tags — and the favicon / JSON-LD
> signals that travel with them

> Korean: [README.ko.md](./README.ko.md)

A focused OpenGraph debugging tool: paste a URL, see exactly how the page's
OG card will render, and get OGP-spec violations called out automatically.
Open Graph stays the primary signal; ogpeek also surfaces the auxiliary
head metadata most pages ship with — favicons / apple-touch-icons /
mask-icons, msapplication tiles, `application-name` / `theme-color`,
and JSON-LD blocks — so "how does this page advertise itself elsewhere?"
debugging stays in one place.

## Layout

- `packages/ogpeek` — the pure engine that handles `fetch` · `parse` ·
  `validate`. This is the body of the repo. Single external dependency:
  `htmlparser2`. Node 22.19+ (development is on Node 24 LTS).
- `packages/ogpeek-react` — drop-in React components that render the
  engine's results.
- `packages/ogpeek-extension` — cross-browser MV3 extension that ships the
  engine in the user's own browser, so it can inspect intranet hosts that
  the public demo can't reach. v1 builds Chrome only; Firefox / Safari
  manifests are scaffolded for follow-up.
- `website` — a **demo site** built on Next.js 15 (App Router). It exists as
  a usage example for the engine and as a landing page. Deployed only to
  Cloudflare Workers (via OpenNext).

## Quick start

```bash
pnpm install
pnpm -F website dev               # http://localhost:3000
pnpm -F ogpeek test               # engine unit tests
pnpm -F ogpeek-extension build    # Chrome MV3 unpacked at packages/ogpeek-extension/dist/chrome
```

## Validation rules at a glance

The rules maintained in `packages/ogpeek/src/validate.ts`:

- `OG_TITLE_MISSING` / `OG_TITLE_TOO_LONG` (over 60 chars — KakaoTalk truncates)
- `OG_TYPE_MISSING` / `OG_TYPE_UNKNOWN`
- `OG_IMAGE_MISSING`
- `OG_URL_MISSING` / `OG_URL_MISMATCH` (`og:url` disagrees with the actual
  request URL)
- `URL_NOT_ABSOLUTE` / `DUPLICATE_SINGLETON` /
  `ORPHAN_STRUCTURED_PROPERTY` / `INVALID_DIMENSION`
- `MISSING_PREFIX_ATTR` (info)
- `JSONLD_PARSE_ERROR` (a `<script type="application/ld+json">` block did
  not parse)

See `packages/ogpeek/README.md` for full descriptions.

## For agents

An [Agent Skill](./skills/ogpeek/SKILL.md) tells coding agents when to reach
for ogpeek instead of a hand-rolled meta-tag scraper, which entry point to
pick, and the gotchas (SSRF guard, static HTML only, relative URLs). In
Claude Code:

```
/plugin marketplace add minjun0219/ogpeek
/plugin install ogpeek@ogpeek
```

The site also serves [`llms.txt`](https://ogpeek.minjun.dev/llms.txt) and
[`llms-full.txt`](https://ogpeek.minjun.dev/llms-full.txt).

For agents in the browser, every page on the site registers two
[WebMCP](https://github.com/webmachinelearning/webmcp) tools:
`ogpeek_inspect` (`url` — fetches through the demo API, so the same SSRF
guard and rate limit apply) and `ogpeek_parse` (`html`, optional `url` —
runs the engine locally in the page, no network).

## Scripts

```bash
pnpm -r typecheck        # workspace-wide tsc --noEmit
pnpm -F ogpeek test      # engine unit tests
pnpm -F website cf:build # OpenNext + Workers bundle
```

## License

MIT.
