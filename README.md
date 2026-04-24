# ogpeek

> peek into any page's Open Graph tags  
> 어느 페이지든 오픈그래프 메타태그를 바로 들여다봅니다.

URL 한 줄로 카카오톡·슬랙·페이스북·X·링크드인에서 어떻게 보이는지 즉시
확인하고, OGP 스펙 위반을 자동으로 잡아내는 OpenGraph 디버깅 도구다.
사내 QA/기획자/개발자 공용 도구이자, 공개 배포 시 랜딩 페이지 역할도
겸한다.

## 구성

- `apps/web` — Next.js 15 (App Router) 기반 웹 앱. UI + API + 랜딩.
- `packages/core` — `fetch` · `parse` · `validate`를 담당하는 순수 엔진.
  외부 의존성은 `htmlparser2` 하나. Node 20+ 기반.

## 빠른 시작

```bash
pnpm install
pnpm -F web dev          # http://localhost:3000
pnpm -F ogpeek-core test # 25개 단위 테스트
```

## Docker

```bash
docker build -t ogpeek -f apps/web/Dockerfile .
docker run --rm -p 3000:3000 -e NEXT_PUBLIC_MODE=public ogpeek
# internal 모드 (사내용, 랜딩 숨김):
docker run --rm -p 3000:3000 -e NEXT_PUBLIC_MODE=internal ogpeek
```

## 환경 변수

| 변수 | 기본값 | 설명 |
| --- | --- | --- |
| `NEXT_PUBLIC_MODE` | `public` | `public` 또는 `internal`. internal은 랜딩 숨김 + rate limit 해제 |
| `OGPEEK_USER_AGENT` | 브라우저 유사 UA | 외부 페이지 fetch 시 사용할 User-Agent |
| `OGPEEK_ALLOW_PRIVATE_NETWORK` | `0` | `1`로 설정 시 사설/루프백/링크로컬 IP 차단을 해제 |
| `OGPEEK_RATE_LIMIT_PER_MIN` | `20` | public 모드에서 IP당 분당 요청 수. 0 이하는 무제한 |

## 주요 검증 규칙

`packages/core/src/validate.ts`에서 관리하는 12개 규칙:

- `OG_TITLE_MISSING` / `OG_TITLE_TOO_LONG` (60자 초과 — 카카오톡 잘림)
- `OG_TYPE_MISSING` / `OG_TYPE_UNKNOWN`
- `OG_IMAGE_MISSING`
- `OG_URL_MISSING` / `OG_URL_MISMATCH` (실제 요청 URL과 og:url 불일치)
- `URL_NOT_ABSOLUTE` / `DUPLICATE_SINGLETON` / `ORPHAN_STRUCTURED_PROPERTY` / `INVALID_DIMENSION`
- `MISSING_PREFIX_ATTR` (info)

자세한 설명은 `packages/core/README.md` 참고.

## 스크립트

```bash
pnpm -r typecheck        # workspace 전체 tsc --noEmit
pnpm -F ogpeek-core test # core 유닛 테스트
pnpm -F web build        # Next.js production build (standalone)
```

## 라이선스

MIT.
