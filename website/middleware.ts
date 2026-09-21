import { type NextRequest, NextResponse } from "next/server";
import { LANGS, pickLangFromAcceptLanguage } from "@/lib/i18n";
import { LEGACY_HOSTS, SITE_URL } from "@/lib/site";

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

  // Resolve the lang prefix up front so the host fold below can reuse it.
  const lang = pickLangFromAcceptLanguage(req.headers.get("accept-language"));
  const langPath = hasPrefix
    ? pathname
    : pathname === "/"
      ? `/${lang}`
      : `/${lang}${pathname}`;

  // Fold requests on former hosts into the canonical domain with a 301 so
  // search signals consolidate. nextUrl.hostname is port-free, unlike the
  // raw Host header (e.g. "ogpeek.dev:443").
  //
  // Two details are load-bearing, both about browsers caching a 301 with no
  // expiry (RFC 9111 lets them keep it forever):
  //
  //   - Land on the lang-prefixed path in one hop. A browser that cached the
  //     *previous* canonical swap still holds "ogpeek.minjun.dev/ → ogpeek.dev/",
  //     so folding "/" onto "/" would bounce between the hosts forever. "/en"
  //     was never a legacy source, so the chain terminates there.
  //   - Bound the lifetime with Cache-Control. If the canonical ever moves
  //     again, the stale entry expires instead of trapping the visitor.
  //     Search engines treat the move as permanent regardless of this header.
  if (LEGACY_HOSTS.includes(req.nextUrl.hostname)) {
    const res = NextResponse.redirect(
      `${SITE_URL}${langPath}${req.nextUrl.search}`,
      301,
    );
    res.headers.set("cache-control", "public, max-age=3600");
    return res;
  }

  if (hasPrefix) {
    return NextResponse.next();
  }

  const url = req.nextUrl.clone();
  url.pathname = langPath;
  return NextResponse.redirect(url);
}

export const config = {
  // Skip Next internals, the API route, and any static asset path.
  matcher: ["/((?!_next/|api/|favicon\\.ico|.*\\..*).*)"],
};
