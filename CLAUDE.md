# ogpeek — agent notes

ogpeek는 "어느 페이지든 오픈그래프 메타태그를 바로 들여다본다"는 단 하나의
목적을 가진 도구다. 작업할 때 이 정체성과 아래 원칙을 지켜라.

## 구조

- `website` — Next.js 15 App Router + TypeScript strict + Tailwind.
  모든 UI/API/랜딩이 여기에 모여 있다.
- `packages/ogpeek` — 파서/fetcher/validator 엔진. **workspace 전용** — npm에
  publish 하지 않는다. 외부 의존성은 `htmlparser2` 하나뿐이다.
- workspace 내부에서는 `ogpeek`을 `workspace:*`로 참조한다. Next.js는
  `transpilePackages: ["ogpeek"]`로 TypeScript 소스를 직접 번들한다.
  엔진에는 `dist/` 빌드가 없다 — `src/index.ts`를 exports가 직접 가리킨다.
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
3. **SSRF 가드는 on-by-default**. `OGPEEK_ALLOW_PRIVATE_NETWORK=1`일 때만
   사설/루프백 대역을 허용한다. 이 기본값을 뒤집지 마라. 리디렉션은 반드시
   `redirect: "manual"`로 받아서 hop마다 hostname을 재검증한다.
4. **한국어 UI**. 사용자향 문구는 전부 한국어. 에러 코드/API 응답 키는 영문.
5. **의존성 추가에 보수적이다**. 새 패키지 추가 전에 표준 라이브러리, 기존
   유틸, Tailwind 원시 스타일로 해결 가능한지 먼저 확인해라.
6. **국내 플랫폼 우선**. 프리뷰 순서는 카카오톡 → 슬랙 → 페이스북 → X →
   링크드인이다. 바꾸지 마라.

## 자주 쓰는 명령

```bash
pnpm -F ogpeek test        # 엔진 단위 테스트
pnpm -F website typecheck  # 웹사이트 타입 체크
pnpm -F website dev        # 로컬 개발 서버
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

## Docker

이미지 빌드는 **루트 디렉토리**에서 한다:

```bash
docker build -t ogpeek -f website/Dockerfile .
```

`website/Dockerfile`은 Next.js standalone 출력을 전제로 작성됐으므로
`website/next.config.ts`의 `output: "standalone"`과
`outputFileTracingRoot: path.join(import.meta.dirname, "..")`를 함부로
제거하지 마라.

## 제외 사항

- Turborepo: 현재 workspace가 2개뿐이라 도입하지 않는다. 3개째가 생기면
  재검토.
- CLI: v1 범위 밖.
- 인증/SSO: 도구 특성상 불필요.
- npm publish: 엔진은 내부 전용.
