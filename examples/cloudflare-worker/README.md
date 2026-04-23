# cloudflare-worker (og-debug example)

원격 페이지를 fetch 해 `og-debug` 로 파싱한 결과를 JSON 으로 돌려주는 데모
Cloudflare Worker.

```bash
pnpm install
pnpm -F cloudflare-worker dev
curl 'http://localhost:8787/?url=https://ogp.me'
```

배포는 `wrangler deploy` (계정 로그인 필요).

## 제약

- `http:` / `https:` 스킴만 허용.
- `content-type` 이 HTML 계열이 아니면 415.
- 본문 2 MiB 초과 시 413.
- fetch 타임아웃 8s.
