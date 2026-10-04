import { describe, expect, it } from "vitest";
import { legacyRedirect } from "../lib/legacy-redirect";
import { LEGACY_HOSTS, SITE_URL } from "../lib/site";

function req(url: string, acceptLanguage?: string): Request {
  const headers = new Headers();
  if (acceptLanguage) {
    headers.set("accept-language", acceptLanguage);
  }
  return new Request(url, { headers });
}

describe("legacyRedirect", () => {
  it("leaves the canonical host alone", () => {
    expect(legacyRedirect(req(`${SITE_URL}/en`))).toBeNull();
  });

  // Pages land on the lang-prefixed path directly: "/" must never be the
  // target, or a browser holding an earlier swap's cached 301 loops.
  const cases: Array<[string, string]> = [
    ["https://ogpeek.minjun.dev/", `${SITE_URL}/en`],
    ["https://ogpeek.dev/", `${SITE_URL}/en`],
    ["https://ogpeek.minjun.dev/en/inspect", `${SITE_URL}/en/inspect`],
    [
      "https://ogpeek.dev/inspect?url=https%3A%2F%2Fogp.me",
      `${SITE_URL}/en/inspect?url=https%3A%2F%2Fogp.me`,
    ],
    // Non-page paths keep their path under the new base.
    [
      "https://ogpeek.minjun.dev/api/parse?url=ogp.me",
      `${SITE_URL}/api/parse?url=ogp.me`,
    ],
    ["https://ogpeek.minjun.dev/llms.txt", `${SITE_URL}/llms.txt`],
  ];
  for (const [from, to] of cases) {
    it(`${from} → 301 ${to}`, () => {
      const res = legacyRedirect(req(from));
      expect(res?.status).toBe(301);
      expect(res?.headers.get("location")).toBe(to);
    });
  }

  it("honours Accept-Language when picking the prefix", () => {
    const res = legacyRedirect(
      req("https://ogpeek.minjun.dev/inspect", "ko-KR,ko;q=0.9"),
    );
    expect(res?.headers.get("location")).toBe(`${SITE_URL}/ko/inspect`);
  });

  it("bounds the 301 cache to the visitor's own browser", () => {
    // Location depends on Accept-Language, so a shared cache must not reuse
    // one visitor's answer for the next — hence private + Vary, not public.
    const res = legacyRedirect(req("https://ogpeek.dev/"));
    expect(res?.headers.get("cache-control")).toBe("private, max-age=3600");
    expect(res?.headers.get("vary")).toBe("accept-language");
  });

  it("never lists the canonical host as legacy", () => {
    // The one way to get a genuine server-side loop: fold a host onto itself.
    expect(LEGACY_HOSTS).not.toContain(new URL(SITE_URL).hostname);
  });
});
