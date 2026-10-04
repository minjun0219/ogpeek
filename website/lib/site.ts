import { type Lang, langPath } from "./i18n";

/**
 * Path prefix the site is mounted under on the shared minjun.kim origin.
 * next.config.ts reads it as `basePath`. Next/Link, router.push and metadata
 * file routes add it on their own; raw `<a href>`, `<img src>` and `fetch()`
 * paths do not, so prefix those with `withBase()`.
 * 공유 origin(minjun.kim)에서 사이트가 붙는 경로 접두사다. next.config.ts 가
 * `basePath` 로 읽는다. Next/Link·router.push·메타데이터 파일 라우트는 알아서
 * 붙이지만, 날 `<a href>`·`<img src>`·`fetch()` 경로는 `withBase()` 로 붙인다.
 */
export const BASE_PATH = "/ogpeek";

/**
 * Origin the site is served from. metadataBase takes the origin, not
 * SITE_URL: Next already puts BASE_PATH on metadata file routes such as
 * opengraph-image, so a base path in metadataBase would appear twice.
 * 사이트가 서비스되는 origin 이다. metadataBase 에는 SITE_URL 이 아니라 이 값을
 * 준다. Next 가 opengraph-image 같은 메타데이터 파일 라우트에 BASE_PATH 를 이미
 * 붙이므로, metadataBase 에도 넣으면 경로가 두 번 붙는다.
 */
export const SITE_ORIGIN = "https://minjun.kim";

/**
 * Canonical deployment URL, base path included. Canonical URLs and the
 * sitemap derive absolute URLs from this value — change it in one place if
 * the site ever moves.
 */
export const SITE_URL = `${SITE_ORIGIN}${BASE_PATH}`;

/** Former hosts the worker entry 301s to SITE_URL (lib/legacy-redirect.ts). */
export const LEGACY_HOSTS = ["ogpeek.minjun.dev", "ogpeek.dev"];

/**
 * Prefixes a root-relative path with BASE_PATH. The app root keeps its
 * trailing slash ("/ogpeek/", hail-mary D-065); pages below follow Next's
 * default of no slash.
 * 루트 기준 경로 앞에 BASE_PATH 를 붙인다. 앱 루트는 끝 슬래시를 유지하고
 * ("/ogpeek/", hail-mary D-065) 하위 페이지는 Next 기본대로 슬래시가 없다.
 */
export function withBase(path: string): string {
  return `${BASE_PATH}${path}`;
}

/**
 * canonical + hreflang alternate metadata for an en·ko page pair.
 * `path` is the route without the lang prefix ("" or "/inspect").
 * x-default is en, the unprefixed default language.
 * en·ko 페이지 쌍의 canonical 과 hreflang alternate 메타데이터다. `path` 는
 * 언어 접두사를 뺀 라우트("" 또는 "/inspect")이고, x-default 는 접두사 없는
 * 기본 언어인 en 이다.
 */
export function langAlternates(lang: Lang, path: "" | "/inspect") {
  return {
    canonical: withBase(langPath(lang, path)),
    languages: {
      en: withBase(langPath("en", path)),
      ko: withBase(langPath("ko", path)),
      "x-default": withBase(langPath("en", path)),
    },
  };
}
