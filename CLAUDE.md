# ogpeek — agent notes

ogpeek는 "어느 페이지든 오픈그래프 메타태그를 바로 들여다본다"는 단 하나의
목적을 가진 도구다. 작업할 때 이 정체성과 아래 원칙을 지켜라.

## 구조

- `packages/ogpeek` — 파서/fetcher/validator 엔진. **이 레포의 본체.** 현재는
  workspace 내부에서만 쓰이지만 **추후 npm 공개 패키지로 배포 예정** — 공개
  API로 간주하고 호환성을 의식하며 바꿔라. 외부 의존성은 `htmlparser2`
  하나뿐이다.
- `website` — Next.js 15 App Router + TypeScript strict + Tailwind. 엔진의
  **예제 / 소개용 데모 사이트**다. 운영 도구가 아니라 "패키지 어떻게 쓰는지
  보여주는 자리". Cloudflare Workers 한 곳에만 배포한다.
- workspace 내부에서는 `ogpeek`을 `workspace:*`로 참조한다. Next.js는
  `transpilePackages: ["ogpeek"]`로 TypeScript 소스를 직접 번들한다.
  엔진에는 `dist/` 빌드가 없다 — `src/index.ts`를 exports가 직접 가리킨다.
- 엔진은 두 엔트리포인트를 노출한다: 루트 `ogpeek`(portable parse/validate)와
  `ogpeek/fetch`(Node 전용 fetcher + SSRF). portable 경로에 Node-only 모듈을
  끌어들이지 마라.
- 로컬 개발은 **Node 24 LTS** 기준 (`.nvmrc` 참고). `engines.node` 는
  `>=22.19.0` 이지만 새 코드는 24 에서만 검증한다.

## 원칙

1. **엔진은 순수 로직이다**. DOM, React, Next 타입을 import 하지 마라.
   외부 의존성은 `htmlparser2` 하나뿐이고, Node 내장도 쓰지 않는다 — 엔진은
   SSRF 를 판단하지 않으므로 `node:dns`/`node:net` 에 의존할 이유가 없다.
2. **일괄 재작성 금지**. 버그 수정/기능 추가는 최소한의 변경으로 한다.
   파서 코드는 30개 테스트로 방어되고 있다. 테스트를 먼저 읽고, 깨지지 않는
   범위로 수정해라.
3. **SSRF 는 호출자 책임**. ogpeek 엔진은 SSRF 정책을 판단하지 않는다.
   모든 요청 hop(최초 URL + 모든 리디렉션 target) 직전에 호출되는 `guard`
   훅 하나만 제공한다 — 차단하려면 `FetchError` 를 throw, 통과시키려면
   return. 배포 환경(클라우드/온프렘/엣지)마다 리졸버와 사설 대역 정의가
   다르므로 가드 구현은 호출자 몫이다. website 는 `lib/ssrf-guard.ts` 에서
   자체 가드를 구현하고 `fetchHtml({ guard: ssrfGuard })` 로 주입한다.
   공개 모드 SSR(`/?url=...`) 은 `/api/parse` 와 동일한 가드 + rate limiter
   를 공유해야 한다. 리디렉션은 반드시 `redirect: "manual"` 로 받아서 hop
   마다 가드를 다시 돌린다.
4. **한국어 UI**. 사용자향 문구는 전부 한국어. 에러 코드/API 응답 키는 영문.
5. **의존성 추가에 보수적이다**. 새 패키지 추가 전에 표준 라이브러리, 기존
   유틸, Tailwind 원시 스타일로 해결 가능한지 먼저 확인해라.
6. **국내 플랫폼 우선**. 프리뷰 순서는 카카오톡 → 슬랙 → 페이스북 → X →
   링크드인이다. 바꾸지 마라.

## 자주 쓰는 명령

```bash
pnpm -F ogpeek test        # 엔진 단위 테스트
pnpm -F website typecheck  # 데모 사이트 타입 체크
pnpm -F website dev        # 로컬 개발 서버 (Node 24)
pnpm -F website cf:build   # OpenNext + Workers 번들
pnpm -F website cf:preview # 로컬 wrangler 미리보기
pnpm -F website cf:deploy  # Workers 배포
```

## 디렉토리 약속

- API route는 `website/app/api/<name>/route.ts`에 둔다. runtime 은 별도로
  지정하지 않는다 — `lib/ssrf-guard.ts` 가 DoH(`cloudflare-dns.com/dns-query`)
  를 fetch 하므로 Node 도, Workers 도 동일하게 굴러간다.
- 플랫폼 프리뷰는 `website/components/previews/*.tsx` 하나 파일 = 하나 플랫폼.
- 서버 전용 로직은 `website/lib/*.ts`, 클라이언트 컴포넌트는 `"use client"`
  지시문을 파일 최상단에 둔다.
- 경고 코드를 추가할 때는 ①`packages/ogpeek/src/types.ts`의 유니온,
  ②`validate.ts`의 구현, ③`test/validate.test.ts`의 커버 테스트,
  ④`packages/ogpeek/README.md`의 표를 함께 갱신한다 — 네 곳 중 하나라도 빠지면
  PR로 받지 않는다.
- 공개 모드 SSR(`/?url=...`) 역시 `/api/parse`와 동일한 per-IP rate limiter를
  공유해야 한다. 우회 경로를 만들지 마라.

## 배포

데모 사이트는 **Cloudflare Workers (OpenNext 경유)** 한 곳에만 배포한다.
Docker / Vercel / 자체 호스팅 옵션은 모두 정리했다 — website 는 운영 도구가
아니라 엔진 소개용이라 단일 경로로 충분하다.

### Cloudflare Workers

`@opennextjs/cloudflare`로 빌드한다. 설정 파일 세트:

- `website/wrangler.json` — `compatibility_flags: ["nodejs_compat"]`
  필수. `compatibility_date`는 `2025-09-23`.
- `website/open-next.config.ts` — OpenNext 어댑터 설정. 기본은 인메모리 캐시.
- `website/package.json` 의 `cf:build` / `cf:preview` / `cf:deploy` 스크립트.

### SSRF 가드와 런타임

`website/lib/ssrf-guard.ts` 는 hostname 문자열 검사 + Cloudflare DoH JSON
API(`cloudflare-dns.com/dns-query`) 로 A/AAAA 를 풀고 `ipaddr.js` 의
`range()` 로 사설/예약 대역을 일괄 차단한다. fetch() 한 발만 쓰니 Node 와
Workers 양쪽에서 동일하게 동작한다 — Node-only 의존(`node:dns`, undici
Agent) 은 모두 제거됐다.

DNS rebinding TOCTOU 창은 열려 있다(검증 시점 IP 와 실제 fetch connect
시점 IP 사이). Workers 는 raw TCP 를 열어주지 않아 connect-time IP pinning
이 불가능하므로 데모 수준에서는 의도적으로 얕은 방어까지만 둔다 — 운영용
도구가 아니라 엔진 소개 사이트라는 위치 매김 하에 합의된 trade-off.

엔진은 SSRF 정책을 판단하지 않는다(원칙 3). 가드를 손볼 때는 ssrf-guard.ts
한 곳만 수정하고, 엔진(`packages/ogpeek`) 으로 SSRF 로직이 새지 않게 해라.

## 제외 사항

- Turborepo: 현재 workspace가 2개뿐이라 도입하지 않는다. 3개째가 생기면
  재검토.
- CLI: v1 범위 밖.
- 인증/SSO: 도구 특성상 불필요.

## 향후 과제 (이번 작업 범위 밖)

- npm 공개 배포: 현재 `packages/ogpeek` 는 workspace 전용이지만 추후 npm
  공개 패키지로 배포할 예정이다. 공개 API 호환성을 의식하고 변경하라.
  실제 배포 시 필요한 작업: `dist/` 빌드 도입, `exports` 재정리, `private`
  필드 제거, README 리라이트.
