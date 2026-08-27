/**
 * Canonical deployment origin. metadataBase, canonical URLs, the sitemap,
 * and robots all derive absolute URLs from this value — change it in one
 * place if the domain ever moves.
 */
export const SITE_URL = "https://ogpeek.dev";

/** Former hosts that middleware folds into the canonical origin via 301. */
export const LEGACY_HOSTS = ["ogpeek.minjun.dev"];

/**
 * canonical + hreflang alternate metadata for an /en·/ko page pair.
 * `path` is the route without the lang prefix ("" or "/inspect").
 * x-default is en — the fallback the Accept-Language middleware picks.
 */
export function langAlternates(lang: string, path: "" | "/inspect") {
  return {
    canonical: `/${lang}${path}`,
    languages: {
      en: `/en${path}`,
      ko: `/ko${path}`,
      "x-default": `/en${path}`,
    },
  };
}
