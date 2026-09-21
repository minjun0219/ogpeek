import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { LEGACY_HOSTS, SITE_URL } from "../lib/site";
import { middleware } from "../middleware";

const ORIGIN = "https://ogpeek.minjun.dev";

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

  describe("legacy hosts fold into the canonical origin", () => {
    // The fold lands on the lang-prefixed path directly: "/" must never be
    // the target, or a browser holding the previous swap's cached 301
    // ("<canonical>/ → <legacy>/") bounces between the hosts forever.
    const cases: Array<[string, string]> = [
      ["https://ogpeek.dev/", `${ORIGIN}/en`],
      ["https://ogpeek.dev/en/inspect", `${ORIGIN}/en/inspect`],
      [
        "https://ogpeek.dev/inspect?url=https%3A%2F%2Fogp.me",
        `${ORIGIN}/en/inspect?url=https%3A%2F%2Fogp.me`,
      ],
    ];
    for (const [from, to] of cases) {
      it(`${from} → 301 ${to}`, () => {
        const res = middleware(new NextRequest(new URL(from)));
        expect(res.status).toBe(301);
        expect(res.headers.get("location")).toBe(to);
      });
    }

    it("honours Accept-Language when picking the folded prefix", () => {
      const res = middleware(
        new NextRequest(new URL("https://ogpeek.dev/inspect"), {
          headers: new Headers({ "accept-language": "ko-KR,ko;q=0.9" }),
        }),
      );
      expect(res.headers.get("location")).toBe(`${ORIGIN}/ko/inspect`);
    });

    it("bounds the 301 cache to the visitor's own browser", () => {
      // Location depends on Accept-Language, so a shared cache must not reuse
      // one visitor's answer for the next — hence private + Vary, not public.
      const res = middleware(new NextRequest(new URL("https://ogpeek.dev/")));
      expect(res.headers.get("cache-control")).toBe("private, max-age=3600");
      expect(res.headers.get("vary")).toBe("accept-language");
    });

    it("never lists the canonical host as legacy", () => {
      // The one way to get a genuine server-side loop: fold a host onto itself.
      expect(LEGACY_HOSTS).not.toContain(new URL(SITE_URL).hostname);
    });
  });

  it("does not loop on lang-prefixed paths even with mismatched Accept-Language", () => {
    // /en + Korean Accept-Language must pass through (no redirect to /ko/en).
    const res = middleware(makeReq("/en", "ko-KR"));
    expect(res.headers.get("location")).toBeNull();
    expect(res.headers.get("x-middleware-next")).toBe("1");
  });
});
