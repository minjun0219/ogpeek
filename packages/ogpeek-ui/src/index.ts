// Render functions (HTML-string API). Run anywhere — Node, Workers, the
// browser — and emit Declarative Shadow DOM that materializes without JS.
export {
  renderPreview,
  renderValidationPanel,
  renderTagTable,
  renderRedirectFlow,
  renderResult,
  type PreviewProps,
  type ValidationPanelProps,
  type TagTableProps,
  type RedirectFlowProps,
  type ResultRenderProps,
  derivePreviewData,
  type PreviewData,
} from "./render/index.js";

// Custom elements (browser API). `register()` is the explicit installer;
// importing this module has no side effects so tree-shaking still works
// for SSR-only consumers.
export { register, type RegisterOptions } from "./register.js";
export { OgPeekPreviewElement } from "./elements/preview.js";
export { OgPeekValidationPanelElement } from "./elements/validationPanel.js";
export { OgPeekTagTableElement } from "./elements/tagTable.js";
export { OgPeekRedirectFlowElement } from "./elements/redirectFlow.js";
export { OgPeekResultElement } from "./elements/result.js";

// i18n primitives — exposed so downstream tools can build their own
// localized layouts on top of the render functions.
export {
  getDict,
  resolveDict,
  hasLang,
  format,
  DEFAULT_LANG,
  LANGS,
  type Lang,
  type Dict,
  type DeepPartial,
} from "./dict.js";
