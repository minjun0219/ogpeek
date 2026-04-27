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

  it("Result composes all four sections in display order", () => {
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
    const flow = html.indexOf("ogpeek-flow-grid");
    const validation = html.indexOf("ogpeek-pass-title");
    const preview = html.indexOf("ogpeek-preview-domain");
    const table = html.indexOf("ogpeek-table-header");
    expect(flow).toBeGreaterThan(-1);
    expect(validation).toBeGreaterThan(flow);
    expect(preview).toBeGreaterThan(validation);
    expect(table).toBeGreaterThan(preview);
  });
});
