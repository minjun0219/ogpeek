# ogpeek

> peek into any page's Open Graph tags  
> 어느 페이지든 오픈그래프 메타태그를 바로 들여다봅니다.

URL 한 줄로 카카오톡·슬랙·페이스북·X·링크드인에서 어떻게 보이는지 즉시
확인하고, OGP 스펙 위반을 자동으로 잡아내는 OpenGraph 디버깅 도구다.
사내 QA/기획자/개발자 공용 도구이자, 공개 배포 시 랜딩 페이지 역할도
겸한다.

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

## 배포

운영 배포는 **Docker**가 정본. 패키지 소개용 무료 호스팅으로 **Cloudflare
Workers**를 보조 채널로 둔다.

### Docker

```bash
docker build -t ogpeek -f website/Dockerfile .
docker run --rm -p 3000:3000 -e NEXT_PUBLIC_MODE=public ogpeek
# internal 모드 (사내용, 랜딩 숨김):
docker run --rm -p 3000:3000 -e NEXT_PUBLIC_MODE=internal ogpeek
```

### Cloudflare Workers

`@opennextjs/cloudflare` 어댑터로 빌드/배포한다. `website/wrangler.json`은
`nodejs_compat` 플래그를 켜둔 상태.

```bash
pnpm -F website cf:build      # OpenNext 빌드 → .open-next/worker.js
pnpm -F website cf:preview    # 로컬 wrangler 미리보기
pnpm -F website cf:deploy     # 실제 배포 (wrangler login 필요)
```

엣지에서는 `node:dns/promises`의 `lookup()` 호출이 throw 할 수 있으므로
SSRF 가드를 hostname 검사 모드로 두는 걸 권장한다 — 환경변수
`OGPEEK_SSRF_MODE=hostname`. Workers Vars 또는 `wrangler.json` `vars` 에
넣는다.

## 환경 변수

| 변수 | 기본값 | 설명 |
| --- | --- | --- |
| `NEXT_PUBLIC_MODE` | `public` | `public` 또는 `internal`. internal은 랜딩 숨김 + rate limit 해제 |
| `OGPEEK_USER_AGENT` | 브라우저 유사 UA | 외부 페이지 fetch 시 사용할 User-Agent |
| `OGPEEK_SSRF_MODE` | `strict` | `strict`(DNS 리졸브 + 사설 IP 차단) / `hostname`(문자열 검사만, 엣지 호환) / `off`(검사 비활성) |
| `OGPEEK_ALLOW_PRIVATE_NETWORK` | `0` | (레거시) `1`로 설정 시 가드 해제. `OGPEEK_SSRF_MODE`가 우선 |
| `OGPEEK_RATE_LIMIT_PER_MIN` | `20` | public 모드에서 IP당 분당 요청 수. 0 이하는 무제한 |

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
