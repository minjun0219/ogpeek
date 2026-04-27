import { describe, expect, it, beforeAll } from "vitest";
import { register } from "../src/index.js";
import {
  OgPeekResultElement,
  OgPeekValidationPanelElement,
} from "../src/index.js";
import { makeResult, FINAL_URL, REDIRECTS, STATUS } from "./fixtures.js";

beforeAll(() => {
  register();
});

describe("custom elements", () => {
  it("register() defines all five tags", () => {
    expect(customElements.get("og-peek-preview")).toBeDefined();
    expect(customElements.get("og-peek-validation-panel")).toBeDefined();
    expect(customElements.get("og-peek-tag-table")).toBeDefined();
    expect(customElements.get("og-peek-redirect-flow")).toBeDefined();
    expect(customElements.get("og-peek-result")).toBeDefined();
  });

  it("register() is idempotent", () => {
    expect(() => register()).not.toThrow();
  });

  it("setting result on <og-peek-result> renders shadow DOM", () => {
    const el = document.createElement("og-peek-result") as OgPeekResultElement;
    document.body.appendChild(el);
    el.result = makeResult();
    el.finalUrl = FINAL_URL;
    el.status = STATUS;
    el.redirects = REDIRECTS;
    el.canonical = FINAL_URL;
    expect(el.shadowRoot).toBeTruthy();
    expect(el.shadowRoot!.innerHTML).toContain("og-stack");
    expect(el.shadowRoot!.innerHTML).toContain("Hello");
    el.remove();
  });

  it("lang attribute switches default dict", () => {
    const el = document.createElement(
      "og-peek-validation-panel",
    ) as OgPeekValidationPanelElement;
    el.setAttribute("lang", "en");
    document.body.appendChild(el);
    el.warnings = [];
    expect(el.shadowRoot!.innerHTML).toContain("Validation passed");
    el.remove();
  });

  it("changing lang attribute re-renders", () => {
    const el = document.createElement(
      "og-peek-validation-panel",
    ) as OgPeekValidationPanelElement;
    document.body.appendChild(el);
    el.warnings = [];
    expect(el.shadowRoot!.innerHTML).toContain("검증 통과");
    el.setAttribute("lang", "en");
    expect(el.shadowRoot!.innerHTML).toContain("Validation passed");
    el.remove();
  });
});
