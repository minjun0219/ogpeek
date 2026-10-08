# ogpeek 에이전트 노트

ogpeek 은 "어느 페이지든 오픈그래프 메타태그를 바로 들여다본다"는 한 가지 목적에 집중한 도구다.
메인 신호는 OG 다. OG 와 함께 다니는 보조 헤드 메타(favicon, apple-touch-icon, mask-icon,
msapplication 타일, `application-name` / `theme-color`, JSON-LD 블록)도 같은 화면에 보여 준다.
"이 페이지가 다른 곳에서 어떻게 보일까?"를 한 곳에서 디버깅하기 위해서다.
메인은 OG 로, 보조는 얇게 둔다. 이 틀과 아래 원칙을 지켜라.

## 구조

- `packages/ogpeek` 은 파서·fetcher·validator 엔진이고 **이 레포의 본체**다. npm 에 `ogpeek` 으로
  **공개 배포**하므로 공개 API 호환성을 생각하며 고쳐라. 외부 의존성은 `htmlparser2` 하나다.
- `packages/ogpeek-react` 는 파서 결과를 렌더링하는 드롭인 React 컴포넌트다(`<Result>`, `<Preview>`,
  `<TagTable>`, `<ValidationPanel>`, `<RedirectFlow>`). npm 에 `@ogpeek/react` 로 **공개 배포**한다.
  `ogpeek` 을 `workspace:^` peer dep 으로 의존한다. 클라이언트 전용 React 훅을 쓰지 않아서 SSR 에서도
  안전하다.
- `packages/ogpeek-extension` 은 엔진을 사용자 브라우저 안에서 실행하는 크로스 브라우저 MV3 확장
  프로그램이다. Workers 데모가 접근하지 못하는 사내망이나 VPN 호스트도 가져올 수 있다. npm 에는 배포하지
  않고, 압축한 unpacked 확장을 GitHub Release 에 올린다. 같은 소스로 Chrome, Firefox, Safari 를
  빌드하며(`BROWSER=` 환경변수로 고른다) v1 파이프라인은 Chrome 만 출력한다. 나머지 매니페스트는 골격만
  있다.
- `website` 는 Next.js 15 App Router + TypeScript strict + Tailwind 로 만든 엔진의 **예제·소개용 데모
  사이트**다. 운영 도구로 만들지 않았고, 패키지를 어떻게 쓰는지 보여 주는 곳이다. Cloudflare Workers
  한 곳에만 배포한다.
- `skills/ogpeek/SKILL.md` 와 `.claude-plugin/` 은 코딩 에이전트에게 언제 ogpeek 을 고르고 어떻게
  쓰는지 알려 주는 Agent Skill 이다. Claude Code 플러그인(`/plugin marketplace add minjun0219/ogpeek`)
  으로 설치한다. 엔진 동작(진입점, `fetchHtml` 기본값, 주의점)을 다시 적어 둔 문서라서, 그 동작을 바꾸는
  PR 에서 함께 고쳐라. `scripts/gen-llms.mjs` 가 이 스킬을 `llms-full.txt` 에도 넣는다.
- `context7.json` 은 Context7 이 이 레포를 색인할 때 쓰는 설정이다. `rules` 에 엔진 사용 규칙을
  적어 두었으므로 공개 API 나 엔진 동작이 바뀌면 스킬과 함께 고쳐라. CI(`biome` job)가 Context7 이
  공개한 스키마로 검증한다(설명 200자, 규칙 하나당 255자 등).
- workspace 안에서 두 라이브러리는 `workspace:*` 로 참조한다. exports 가 `dist/*.js` 와
  `dist/*.d.ts` 를 가리키므로 소비하는 쪽(website, 또는 `ogpeek` 을 쓰는 `@ogpeek/react`)보다 상류를
  먼저 빌드해야 한다. 루트의 `pnpm libs:build` 가 위상 순서대로 빌드하고, website 의 `dev`, `build`,
  `typecheck`, `cf:build` 스크립트가 각각 이 명령을 호출한다. 라이브러리 소스를 고쳤으면
  `pnpm libs:build` 를 다시 실행하거나 `tsc --watch` 를 같이 띄워라.
- 엔진의 진입점은 둘이다. 루트 `ogpeek` 은 어디서나 동작하는 parse/validate 이고, `ogpeek/fetch` 는
  Node 친화 fetcher 다. 루트 경로에 Node 전용 모듈을 끌어들이지 마라.
- 로컬 개발은 **Node 24 LTS** 기준이다(`.nvmrc`). `engines.node` 는 `>=22.19.0` 이지만 새 코드는
  Node 24 에서만 검증한다.

## 원칙

1. **엔진은 순수 로직이다.** DOM, React, Next 타입을 import 하지 마라. 외부 의존성은 `htmlparser2`
   하나뿐이고 Node 내장 모듈도 쓰지 않는다. 엔진은 SSRF 를 판단하지 않으므로 `node:dns` 나 `node:net`
   에 의존할 이유가 없다.
2. **한꺼번에 다시 쓰지 않는다.** 버그 수정과 기능 추가는 합리적인 최소 변경으로 한다. 파서는 단위
   테스트가 지키고 있다. 테스트를 먼저 읽고 그 테스트가 지키는 범위 안에서 고쳐라.
3. **SSRF 는 호출하는 쪽이 책임진다.** 엔진은 SSRF 정책을 판단하지 않는다. 모든 요청 hop(최초 URL 과
   모든 리디렉션 대상) 직전에 호출되는 `guard` 훅 하나만 제공한다. 막으려면 `FetchError` 를 `throw`
   하고, 통과시키려면 `return` 한다. 리졸버 동작과 "사설 대역"의 정의는 배포 환경(클라우드, 온프렘,
   엣지)마다 달라서 가드는 호출하는 쪽이 구현한다. website 는 `lib/ssrf-guard.ts` 에 자체 가드를 두고
   `fetchHtml({ guard: ssrfGuard })` 로 넘긴다. SSR 페이지 방문(`/{lang}/inspect?url=...`)도 `/api/parse`
   와 같은 가드와 rate limiter 를 써야 한다. 리디렉션은 반드시 `redirect: "manual"` 로 받아서 hop 마다
   가드를 다시 실행한다.
4. **언어 규칙.**
   - 사용자에게 보이는 UI 문구는 전부 한국어다. 에러 코드와 API 응답 키는 영어다.
   - `AGENTS.md` 는 한국어로만 쓴다.
   - 커밋 메시지와 PR 제목은 Conventional Commits 접두어 뒤에 한국어 요약을 해라체 현재형으로 쓴다.
     예: `fix(website): 좁은 화면에서 헤더 메뉴가 꺾이지 않게 한다`. PR 본문도 한국어로 쓴다.
   - 새로 쓰는 코드 주석은 영어와 한국어를 함께 쓴다. 영어 줄을 먼저 쓰고 바로 아래에 같은 뜻의
     한국어 줄을 쓴다. 이미 영어로만 쓴 주석은 그대로 두고, 코드를 고칠 때도 일부러 옮기지 않는다.

     ```ts
     // Loaded on first call so the engine stays out of the initial bundle.
     // 첫 호출 때 불러와서 엔진이 초기 번들에 들어가지 않게 한다.
     ```
   - README 는 영어(`README.md`)와 한국어(`README.ko.md`) 두 벌을 같은 커밋에서 함께 고친다.
     changeset 설명은 CHANGELOG 에 그대로 실리므로 영어로 쓴다.
   - 한국어 글은 [korean-writing 스킬](https://github.com/minjun0219/skills/tree/main/skills/korean-writing)
     을 따른다. 영문이나 코드 뒤 조사는 띄어 쓴다(`ogpeek 을`, `` `parse` 가 ``).
   - PR 을 연 뒤에는 채팅에서 짧게 한국어로 정리해 알린다.
5. **새 의존성에 보수적이다.** 패키지를 추가하기 전에 표준 라이브러리, 기존 유틸, Tailwind 기본
   스타일로 해결되는지 먼저 확인해라.
6. **미리보기는 하나만 보여 준다.** OG 카드 모양은 플랫폼마다 거의 같아서 대표 미리보기 하나면 충분하다.
   플랫폼별 변형을 늘리거나 미리보기에 SNS 이름을 붙이지 마라. 도구의 단일 목적이 흐려진다.
7. **보조 메타는 얇게 둔다.** 보조 메타(아이콘, JSON-LD, `application-name` / `theme-color` /
   `msapplication-*`)는 디버깅용 화면이고 검증기로 만들지 않는다. "추출, 표시, 파싱 오류 보고"까지만
   한다. schema.org 규칙 검증, manifest.json 가져오기, 플랫폼별 아이콘 해석은 범위 밖이다. Google Rich
   Results Test 나 Schema.org Validator 같은 도구가 이미 있고, 이것까지 끌어들이면 OG 가 메인이라는 틀이
   흐려진다. `parse()` 의 `jsonldScope` 옵션은 `<body>` JSON-LD 까지 훑는 비용을 호출하는 쪽이 골라서
   켜게 하려고 둔 것이다.

## 자주 쓰는 명령

```bash
pnpm libs:build             # 두 라이브러리를 위상 순서로 빌드 (ogpeek -> @ogpeek/react)
pnpm libs:typecheck         # 두 라이브러리 타입 체크
pnpm -F ogpeek test         # 엔진 단위 테스트
pnpm -F @ogpeek/react test  # React 컴포넌트 테스트
pnpm -F website typecheck   # 데모 사이트 타입 체크 (libs:build 먼저 실행)
pnpm -F website dev         # 로컬 개발 서버 (Node 24, libs:build 먼저 실행)
pnpm -F website cf:build    # OpenNext + Workers 번들 (libs:build 먼저 실행)
pnpm -F website cf:preview  # 로컬 wrangler 미리보기
pnpm -F website cf:deploy   # 수동 배포 (부트스트랩·긴급용)
pnpm check                  # biome 포맷 + 린트 검사 (CI 는 `biome ci`)
pnpm check:fix              # biome 자동 수정 (포맷 + 안전한 린트 수정)
```

## 디렉터리 약속

- API route 는 `website/app/api/<name>/route.ts` 에 둔다. runtime 은 고정하지 않는다.
  `lib/ssrf-guard.ts` 가 DoH(`cloudflare-dns.com/dns-query`)를 fetch 하므로 같은 코드가 Node 와
  Workers 에서 똑같이 동작한다.
- 미리보기는 `website/components/previews/` 아래에 대표 하나만 둔다(원칙 6).
- 서버 전용 로직은 `website/lib/*.ts` 에 둔다. 클라이언트 컴포넌트는 파일 맨 위에 `"use client"` 를
  쓴다.
- 경고 코드를 추가할 때는 네 곳을 함께 고친다.
  ① `packages/ogpeek/src/types.ts` 의 유니온,
  ② `validate.ts` 의 구현,
  ③ `test/validate.test.ts` 의 테스트,
  ④ `packages/ogpeek/README.md` 의 표.
  하나라도 빠지면 PR 을 받지 않는다. 웹사이트의 검증 항목 목록(`website/components/landing/Checks.tsx`
  와 `lib/i18n.ts` 의 `checks.rules`)은 `Record<WarningCode, …>` 타입이라서, 빠뜨리면 website 타입
  체크가 실패한다.
- SSR 페이지 방문(`/{lang}/inspect?url=...`)은 `/api/parse` 와 같은 per-IP rate limiter 를 써야 한다.
  우회 경로를 만들지 마라.
- `website/components/WebMcpTools.tsx` 가 브라우저 에이전트용 WebMCP 도구(`ogpeek_inspect`,
  `ogpeek_parse`)를 등록한다. `ogpeek_inspect` 는 반드시 `/api/parse` 를 거쳐서 같은 가드와 rate
  limiter 를 써야 한다. `ogpeek_parse` 는 넘겨받은 HTML 만 파싱하고 fetch 하지 않는다.

## 배포

데모 사이트는 **Cloudflare Workers(OpenNext 경유)** 한 곳에만 배포한다. Docker, Vercel, 자체 호스팅
옵션은 모두 정리했다. website 는 엔진 소개 사이트라서 배포 경로 하나면 충분하다.

### Cloudflare Workers

`@opennextjs/cloudflare` 로 빌드한다. 설정 파일은 다음 셋이다.

- `website/wrangler.json`: `compatibility_flags: ["nodejs_compat"]` 가 필요하다.
  `compatibility_date` 는 `2025-09-23` 이다.
- `website/open-next.config.ts`: OpenNext 어댑터 설정. 기본은 인메모리 캐시다.
- `website/package.json`: `cf:build`, `cf:preview`, `cf:deploy` 스크립트.

사이트는 `minjun.kim/ogpeek/` 에 붙는다. minjun.kim 은 개인 사이트(Custom Domain)와 origin 을 함께
쓰고, ogpeek 워커는 zone route `minjun.kim/ogpeek` · `minjun.kim/ogpeek/*` 로 그 앞에서 먼저 실행된다.
그래서 지켜야 할 것이 셋이다.

- Next `basePath` 는 `lib/site.ts` 의 `BASE_PATH` 하나에서 나온다. `Link`, `router.push`, 메타데이터 파일
  라우트는 base 를 알아서 붙이지만 날 `<a href>` · `<img src>` · `fetch()` 경로는 `withBase()` 로 붙인다.
- 옛 호스트(`ogpeek.minjun.dev`, `ogpeek.dev`)는 mdwire 처럼 `minjun.kim/ogpeek/` 로 301 한다.
  `website/worker.ts`(OpenNext 를 감싸는 워커 엔트리)가 `lib/legacy-redirect.ts` 로 처리하고, 앱 루트의 끝
  슬래시(`/ogpeek` → `/ogpeek/`)는 `lib/root-slash.ts` 가 맡는다. basePath 밖 경로는 Next 가 라우팅하지
  않으므로 middleware 로 옮기지 마라.
- 경로 · 슬래시 · 리다이렉트 · robots 같은 `minjun.kim/<이름>/` 하위 앱 규칙은 minjun.kim repo 가 정본이다.
- localStorage 나 쿠키를 새로 쓰면 키에 `ogpeek` 접두사를 붙인다. 같은 origin 을 다른 사이트와 함께 쓴다.

**`main` 에 푸시하면 그대로 배포된다.** 이 레포에 Workers Builds 가 연결되어 있어서 `main` 커밋마다
새로 클론해서 빌드한다. 로컬 `cf:deploy` 는 부트스트랩이나 긴급 상황에만 쓴다. 로컬에서 배포하면
커밋하지 않은 상태가 프로덕션에 올라가고, 다음 `main` 푸시가 그 상태를 말없이 덮어쓴다.

Workers Builds 는 깨끗한 체크아웃에서 시작하므로 gitignore 된 파일은 그곳에 없다. `website/.env` 는
gitignore 대상이다. `NEXT_PUBLIC_POSTHOG_KEY` · `NEXT_PUBLIC_POSTHOG_HOST` 는 `NEXT_PUBLIC_*` 라서 런타임에 읽지 않고
**`next build` 가 번들에 인라인**한다.
그래서 브라우저 분석 키는 Workers Builds **프로덕션 트리거**의 빌드 변수에만 넣는다. 프리뷰 트리거와
로컬에는 넣지 않고, 키나 호스트가 없으면 PostHog 를 초기화하지 않는다. 호스트에는 폴백을 두지 않는다 —
posthog-js 기본값(`us.i.posthog.com`)으로 리버스 프록시를 조용히 우회하는 빌드를 막기 위해서다. Worker secret 은
번들에 들어가지 않으므로 쓸 수 없다. `cf:build` 는 먼저 `website/scripts/require-analytics-env.mjs` 를 실행해서
프로덕션 빌드(`WORKERS_CI_BRANCH=main`)에서 `NEXT_PUBLIC_POSTHOG_KEY` 나 `NEXT_PUBLIC_POSTHOG_HOST` 가 없으면
빌드를 실패시킨다. 일부러 분석 없이 배포하려면 `OGPEEK_ALLOW_NO_ANALYTICS=1` 을 설정한다. 이 가드를 넣기
전까지 ogpeek.dev 는 이벤트를 한 건도 수집하지 못했다.

PostHog 는 minjun.kim origin 의 다른 앱(사이트·mdwire)과 같은 프로젝트·쿠키를 쓰고, 수집 범위도 같게 맞춘다.
페이지뷰·떠남과 커스텀 이벤트 `webmcp_tool_called` 만 모으고, 클릭 자동 수집·히트맵·dead click·Web Vitals·예외·
세션 녹화·설문은 `lib/posthog.tsx` 에서 명시적으로 끈다. full 번들이라 끄지 않으면 프로젝트 설정만으로 다시
켜진다. 크롤러는 코드가 아니라 PostHog 프로젝트의 "내부·테스트 사용자 제외" 필터로 뺀다.

### SSRF 가드와 런타임

`website/lib/ssrf-guard.ts` 는 hostname 문자열을 검사하고 Cloudflare DoH JSON
API(`cloudflare-dns.com/dns-query`)로 A/AAAA 레코드를 조회한다. 그다음 `ipaddr.js` 의 `range()` 로
사설·예약 대역을 한 번에 막는다. `fetch()` 한 번만 쓰므로 Node 와 Workers 에서 똑같이 동작한다. Node
전용 의존(`node:dns`, undici Agent)은 모두 제거했다.

DNS rebinding TOCTOU 창(검증한 IP 와 `fetch()` 가 실제로 연결하는 IP 사이)은 열려 있다. Workers 는 raw
TCP 를 열 수 없어서 연결 시점에 IP 를 고정하지 못한다. 그래서 데모 수준의 얕은 방어에서 멈췄다. 운영
도구가 아닌 엔진 소개 사이트라는 점을 고려해 합의한 trade-off 다.

엔진은 SSRF 정책을 판단하지 않는다(원칙 3). 가드를 고칠 때는 `ssrf-guard.ts` 만 고치고, SSRF 로직이
엔진(`packages/ogpeek`)으로 새지 않게 해라.

## 범위 밖

- Turborepo: 아직 도입하지 않는다. 빌드 DAG 는 `ogpeek` → `@ogpeek/react` → `website` 이고,
  `packages/ogpeek-extension` 은 두 라이브러리를 쓰는 말단이다. 배포에 필요한 하위 그래프의 위상 순서는
  `pnpm -r --filter 'website^...'` 가 이미 처리한다. 퍼블리시 job 은 npm provenance 증명 때문에 새로
  빌드해야 해서 원격 캐시를 둬도 이득이 작다. 조건 (a)(4번째 workspace)는 이미 충족됐다. 다음 중 하나가
  더 나빠지면 다시 검토한다. **(b) npm 에 배포하는 3번째 패키지가 생긴다**(changesets fixed 그룹의 npm
  항목이 3개가 된다). **(c) `pnpm -F website dev` 콜드 스타트가 15초 안팎을 넘는다.** **(d) job 사이
  CI 캐시 공유가 원격 캐시를 둘 만큼 중요해진다.**
- TypeScript project references(`composite: true` + `tsc -b`): 켜지 않는다. 조건은 Turborepo 의 (c)와
  같다. 캐시가 찬 상태의 typecheck 나 dev 시작 시간이 실제로 불편해지면 도입한다.
- CLI: v1 범위 밖이다.
- 인증, SSO: 이런 도구에는 필요하지 않다.

## 릴리스

npm 에는 두 패키지를 공개 배포한다. 엔진 `ogpeek` 과 React 컴포넌트 `@ogpeek/react` 다.
`ogpeek-extension`(Chrome MV3)은 GitHub Release zip 으로 배포한다. 세 패키지는 하나의 제품으로 보고
[changesets](https://github.com/changesets/changesets)의 `fixed` 그룹 하나로 **버전을 맞춘다**.
`package.json#version` 과 확장의 `manifest/*.json` 버전은 손으로 고치지 마라.

- 배포가 필요한 변경은 같은 PR 에 **changeset 파일**을 넣는다. `pnpm changeset` 을 실행해서 세 패키지
  중 아무거나 고르고(fixed 그룹이 함께 올린다) 범프 단계(patch, minor, major)를 고른 뒤 변경을 설명한다.
  이 설명이 CHANGELOG 항목이 되므로 릴리스 노트를 읽을 사람을 생각하며 쓴다. 문서나 CI 만 바꾼 변경은
  changeset 없이 내고, 릴리스도 일어나지 않는다.
- `.github/workflows/release.yml` 은 `main` 푸시마다 실행된다. changeset 파일이 남아 있으면
  `changesets/action` 이 `chore(release): Version Packages` PR 하나를 열거나 갱신한다. 이 PR 의
  `version` 명령은 `pnpm changeset:version` 이다. `changeset version` 이 세 workspace 의
  `package.json` 과 패키지별 `CHANGELOG.md` 를 올리고, 이어서 `scripts/sync-versions.mjs` 가 같은 버전을
  루트 `package.json` 과 `packages/ogpeek-extension/manifest/*.json` 에 기록한다. Chrome Web Store 는
  버전이 오르지 않은 재업로드를 거부하므로 manifest 에 버전을 기록하는 단계를 빼면 안 된다.
- 이 PR 을 머지하면 `scripts/release-github.mjs` 가 `vX.Y.Z` 태그 **하나**와 GitHub Release **하나**를
  만든다. 릴리스 노트는 해당 CHANGELOG 절이다. 이 스크립트는 GitHub Release 가 이미 있는지로 판단해서
  여러 번 실행해도 결과가 같으므로, 중간에 실패하면 다음 `main` 푸시에서 다시 시도된다. 이 단계의
  `release_created` 출력에 따라 같은 워크플로 실행 안에서 퍼블리시 job 세 개가 실행된다.
  `publish-ogpeek`(npm), `publish-ogpeek-react`(npm), `publish-ogpeek-extension`(Chrome zip 을 빌드해서
  GitHub Release 에 올린다)이다.
- changesets 설정은 `.changeset/config.json` 에 있다. `fixed` 그룹
  `["ogpeek", "@ogpeek/react", "ogpeek-extension"]` 이 버전을 묶는다. `website` 는 `ignore` 대상이다
  (배포만 하고 릴리스하지 않는다). changelog 형식은 `@changesets/changelog-github` 이고, 로컬에서
  `changeset version` 을 실행하려면 `GITHUB_TOKEN` 이 필요하다. 기준 버전은
  `packages/ogpeek/package.json#version` 이다. git 태그는 패키지 접두어 없이 `vX.Y.Z` 로 쓴다.
- `changesets/action` 의 알려진 trade-off: Version PR 은 워크플로의 `GITHUB_TOKEN` 으로 만들어지고, 이
  토큰이 만든 PR 은 CI 워크플로를 트리거하지 **않는다**. 이 PR 은 버전과 CHANGELOG 파일만 고치므로, PR 을
  만든 시점의 `main` CI 결과를 보고 머지한다. 수동 `workflow_dispatch` 경로는 일부러 두지 않았다. 릴리스
  흐름이 그만큼 막히면 그때 trade-off 를 따져 보고 다시 넣는다.
- 인증: 두 npm 퍼블리시는 npm Trusted Publisher(OIDC)를 써서 시크릿이 필요 없다. 두 패키지 모두
  `publishConfig.access: "public"` 과 `publishConfig.provenance: true` 를 쓰고, 빌드 산출물만 담는다
  (`files: ["dist", "README.md", "LICENSE"]`). `prepack` 훅이 퍼블리시 직전에 빌드를 강제한다. 확장
  퍼블리시는 `GITHUB_TOKEN` 만 쓴다. npm 에는 접근하지 않고, 만든 태그에 `gh release upload --clobber`
  를 실행한다.
- 버전을 묶는 trade-off: `ogpeek` 에 patch changeset 하나만 넣어도 내용이 바뀌지 않은 `@ogpeek/react` 와
  `ogpeek-extension` 의 새 버전이 함께 나간다. 세 패키지는 실제로 함께 움직이고, 묶음 태그와 Release 가
  현실과 맞으므로 받아들인다. CHANGELOG 항목은 패키지별 파일(`packages/*/CHANGELOG.md`, changesets 가
  작성)에 남는다. release-please 시절(v0.5.0 이하)의 루트 `CHANGELOG.md` 는 git 이력에만 있다.

### Chrome Web Store 자동 배포

GitHub Release 에 zip 을 올리는 `publish-ogpeek-extension` job 이 같은 zip 을
[`chrome-webstore-upload-cli`](https://github.com/fregante/chrome-webstore-upload-cli)로 Chrome Web
Store 에도 올리고 심사를 제출한다(`--auto-publish`). 이 단계는 `vars.CHROME_AUTOPUBLISH == 'true'` 일
때만 실행된다. 자동 배포 경로를 모두 연결하기 전까지는 아무 일도 하지 않고, 그동안 릴리스는 GitHub
Release zip 만으로 진행된다.

이 단계에 필요한 값:

| 종류 | 이름 | 용도 |
| --- | --- | --- |
| Variable | `CHROME_AUTOPUBLISH` | `'true'` 면 이 단계를 실행한다. 다른 값이거나 설정하지 않으면 건너뛴다. |
| Secret | `CHROME_EXTENSION_ID` | 첫 수동 업로드 뒤 발급되는 아이템 ID. |
| Secret | `CHROME_CLIENT_ID` | Chrome Web Store API 를 켠 Google Cloud OAuth 2.0 *Desktop* 클라이언트 ID. |
| Secret | `CHROME_CLIENT_SECRET` | `CHROME_CLIENT_ID` 와 짝을 이루는 시크릿. |
| Secret | `CHROME_REFRESH_TOKEN` | 오래 유지되는 OAuth refresh token. 작업용 컴퓨터에서 `npx chrome-webstore-upload-keys`(또는 `https://www.googleapis.com/auth/chromewebstore` scope 를 요청하는 같은 흐름)로 한 번 만들어 붙여 넣는다. |

처음 한 번은 수동으로 준비한다. API 는 이미 있는 아이템만 갱신할 수 있다.

1. [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)에서 개발자
   등록비 $5 를 한 번 낸다.
2. 릴리스용 zip 을 로컬에서 만든다. `pnpm -F ogpeek-extension package:chrome` 을 실행하면
   `packages/ogpeek-extension/dist/ogpeek-chrome.zip` 이 생긴다.
3. 대시보드에서 **New item** 으로 zip 을 올리고 스토어 등록 정보(설명, 스크린샷, 카테고리, 언어,
   개인정보처리방침 URL, 단일 목적 사유, `<all_urls>` host permission 사유)를 채운 뒤 심사를 제출한다.
4. Google 이 첫 버전을 승인하면 발급된 아이템 ID 를 `CHROME_EXTENSION_ID` 에 넣고 OAuth 클라이언트와
   refresh token 을 만든다. 변경이 한 번에 반영되도록 `CHROME_AUTOPUBLISH=true` 는 마지막에 설정한다.

그 뒤로는 `release.yml` 이 만드는 모든 릴리스 태그에서 이 단계가 실행된다. 등록 정보 문구와 스크린샷만
대시보드에서 직접 고친다. `manifest/chrome.json` 에 새 권한을 추가하면 심사 기간은 길어지지만
워크플로는 바뀌지 않는다.
