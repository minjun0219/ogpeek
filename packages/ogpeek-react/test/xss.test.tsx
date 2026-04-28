import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  derivePreviewData,
  Preview,
  TagTable,
  ValidationPanel,
} from "../src/index.js";
import { makeResult } from "./fixtures.js";

const PAYLOAD = `<script>alert(1)</script>"><img onerror=alert(2)>`;

const render = (node: ReactElement) => renderToStaticMarkup(node);

describe("XSS escaping", () => {
  it("escapes hostile og:title in preview", () => {
    const result = makeResult();
    result.ogp.title = PAYLOAD;
    const html = render(
      <Preview data={derivePreviewData(result, "https://example.com/")} />,
    );
    expect(html).not.toContain("<script>alert(1)");
    expect(html).not.toContain("<img onerror");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("&quot;");
  });

  it("blocks javascript: URLs in preview image", () => {
    const result = makeResult();
    result.ogp.images = [
      {
        url: "javascript:alert(1)",
      },
    ];
    const html = render(
      <Preview data={derivePreviewData(result, "https://example.com/")} />,
    );
    expect(html).not.toContain("javascript:");
    expect(html).toContain("ogpeek-preview-image-empty");
  });

  it("blocks data: URLs in preview image", () => {
    const result = makeResult();
    result.ogp.images = [
      {
        url: "data:image/svg+xml;base64,PHN2Zy8+",
      },
    ];
    const html = render(
      <Preview data={derivePreviewData(result, "https://example.com/")} />,
    );
    expect(html).not.toContain("data:image");
    expect(html).toContain("ogpeek-preview-image-empty");
  });

  it("blocks mailto: URLs in preview image", () => {
    const result = makeResult();
    result.ogp.images = [
      {
        url: "mailto:attacker@example.com",
      },
    ];
    const html = render(
      <Preview data={derivePreviewData(result, "https://example.com/")} />,
    );
    expect(html).not.toContain("mailto:");
    expect(html).toContain("ogpeek-preview-image-empty");
  });

  it("escapes hostile values in tag table", () => {
    const result = makeResult();
    result.ogp.title = PAYLOAD;
    result.raw = [
      {
        property: "og:title",
        content: PAYLOAD,
      },
    ];
    const html = render(<TagTable result={result} />);
    expect(html).not.toContain("<script>alert");
    expect(html).toContain("&lt;script&gt;");
  });

  it("escapes hostile warning messages and values", () => {
    const html = render(
      <ValidationPanel
        warnings={[
          {
            code: "OG_TITLE_MISSING",
            severity: "error",
            message: PAYLOAD,
            property: "og:title",
            value: PAYLOAD,
          },
        ]}
      />,
    );
    expect(html).not.toContain("<script>alert");
    expect(html).not.toContain("<img onerror");
    expect(html).toContain("&lt;script&gt;");
  });
});
