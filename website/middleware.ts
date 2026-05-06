import { type NextRequest, NextResponse } from "next/server";
import { LANGS, pickLangFromAcceptLanguage } from "@/lib/i18n";

// Mirrors the Next.js i18n-routing reference example: every page lives under
// /<lang>/. Requests without a lang prefix are redirected to /<picked-lang>
// based on Accept-Language; lang-prefixed paths pass through unchanged.
//
//   /                    → 307 /<lang>
//   /inspect             → 307 /<lang>/inspect
//   /<en|ko>(/...)?      → passthrough
export function middleware(req: NextRequest): NextResponse {
  const { pathname } = req.nextUrl;
  const hasPrefix = LANGS.some(
    (l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`),
  );
  if (hasPrefix) {
    return NextResponse.next();
  }

  const lang = pickLangFromAcceptLanguage(req.headers.get("accept-language"));
  const url = req.nextUrl.clone();
  url.pathname = pathname === "/" ? `/${lang}` : `/${lang}${pathname}`;
  return NextResponse.redirect(url);
}

export const config = {
  // Skip Next internals, the API route, and any static asset path.
  matcher: ["/((?!_next/|api/|favicon\\.ico|.*\\..*).*)"],
};
