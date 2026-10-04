import { describe, expect, it } from "vitest";
import { DEFAULT_LANG, langPath, stripLangPrefix } from "../lib/i18n";

describe("langPath", () => {
  it("leaves the default language unprefixed", () => {
    expect(DEFAULT_LANG).toBe("en");
    expect(langPath("en")).toBe("/");
    expect(langPath("en", "/inspect")).toBe("/inspect");
  });

  it("prefixes Korean with /ko", () => {
    expect(langPath("ko")).toBe("/ko");
    expect(langPath("ko", "/inspect")).toBe("/ko/inspect");
  });
});

describe("stripLangPrefix", () => {
  it("returns root for bare lang prefix", () => {
    expect(stripLangPrefix("/en")).toBe("/");
    expect(stripLangPrefix("/ko")).toBe("/");
  });

  it("strips a lang prefix when followed by a sub-path", () => {
    expect(stripLangPrefix("/en/inspect")).toBe("/inspect");
    expect(stripLangPrefix("/ko/inspect")).toBe("/inspect");
    expect(stripLangPrefix("/en/a/b")).toBe("/a/b");
  });

  it("leaves paths without a lang prefix untouched", () => {
    expect(stripLangPrefix("/")).toBe("/");
    expect(stripLangPrefix("/inspect")).toBe("/inspect");
    expect(stripLangPrefix("/a/b")).toBe("/a/b");
  });

  it("does not match paths whose first segment merely starts with en/ko", () => {
    // "/enable" must not be confused with "/en/able".
    expect(stripLangPrefix("/enable")).toBe("/enable");
    expect(stripLangPrefix("/koala")).toBe("/koala");
    expect(stripLangPrefix("/english")).toBe("/english");
  });
});
