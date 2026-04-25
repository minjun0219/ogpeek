import { NextResponse, type NextRequest } from "next/server";
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  isLocale,
  pickLocaleFromAcceptLanguage,
  type Locale,
} from "@/lib/i18n";

const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

// Locale resolution per page request:
//   /en/*  → English passthrough; refreshes the locale cookie.
//   /ko/*  → Korean  passthrough; refreshes the locale cookie.
//   /      → pure redirector. Picks the target by, in order:
//             1) the user's last explicit choice if a `locale-pref` cookie
//                is present (sticky toggle),
//             2) the Accept-Language preference,
//             3) DEFAULT_LOCALE.
// Because `/` always redirects and `/en` / `/ko` never do, redirect loops
// are structurally impossible and the toggle does not need to write
// cookies — visiting `/en` or `/ko` is what pins the preference.
export function middleware(req: NextRequest): NextResponse {
  const { pathname } = req.nextUrl;

  if (pathname === "/en" || pathname.startsWith("/en/")) {
    return passthroughWithCookie("en");
  }
  if (pathname === "/ko" || pathname.startsWith("/ko/")) {
    return passthroughWithCookie("ko");
  }

  if (pathname === "/") {
    const cookiePref = req.cookies.get(LOCALE_COOKIE)?.value;
    const pinned: Locale | null =
      cookiePref && isLocale(cookiePref) ? cookiePref : null;
    const target =
      pinned ??
      pickLocaleFromAcceptLanguage(req.headers.get("accept-language"));
    const url = req.nextUrl.clone();
    url.pathname = `/${target}`;
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

function passthroughWithCookie(locale: Locale): NextResponse {
  const response = NextResponse.next();
  response.cookies.set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: LOCALE_COOKIE_MAX_AGE,
    sameSite: "lax",
  });
  return response;
}

export const config = {
  // Skip Next internals, the API route, and any static asset path.
  matcher: ["/((?!_next/|api/|favicon\\.ico|.*\\..*).*)"],
};
