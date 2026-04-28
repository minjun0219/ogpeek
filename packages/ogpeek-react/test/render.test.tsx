import type { ReactElement } from "react";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import {
  Preview,
  RedirectFlow,
  Result,
  TagTable,
  ValidationPanel,
  derivePreviewData,
} from "../src/index.js";
import { FINAL_URL, REDIRECTS, STATUS, makeResult } from "./fixtures.js";

const render = (node: ReactElement) => renderToStaticMarkup(node);

describe("@ogpeek/react render", () => {
  it("Preview emits real img and description elements", () => {
    const result = makeResult();
    const html = render(
      <Preview data={derivePreviewData(result, FINAL_URL)} />,
    );
    expect(html).toContain("ogpeek-root");
    expect(html).toContain("ogpeek-preview");
    expect(html).toContain('<img class="ogpeek-preview-image"');
    expect(html).toContain('class="ogpeek-preview-description"');
    expect(html).toContain("Hello");
    expect(html).toContain("example.com");
  });

  it("Preview falls back to empty image placeholder", () => {
    const result = makeResult();
    result.ogp.images = [];
    const html = render(
      <Preview data={derivePreviewData(result, FINAL_URL)} />,
    );
    expect(html).toContain('class="ogpeek-preview-image-empty"');
    expect(html).not.toContain("<img");
  });

  it("ValidationPanel pass state when no warnings (ko default)", () => {
    const html = render(<ValidationPanel warnings={[]} />);
    expect(html).toContain("ogpeek-pass-title");
    expect(html).toContain("검증 통과");
  });

  it("ValidationPanel uses en when lang=en", () => {
    const html = render(<ValidationPanel warnings={[]} lang="en" />);
    expect(html).toContain("Validation passed");
    expect(html).not.toContain("검증 통과");
  });

  it("ValidationPanel sorts and groups warnings by severity", () => {
    const html = render(
      <ValidationPanel
        lang="ko"
        warnings={[
          { code: "OG_TITLE_MISSING", severity: "error", message: "missing" },
          { code: "OG_URL_MISMATCH", severity: "warn", message: "mismatch" },
        ]}
      />,
    );
    expect(html).toContain("OG_TITLE_MISSING");
    expect(html).toContain("OG_URL_MISMATCH");
    expect(html.indexOf("ogpeek-warning-item--error")).toBeLessThan(
      html.indexOf("ogpeek-warning-item--warn"),
    );
  });

  it("ValidationPanel emits warning value when present", () => {
    const html = render(
      <ValidationPanel
        warnings={[
          {
            code: "OG_URL_MISMATCH",
            severity: "warn",
            message: "mismatch",
            property: "og:url",
            value: "https://example.com/canonical",
          },
        ]}
      />,
    );
    expect(html).toContain('class="ogpeek-warning-value"');
    expect(html).toContain("og:url:");
    expect(html).toContain("https://example.com/canonical");
  });

  it("TagTable lists groups (ko default)", () => {
    const html = render(<TagTable result={makeResult()} />);
    expect(html).toContain("Open Graph");
    expect(html).toContain("Twitter Card");
    expect(html).toContain("og:title");
    expect(html).toContain("twitter:card");
    expect(html).toContain("총 3개");
  });

  it("TagTable renders icons as clickable links resolved against baseUrl", () => {
    const result = makeResult({
      icons: [
        { rel: "icon", href: "/favicon.ico", sizes: "any" },
        {
          rel: "apple-touch-icon",
          href: "https://cdn.example.com/apple-icon.png",
          sizes: "180x180",
          type: "image/png",
        },
      ],
    });
    const html = render(
      <TagTable result={result} baseUrl="https://example.com/page" />,
    );
    expect(html).toContain(">아이콘<");
    // Relative href is absolutized against baseUrl.
    expect(html).toContain('href="https://example.com/favicon.ico"');
    // Already-absolute href is preserved.
    expect(html).toContain('href="https://cdn.example.com/apple-icon.png"');
    // target/rel are attached.
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
    // Sizes/type metadata is shown as muted suffix, not part of the link.
    expect(html).toContain("sizes: any");
    expect(html).toContain("sizes: 180x180");
    expect(html).toContain("type: image/png");
  });

  it("TagTable falls back to plain text when an icon href has no safe URL", () => {
    const result = makeResult({
      icons: [{ rel: "icon", href: "javascript:alert(1)" }],
    });
    const html = render(
      <TagTable result={result} baseUrl="https://example.com/" />,
    );
    // The URL is shown as text but never wrapped in an anchor — the
    // sanitizer rejects non-http(s) schemes so a malicious href can never
    // become a clickable link.
    expect(html).not.toContain('href="javascript:');
    expect(html).toContain("<td>javascript:alert(1)</td>");
  });

  it("TagTable renders og:image and og:url as clickable links", () => {
    const result = makeResult();
    const html = render(
      <TagTable result={result} baseUrl="https://example.com/" />,
    );
    expect(html).toContain('href="https://example.com/img.png"');
    expect(html).toContain('href="https://example.com/"');
  });

  it("TagTable renders a JSON-LD group with pretty JSON and parse-error payloads", () => {
    const result = makeResult({
      jsonld: [
        {
          raw: '{"@type":"WebSite","name":"Example"}',
          parsed: { "@type": "WebSite", name: "Example" },
          types: ["WebSite"],
        },
        {
          raw: "{ broken",
          parsed: null,
          types: [],
          error: "Unexpected token b",
        },
      ],
    });
    const html = render(<TagTable result={result} />);
    expect(html).toContain(">JSON-LD<");
    // Successful block: pretty-printed JSON inside a <pre> element with
    // both @type and the inner field surfaced verbatim.
    expect(html).toContain("ogpeek-table-pre");
    expect(html).toContain("&quot;@type&quot;: &quot;WebSite&quot;");
    expect(html).toContain("&quot;name&quot;: &quot;Example&quot;");
    // Error block: parser message and the original payload both visible.
    expect(html).toContain("(파싱 오류)");
    expect(html).toContain("Unexpected token b");
    expect(html).toContain("{ broken");
  });

  it("TagTable surfaces auxiliary meta-name tags in the basic-meta group", () => {
    const result = makeResult({
      meta: {
        title: "Hello",
        canonical: "https://example.com/",
        prefixDeclared: true,
        charset: "utf-8",
        applicationName: "Example App",
        themeColor: "#0a84ff",
        msTileImage: "https://example.com/tile.png",
        msTileColor: "#0a84ff",
      },
      raw: [
        { property: "og:title", content: "Hello" },
        { property: "application-name", content: "Example App" },
        { property: "theme-color", content: "#0a84ff" },
      ],
    });
    const html = render(<TagTable result={result} />);
    expect(html).toContain("application-name");
    expect(html).toContain("Example App");
    expect(html).toContain("theme-color");
    // The Other group must not duplicate the auxiliary meta-name tags it
    // has already promoted into Basic meta.
    const appNameMatches = html.match(/application-name/g) ?? [];
    expect(appNameMatches.length).toBe(1);
  });

  it("RedirectFlow shows fetched URL and status", () => {
    const html = render(
      <RedirectFlow
        finalUrl={FINAL_URL}
        status={STATUS}
        redirects={REDIRECTS}
        canonical={FINAL_URL}
      />,
    );
    expect(html).toContain("HTTP 200");
    expect(html).toContain("https://example.com/");
    expect(html).toContain("가져온 URL");
  });

  it("RedirectFlow shows canonical note when canonical differs", () => {
    const html = render(
      <RedirectFlow
        finalUrl="https://example.com/page"
        status={200}
        redirects={[]}
        canonical="https://example.com/canonical"
      />,
    );
    expect(html).toContain("표준 URL");
    expect(html).toContain("페이지가 선언한 캐노니컬");
  });

  it("RedirectFlow treats a relative canonical as same resource", () => {
    // ogpeek exposes the raw canonical href, which may be relative —
    // resolving it against finalUrl should suppress the "differs" note.
    const html = render(
      <RedirectFlow
        finalUrl="https://example.com/"
        status={200}
        redirects={[]}
        canonical="/"
      />,
    );
    expect(html).not.toContain("표준 URL");
    expect(html).not.toContain("페이지가 선언한 캐노니컬");
  });

  it("RedirectFlow lists redirect hops", () => {
    const html = render(
      <RedirectFlow
        finalUrl="https://example.com/final"
        status={200}
        redirects={[
          {
            from: "https://t.co/x",
            to: "https://example.com/final",
            status: 301,
          },
        ]}
        canonical={null}
      />,
    );
    expect(html).toContain("리디렉션 경로");
    expect(html).toContain("301");
    expect(html).toContain("https://t.co/x");
  });

  it("Result composes sections in display order: validation → flow → table → preview", () => {
    const result = makeResult();
    const html = render(
      <Result
        result={result}
        finalUrl={FINAL_URL}
        status={STATUS}
        redirects={REDIRECTS}
        canonical={FINAL_URL}
        lang="en"
      />,
    );
    const validation = html.indexOf("ogpeek-pass-title");
    const flow = html.indexOf("ogpeek-flow-grid");
    const table = html.indexOf("ogpeek-table-header");
    const preview = html.indexOf("ogpeek-preview-domain");
    expect(validation).toBeGreaterThan(-1);
    expect(flow).toBeGreaterThan(validation);
    expect(table).toBeGreaterThan(flow);
    expect(preview).toBeGreaterThan(table);
  });

  it("Result renders the preview heading from dict (en)", () => {
    const html = render(
      <Result
        result={makeResult()}
        finalUrl={FINAL_URL}
        status={STATUS}
        redirects={REDIRECTS}
        canonical={FINAL_URL}
        lang="en"
      />,
    );
    expect(html).toContain("ogpeek-preview-section");
    expect(html).toContain(">Preview<");
  });

  it("Result renders the preview heading from dict (ko default)", () => {
    const html = render(
      <Result
        result={makeResult()}
        finalUrl={FINAL_URL}
        status={STATUS}
        redirects={REDIRECTS}
        canonical={FINAL_URL}
      />,
    );
    expect(html).toContain("미리보기");
  });

  it("Result accepts a dict override for the preview heading", () => {
    const html = render(
      <Result
        result={makeResult()}
        finalUrl={FINAL_URL}
        status={STATUS}
        redirects={REDIRECTS}
        canonical={FINAL_URL}
        lang="en"
        dict={{ preview: { heading: "Card preview" } }}
      />,
    );
    expect(html).toContain(">Card preview<");
    expect(html).not.toContain(">Preview<");
  });

  it("Result keeps a single ogpeek-root scope (children skip their own)", () => {
    const html = render(
      <Result
        result={makeResult()}
        finalUrl={FINAL_URL}
        status={STATUS}
        redirects={REDIRECTS}
        canonical={FINAL_URL}
        lang="en"
      />,
    );
    const matches = html.match(/ogpeek-root/g) ?? [];
    expect(matches.length).toBe(1);
  });

  it("Result propagates lang via context (children render en copy)", () => {
    const html = render(
      <Result
        result={makeResult()}
        finalUrl={FINAL_URL}
        status={STATUS}
        redirects={REDIRECTS}
        canonical={FINAL_URL}
        lang="en"
      />,
    );
    // ValidationPanel pass state + RedirectFlow + TagTable header all
    // render English copy without any explicit lang prop on the children.
    expect(html).toContain("Validation passed");
    expect(html).toContain("Fetched URL");
    expect(html).toContain("Meta tags");
    expect(html).not.toContain("검증 통과");
    expect(html).not.toContain("가져온 URL");
  });

  it("Result propagates dict override via context", () => {
    const html = render(
      <Result
        result={makeResult()}
        finalUrl={FINAL_URL}
        status={STATUS}
        redirects={REDIRECTS}
        canonical={FINAL_URL}
        lang="en"
        dict={{ redirectFlow: { fetchedUrl: "Resolved URL" } }}
      />,
    );
    expect(html).toContain("Resolved URL");
    expect(html).not.toContain("Fetched URL");
  });

  it("Standalone components still emit their own ogpeek-root", () => {
    // Sanity check that the context-based scoping is opt-in: rendering a
    // panel directly (no Result wrapper, no provider) keeps the existing
    // ogpeek-root scope so the component is self-contained.
    const previewHtml = render(
      <Preview data={derivePreviewData(makeResult(), FINAL_URL)} />,
    );
    const validationHtml = render(<ValidationPanel warnings={[]} />);
    expect(previewHtml).toContain("ogpeek-root");
    expect(validationHtml).toContain("ogpeek-root");
  });
});
