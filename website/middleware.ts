import { type NextRequest, NextResponse } from "next/server";
import { pickLangFromAcceptLanguage } from "@/lib/i18n";

const HAS_LANG_PREFIX = /^\/(en|ko)(\/|$)/;

// Language resolution per page request:
//   /en/*, /ko/* → passthrough. These are stable, never redirected and never
//                  rewritten — the EN toggle relies on /en being reachable
//                  even for visitors with a Korean Accept-Language.
//   /<path>      + Korean Accept-Language → redirect to /ko<path>.
//   /<path>      + everything else        → internal rewrite to /en<path>.
//                  The browser URL stays unprefixed; only one [lang]/ tree
//                  exists in the file system.
//
// Because lang-prefixed paths are passthrough, redirect loops are
// structurally impossible.
export function middleware(req: NextRequest): NextResponse {
  const { pathname } = req.nextUrl;

  if (HAS_LANG_PREFIX.test(pathname)) {
    return NextResponse.next();
  }

  const lang = pickLangFromAcceptLanguage(req.headers.get("accept-language"));

  if (lang === "ko") {
    const url = req.nextUrl.clone();
    url.pathname = pathname === "/" ? "/ko" : `/ko${pathname}`;
    return NextResponse.redirect(url);
  }

  const url = req.nextUrl.clone();
  url.pathname = pathname === "/" ? "/en" : `/en${pathname}`;

  // Pass the user-visible pathname through so server components can build
  // canonical URLs and lang-toggle hrefs against the public path, not the
  // internal /en-prefixed one.
  const headers = new Headers(req.headers);
  headers.set("x-public-pathname", pathname);
  return NextResponse.rewrite(url, { request: { headers } });
}

export const config = {
  // Skip Next internals, the API route, and any static asset path.
  matcher: ["/((?!_next/|api/|favicon\\.ico|.*\\..*).*)"],
};
