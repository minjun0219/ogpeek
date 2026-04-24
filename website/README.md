# ogpeek — website (데모)

`packages/ogpeek` 엔진의 **예제 / 소개용 데모 사이트**. Next.js 15 (App
Router) 로 작성됐고 Cloudflare Workers 한 곳에만 배포한다. 운영용 도구가
아니다 — 엔진을 어떻게 쓰는지 보여주는 자리.

## 개발

```bash
pnpm -F website dev         # http://localhost:3000 (Node 24)
pnpm -F website typecheck
```

## 배포 — Cloudflare Workers 전용

`@opennextjs/cloudflare` 어댑터로 빌드/배포한다. `wrangler.json` 은
`nodejs_compat` 플래그를 켜둔 상태.

```bash
pnpm -F website cf:build    # OpenNext 빌드 → .open-next/worker.js
pnpm -F website cf:preview  # 로컬 wrangler 미리보기
pnpm -F website cf:deploy   # 실제 배포 (wrangler login 필요)
```

## SSRF 가드와 런타임 차이

`lib/ssrf-guard.ts` (pre-flight DNS 검사) 와 `lib/safe-dispatcher.ts`
(connect-time IP 재검증) 는 **Node-only** 구현이다 — `node:dns/promises` 와
undici `Agent` 의 custom `connect.lookup` 을 쓴다. 로컬 dev 서버 (Node 24)
에서는 둘 다 동작하지만, Workers 런타임에는 raw TCP / 완전한 `node:dns` 가
없어서 그대로 적용되지 않는다.

엔진(`packages/ogpeek`)은 SSRF 정책을 판단하지 않는다. 데모 사이트의 가드를
Workers 호환으로 재설계할 때까지는 hostname-only 검사 + DoH 어댑터(예:
`1.1.1.1/dns-query` 를 fetch) 조합으로 갈아끼우는 경로를 권장한다.

## 환경 변수

| 변수 | 기본값 | 설명 |
| --- | --- | --- |
| `NEXT_PUBLIC_MODE` | `public` | `public` 또는 `internal`. internal은 랜딩 숨김 + rate limit 해제 |
| `OGPEEK_USER_AGENT` | 브라우저 유사 UA | 외부 페이지 fetch 시 사용할 User-Agent |
| `OGPEEK_RATE_LIMIT_PER_MIN` | `20` | public 모드에서 IP당 분당 요청 수. 0 이하는 무제한 |
