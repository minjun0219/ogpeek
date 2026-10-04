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

/** Former hosts the worker entry keeps serving under BASE_PATH (lib/legacy-host.ts). */
export const LEGACY_HOSTS = ["ogpeek.minjun.dev", "ogpeek.dev"];

/** Prefixes a root-relative path with BASE_PATH. */
export function withBase(path: string): string {
  return `${BASE_PATH}${path}`;
}

/**
 * canonical + hreflang alternate metadata for an /en·/ko page pair.
 * `path` is the route without the lang prefix ("" or "/inspect").
 * x-default is en — the fallback the Accept-Language middleware picks.
 */
export function langAlternates(lang: string, path: "" | "/inspect") {
  return {
    canonical: withBase(`/${lang}${path}`),
    languages: {
      en: withBase(`/en${path}`),
      ko: withBase(`/ko${path}`),
      "x-default": withBase(`/en${path}`),
    },
  };
}
