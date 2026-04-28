import { type NextRequest, NextResponse } from "next/server";
import { pickLangFromAcceptLanguage } from "@/lib/i18n";

// Language resolution per page request:
//   /en/*  → English passthrough.
//   /ko/*  → Korean  passthrough.
//   /      → pure redirector. Picks `/en` or `/ko` based on the visitor's
//            Accept-Language (falling back to DEFAULT_LANG).
// Because `/` always redirects and `/en` / `/ko` never do, redirect loops
// are structurally impossible. No cookie or other persistence is needed —
// the URL itself is the source of truth.
export function middleware(req: NextRequest): NextResponse {
  if (req.nextUrl.pathname === "/") {
    const target = pickLangFromAcceptLanguage(
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
  matcher: [
    "/((?!_next/|api/|favicon\\.ico|.*\\..*).*)",
  ],
};
