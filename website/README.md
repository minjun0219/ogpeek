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

엣지에서는 `node:dns/promises`의 `lookup()` 호출이 throw 할 수 있으므로
SSRF 가드를 hostname 검사 모드로 두는 걸 권장한다 — 환경변수
`OGPEEK_SSRF_MODE=hostname`. Workers Vars 또는 `wrangler.json` `vars`에
넣는다.

## 환경 변수

| 변수 | 기본값 | 설명 |
| --- | --- | --- |
| `NEXT_PUBLIC_MODE` | `public` | `public` 또는 `internal`. internal은 랜딩 숨김 + rate limit 해제 |
| `OGPEEK_USER_AGENT` | 브라우저 유사 UA | 외부 페이지 fetch 시 사용할 User-Agent |
| `OGPEEK_SSRF_MODE` | `strict` | `strict`(DNS 리졸브 + 사설 IP 차단) / `hostname`(문자열 검사만, 엣지 호환) / `off`(검사 비활성) |
| `OGPEEK_RATE_LIMIT_PER_MIN` | `20` | public 모드에서 IP당 분당 요청 수. 0 이하는 무제한 |
