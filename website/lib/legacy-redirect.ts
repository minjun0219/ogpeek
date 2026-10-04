import { BASE_PATH, LEGACY_HOSTS, SITE_ORIGIN } from "./site";

/**
 * Maps a path on a former host to its address under minjun.kim/ogpeek/.
 * Former hosts served three generations of URLs, and each lands on the
 * current page in one hop:
 * - "/ogpeek/…" from the period both hosts served the app → same path.
 * - "/en", "/en/…" from the lang-prefixed era → the unprefixed English page.
 * - anything else ("/", "/ko/…", "/inspect", "/api/…", files) → under the base.
 * The app root keeps its trailing slash ("/ogpeek/"); pages below it have none.
 * 옛 호스트의 경로를 minjun.kim/ogpeek/ 아래 주소로 옮긴다. 옛 호스트에는 세 세대의
 * URL 이 있었고, 어느 것이든 한 번에 지금 페이지로 간다.
 * - 두 호스트가 함께 서빙하던 때의 "/ogpeek/…" → 같은 경로.
 * - 언어 접두사 시절의 "/en", "/en/…" → 접두사 없는 영어 페이지.
 * - 그 밖("/", "/ko/…", "/inspect", "/api/…", 파일) → base 아래로.
 * 앱 루트는 끝 슬래시("/ogpeek/")를 유지하고, 그 아래 페이지는 슬래시가 없다.
 */
export function legacyTarget(pathname: string): string {
  let path = pathname;
  if (path === BASE_PATH || path.startsWith(`${BASE_PATH}/`)) {
    path = path.slice(BASE_PATH.length);
  }
  if (path === "/en" || path.startsWith("/en/")) {
    path = path.slice("/en".length);
  }
  // Pages below the root drop a trailing slash ("/ko/" → "/ko") so the visitor
  // does not take Next's 308 as a second hop.
  // 루트 아래 페이지는 끝 슬래시를 뗀다("/ko/" → "/ko"). Next 의 308 을 한 번 더 거치지 않게 한다.
  if (path.length > 1 && path.endsWith("/")) {
    path = path.replace(/\/+$/, "");
  }
  return `${BASE_PATH}${path === "" ? "/" : path}`;
}

/**
 * 301 for any request on a former host (ogpeek.minjun.dev, ogpeek.dev) to
 * minjun.kim/ogpeek/, the same way mdwire folds its former host; null
 * otherwise. The query string is kept. The 301 is cached for an hour only,
 * so a stale entry cannot trap visitors if the site moves again.
 * 옛 호스트(ogpeek.minjun.dev, ogpeek.dev)로 온 요청을 mdwire 처럼
 * minjun.kim/ogpeek/ 로 301 하고, 아니면 null 을 돌려준다. 쿼리는 유지한다.
 * 사이트가 또 옮겨도 낡은 캐시가 방문자를 가두지 않게 301 캐시는 한 시간으로 묶는다.
 */
export function legacyRedirect(req: Request): Response | null {
  const url = new URL(req.url);
  if (!LEGACY_HOSTS.includes(url.hostname)) {
    return null;
  }
  // A 301 lets clients turn POST into GET and drop the body, which breaks
  // `POST /api/parse`; 308 keeps the method and body for anything but GET/HEAD.
  // 301 은 클라이언트가 POST 를 GET 으로 바꾸고 본문을 버리게 둔다(`POST /api/parse` 가
  // 깨진다). GET/HEAD 가 아니면 메서드와 본문을 지키는 308 을 쓴다.
  const safe = req.method === "GET" || req.method === "HEAD";
  return new Response(null, {
    status: safe ? 301 : 308,
    headers: {
      location: `${SITE_ORIGIN}${legacyTarget(url.pathname)}${url.search}`,
      "cache-control": "max-age=3600",
    },
  });
}
