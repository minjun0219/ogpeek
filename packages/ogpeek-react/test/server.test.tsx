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
} from "../src/server.js";
import { FINAL_URL, REDIRECTS, STATUS, makeResult } from "./fixtures.js";

const render = (node: ReactElement) => renderToStaticMarkup(node);

// The `/server` subpath exposes the same components without React
// Context — they should render correctly with no Provider in the tree
// and without "use client" wrappers leaking client-only code paths.

describe("@ogpeek/react/server surface", () => {
  it("Preview renders standalone with .ogpeek-root", () => {
    const html = render(
      <Preview data={derivePreviewData(makeResult(), FINAL_URL)} />,
    );
    expect(html).toContain("ogpeek-root");
    expect(html).toContain("ogpeek-preview");
  });

  it("Preview skips .ogpeek-root when composed=true", () => {
    const html = render(
      <Preview
        data={derivePreviewData(makeResult(), FINAL_URL)}
        composed
      />,
    );
    expect(html).not.toContain("ogpeek-root");
    expect(html).toContain("ogpeek-preview");
  });

  it("ValidationPanel uses lang prop for dictionary (en)", () => {
    const html = render(<ValidationPanel warnings={[]} lang="en" />);
    expect(html).toContain("Validation passed");
    expect(html).not.toContain("검증 통과");
  });

  it("RedirectFlow shows fetched URL and status", () => {
    const html = render(
      <RedirectFlow
        finalUrl={FINAL_URL}
        status={STATUS}
        redirects={REDIRECTS}
        canonical={FINAL_URL}
        lang="en"
      />,
    );
    expect(html).toContain("HTTP 200");
    expect(html).toContain("https://example.com/");
    expect(html).toContain("Fetched URL");
  });

  it("TagTable renders Open Graph rows", () => {
    const html = render(<TagTable result={makeResult()} lang="en" />);
    expect(html).toContain("Open Graph");
    expect(html).toContain("og:title");
  });

  it("Result drills lang and composed into every child", () => {
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
    // Section ordering matches prod: validation → flow → table → preview.
    const validation = html.indexOf("ogpeek-pass-title");
    const flow = html.indexOf("ogpeek-flow-grid");
    const table = html.indexOf("ogpeek-table-header");
    const preview = html.indexOf("ogpeek-preview-domain");
    expect(validation).toBeGreaterThan(-1);
    expect(flow).toBeGreaterThan(validation);
    expect(table).toBeGreaterThan(flow);
    expect(preview).toBeGreaterThan(table);

    // Only the outer wrapper carries .ogpeek-root — children skip it.
    const rootMatches = html.match(/ogpeek-root/g) ?? [];
    expect(rootMatches.length).toBe(1);

    // English preview heading sourced from the bundled dict.
    expect(html).toContain(">Preview<");
  });

  it("Result accepts a dict override on /server", () => {
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
  });
});
