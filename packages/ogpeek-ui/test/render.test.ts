import { describe, expect, it } from "vitest";
import {
  renderPreview,
  renderValidationPanel,
  renderTagTable,
  renderRedirectFlow,
  renderResult,
  derivePreviewData,
} from "../src/index.js";
import { FINAL_URL, REDIRECTS, STATUS, makeResult } from "./fixtures.js";

describe("render functions", () => {
  it("renderPreview wraps body in DSD", () => {
    const result = makeResult();
    const html = renderPreview({
      data: derivePreviewData(result, FINAL_URL),
    });
    expect(html).toMatch(/^<og-peek-preview><template shadowrootmode="open">/);
    expect(html).toContain("og-preview");
    expect(html).toContain("Hello");
    expect(html).toContain("example.com");
    expect(html).toContain("</template></og-peek-preview>");
  });

  it("renderPreview emits image and description as real elements", () => {
    const result = makeResult();
    const html = renderPreview({
      data: derivePreviewData(result, FINAL_URL),
    });
    expect(html).toContain('<img class="og-preview-image"');
    expect(html).toContain('<div class="og-preview-description">');
    expect(html).not.toContain("&lt;img");
    expect(html).not.toContain("&lt;div class=&quot;og-preview-description");
  });

  it("renderPreview emits empty-image element when no image", () => {
    const result = makeResult();
    result.ogp.images = [];
    const html = renderPreview({
      data: derivePreviewData(result, FINAL_URL),
    });
    expect(html).toContain('<div class="og-preview-image-empty">');
    expect(html).not.toContain("&lt;div class=&quot;og-preview-image-empty");
  });

  it("renderValidationPanel emits warning value as real element", () => {
    const html = renderValidationPanel({
      warnings: [
        {
          code: "OG_URL_MISMATCH",
          severity: "warn",
          message: "mismatch",
          property: "og:url",
          value: "https://example.com/canonical",
        },
      ],
    });
    expect(html).toContain('<div class="og-warning-value">');
    expect(html).not.toContain("&lt;div class=&quot;og-warning-value");
  });

  it("renderValidationPanel pass state when no warnings", () => {
    const html = renderValidationPanel({ warnings: [] });
    expect(html).toContain("og-pass-title");
    expect(html).toContain("검증 통과"); // ko default
  });

  it("renderValidationPanel uses en when lang=en", () => {
    const html = renderValidationPanel({ warnings: [], lang: "en" });
    expect(html).toContain("Validation passed");
    expect(html).not.toContain("검증 통과");
  });

  it("renderValidationPanel sorts and groups warnings", () => {
    const html = renderValidationPanel({
      lang: "ko",
      warnings: [
        { code: "OG_TITLE_MISSING", severity: "error", message: "missing" },
        { code: "OG_URL_MISMATCH", severity: "warn", message: "mismatch" },
      ],
    });
    expect(html).toContain("OG_TITLE_MISSING");
    expect(html).toContain("OG_URL_MISMATCH");
    expect(html).toContain("og-warning-item--error");
    expect(html).toContain("og-warning-item--warn");
    // error pill should appear before warn pill in source order
    expect(html.indexOf("og-warning-item--error")).toBeLessThan(
      html.indexOf("og-warning-item--warn"),
    );
  });

  it("renderTagTable lists groups", () => {
    const html = renderTagTable({ result: makeResult() });
    expect(html).toContain("Open Graph");
    expect(html).toContain("Twitter Card");
    expect(html).toContain("og:title");
    expect(html).toContain("twitter:card");
    expect(html).toContain("총 3개"); // ko default + 3 raw rows
  });

  it("renderRedirectFlow shows fetched URL and status", () => {
    const html = renderRedirectFlow({
      finalUrl: FINAL_URL,
      status: STATUS,
      redirects: REDIRECTS,
      canonical: FINAL_URL,
    });
    expect(html).toContain("HTTP 200");
    expect(html).toContain("https://example.com/");
    expect(html).toContain("가져온 URL");
  });

  it("renderRedirectFlow shows canonical note when canonical differs", () => {
    const html = renderRedirectFlow({
      finalUrl: "https://example.com/page",
      status: 200,
      redirects: [],
      canonical: "https://example.com/canonical",
    });
    expect(html).toContain("표준 URL");
    expect(html).toContain("페이지가 선언한 캐노니컬");
  });

  it("renderRedirectFlow lists redirect hops", () => {
    const html = renderRedirectFlow({
      finalUrl: "https://example.com/final",
      status: 200,
      redirects: [
        { from: "https://t.co/x", to: "https://example.com/final", status: 301 },
      ],
      canonical: null,
    });
    expect(html).toContain("리디렉션 경로");
    expect(html).toContain("301");
    expect(html).toContain("https://t.co/x");
  });

  it("renderResult composes all four sections in order", () => {
    const result = makeResult();
    const html = renderResult({
      result,
      finalUrl: FINAL_URL,
      status: STATUS,
      redirects: REDIRECTS,
      canonical: FINAL_URL,
    });
    expect(html).toMatch(/^<og-peek-result lang="ko">/);
    // Class names also appear inside <style>. Anchor the order check to
    // the body region after the stylesheet closes.
    const bodyStart = html.indexOf("</style>");
    const body = html.slice(bodyStart);
    const flow = body.indexOf("og-flow-grid");
    const validation = body.indexOf("og-pass-title");
    const preview = body.indexOf("og-preview-domain");
    const table = body.indexOf("og-table-header");
    expect(flow).toBeGreaterThan(-1);
    expect(validation).toBeGreaterThan(flow);
    expect(preview).toBeGreaterThan(validation);
    expect(table).toBeGreaterThan(preview);
  });
});
