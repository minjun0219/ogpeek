import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { middleware } from "../middleware";

const ORIGIN = "https://minjun.kim";

function run(pathname: string, acceptLanguage?: string) {
  const headers = new Headers();
  if (acceptLanguage) {
    headers.set("accept-language", acceptLanguage);
  }
  return middleware(new NextRequest(new URL(pathname, ORIGIN), { headers }));
}

describe("middleware", () => {
  describe("unprefixed paths render English in place", () => {
    const cases: Array<[string, string]> = [
      ["/", "/en"],
      ["/inspect", "/en/inspect"],
      ["/a/b", "/en/a/b"],
    ];
    for (const [path, target] of cases) {
      it(`${path} rewrites to ${target}`, () => {
        const res = run(path);
        expect(res.headers.get("location")).toBeNull();
        const rewrite = res.headers.get("x-middleware-rewrite");
        expect(rewrite && new URL(rewrite).pathname).toBe(target);
      });
    }

    it("ignores Accept-Language — the URL alone picks the language", () => {
      const res = run("/", "ko-KR,ko;q=0.9");
      expect(res.headers.get("location")).toBeNull();
      const rewrite = res.headers.get("x-middleware-rewrite");
      expect(rewrite && new URL(rewrite).pathname).toBe("/en");
    });

    it("keeps the query string", () => {
      const res = run("/inspect?url=https%3A%2F%2Fogp.me");
      const rewrite = res.headers.get("x-middleware-rewrite");
      expect(rewrite && new URL(rewrite).searchParams.get("url")).toBe(
        "https://ogp.me",
      );
    });
  });

  describe("Korean passes through", () => {
    for (const path of ["/ko", "/ko/inspect"]) {
      it(`${path} passes through`, () => {
        const res = run(path, "en-US");
        expect(res.headers.get("location")).toBeNull();
        expect(res.headers.get("x-middleware-next")).toBe("1");
      });
    }
  });

  describe("old /en URLs move to the unprefixed form", () => {
    const cases: Array<[string, string]> = [
      ["/en", "/ogpeek/"],
      ["/en/inspect", "/inspect"],
      ["/en/inspect?url=ogp.me", "/inspect?url=ogp.me"],
    ];
    for (const [from, to] of cases) {
      it(`${from} → 308 ${to}`, () => {
        const res = run(from);
        expect(res.status).toBe(308);
        const loc = new URL(res.headers.get("location") ?? "");
        expect(`${loc.pathname}${loc.search}`).toBe(to);
      });
    }
  });

  it("does not treat /enable or /koala as a language prefix", () => {
    const res = run("/enable");
    const rewrite = res.headers.get("x-middleware-rewrite");
    expect(rewrite && new URL(rewrite).pathname).toBe("/en/enable");
    expect(run("/koala").headers.get("x-middleware-next")).toBeNull();
  });
});
