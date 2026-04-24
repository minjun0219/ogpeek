# ogpeek

ogpeek 웹사이트를 구동하는 OGP 엔진.

두 개의 엔트리포인트로 구성된다.

| 엔트리 | 용도 | 런타임 | 의존성 |
| --- | --- | --- | --- |
| `ogpeek` | `parse`, `validate`, 타입 | Node · Bun · Workers · 브라우저 어디서든 | `htmlparser2` |
| `ogpeek/fetch` | 외부 URL 가져오기 (타임아웃/크기상한/리디렉션 추적) | `globalThis.fetch` 가 있는 어디든 | 없음 (Node 내장 포함 X) |

파서 루트 엔트리는 순수 로직이라 `ogpeek/fetch`를 import 하지 않는 한 어떤
런타임 의존성도 끌려오지 않는다. fetch 서브패스 역시 Node 내장 모듈을 쓰지
않으므로 엣지/브라우저 런타임에서도 그대로 로드된다 — SSRF 정책 판단은 엔진
밖으로 뺐기 때문.

## 사용

```ts
import { parse } from "ogpeek";
import { fetchHtml } from "ogpeek/fetch";

const { html, finalUrl } = await fetchHtml("https://ogp.me");
const result = parse(html, { url: finalUrl });

console.log(result.ogp.title);
console.log(result.ogp.images);
for (const w of result.warnings) {
  console.log(`[${w.severity}] ${w.code}: ${w.message}`);
}
```

## API

### `parse(html: string, options?: ParseOptions): OgDebugResult`

- `html` — 원문 HTML 문자열.
- `options.url` — 상대 URL을 절대 URL로 해석할 때 기준이 되는 base. 없으면
  원문에 선언된 `og:url` 을 base로 사용한다.

반환값은 다음 형태다.

```ts
type OgDebugResult = {
  ogp: OpenGraph;                  // 정규화된 OG 트리
  typed: TypedObject | null;       // article / book / profile / music.* / video.*
  twitter: Record<string, string>; // twitter:* passthrough
  raw: Array<{ property: string; content: string }>; // 등장 순서
  warnings: Warning[];
  meta: {
    title: string | null;
    canonical: string | null;      // <link rel="canonical">
    prefixDeclared: boolean;       // <html prefix="og: https://ogp.me/ns#">
    charset: string | null;
  };
};
```

각 구조 속성(`og:image:width` 등)은 가장 최근의 부모(`og:image`)에 attach
된다. 부모 없이 먼저 등장하면 `ORPHAN_STRUCTURED_PROPERTY` 경고로 보고된다.

### `fetchHtml(url: string, options?: FetchOptions): Promise<FetchResult>`

외부 URL을 가져와 HTML 문자열로 반환한다. 타임아웃, 응답 크기 상한, 리디렉션
추적이 기본 내장. 리디렉션은 `redirect: "manual"` 로 받아 hop 마다
`options.guard` 를 다시 돌린다.

- `options.userAgent` — 외부 요청 User-Agent. 기본값은 브라우저 유사 UA.
- `options.timeoutMs` — 요청 타임아웃. 기본 8000.
- `options.maxBytes` — 응답 크기 상한. 기본 5 MiB. 초과 시 스트림을 취소한다.
- `options.guard` — `(url: URL) => Promise<void> | void`. **초기 요청 + 모든
  리디렉션 hop 직전에 호출된다.** 차단하려면 `FetchError` 를 throw, 통과
  시키려면 그냥 return. 미지정 시 아무 검사도 하지 않는다 — ogpeek 은 SSRF
  정책을 판단하지 않는다.

실패 시 `FetchError`(필드: `code`, `status`, `message`)를 throw한다. 주요
코드: `INVALID_URL`, `UNSUPPORTED_SCHEME`, `TIMEOUT`, `NETWORK`,
`UPSTREAM_STATUS`, `NOT_HTML`, `TOO_LARGE`, `REDIRECT_LOOP`,
`TOO_MANY_REDIRECTS`, `BAD_REDIRECT`, `GUARD_FAILED` (가드가 비-FetchError 를
throw 한 경우).

### SSRF 는 호출자 책임

이전 버전은 엔진 안에 `"strict" | "hostname" | false` 3-mode SSRF 가드를
내장했다. 그러나 Cloudflare Workers `nodejs_compat` 의 `dns.lookup()` CNAME
폴리필 버그 등 런타임별 edge case 가 계속 발생했고, 클라우드/온프렘/엣지마다
차단해야 할 사설 대역 정의와 리졸버 전략이 달라서 **라이브러리가 이 정책을
떠안는 것 자체가 잘못된 책임 경계** 라는 결론에 도달했다.

현재 엔진은 `guard` 훅만 제공한다. 자기 배포 환경에 맞는 가드 구현을 호출자
쪽에서 주입해라. 가드는 URL 을 받아 허용이면 return, 차단이면 `FetchError`
를 throw 한다.

#### 예시: 인라인 가드

```ts
import { fetchHtml, FetchError } from "ogpeek/fetch";

await fetchHtml(userInput, {
  guard(url) {
    if (url.hostname === "169.254.169.254") {
      throw new FetchError("BLOCKED_METADATA", 400, "cloud metadata blocked");
    }
  },
});
```

#### 권장 라이브러리

ogpeek `guard` 훅은 URL 한 번 받는 단순 hook 이라, 입맛에 맞는 IP 분류
라이브러리와 붙여 쓰면 된다. 아래는 npm 레지스트리에서 직접 확인한 현역
후보다 (확인일: 2026-04-24).

**`ipaddr.js`** — IP 파싱/대역 분류 유틸. 가드 훅에 그대로 쓰기 좋은 저수준
프리미티브.

```ts
import ipaddr from "ipaddr.js";
import { resolve4, resolve6 } from "node:dns/promises";
import { FetchError } from "ogpeek/fetch";

async function guard(url: URL) {
  const ips = [
    ...(await resolve4(url.hostname).catch(() => [])),
    ...(await resolve6(url.hostname).catch(() => [])),
  ];
  if (ips.length === 0) throw new FetchError("DNS_FAILED", 400, "no records");
  for (const ip of ips) {
    const range = ipaddr.parse(ip).range();
    if (range !== "unicast") {
      throw new FetchError("BLOCKED_PRIVATE_IP", 400, `${url.hostname} → ${ip} (${range})`);
    }
  }
}
```

**`request-filtering-agent`** (azu) — http(s).Agent 구현체. Node 20+/22 지원,
v3.x 는 2025-12 릴리즈. `node-fetch`/`axios`/`got` 처럼 `agent` 파라미터를
받는 클라이언트에만 직접 붙는다 — `globalThis.fetch` 는 agent 를 안 받으므로
ogpeek 과 조합하려면 guard 훅 안에서 자체 IP 검증에 `ipaddr.js` 조합으로
쓰거나, 별도 클라이언트로 미리 확인하는 식으로 조립해야 한다.

**`ssrf-agent-guard`** (swapniluneva) — 유사 프로젝트. 2026-01 릴리즈, 클라우드
메타데이터 엔드포인트(`169.254.169.254` 등)를 명시적으로 블록하는 프리셋을
제공한다. 역시 http.Agent 기반이라 도입 조건은 위와 동일.

> native `fetch()` / undici 에는 SSRF 차단 agent 를 직접 꽂는 표준 API 가
> 없다 (`nodejs/undici#2019` 참고). TOCTOU 가 신경 쓰이는 배포에서는 검증된
> IP 로 직접 connect 하는 **커스텀 undici Dispatcher** 를 guard 가 아닌 별도
> 계층에서 조립하는 게 맞다.

## 경고 코드

| code | severity | 설명 |
| --- | --- | --- |
| `OG_TITLE_MISSING` | error | `og:title` 누락 |
| `OG_TITLE_TOO_LONG` | warn | `og:title` 이 60자 초과 — 카카오톡에서 잘림 |
| `OG_TYPE_MISSING` | error | `og:type` 누락 |
| `OG_IMAGE_MISSING` | error | `og:image` 누락 |
| `OG_URL_MISSING` | error | `og:url` 누락 |
| `OG_URL_MISMATCH` | warn | `og:url` 이 실제 요청 URL과 host/path가 다름 |
| `OG_TYPE_UNKNOWN` | warn | `og:type` 값이 OGP 스펙 화이트리스트에 없음 |
| `URL_NOT_ABSOLUTE` | warn | URL 계열 속성이 절대 URL 아님 |
| `DUPLICATE_SINGLETON` | warn | 단일값 속성이 여러 번 선언됨 |
| `ORPHAN_STRUCTURED_PROPERTY` | warn | 구조화 속성 앞에 부모가 없음 |
| `INVALID_DIMENSION` | warn | width/height 정수 파싱 실패 |
| `MISSING_PREFIX_ATTR` | info | `<html prefix>` 선언 없음 |

## 라이선스

MIT.
