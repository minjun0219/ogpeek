# og-debug

Open Graph Protocol (https://ogp.me) 디버거 파서 + 데모 워커.

## 구성

- `packages/og-debug` — 순수 파서 패키지. `parse(html, { url? })` 하나로
  OGP 메타 태그를 구조화하고 스펙 위반을 경고로 보고한다. 의존성 최소화
  (htmlparser2 하나) — Node, Workers, 브라우저 어디서든 import 가능.
- `examples/cloudflare-worker` — `?url=<target>` 으로 원격 페이지를 fetch 해
  파서를 돌려 JSON 으로 응답하는 Cloudflare Worker 예제.

## 개발

```bash
pnpm install
pnpm -F og-debug build
pnpm -F og-debug test
pnpm -F cloudflare-worker dev  # wrangler dev
```

## 라이선스

MIT.
