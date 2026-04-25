# ogpeek

> peek into any page's Open Graph tags

> Korean: [README.ko.md](./README.ko.md)

A focused OpenGraph debugging tool: paste a URL, see exactly how the page's
OG card will render, and get OGP-spec violations called out automatically.
Built as a shared utility for QA, product, and engineering — and as the
landing page when published publicly.

## Layout

- `packages/ogpeek` — the pure engine that handles `fetch` · `parse` ·
  `validate`. This is the body of the repo. Single external dependency:
  `htmlparser2`. Node 22.19+ (development is on Node 24 LTS).
- `website` — a **demo site** built on Next.js 15 (App Router). It exists as
  a usage example for the engine and as a landing page. Deployed only to
  Cloudflare Workers (via OpenNext).

## Quick start

```bash
pnpm install
pnpm -F website dev      # http://localhost:3000
pnpm -F ogpeek test      # engine unit tests
```

## Validation rules at a glance

The 12 rules maintained in `packages/ogpeek/src/validate.ts`:

- `OG_TITLE_MISSING` / `OG_TITLE_TOO_LONG` (over 60 chars — KakaoTalk truncates)
- `OG_TYPE_MISSING` / `OG_TYPE_UNKNOWN`
- `OG_IMAGE_MISSING`
- `OG_URL_MISSING` / `OG_URL_MISMATCH` (`og:url` disagrees with the actual
  request URL)
- `URL_NOT_ABSOLUTE` / `DUPLICATE_SINGLETON` /
  `ORPHAN_STRUCTURED_PROPERTY` / `INVALID_DIMENSION`
- `MISSING_PREFIX_ATTR` (info)

See `packages/ogpeek/README.md` for full descriptions.

## Scripts

```bash
pnpm -r typecheck        # workspace-wide tsc --noEmit
pnpm -F ogpeek test      # engine unit tests
pnpm -F website cf:build # OpenNext + Workers bundle
```

## License

MIT.
