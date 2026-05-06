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

  // x-public-pathname carries the user-visible URL into server components so
  // generateMetadata can build canonical/alternate URLs against the public
  // path rather than the internal /en-prefixed one. We always overwrite it
  // server-side — clients must not be able to spoof what we treat as the
  // request's true path.
  const headers = new Headers(req.headers);
  headers.set("x-public-pathname", pathname);

  if (HAS_LANG_PREFIX.test(pathname)) {
    return NextResponse.next({ request: { headers } });
  }

  const lang = pickLangFromAcceptLanguage(req.headers.get("accept-language"));

  if (lang === "ko") {
    const url = req.nextUrl.clone();
    url.pathname = pathname === "/" ? "/ko" : `/ko${pathname}`;
    return NextResponse.redirect(url);
  }

  const url = req.nextUrl.clone();
  url.pathname = pathname === "/" ? "/en" : `/en${pathname}`;
  return NextResponse.rewrite(url, { request: { headers } });
}

export const config = {
  // Skip Next internals, the API route, and any static asset path.
  matcher: ["/((?!_next/|api/|favicon\\.ico|.*\\..*).*)"],
};
