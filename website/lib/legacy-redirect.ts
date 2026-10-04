import { LANGS, pickLangFromAcceptLanguage } from "./i18n";
import { LEGACY_HOSTS, SITE_URL } from "./site";

/**
 * 301 for requests on a former host, or null when the host is current.
 *
 * Runs in the worker entry, not in Next middleware: with `basePath` set, Next
 * never routes a path outside the base, and legacy hosts carry no base.
 *
 * - Pages land on the lang-prefixed path in one hop. A browser that cached an
 *   earlier canonical swap's 301 for "/" would otherwise bounce between the
 *   hosts forever; "/en" was never a redirect source, so the chain ends there.
 * - Non-page paths (`/api/*`, `/_next/*`, files such as `/llms.txt`) keep
 *   their path under the new base.
 * - The 301 is cached for an hour in the visitor's own browser only: its
 *   Location depends on Accept-Language, and a bounded lifetime keeps a stale
 *   entry from trapping visitors if the site moves again.
 *
 * 옛 호스트로 온 요청을 301 로 보내고, 지금 호스트면 null 을 돌려준다.
 * `basePath` 를 켜면 Next 는 base 밖 경로를 라우팅하지 않는데 옛 호스트 요청에는
 * base 가 없으므로, Next middleware 가 아니라 워커 엔트리에서 처리한다.
 * - 페이지는 한 번에 언어 접두사 경로로 보낸다. 예전 도메인 교체 때 "/" 의 301 을
 *   캐시한 브라우저가 호스트 사이를 끝없이 오가지 않게 하려는 것이다.
 * - 페이지가 아닌 경로(`/api/*`, `/_next/*`, `/llms.txt` 같은 파일)는 경로를
 *   그대로 새 base 아래로 옮긴다.
 * - 301 은 방문자 브라우저에만 한 시간 캐시한다. Location 이 Accept-Language 에
 *   따라 달라지고, 사이트가 또 옮겨도 낡은 캐시가 방문자를 가두지 않게 한다.
 */
export function legacyRedirect(req: Request): Response | null {
  const url = new URL(req.url);
  if (!LEGACY_HOSTS.includes(url.hostname)) {
    return null;
  }

  const { pathname } = url;
  const isPage =
    !pathname.startsWith("/api/") &&
    !pathname.startsWith("/_next/") &&
    !/\.[^/]+$/.test(pathname);
  let target = pathname;
  if (isPage) {
    const hasPrefix = LANGS.some(
      (l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`),
    );
    if (!hasPrefix) {
      const lang = pickLangFromAcceptLanguage(
        req.headers.get("accept-language"),
      );
      target = pathname === "/" ? `/${lang}` : `/${lang}${pathname}`;
    }
  }

  return new Response(null, {
    status: 301,
    headers: {
      location: `${SITE_URL}${target}${url.search}`,
      "cache-control": "private, max-age=3600",
      vary: "accept-language",
    },
  });
}
