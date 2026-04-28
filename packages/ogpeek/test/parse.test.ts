import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parse } from "../src/index";

const fixturesDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "fixtures",
);
const load = (name: string) =>
  readFileSync(path.join(fixturesDir, name), "utf8");

describe("parse()", () => {
  it("parses the full fixture into a complete OGP tree", () => {
    const result = parse(load("full.html"), {
      url: "https://www.imdb.com/title/tt0117500/",
    });

    expect(result.ogp.title).toBe("The Rock");
    expect(result.ogp.type).toBe("article");
    expect(result.ogp.url).toBe("https://www.imdb.com/title/tt0117500/");
    expect(result.ogp.site_name).toBe("IMDb");
    expect(result.ogp.determiner).toBe("the");
    expect(result.ogp.locale).toBe("en_US");
    expect(result.ogp.locale_alternate).toEqual(["fr_FR", "es_ES"]);

    expect(result.ogp.images).toHaveLength(1);
    expect(result.ogp.images[0]).toEqual({
      url: "https://ia.media-imdb.com/images/rock.jpg",
      secure_url: "https://secure.media-imdb.com/images/rock.jpg",
      type: "image/jpeg",
      width: 400,
      height: 300,
      alt: "A shot of Alcatraz.",
    });

    expect(result.ogp.videos[0]).toEqual({
      url: "https://example.com/rock-trailer.mp4",
      type: "video/mp4",
      width: 1280,
      height: 720,
    });

    expect(result.ogp.audios[0]).toEqual({
      url: "https://example.com/rock-theme.mp3",
      type: "audio/mpeg",
    });

    expect(result.typed).not.toBeNull();
    expect(result.typed?.kind).toBe("article");
    expect(result.typed?.properties.published_time).toBe(
      "1996-06-07T00:00:00Z",
    );
    expect(result.typed?.properties.tag).toEqual(["Alcatraz", "San Francisco"]);

    expect(result.twitter).toEqual({
      "twitter:card": "summary_large_image",
      "twitter:site": "@imdb",
    });

    expect(result.meta.title).toBe("The Rock (1996)");
    expect(result.meta.canonical).toBe("https://www.imdb.com/title/tt0117500/");
    expect(result.meta.prefixDeclared).toBe(true);
    expect(result.meta.charset).toBe("utf-8");
    expect(result.icons).toEqual([]);
    expect(result.jsonld).toEqual([]);

    expect(result.warnings).toEqual([]);
  });

  it("collects favicons, app icons, and msapplication / theme tiles", () => {
    const result = parse(load("auxiliary.html"));

    expect(result.icons).toEqual([
      { rel: "icon", href: "/favicon.ico", sizes: "any" },
      { rel: "icon", href: "/icon-32.png", sizes: "32x32", type: "image/png" },
      {
        rel: "apple-touch-icon",
        href: "/apple-icon-180.png",
        sizes: "180x180",
      },
      { rel: "mask-icon", href: "/safari-pinned.svg", color: "#0a84ff" },
    ]);

    expect(result.meta.applicationName).toBe("Example App");
    expect(result.meta.themeColor).toBe("#0a84ff");
    expect(result.meta.msTileImage).toBe("https://example.com/tile.png");
    expect(result.meta.msTileColor).toBe("#0a84ff");
  });

  it("collects JSON-LD blocks from <head> by default and exposes their @types", () => {
    const result = parse(load("auxiliary.html"));

    expect(result.jsonld).toHaveLength(2);
    expect(result.jsonld[0]?.types).toEqual(["WebSite"]);
    expect(result.jsonld[1]?.types).toEqual(["Organization", "BreadcrumbList"]);
    expect(result.jsonld[0]?.error).toBeUndefined();
    expect(result.jsonld[1]?.error).toBeUndefined();
  });

  it("extends JSON-LD scan into <body> when jsonldScope is 'document'", () => {
    const result = parse(load("auxiliary.html"), { jsonldScope: "document" });

    expect(result.jsonld).toHaveLength(3);
    expect(result.jsonld[2]?.types).toEqual(["Article"]);
  });

  it("matches icon-shaped rel as a token set, not as a single string", () => {
    // `<link rel>` is a space-separated token list per HTML spec, so legacy
    // IE form (`shortcut icon`), reordered tokens, and multi-role
    // declarations all need to map to icon entries.
    const html = `
      <html><head><title>T</title>
        <meta property="og:title" content="T">
        <meta property="og:type" content="website">
        <meta property="og:url" content="https://a.com">
        <meta property="og:image" content="https://a.com/x.png">
        <link rel="shortcut icon" href="/legacy.ico">
        <link rel="icon shortcut" href="/legacy-reversed.ico">
        <link rel="icon   apple-touch-icon" href="/dual-role.png" sizes="64x64">
      </head></html>`;
    const result = parse(html);

    expect(result.icons).toEqual([
      { rel: "icon", href: "/legacy.ico" },
      { rel: "icon", href: "/legacy-reversed.ico" },
      { rel: "icon", href: "/dual-role.png", sizes: "64x64" },
      { rel: "apple-touch-icon", href: "/dual-role.png", sizes: "64x64" },
    ]);
  });

  it("accepts JSON-LD with a parameterized MIME type", () => {
    const html = `
      <html><head><title>T</title>
        <meta property="og:title" content="T">
        <meta property="og:type" content="website">
        <meta property="og:url" content="https://a.com">
        <meta property="og:image" content="https://a.com/x.png">
        <script type="application/ld+json; charset=utf-8">
          { "@context": "https://schema.org", "@type": "WebSite", "name": "X" }
        </script>
      </head></html>`;
    const result = parse(html);

    expect(result.jsonld).toHaveLength(1);
    expect(result.jsonld[0]?.types).toEqual(["WebSite"]);
    expect(result.jsonld[0]?.error).toBeUndefined();
  });

  it("handles the minimal fixture with no warnings except info-level", () => {
    const result = parse(load("minimal.html"));
    const errors = result.warnings.filter((w) => w.severity === "error");
    expect(errors).toEqual([]);
    expect(result.ogp.images).toHaveLength(1);
  });

  it("accumulates multiple images with their own subproperties", () => {
    const result = parse(load("arrays.html"));
    expect(result.ogp.images).toHaveLength(2);
    expect(result.ogp.images[0]).toEqual({
      url: "https://example.com/a.png",
      width: 100,
      height: 100,
    });
    expect(result.ogp.images[1]).toEqual({
      url: "https://example.com/b.png",
      width: 200,
      height: 200,
      alt: "Second",
    });
  });

  it("stops scanning after </head>", () => {
    const html = `<html><head><title>H</title><meta property="og:title" content="T"></head><body><meta property="og:fake" content="ignored"></body></html>`;
    const result = parse(html);
    expect(result.raw.find((m) => m.property === "og:fake")).toBeUndefined();
  });

  it("lower-cases meta property names", () => {
    const html = `<html><head><title>T</title><meta property="OG:Title" content="X"><meta name="Twitter:Card" content="summary"></head></html>`;
    const result = parse(html);
    expect(result.ogp.title).toBe("X");
    expect(result.twitter["twitter:card"]).toBe("summary");
  });
});
