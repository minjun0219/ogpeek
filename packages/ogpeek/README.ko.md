# ogpeek

> 어느 페이지든 오픈그래프 메타태그를 바로 들여다본다.

> English: [README.md](./README.md)

OpenGraph 태그 파싱 · 페치 · 검증을 한 패키지에서 다루는 경량 엔진. 외부
의존성은 `htmlparser2` 하나. Node 20+ · Bun · Workers · 브라우저에서 모두
동작한다.

## 설치

```bash
npm install ogpeek
# 또는
pnpm add ogpeek
# 또는
yarn add ogpeek
```

## 두 개의 엔트리포인트

| 엔트리 | 용도 | 런타임 | 의존성 |
| --- | --- | --- | --- |
| `ogpeek` | `parse`, `validate`, 타입 | Node · Bun · Workers · 브라우저 어디서든 | `htmlparser2` |
| `ogpeek/fetch` | 외부 URL 가져오기 (타임아웃/크기상한/리디렉션 추적) | `globalThis.fetch` 가 있는 어디든 | 없음 (Node 내장 포함 X) |

파서 루트 엔트리는 순수 로직이라 `ogpeek/fetch`를 import 하지 않는 한 어떤
런타임 의존성도 끌려오지 않는다. fetch 서브패스 역시 Node 내장 모듈을 쓰지
않으므로 엣지/브라우저 런타임에서도 그대로 로드된다 — SSRF 정책 판단은 엔진
밖으로 뺐기 때문.

## 빠른 시작

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
`options.guard` 를 다시 돌린다. 결과의 `redirects: { from, to, status }[]` 에
모든 리디렉션 hop 이 발생 순서대로 담긴다 — UI 에서 "URL 입력 → 302 → 최종"
같은 흐름을 그대로 그릴 수 있다.

- `options.userAgent` — 외부 요청 User-Agent. 기본값은 브라우저 유사 UA.
- `options.timeoutMs` — 요청 타임아웃. 기본 8000.
- `options.maxBytes` — 응답 크기 상한. 기본 5 MiB. 초과 시 스트림을 취소한다.
- `options.guard` — `(url: URL) => Promise<void> | void`. **초기 요청 + 모든
  리디렉션 hop 직전에 호출된다.** 차단하려면 `FetchError` 를 throw, 통과
  시키려면 그냥 return. 미지정 시 아무 검사도 하지 않는다 — ogpeek 은 SSRF
  정책을 판단하지 않는다.
- `options.fetch` — `(url: string, init: RequestInit) => Promise<Response>`.
  한 hop 의 HTTP 전송만 수행하는 함수. fetchHtml 이 각 리디렉션 hop 마다
  이 함수를 호출해서 단일 응답을 받는다. 리디렉션 추적 · timeout · maxBytes
  · content-type 판정 · guard 호출은 fetchHtml 이 계속 소유하므로 이 주입점
  은 "전송 정책만" 바꾸는 좁은 슬롯이다 (커스텀 dispatcher, DoH 리졸버, mTLS
  등). 기본값은 `globalThis.fetch`.

실패 시 `FetchError`(필드: `code`, `status`, `message`)를 throw한다. 주요
코드: `INVALID_URL`, `UNSUPPORTED_SCHEME`, `TIMEOUT`, `NETWORK`,
`UPSTREAM_STATUS`, `NOT_HTML`, `TOO_LARGE`, `REDIRECT_LOOP`,
`TOO_MANY_REDIRECTS`, `BAD_REDIRECT`, `GUARD_FAILED` (가드가 비-FetchError 를
throw 한 경우).

### SSRF 는 호출자 책임

엔진은 SSRF 정책을 판단하지 않는다. 클라우드/온프렘/엣지마다 사설 대역
정의와 리졸버 동작이 달라 라이브러리가 이 책임을 떠안는 구조는 조합
폭발을 일으킨다. 대신 `guard` 훅 하나를 두어 호출자가 자기 배포 환경에
맞는 가드를 주입하도록 했다.

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

실전 가드는 hostname 검사 → DNS 리졸브 → IP 대역 분류 순으로 쌓는다.
`ipaddr.js` 로 대역을 분류하고, Node 환경이라면 undici
`Agent({ connect: { lookup } })` 로 검증한 IP 에 직접 connect 해 DNS rebinding
까지 막는 게 정석. 엣지 런타임 (Cloudflare Workers 등) 은 raw TCP 를 열어주지
않으니 DoH(`cloudflare-dns.com/dns-query`) + hostname 검사 까지가 현실적인
범위다. 전체 위협 모델과 구현 레퍼런스는 [OWASP SSRF Prevention Cheat
Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html)
참고. 이 레포의 `website/lib/ssrf-guard.ts` 가 Workers 호환 DoH 가드의 구체
예시다.

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

## 관련 프로젝트

이 엔진으로 만든 웹 도구: <https://github.com/minjun0219/ogpeek>

## 라이선스

MIT.
