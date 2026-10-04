import { describe, expect, it } from "vitest";
import { legacyRedirect } from "../lib/legacy-redirect";
import { LEGACY_HOSTS, SITE_URL } from "../lib/site";

describe("legacyRedirect", () => {
  it("leaves the canonical host alone", () => {
    expect(legacyRedirect(new Request(`${SITE_URL}/ko`))).toBeNull();
  });

  const cases: Array<[string, string]> = [
    ["https://ogpeek.minjun.dev/", "https://minjun.kim/ogpeek/"],
    ["https://ogpeek.dev/", "https://minjun.kim/ogpeek/"],
    // lang-prefixed era
    ["https://ogpeek.minjun.dev/en", "https://minjun.kim/ogpeek/"],
    [
      "https://ogpeek.dev/en/inspect?url=ogp.me",
      "https://minjun.kim/ogpeek/inspect?url=ogp.me",
    ],
    [
      "https://ogpeek.minjun.dev/ko/inspect",
      "https://minjun.kim/ogpeek/ko/inspect",
    ],
    ["https://ogpeek.minjun.dev/en/", "https://minjun.kim/ogpeek/"],
    // pages below the root land on the no-slash form in one hop
    ["https://ogpeek.minjun.dev/ko/", "https://minjun.kim/ogpeek/ko"],
    ["https://ogpeek.dev/en/inspect/", "https://minjun.kim/ogpeek/inspect"],
    ["https://ogpeek.minjun.dev/ogpeek/", "https://minjun.kim/ogpeek/"],
    ["https://ogpeek.minjun.dev/ogpeek/ko/", "https://minjun.kim/ogpeek/ko"],
    // parallel-serving era
    ["https://ogpeek.minjun.dev/ogpeek", "https://minjun.kim/ogpeek/"],
    ["https://ogpeek.minjun.dev/ogpeek/ko", "https://minjun.kim/ogpeek/ko"],
    // API and files keep their path under the base
    [
      "https://ogpeek.minjun.dev/api/parse?url=ogp.me",
      "https://minjun.kim/ogpeek/api/parse?url=ogp.me",
    ],
    [
      "https://ogpeek.minjun.dev/llms.txt",
      "https://minjun.kim/ogpeek/llms.txt",
    ],
  ];
  for (const [from, to] of cases) {
    it(`${from} → 301 ${to}`, () => {
      const res = legacyRedirect(new Request(from));
      expect(res?.status).toBe(301);
      expect(res?.headers.get("location")).toBe(to);
    });
  }

  it("uses 308 for POST so the method and body survive", () => {
    const res = legacyRedirect(
      new Request("https://ogpeek.minjun.dev/api/parse", {
        method: "POST",
        body: '{"url":"ogp.me"}',
      }),
    );
    expect(res?.status).toBe(308);
    expect(res?.headers.get("location")).toBe(
      "https://minjun.kim/ogpeek/api/parse",
    );
  });

  it("bounds the 301 cache", () => {
    const res = legacyRedirect(new Request("https://ogpeek.dev/"));
    expect(res?.headers.get("cache-control")).toBe("max-age=3600");
  });

  it("never lists the canonical host as legacy", () => {
    expect(LEGACY_HOSTS).not.toContain(new URL(SITE_URL).hostname);
  });
});
