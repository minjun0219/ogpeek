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
(`ogpeek.minjun.dev`, `ogpeek.dev`)를 `minjun.kim/ogpeek/` 로 301 하고, 앱 루트에
끝 슬래시를 붙인다. 랜딩 페이지의 마크다운 사본도 `/ogpeek/index.md` · `/ogpeek/ko.md` 에서
응답한다(`lib/landing-markdown.ts`, 페이지와 같은 사전으로 만든다). 페이지는
`<link rel="alternate" type="text/markdown">` 로 사본을 가리킨다. 페이지 주소(`/ogpeek/`,
`/ogpeek/ko`)도 `Accept` 가 마크다운을 원하면 사본으로 응답한다. `text/markdown` 이 직접 적혀
있고 그 q 가 HTML 의 q 이상이어야 한다(Claude Code 의 WebFetch 가 이렇게 요청한다.
`lib/prefers-markdown.ts`, mdwire 와 같은 규칙). 브라우저와 `Accept: */*` 는 그대로 HTML 을 받고,
두 형태 모두 `Vary: Accept` 를 단다. 배포 뒤에는
`curl -sI -H 'Accept: text/markdown' https://minjun.kim/ogpeek/` 로 `content-type: text/markdown` 과
`vary: Accept` 를 확인한다.

`_headers` 는 정적 자산의 헤더 규칙이다(`llms.txt` · `llms-full.txt` 에 `charset=utf-8` 을
붙인다). Workers Static Assets 는 이 파일을 자산 디렉터리 루트에서만 읽는데 OpenNext 는
`public/` 을 base 경로 아래에 둔다. 그래서 `cf:build` 가 OpenNext 빌드 뒤에
`.open-next/assets/_headers` 로 복사한다.

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
둘 중 하나라도 없으면 PostHog 를 초기화하지 않는다. 호스트에는 폴백이 없어서
리버스 프록시를 조용히 우회하는 빌드가 나가지 않는다. `cf:build` 는 프로덕션 빌드
(`WORKERS_CI_BRANCH=main`)에서만 둘이 없을 때 중단되고, 의도적으로 분석 없이
배포하려면 `OGPEEK_ALLOW_NO_ANALYTICS=1`. PostHog 는 페이지뷰(와 커스텀 이벤트
`webmcp_tool_called`)만 모은다 — 클릭 자동 수집·히트맵·Web Vitals·예외·세션 녹화·설문은
minjun.kim origin 의 다른 앱처럼 코드에서 끈다.

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
