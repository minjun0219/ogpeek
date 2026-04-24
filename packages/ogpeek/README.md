# ogpeek

> 어느 페이지든 오픈그래프 메타태그를 바로 들여다본다.

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

| 엔트리 | 용도 | 런타임 |
| --- | --- | --- |
| `ogpeek` | `parse`, `validate`, 타입 | Node · Bun · Workers · 브라우저 |
| `ogpeek/fetch` | 외부 URL 가져오기 + SSRF 가드 | Node 20+ (엣지는 `ssrf: "hostname"` 필요) |

루트 엔트리는 순수 로직이라 `ogpeek/fetch`를 import 하지 않는 한 Node 전용
모듈이 번들에 끌려오지 않는다.

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

외부 URL을 가져와 HTML 문자열로 반환한다. SSRF 가드, 타임아웃, 응답 크기
상한이 기본 내장. 리디렉션은 `redirect: "manual"` 로 받아 hop 마다 가드를 다시 돌린다.

- `options.userAgent` — 외부 요청 User-Agent. 기본값은 브라우저 유사 UA.
- `options.timeoutMs` — 요청 타임아웃. 기본 8000.
- `options.maxBytes` — 응답 크기 상한. 기본 5 MiB. 초과 시 스트림을 취소한다.
- `options.ssrf` — SSRF 가드 모드. 기본 `"strict"`.
  - `"strict"` — `node:dns/promises`의 `lookup()` 으로 hostname을 IP로
    리졸브하고 사설/루프백/링크로컬 대역을 차단. **Node.js 환경 전용**
    (Cloudflare Workers 등 엣지에서는 `lookup()` 이 throw할 수 있다).
  - `"hostname"` — hostname 문자열 검사만. `localhost`/`*.localhost`/리터럴
    사설 IP를 차단. DNS 리졸브 없음. 엣지 런타임 호환.
  - `false` — 검사 비활성. 신뢰된 URL만 처리하는 소비자용. **기본값을 끄지 마라**.

환경변수 `OGPEEK_SSRF_MODE`로 기본 모드를 덮어쓸 수도 있다 (`strict` |
`hostname` | `off`).

실패 시 `FetchError`(필드: `code`, `status`, `message`)를 throw한다.

### 알려진 한계 — DNS rebinding (`"strict"` 모드)

SSRF 가드의 strict 모드는 요청 **전에** `dns.lookup()`으로 hostname을 해석하지만,
실제 `fetch()`는 연결 시점에 다시 해석한다. 공격자 제어 DNS가 첫 lookup에는
공개 IP를, 연결 시에는 사설 IP를 돌려주는 시나리오에 TOCTOU 틈이 있다.
완전한 방어는 검증한 리터럴 IP로 직접 연결하면서 원 hostname을 Host 헤더
/ SNI에 넣는 커스텀 undici Agent가 필요하고, 현재 범위에는 과한 복잡도라
도입하지 않았다. 공개 DNS가 신뢰 가능한 배포 환경을 전제한다.

`"hostname"` 모드는 DNS 리졸브를 아예 하지 않으므로, **공개 hostname이 사설
IP로 리졸브되는 경우는 통과시킨다**. Cloudflare Workers처럼 같은 네트워크 안에
사설 자원이 없는 엣지 런타임 한정으로 사용하라.

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
