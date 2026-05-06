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
      it(`${path} with accept-language=${accept ?? "(none)"} passes through`, () => {
        const res = middleware(makeReq(path, accept));
        // NextResponse.next() carries an x-middleware-next header.
        expect(res.headers.get("x-middleware-next")).toBe("1");
        expect(res.headers.get("location")).toBeNull();
      });
    }
  });

  describe("non-prefixed paths redirect to /<picked-lang><path>", () => {
    const cases: Array<[string, string | null, string]> = [
      ["/", "ko-KR,ko;q=0.9", "/ko"],
      ["/inspect", "ko", "/ko/inspect"],
      ["/", "en-US", "/en"],
      ["/inspect", "en", "/en/inspect"],
      ["/", null, "/en"],
      ["/a/b", "fr-FR", "/en/a/b"],
    ];
    for (const [path, accept, expected] of cases) {
      it(`${path} (accept=${accept ?? "(none)"}) → ${expected}`, () => {
        const res = middleware(makeReq(path, accept));
        expect(res.status).toBe(307);
        const loc = res.headers.get("location");
        if (loc === null) {
          throw new Error("expected redirect Location");
        }
        expect(new URL(loc).pathname).toBe(expected);
      });
    }
  });

  it("preserves the query string when redirecting", () => {
    const req = new NextRequest(
      new URL("/inspect?url=https%3A%2F%2Fogp.me", ORIGIN),
      { headers: new Headers({ "accept-language": "en" }) },
    );
    const res = middleware(req);
    const loc = res.headers.get("location");
    if (loc === null) {
      throw new Error("expected redirect Location");
    }
    const u = new URL(loc);
    expect(u.pathname).toBe("/en/inspect");
    expect(u.searchParams.get("url")).toBe("https://ogp.me");
  });

  it("does not loop on lang-prefixed paths even with mismatched Accept-Language", () => {
    // /en + Korean Accept-Language must pass through (no redirect to /ko/en).
    const res = middleware(makeReq("/en", "ko-KR"));
    expect(res.headers.get("location")).toBeNull();
    expect(res.headers.get("x-middleware-next")).toBe("1");
  });
});
