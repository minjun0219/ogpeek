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

SSRF 정책은 엔진이 아니라 `website/lib/ssrf-guard.ts` 에서 관리한다. 엣지
배포(Cloudflare Workers 등)에서 `resolve4/6` 이 미구현/불안정한 경우,
`ssrf-guard.ts` 의 DNS 단계를 hostname-only 검사로 대체하거나 DoH 어댑터를
주입하는 식으로 배포 환경에 맞춰 조정해라.

## 환경 변수

| 변수 | 기본값 | 설명 |
| --- | --- | --- |
| `NEXT_PUBLIC_MODE` | `public` | `public` 또는 `internal`. internal은 랜딩 숨김 + rate limit 해제 |
| `OGPEEK_USER_AGENT` | 브라우저 유사 UA | 외부 페이지 fetch 시 사용할 User-Agent |
| `OGPEEK_RATE_LIMIT_PER_MIN` | `20` | public 모드에서 IP당 분당 요청 수. 0 이하는 무제한 |

SSRF 가드는 website 에서 항상 ON 이다 — 이전 버전에 있던 `OGPEEK_SSRF_MODE` /
`OGPEEK_ALLOW_PRIVATE_NETWORK` 환경변수로는 끌 수 없다. 사내 staging 도메인을
파싱해야 한다면 자체 배포 인스턴스에서 `website/lib/ssrf-guard.ts` 를
수정해라.

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
