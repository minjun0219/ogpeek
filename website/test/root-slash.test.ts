import { describe, expect, it } from "vitest";
import { rootSlash } from "../lib/root-slash";

describe("rootSlash", () => {
  it("308s the bare base to the trailing-slash root, keeping the query", () => {
    const res = rootSlash(new Request("https://minjun.kim/ogpeek?ref=hub"));
    expect(res).toBeInstanceOf(Response);
    expect((res as Response).status).toBe(308);
    expect((res as Response).headers.get("location")).toBe(
      "https://minjun.kim/ogpeek/?ref=hub",
    );
  });

  it("serves the trailing-slash root as the base so Next does not bounce it", () => {
    const res = rootSlash(new Request("https://minjun.kim/ogpeek/"));
    expect(res).toBeInstanceOf(Request);
    expect((res as Request).url).toBe("https://minjun.kim/ogpeek");
  });

  it("leaves pages below the root alone", () => {
    for (const path of ["/ogpeek/ko", "/ogpeek/inspect", "/ogpeek/ko/"]) {
      expect(rootSlash(new Request(`https://minjun.kim${path}`))).toBeNull();
    }
  });
});
