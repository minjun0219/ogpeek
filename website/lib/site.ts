/**
 * 배포 정본 origin. metadataBase · canonical · sitemap · robots 가 모두
 * 이 값을 기준으로 절대 URL 을 만든다. 도메인이 바뀌면 여기 한 곳만 고친다.
 */
export const SITE_URL = "https://ogpeek.dev";

/** 정본이 아닌 과거 호스트 — middleware 가 301 로 정본에 합친다. */
export const LEGACY_HOSTS = ["ogpeek.minjun.dev"];

/**
 * /en·/ko 페이지 쌍의 canonical + hreflang alternate 메타데이터.
 * `path` 는 lang 프리픽스를 뺀 경로 ("" 또는 "/inspect").
 * x-default 는 middleware 의 Accept-Language 판별이 기본으로 삼는 en.
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
