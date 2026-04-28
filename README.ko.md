# ogpeek

> peek into any page's Open Graph tags — and the favicon / JSON-LD
> signals that travel with them
> 어느 페이지든 오픈그래프 메타태그를 바로 들여다봅니다 — 같이 따라
> 다니는 favicon · JSON-LD 같은 보조 메타까지.

> English: [README.md](./README.md)

URL 한 줄로 OG 카드가 어떻게 보이는지 즉시 확인하고, OGP 스펙 위반을
자동으로 잡아내는 OpenGraph 디버깅 도구다. 메인 신호는 OG 그대로 두고,
페이지가 같이 싣고 다니는 보조 헤드 메타(favicon · apple-touch-icon ·
mask-icon, msapplication 타일, `application-name` / `theme-color`,
JSON-LD 블록)도 같은 자리에서 보여줘서 "이 페이지가 다른 곳에서 어떻게
보일까?" 디버깅을 한 화면에서 끝낼 수 있도록 했다.

## 구성

- `packages/ogpeek` — `fetch` · `parse` · `validate`를 담당하는 순수 엔진.
  레포의 본체. 외부 의존성은 `htmlparser2` 하나. Node 22.19+ (개발은 Node
  24 LTS).
- `website` — Next.js 15 (App Router) 기반 **데모 사이트**. 엔진 사용 예제이자
  랜딩. Cloudflare Workers (OpenNext) 한 곳에만 배포한다.

## 빠른 시작

```bash
pnpm install
pnpm -F website dev      # http://localhost:3000
pnpm -F ogpeek test      # 엔진 단위 테스트
```

## 주요 검증 규칙

`packages/ogpeek/src/validate.ts`에서 관리하는 규칙:

- `OG_TITLE_MISSING` / `OG_TITLE_TOO_LONG` (60자 초과 — 카카오톡 잘림)
- `OG_TYPE_MISSING` / `OG_TYPE_UNKNOWN`
- `OG_IMAGE_MISSING`
- `OG_URL_MISSING` / `OG_URL_MISMATCH` (실제 요청 URL과 og:url 불일치)
- `URL_NOT_ABSOLUTE` / `DUPLICATE_SINGLETON` / `ORPHAN_STRUCTURED_PROPERTY` / `INVALID_DIMENSION`
- `MISSING_PREFIX_ATTR` (info)
- `JSONLD_PARSE_ERROR` (`<script type="application/ld+json">` 블록 파싱 실패)

자세한 설명은 `packages/ogpeek/README.md` 참고.

## 스크립트

```bash
pnpm -r typecheck        # workspace 전체 tsc --noEmit
pnpm -F ogpeek test      # 엔진 유닛 테스트
pnpm -F website cf:build # OpenNext + Workers 번들
```

## 라이선스

MIT.
