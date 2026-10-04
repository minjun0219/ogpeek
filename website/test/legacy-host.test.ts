import { describe, expect, it } from "vitest";
import { legacyRewrite } from "../lib/legacy-host";
import { LEGACY_HOSTS, SITE_URL } from "../lib/site";

describe("legacyRewrite", () => {
  it("leaves the canonical host alone", () => {
    expect(legacyRewrite(new Request(`${SITE_URL}/en`))).toBeNull();
  });

  const cases: Array<[string, string]> = [
    // The bare root maps to the base itself, not "/ogpeek/", so Next does
    // not add a trailing-slash 308 before the lang redirect.
    ["https://ogpeek.minjun.dev/", "https://ogpeek.minjun.dev/ogpeek"],
    ["https://ogpeek.dev/en/inspect", "https://ogpeek.dev/ogpeek/en/inspect"],
    [
      "https://ogpeek.minjun.dev/api/parse?url=ogp.me",
      "https://ogpeek.minjun.dev/ogpeek/api/parse?url=ogp.me",
    ],
    [
      "https://ogpeek.minjun.dev/llms.txt",
      "https://ogpeek.minjun.dev/ogpeek/llms.txt",
    ],
  ];
  for (const [from, to] of cases) {
    it(`${from} → ${to}`, () => {
      expect(legacyRewrite(new Request(from))?.url).toBe(to);
    });
  }

  it("passes through paths the app already put under the base", () => {
    expect(
      legacyRewrite(new Request("https://ogpeek.minjun.dev/ogpeek/en")),
    ).toBeNull();
    expect(
      legacyRewrite(
        new Request("https://ogpeek.minjun.dev/ogpeek/_next/static/x.js"),
      ),
    ).toBeNull();
  });

  it("keeps method, headers and body", async () => {
    const res = legacyRewrite(
      new Request("https://ogpeek.dev/api/parse", {
        method: "POST",
        headers: { "accept-language": "ko" },
        body: "x",
      }),
    );
    expect(res?.method).toBe("POST");
    expect(res?.headers.get("accept-language")).toBe("ko");
    expect(await res?.text()).toBe("x");
  });

  it("never lists the canonical host as legacy", () => {
    expect(LEGACY_HOSTS).not.toContain(new URL(SITE_URL).hostname);
  });
});
