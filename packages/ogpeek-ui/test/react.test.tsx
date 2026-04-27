import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import {
  OgPeekResult,
  OgPeekValidationPanel,
  OgPeekPreview,
  OgPeekTagTable,
  OgPeekRedirectFlow,
} from "../src/react.js";
import { derivePreviewData } from "../src/index.js";
import { FINAL_URL, REDIRECTS, STATUS, makeResult } from "./fixtures.js";

describe("React wrappers", () => {
  it("OgPeekResult emits a div containing DSD markup", () => {
    const html = renderToStaticMarkup(
      <OgPeekResult
        result={makeResult()}
        finalUrl={FINAL_URL}
        status={STATUS}
        redirects={REDIRECTS}
        canonical={FINAL_URL}
        lang="ko"
      />,
    );
    expect(html).toMatch(/^<div>/);
    expect(html).toContain("<og-peek-result");
    expect(html).toContain('shadowrootmode="open"');
    expect(html).toContain("og-stack");
    expect(html).toContain("Hello");
  });

  it("OgPeekResult forwards className to the wrapper div", () => {
    const html = renderToStaticMarkup(
      <OgPeekResult
        className="max-w-3xl"
        result={makeResult()}
        finalUrl={FINAL_URL}
        status={STATUS}
        redirects={REDIRECTS}
        canonical={FINAL_URL}
      />,
    );
    expect(html).toMatch(/^<div class="max-w-3xl">/);
  });

  it("OgPeekValidationPanel renders pass state", () => {
    const html = renderToStaticMarkup(
      <OgPeekValidationPanel warnings={[]} lang="en" />,
    );
    expect(html).toContain("og-peek-validation-panel");
    expect(html).toContain("Validation passed");
  });

  it("OgPeekPreview renders preview body", () => {
    const html = renderToStaticMarkup(
      <OgPeekPreview data={derivePreviewData(makeResult(), FINAL_URL)} />,
    );
    expect(html).toContain("og-peek-preview");
    expect(html).toContain("og-preview");
    expect(html).toContain("example.com");
  });

  it("OgPeekTagTable renders groups", () => {
    const html = renderToStaticMarkup(
      <OgPeekTagTable result={makeResult()} />,
    );
    expect(html).toContain("og-peek-tag-table");
    expect(html).toContain("Open Graph");
    expect(html).toContain("og:title");
  });

  it("OgPeekRedirectFlow renders fetched URL", () => {
    const html = renderToStaticMarkup(
      <OgPeekRedirectFlow
        finalUrl={FINAL_URL}
        status={STATUS}
        redirects={REDIRECTS}
        canonical={FINAL_URL}
      />,
    );
    expect(html).toContain("og-peek-redirect-flow");
    expect(html).toContain("HTTP 200");
  });
});
