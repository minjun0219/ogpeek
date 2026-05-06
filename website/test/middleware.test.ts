import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { middleware } from "../middleware";

const ORIGIN = "https://ogpeek.dev";

function makeReq(pathname: string, acceptLanguage: string | null): NextRequest {
  const headers = new Headers();
  if (acceptLanguage !== null) {
    headers.set("accept-language", acceptLanguage);
  }
  return new NextRequest(new URL(pathname, ORIGIN), { headers });
}

describe("middleware", () => {
  describe("passthrough for lang-prefixed paths", () => {
    const cases: Array<[string, string | null]> = [
      ["/en", "ko-KR"],
      ["/en/inspect", "ko"],
      ["/ko", "en-US"],
      ["/ko/inspect", null],
      ["/en/a/b", "en"],
    ];
    for (const [path, accept] of cases) {
      it(`${path} with accept-language=${accept ?? "(none)"} passes through with x-public-pathname=${path}`, () => {
        const res = middleware(makeReq(path, accept));
        // NextResponse.next() carries an x-middleware-next header.
        expect(res.headers.get("x-middleware-next")).toBe("1");
        expect(res.headers.get("location")).toBeNull();
        // The public path is forwarded so server components on nested
        // routes (/en/inspect, /ko/inspect …) compute canonical URLs from
        // the full path rather than the layout's "/${lang}" fallback.
        expect(res.headers.get("x-middleware-override-headers")).toContain(
          "x-public-pathname",
        );
        expect(res.headers.get("x-middleware-request-x-public-pathname")).toBe(
          path,
        );
      });
    }

    it("ignores client-supplied x-public-pathname (spoofing guard)", () => {
      const headers = new Headers();
      headers.set("x-public-pathname", "/ko/anything");
      const req = new NextRequest(new URL("/en", ORIGIN), { headers });
      const res = middleware(req);
      // The middleware overwrites the header with the actual request path;
      // a spoofed value must not survive into server components.
      expect(res.headers.get("x-middleware-request-x-public-pathname")).toBe(
        "/en",
      );
    });
  });

  describe("Korean Accept-Language → redirect to /ko<path>", () => {
    const cases: Array<[string, string]> = [
      ["/", "/ko"],
      ["/inspect", "/ko/inspect"],
      ["/a/b", "/ko/a/b"],
    ];
    for (const [path, expected] of cases) {
      it(`${path} → ${expected}`, () => {
        const res = middleware(makeReq(path, "ko-KR,ko;q=0.9"));
        expect(res.status).toBe(307);
        const loc = res.headers.get("location");
        if (loc === null) {
          throw new Error("expected redirect Location");
        }
        expect(new URL(loc).pathname).toBe(expected);
      });
    }
  });

  describe("non-Korean → rewrite to /en<path> with x-public-pathname", () => {
    const cases: Array<[string, string | null, string]> = [
      ["/", "en-US", "/en"],
      ["/inspect", "en", "/en/inspect"],
      ["/", null, "/en"],
      ["/a/b", "fr-FR", "/en/a/b"],
    ];
    for (const [path, accept, internal] of cases) {
      it(`${path} (accept=${accept ?? "(none)"}) rewrites internally to ${internal}`, () => {
        const res = middleware(makeReq(path, accept));
        // No redirect — rewrite responses do not set Location.
        expect(res.headers.get("location")).toBeNull();
        // NextResponse.rewrite encodes the destination in x-middleware-rewrite.
        const rewriteUrl = res.headers.get("x-middleware-rewrite");
        if (rewriteUrl === null) {
          throw new Error("expected x-middleware-rewrite header");
        }
        expect(new URL(rewriteUrl).pathname).toBe(internal);
        // The public path is forwarded so server components can build
        // canonical URLs and lang-toggle hrefs.
        expect(res.headers.get("x-middleware-override-headers")).toContain(
          "x-public-pathname",
        );
        expect(res.headers.get("x-middleware-request-x-public-pathname")).toBe(
          path,
        );
      });
    }
  });
});
