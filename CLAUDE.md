# ogpeek — agent notes

ogpeek는 "어느 페이지든 오픈그래프 메타태그를 바로 들여다본다"는 단 하나의
목적을 가진 도구다. 작업할 때 이 정체성과 아래 원칙을 지켜라.

## 구조

- `website` — Next.js 15 App Router + TypeScript strict + Tailwind.
  모든 UI/API/랜딩이 여기에 모여 있다.
- `packages/ogpeek` — 파서/fetcher/validator 엔진. 현재는 workspace 내부에서만
  쓰이지만 **추후 npm 공개 패키지로 배포 예정** — 공개 API로 간주하고 호환성을
  의식하며 바꿔라. 외부 의존성은 `htmlparser2` 하나뿐이다.
- workspace 내부에서는 `ogpeek`을 `workspace:*`로 참조한다. Next.js는
  `transpilePackages: ["ogpeek"]`로 TypeScript 소스를 직접 번들한다.
  엔진에는 `dist/` 빌드가 없다 — `src/index.ts`를 exports가 직접 가리킨다.
- 엔진은 두 엔트리포인트를 노출한다: 루트 `ogpeek`(portable parse/validate)와
  `ogpeek/fetch`(Node 전용 fetcher + SSRF). portable 경로에 Node-only 모듈을
  끌어들이지 마라.

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
6. **미리보기는 페이스북 한 종류만 노출한다**. OG 카드 모양은 플랫폼마다
   대동소이하므로 대표로 페이스북 스타일 하나만 보여 준다. 다시 여러 SNS
   프리뷰를 늘리지 마라 — 도구의 단일 목적성을 흐린다.

## 자주 쓰는 명령

```bash
pnpm -F ogpeek test        # 엔진 단위 테스트
pnpm -F website typecheck  # 웹사이트 타입 체크
pnpm -F website dev        # 로컬 개발 서버
pnpm -F website build      # 프로덕션 빌드 (standalone output)
```

## 디렉토리 약속

- API route는 `website/app/api/<name>/route.ts`에 둔다. runtime은
  `nodejs`이어야 한다 (`website/lib/ssrf-guard.ts` 가 `node:dns/promises`
  `resolve4/6` 을 쓰기 때문).
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

운영 배포는 **Docker (Next.js standalone)** 가 정본이다. 패키지 소개용 무료
호스팅으로 **Cloudflare Workers (OpenNext 경유)** 를 보조 채널로 둔다.

### Docker

이미지 빌드는 **루트 디렉토리**에서 한다:

```bash
docker build -t ogpeek -f website/Dockerfile .
```

`website/Dockerfile`은 Next.js standalone 출력을 전제로 작성됐으므로
`website/next.config.ts`의 `output: "standalone"`과
`outputFileTracingRoot: path.join(import.meta.dirname, "..")`를 함부로
제거하지 마라.

### Cloudflare Workers

`@opennextjs/cloudflare`로 빌드한다. 설정 파일 세트:

- `website/wrangler.json` — `compatibility_flags: ["nodejs_compat"]`
  필수. `compatibility_date`는 `2024-09-23` 이상 (`nodejs_compat_v2` 활성).
- `website/open-next.config.ts` — OpenNext 어댑터 설정. 기본은 인메모리 캐시.
- `website/package.json` 의 `cf:build` / `cf:preview` / `cf:deploy` 스크립트.

엣지 런타임에서는 `node:dns/promises` 의 `resolve4/6` 이 미구현 혹은 불안정
할 수 있다. Workers 에 배포할 때는 `website/lib/ssrf-guard.ts` 의 strict DNS
단계를 hostname-only 검사로 교체하거나, 별도 DNS-over-HTTPS 어댑터를
주입하는 식으로 가드 구현을 환경에 맞춰 조정해라 — 엔진은 관여하지 않는다.

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
