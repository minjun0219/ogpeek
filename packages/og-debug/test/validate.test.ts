import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { parse } from "../src/index";
import type { WarningCode } from "../src/types";

const fixturesDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "fixtures");
const load = (name: string) => readFileSync(path.join(fixturesDir, name), "utf8");

const codes = (warnings: { code: WarningCode }[]) => warnings.map((w) => w.code);

describe("validate()", () => {
  it("reports required-field errors on the invalid fixture", () => {
    const result = parse(load("invalid.html"));
    const got = codes(result.warnings);
    expect(got).toContain("OG_TITLE_MISSING");
    expect(got).toContain("OG_URL_MISSING");
    expect(got).toContain("DUPLICATE_SINGLETON");
    expect(got).toContain("URL_NOT_ABSOLUTE");
    expect(got).toContain("ORPHAN_STRUCTURED_PROPERTY");
    expect(got).toContain("OG_TYPE_UNKNOWN"); // "novel" (second type value) is unknown
    expect(got).toContain("INVALID_DIMENSION");
    expect(got).toContain("MISSING_PREFIX_ATTR");
  });

  it("does not flag absolute https URLs as non-absolute", () => {
    const html = `<html><head><title>T</title><meta property="og:title" content="T"><meta property="og:type" content="website"><meta property="og:url" content="https://a.com"><meta property="og:image" content="https://a.com/x.png"></head></html>`;
    const got = codes(parse(html).warnings);
    expect(got).not.toContain("URL_NOT_ABSOLUTE");
  });

  it("flags protocol-relative URLs", () => {
    const html = `<html><head><title>T</title><meta property="og:title" content="T"><meta property="og:type" content="website"><meta property="og:url" content="//a.com"><meta property="og:image" content="https://a.com/x.png"></head></html>`;
    const got = codes(parse(html).warnings);
    expect(got).toContain("URL_NOT_ABSOLUTE");
  });

  it("accepts all OGP spec object types", () => {
    for (const type of [
      "website",
      "article",
      "book",
      "profile",
      "music.song",
      "music.album",
      "music.playlist",
      "music.radio_station",
      "video.movie",
      "video.episode",
      "video.tv_show",
      "video.other",
    ]) {
      const html = `<html><head><title>T</title><meta property="og:title" content="T"><meta property="og:type" content="${type}"><meta property="og:url" content="https://a.com"><meta property="og:image" content="https://a.com/x.png"></head></html>`;
      const got = codes(parse(html).warnings);
      expect(got, type).not.toContain("OG_TYPE_UNKNOWN");
    }
  });

  it("treats MISSING_PREFIX_ATTR as info-only", () => {
    const html = `<html><head><title>T</title><meta property="og:title" content="T"><meta property="og:type" content="website"><meta property="og:url" content="https://a.com"><meta property="og:image" content="https://a.com/x.png"></head></html>`;
    const result = parse(html);
    const prefix = result.warnings.find((w) => w.code === "MISSING_PREFIX_ATTR");
    expect(prefix?.severity).toBe("info");
  });
});
