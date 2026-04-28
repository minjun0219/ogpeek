// All components are plain React — no hooks, no Context, no
// `"use client"`. They run anywhere React 18+ runs (Node SSR,
// Cloudflare Workers, React Server Components, browser). Standalone
// consumers pass `lang` / `dict` directly to whichever panel they
// need; the composite `<Result />` is the composed entry point that
// drills `lang` / `dict` / `composed=true` to every child so each
// child resolves its own dict slice from the bundled ko/en defaults.

export {
  derivePreviewData,
  type PreviewData,
  safeImageSrc,
  safeLinkHref,
} from "./derivePreviewData.js";
export {
  DEFAULT_LANG,
  type DeepPartial,
  type Dict,
  format,
  getDict,
  hasLang,
  LANGS,
  type Lang,
  resolveDict,
} from "./dict.js";
export { Preview, type PreviewProps } from "./Preview.js";
export { RedirectFlow, type RedirectFlowProps } from "./RedirectFlow.js";
export { Result, type ResultProps } from "./Result.js";
export { TagTable, type TagTableProps } from "./TagTable.js";
export {
  ValidationPanel,
  type ValidationPanelProps,
} from "./ValidationPanel.js";
