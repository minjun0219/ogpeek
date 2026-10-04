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
  // Skip Next internals, the API route, and any static asset path. "/" is
  // listed on its own because with basePath the bare base ("/ogpeek") does
  // not match the pattern below and would 404 instead of picking a language.
  // Next 내부, API route, 정적 파일은 건너뛴다. basePath 를 켜면 base 그 자체
  // ("/ogpeek")가 아래 패턴에 걸리지 않아 언어를 고르지 못하고 404 가 나므로 "/" 를 따로 둔다.
  matcher: ["/", "/((?!_next/|api/|favicon\\.ico|.*\\..*).*)"],
};
