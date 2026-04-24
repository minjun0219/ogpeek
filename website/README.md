# ogpeek — website

Next.js 15 (App Router) 기반 ogpeek 웹사이트. UI + API + 랜딩을 한 덩어리로
제공한다.

## 개발

```bash
pnpm -F website dev         # http://localhost:3000
pnpm -F website typecheck
pnpm -F website build       # Next.js production build (standalone)
```

## 배포

운영 배포는 **Docker**가 정본. 패키지 소개용 무료 호스팅으로 **Cloudflare
Workers**를 보조 채널로 둔다.

### Docker

이미지 빌드는 **저장소 루트 디렉토리**에서 한다 — `Dockerfile`은 standalone
출력과 workspace 루트의 lockfile을 전제로 작성됐다.

```bash
docker build -t ogpeek -f website/Dockerfile .
docker run --rm -p 3000:3000 -e NEXT_PUBLIC_MODE=public ogpeek
# internal 모드 (사내용, 랜딩 숨김):
docker run --rm -p 3000:3000 -e NEXT_PUBLIC_MODE=internal ogpeek
```

### Cloudflare Workers

`@opennextjs/cloudflare` 어댑터로 빌드/배포한다. `wrangler.json`은
`nodejs_compat` 플래그를 켜둔 상태.

```bash
pnpm -F website cf:build    # OpenNext 빌드 → .open-next/worker.js
pnpm -F website cf:preview  # 로컬 wrangler 미리보기
pnpm -F website cf:deploy   # 실제 배포 (wrangler login 필요)
```

SSRF 정책은 엔진이 아니라 `website/lib/ssrf-guard.ts` 에서 관리한다. 엣지
배포에서는 `node:dns/promises` 의 `resolve4/6` 이 미구현/불안정할 수 있으므로,
`ssrf-guard.ts` 의 DNS 단계를 hostname-only 검사로 대체하거나 DoH 어댑터를
주입하는 식으로 배포 환경에 맞춰 조정해라 — 엔진은 관여하지 않는다.

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
