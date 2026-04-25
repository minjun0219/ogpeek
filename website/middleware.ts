import { NextResponse, type NextRequest } from "next/server";
import { pickLocaleFromAcceptLanguage } from "@/lib/i18n";

// Locale resolution per page request:
//   /en/*  → English passthrough.
//   /ko/*  → Korean  passthrough.
//   /      → pure redirector. Picks `/en` or `/ko` based on the visitor's
//            Accept-Language (falling back to DEFAULT_LOCALE).
// Because `/` always redirects and `/en` / `/ko` never do, redirect loops
// are structurally impossible. No cookie or other persistence is needed —
// the URL itself is the source of truth.
export function middleware(req: NextRequest): NextResponse {
  if (req.nextUrl.pathname === "/") {
    const target = pickLocaleFromAcceptLanguage(
      req.headers.get("accept-language"),
    );
    const url = req.nextUrl.clone();
    url.pathname = `/${target}`;
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  // Skip Next internals, the API route, and any static asset path.
  matcher: ["/((?!_next/|api/|favicon\\.ico|.*\\..*).*)"],
};
