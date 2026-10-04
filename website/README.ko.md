# ogpeek — website (데모)

> English: [README.md](./README.md)

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
`nodejs_compat` 플래그를 켜둔 상태이고, zone route 로 사이트를 `minjun.kim/ogpeek/`
(Next `basePath`)에 붙인다. `worker.ts` 가 OpenNext 결과를 감싸서 옛 호스트
(`ogpeek.minjun.dev`, `ogpeek.dev`)를 새 URL 로 301 한다.

**`main` 에 푸시하는 것이 곧 배포다** — Workers Builds 가 `main` 커밋마다
새 클론에서 빌드한다. 아래 명령은 로컬 확인용이고, `cf:deploy` 는 부트스트랩·
긴급용 경로다.

```bash
pnpm -F website cf:build    # OpenNext 빌드 → .open-next/worker.js
pnpm -F website cf:preview  # 로컬 wrangler 미리보기
pnpm -F website cf:deploy   # 수동 배포 (부트스트랩·긴급용, wrangler login 필요)
```

`NEXT_PUBLIC_POSTHOG_KEY` · `NEXT_PUBLIC_POSTHOG_HOST` 는 `NEXT_PUBLIC_*` 라서 빌드 타임에
인라인되고, 프로덕션에만 넣는다. 값은 Workers Builds 프로덕션 트리거의 빌드
변수에 둔다(Worker secret 은 번들에 닿지 않고, 저장소 파일에도 두지 않는다).
키가 없으면 PostHog 를 초기화하지 않는다. `cf:build` 는 프로덕션 빌드
(`WORKERS_CI_BRANCH=main`)에서만 키가 없을 때 중단되고, 의도적으로 분석 없이
배포하려면 `OGPEEK_ALLOW_NO_ANALYTICS=1`.

## SSRF 가드

`lib/ssrf-guard.ts` 는 다음 두 단계로 동작한다:

1. **hostname 검사** — `localhost` / `*.localhost` / 리터럴 사설 IP 차단.
2. **DoH(DNS-over-HTTPS) 조회** — Cloudflare 의 `cloudflare-dns.com/dns-query`
   JSON API 로 A/AAAA 를 받아 `ipaddr.js` `range()` 가 `unicast` 가 아닌 모든
   대역을 차단.

fetch() 한 발이면 끝나므로 Node 도, Workers 도 동일하게 동작한다 — 별도의
runtime 분기 없이 같은 코드 경로.

DNS rebinding 완전 방어는 connect-time IP pinning(검증한 IP 로 직접 connect)
이 필요하지만 Workers 는 raw TCP 를 열어주지 않는다. 데모 사이트라는 위치
매김 상 의도적으로 얕은 방어까지만 둔 것 — 운영용 도구로 쓰려면 자체 호스팅
인스턴스에서 undici Agent + node:dns 기반 connect-time 가드를 따로 짜라.

## 환경 변수

| 변수 | 기본값 | 설명 |
| --- | --- | --- |
| `OGPEEK_USER_AGENT` | 브라우저 유사 UA | 외부 페이지 fetch 시 사용할 User-Agent |
| `OGPEEK_RATE_LIMIT_PER_MIN` | `20` | IP당 분당 요청 수. 0 이하는 무제한 |
