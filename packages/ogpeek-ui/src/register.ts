import { OgPeekPreviewElement } from "./elements/preview.js";
import { OgPeekValidationPanelElement } from "./elements/validationPanel.js";
import { OgPeekTagTableElement } from "./elements/tagTable.js";
import { OgPeekRedirectFlowElement } from "./elements/redirectFlow.js";
import { OgPeekResultElement } from "./elements/result.js";

export type RegisterOptions = {
  // Override the tag prefix. Defaults to "og-peek". Useful when shipping
  // multiple versions side-by-side or working around a name collision.
  prefix?: string;
};

const DEFAULT_PREFIX = "og-peek";

const ELEMENTS: ReadonlyArray<readonly [string, CustomElementConstructor]> = [
  ["preview", OgPeekPreviewElement],
  ["validation-panel", OgPeekValidationPanelElement],
  ["tag-table", OgPeekTagTableElement],
  ["redirect-flow", OgPeekRedirectFlowElement],
  ["result", OgPeekResultElement],
];

// Registers all `<og-peek-*>` custom elements. Idempotent: existing
// definitions for any given tag are left in place, so calling `register()`
// twice — or from two co-loaded bundles — does not throw.
export function register(opts?: RegisterOptions): void {
  if (typeof customElements === "undefined") return;
  const prefix = opts?.prefix ?? DEFAULT_PREFIX;
  for (const [suffix, ctor] of ELEMENTS) {
    const tag = `${prefix}-${suffix}`;
    if (!customElements.get(tag)) customElements.define(tag, ctor);
  }
}
