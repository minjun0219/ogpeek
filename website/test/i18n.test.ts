import { describe, expect, it } from "vitest";
import {
  DEFAULT_LANG,
  pickLangFromAcceptLanguage,
  stripLangPrefix,
} from "../lib/i18n";

describe("pickLangFromAcceptLanguage", () => {
  it("returns DEFAULT_LANG when header is null or empty", () => {
    expect(pickLangFromAcceptLanguage(null)).toBe(DEFAULT_LANG);
    expect(pickLangFromAcceptLanguage("")).toBe(DEFAULT_LANG);
  });

  it("matches Korean variants by primary subtag", () => {
    expect(pickLangFromAcceptLanguage("ko")).toBe("ko");
    expect(pickLangFromAcceptLanguage("ko-KR")).toBe("ko");
    expect(pickLangFromAcceptLanguage("ko-KR,ko;q=0.9")).toBe("ko");
  });

  it("matches English variants by primary subtag", () => {
    expect(pickLangFromAcceptLanguage("en")).toBe("en");
    expect(pickLangFromAcceptLanguage("en-US")).toBe("en");
    expect(pickLangFromAcceptLanguage("en-GB,en;q=0.9")).toBe("en");
  });

  it("respects q-value ordering", () => {
    // English wins over Korean when its quality is higher.
    expect(pickLangFromAcceptLanguage("en;q=0.9,ko;q=0.5")).toBe("en");
    // Korean wins when it has the higher quality even if listed second.
    expect(pickLangFromAcceptLanguage("en;q=0.3,ko;q=0.9")).toBe("ko");
  });

  it("falls back to DEFAULT_LANG for unsupported tags", () => {
    expect(pickLangFromAcceptLanguage("fr-FR,de;q=0.5")).toBe(DEFAULT_LANG);
    expect(pickLangFromAcceptLanguage("ja")).toBe(DEFAULT_LANG);
  });

  it("skips entries with q=0", () => {
    expect(pickLangFromAcceptLanguage("ko;q=0,en;q=0.5")).toBe("en");
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
