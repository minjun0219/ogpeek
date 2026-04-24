# ogpeek

> peek into any page's Open Graph tags  
> 어느 페이지든 오픈그래프 메타태그를 바로 들여다봅니다.

URL 한 줄로 OG 카드가 어떻게 보이는지 즉시 확인하고, OGP 스펙 위반을
자동으로 잡아내는 OpenGraph 디버깅 도구다. 사내 QA/기획자/개발자 공용
도구이자, 공개 배포 시 랜딩 페이지 역할도 겸한다.

## 구성

- `website` — Next.js 15 (App Router) 기반 웹사이트. UI + API + 랜딩.
- `packages/ogpeek` — `fetch` · `parse` · `validate`를 담당하는 순수 엔진.
  외부 의존성은 `htmlparser2` 하나. Node 20+ 기반.

## 빠른 시작

```bash
pnpm install
pnpm -F website dev      # http://localhost:3000
pnpm -F ogpeek test      # 35개 단위 테스트
```

## 주요 검증 규칙

`packages/ogpeek/src/validate.ts`에서 관리하는 12개 규칙:

- `OG_TITLE_MISSING` / `OG_TITLE_TOO_LONG` (60자 초과 — 카카오톡 잘림)
- `OG_TYPE_MISSING` / `OG_TYPE_UNKNOWN`
- `OG_IMAGE_MISSING`
- `OG_URL_MISSING` / `OG_URL_MISMATCH` (실제 요청 URL과 og:url 불일치)
- `URL_NOT_ABSOLUTE` / `DUPLICATE_SINGLETON` / `ORPHAN_STRUCTURED_PROPERTY` / `INVALID_DIMENSION`
- `MISSING_PREFIX_ATTR` (info)

자세한 설명은 `packages/ogpeek/README.md` 참고.

## 스크립트

```bash
pnpm -r typecheck        # workspace 전체 tsc --noEmit
pnpm -F ogpeek test      # 엔진 유닛 테스트
pnpm -F website build    # Next.js production build (standalone)
```

## 라이선스

MIT.
