import { BASE_PATH } from "./site";

/**
 * Gives the app root its canonical trailing-slash form, "/ogpeek/".
 *
 * Next (trailingSlash: false) would 308 "/ogpeek/" to "/ogpeek", the opposite
 * of what hail-mary D-065 settled on: the app root ends in a slash, pages
 * below it follow Next's default (no slash). So the worker entry handles the
 * root on its own:
 * - "/ogpeek"  → a 308 Response to "/ogpeek/".
 * - "/ogpeek/" → a Request for "/ogpeek", so Next serves it instead of
 *   redirecting back.
 * - anything else → null.
 *
 * 앱 루트를 끝 슬래시가 붙은 정본 형태 "/ogpeek/" 로 맞춘다.
 * Next(trailingSlash: false)는 "/ogpeek/" 를 "/ogpeek" 으로 308 하는데, hail-mary
 * D-065 는 반대로 앱 루트만 슬래시를 붙이고 하위 페이지는 Next 기본(슬래시 없음)을
 * 따르기로 했다. 그래서 루트는 워커 엔트리가 따로 처리한다.
 * - "/ogpeek"  → "/ogpeek/" 로 가는 308 Response.
 * - "/ogpeek/" → "/ogpeek" 을 묻는 Request. Next 가 되돌려 보내지 않고 서빙한다.
 * - 그 밖 → null.
 */
export function rootSlash(req: Request): Response | Request | null {
  const url = new URL(req.url);
  if (url.pathname === BASE_PATH) {
    url.pathname = `${BASE_PATH}/`;
    return new Response(null, {
      status: 308,
      headers: { location: url.toString() },
    });
  }
  if (url.pathname === `${BASE_PATH}/`) {
    url.pathname = BASE_PATH;
    return new Request(url, req);
  }
  return null;
}
