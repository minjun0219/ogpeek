import { BASE_PATH, LEGACY_HOSTS } from "./site";

/**
 * Serves the same app on a former host by moving the request under BASE_PATH.
 * Returns the rewritten request, or null when nothing needs to change.
 *
 * The former hosts stay open next to minjun.kim/ogpeek/ until they are
 * merged later (hail-mary D-065). There is one build with `basePath`, and
 * Next never routes a path outside the base, so a bare "/inspect" on a former host
 * has to become "/ogpeek/inspect" before Next sees it. Paths already under the base
 * — every link, asset and redirect the app emits — pass through unchanged, so
 * after the first navigation the address bar reads "<host>/ogpeek/…".
 *
 * 옛 호스트에서도 같은 앱을 서빙하도록 요청 경로를 BASE_PATH 아래로 옮긴다.
 * 바꾼 요청을 돌려주고, 바꿀 것이 없으면 null 을 돌려준다.
 * 옛 호스트는 나중에 합칠 때까지 minjun.kim/ogpeek/ 와 함께 열어 둔다(hail-mary D-065).
 * 빌드는 `basePath` 하나이고 Next 는 base 밖 경로를 라우팅하지 않으므로, 옛 호스트의
 * "/inspect" 는 Next 에 닿기 전에 "/ogpeek/inspect" 가 되어야 한다. 앱이 내보내는 링크·에셋·
 * 리다이렉트처럼 이미 base 아래인 경로는 그대로 두므로, 한 번 이동하면 주소창은
 * "<host>/ogpeek/…" 가 된다.
 */
export function legacyRewrite(req: Request): Request | null {
  const url = new URL(req.url);
  if (!LEGACY_HOSTS.includes(url.hostname)) {
    return null;
  }
  const { pathname } = url;
  if (pathname === BASE_PATH || pathname.startsWith(`${BASE_PATH}/`)) {
    return null;
  }
  url.pathname = pathname === "/" ? BASE_PATH : `${BASE_PATH}${pathname}`;
  return new Request(url, req);
}
