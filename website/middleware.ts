// Next 16 deprecates the `middleware` file name in favor of `proxy`, but the
// name stays on purpose. `proxy.ts` always runs on the Node.js runtime, which
// OpenNext supports on Workers only as an experiment. As `middleware.ts` this
// file runs on the edge runtime that OpenNext supports. That is why the build
// prints a deprecation warning.
// Next 16 은 `middleware` 파일 이름을 deprecated 로 두고 `proxy` 를 권하지만 이 파일은 일부러
// 이름을 유지한다. `proxy.ts` 는 언제나 Node.js 런타임에서 실행되는데 OpenNext 는 Workers 에서
// 이 런타임을 실험 기능으로만 지원한다. `middleware.ts` 로 두면 OpenNext 가 지원하는 edge
// 런타임에서 실행된다. 빌드할 때 나오는 deprecated 경고는 이 때문이다.

import { type NextRequest, NextResponse } from "next/server";
import { BASE_PATH } from "@/lib/site";

// Every page lives under app/[lang]/, but only Korean shows its prefix in
// the URL — English is the unprefixed default, the same layout as mdwire on
// the shared origin. No Accept-Language detection: a URL always shows the
// same language.
// 모든 페이지는 app/[lang]/ 아래 있지만 URL 에 접두사가 보이는 건 한국어뿐이다.
// 영어는 접두사 없는 기본 언어로, 같은 origin 의 mdwire 와 같은 구조다.
// Accept-Language 로 고르지 않으므로 같은 URL 은 언제나 같은 언어다.
//
//   /, /inspect          → rewrite to /en, /en/inspect (URL unchanged)
//   /ko(/...)?           → passthrough
//   /en(/...)?           → 308 to the unprefixed URL (links from before)
export function middleware(req: NextRequest): NextResponse {
  const { pathname } = req.nextUrl;

  if (pathname === "/ko" || pathname.startsWith("/ko/")) {
    return NextResponse.next();
  }

  const url = req.nextUrl.clone();
  if (pathname === "/en") {
    // Straight to the app root's trailing-slash form; a "/" pathname here
    // would come out as "/ogpeek" and cost another hop (lib/root-slash.ts).
    // 앱 루트의 끝 슬래시 형태로 바로 보낸다. 여기서 pathname 을 "/" 로 두면
    // "/ogpeek" 이 되어 한 번 더 이동한다(lib/root-slash.ts).
    return NextResponse.redirect(
      new URL(`${BASE_PATH}/${req.nextUrl.search}`, req.url),
      308,
    );
  }
  if (pathname.startsWith("/en/")) {
    url.pathname = pathname.slice("/en".length);
    return NextResponse.redirect(url, 308);
  }

  url.pathname = pathname === "/" ? "/en" : `/en${pathname}`;
  return NextResponse.rewrite(url);
}

export const config = {
  // Skip Next internals, the API route, and any static asset path. "/" is
  // listed on its own because with basePath the bare base ("/ogpeek") does
  // not match the pattern below.
  // Next 내부, API route, 정적 파일은 건너뛴다. basePath 를 켜면 base 그 자체
  // ("/ogpeek")가 아래 패턴에 걸리지 않으므로 "/" 를 따로 둔다.
  matcher: ["/", "/((?!_next/|api/|favicon\\.ico|.*\\..*).*)"],
};
