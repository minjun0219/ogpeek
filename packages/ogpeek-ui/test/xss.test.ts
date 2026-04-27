import { describe, expect, it } from "vitest";
import {
  renderPreview,
  renderTagTable,
  renderValidationPanel,
  derivePreviewData,
} from "../src/index.js";
import { makeResult } from "./fixtures.js";

const PAYLOAD = `<script>alert(1)</script>"><img onerror=alert(2)>`;

describe("XSS escaping", () => {
  it("escapes hostile og:title in preview", () => {
    const result = makeResult();
    result.ogp.title = PAYLOAD;
    const html = renderPreview({
      data: derivePreviewData(result, "https://example.com/"),
    });
    expect(html).not.toContain("<script>alert(1)");
    expect(html).not.toContain("<img onerror");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("&quot;");
  });

  it("blocks javascript: URLs in preview image", () => {
    const result = makeResult();
    result.ogp.images = [{ url: "javascript:alert(1)" }];
    const html = renderPreview({
      data: derivePreviewData(result, "https://example.com/"),
    });
    // No img tag should be emitted because safeHref returns "" for js: schemes
    expect(html).not.toContain("javascript:");
    expect(html).toContain("og-preview-image-empty");
  });

  it("blocks data: URLs in preview image", () => {
    const result = makeResult();
    result.ogp.images = [
      { url: "data:image/svg+xml;base64,PHN2Zy8+" },
    ];
    const html = renderPreview({
      data: derivePreviewData(result, "https://example.com/"),
    });
    expect(html).not.toContain("data:image");
    expect(html).toContain("og-preview-image-empty");
  });

  it("escapes hostile values in tag table", () => {
    const result = makeResult();
    result.ogp.title = PAYLOAD;
    result.raw = [
      { property: "og:title", content: PAYLOAD },
    ];
    const html = renderTagTable({ result });
    expect(html).not.toContain("<script>alert");
    expect(html).toContain("&lt;script&gt;");
  });

  it("escapes hostile warning messages", () => {
    const html = renderValidationPanel({
      warnings: [
        {
          code: "OG_TITLE_MISSING",
          severity: "error",
          message: PAYLOAD,
          property: "og:title",
          value: PAYLOAD,
        },
      ],
    });
    expect(html).not.toContain("<script>alert");
    expect(html).not.toContain("<img onerror");
    expect(html).toContain("&lt;script&gt;");
  });
});
