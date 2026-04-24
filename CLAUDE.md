# ogpeek — agent notes

ogpeek는 "어느 페이지든 오픈그래프 메타태그를 바로 들여다본다"는 단 하나의
목적을 가진 도구다. 작업할 때 이 정체성과 아래 원칙을 지켜라.

## 구조

- `website` — Next.js 15 App Router + TypeScript strict + Tailwind.
  모든 UI/API/랜딩이 여기에 모여 있다.
- `packages/ogpeek` — 파서/fetcher/validator 엔진. **npm에 공개 배포되는 패키지**
  (`ogpeek`) — 공개 API 호환성을 의식하며 바꿔라. 외부 의존성은 `htmlparser2`
  하나뿐이다.
- workspace 내부에서는 `ogpeek`을 `workspace:*`로 참조한다. exports는
  `dist/*.js` / `dist/*.d.ts`를 가리키므로 website 스크립트(`dev`/`build`/
  `typecheck`/`cf:build`)는 `pnpm --filter ogpeek run build`를 선행 체인한다.
  ogpeek 소스를 수정했다면 수동으로 재빌드하거나 `tsc --watch`를 같이 돌려라.
- 엔진은 두 엔트리포인트를 노출한다: 루트 `ogpeek`(portable parse/validate)와
  `ogpeek/fetch`(Node 전용 fetcher + SSRF). portable 경로에 Node-only 모듈을
  끌어들이지 마라.

## 원칙

1. **엔진은 순수 로직이다**. DOM, React, Next 타입을 import 하지 마라.
   Node 내장(`node:dns/promises`, `node:net`)과 `htmlparser2`만 허용 — 그나마
   Node 내장은 `ogpeek/fetch` 서브패스 안에서만 쓴다.
2. **일괄 재작성 금지**. 버그 수정/기능 추가는 최소한의 변경으로 한다.
   파서 코드는 30개 테스트로 방어되고 있다. 테스트를 먼저 읽고, 깨지지 않는
   범위로 수정해라.
3. **SSRF 가드는 on-by-default**. `fetchHtml`은 옵션 없이 호출하면 `"strict"`
   모드 — DNS 리졸브 + 사설/루프백/링크로컬 대역 차단 — 로 동작한다. 엣지
   런타임 등 `node:dns/promises`의 `lookup()`을 못 쓰는 환경에선
   `{ ssrf: "hostname" }` 또는 환경변수 `OGPEEK_SSRF_MODE=hostname` 으로
   문자열-only 검사로 전환할 수 있다. 이 기본값을 뒤집지 마라.
   리디렉션은 반드시 `redirect: "manual"`로 받아서 hop마다 선택된 가드를
   다시 돌린다.
4. **한국어 UI**. 사용자향 문구는 전부 한국어. 에러 코드/API 응답 키는 영문.
5. **의존성 추가에 보수적이다**. 새 패키지 추가 전에 표준 라이브러리, 기존
   유틸, Tailwind 원시 스타일로 해결 가능한지 먼저 확인해라.
6. **국내 플랫폼 우선**. 프리뷰 순서는 카카오톡 → 슬랙 → 페이스북 → X →
   링크드인이다. 바꾸지 마라.

## 자주 쓰는 명령

```bash
pnpm -F ogpeek test        # 엔진 단위 테스트
pnpm -F ogpeek build       # dist/ 빌드 (tsc)
pnpm -F website typecheck  # 웹사이트 타입 체크 (ogpeek build 선행)
pnpm -F website dev        # 로컬 개발 서버 (ogpeek build 선행)
pnpm -F website build      # 프로덕션 빌드 (standalone output)
```

## 디렉토리 약속

- API route는 `website/app/api/<name>/route.ts`에 둔다. runtime은
  `nodejs`이어야 한다 (`node:dns/promises` 때문).
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

엣지 런타임에서는 `node:dns/promises` 의 `lookup()` 호출이 실패할 수 있으므로
SSRF 모드를 `OGPEEK_SSRF_MODE=hostname` 으로 두는 걸 권장한다 (Workers Vars
또는 `wrangler.json` `vars`). 이 모드는 hostname 문자열 검사만 한다.

## 제외 사항

- Turborepo: 현재 workspace가 2개뿐이라 도입하지 않는다. 3개째가 생기면
  재검토.
- CLI: v1 범위 밖.
- 인증/SSO: 도구 특성상 불필요.

## npm 배포

엔진은 `ogpeek`이라는 이름으로 npm에 공개 배포된다.

- `.github/workflows/publish-ogpeek.yml` — GitHub Release `published` 트리거
  또는 `workflow_dispatch`(tag·dry-run 입력)로 퍼블리시. 인증은 npm Trusted
  Publisher(OIDC)로 처리되므로 시크릿이 필요 없다.
- `packages/ogpeek/package.json` 의 `publishConfig.access: "public"` 와
  `publishConfig.provenance: true` 로 공개·provenance 배포가 기본이다.
- 빌드 산출물(`dist/`)만 tarball에 포함된다 (`files: ["dist", "README.md",
  "LICENSE"]`). `prepack` 훅이 퍼블리시 직전 빌드를 강제한다.
- 버전 범핑은 `packages/ogpeek/package.json` 의 `version` 만 올리고 동일한
  태그(`v<version>`)로 GitHub Release를 만들면 워크플로가 일치 여부를 검증한
  뒤 배포한다.
