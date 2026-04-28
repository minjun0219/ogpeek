// All components are plain React — no hooks, no Context, no
// `"use client"`. They run anywhere React 18+ runs (Node SSR,
// Cloudflare Workers, React Server Components, browser). The composite
// `<Result />` resolves the dictionary once and drills `lang` / `dict` /
// `composed=true` to every child internally; standalone consumers pass
// `lang` / `dict` directly to whichever panel they need.

export { Preview, type PreviewProps } from "./Preview.js";
export {
  ValidationPanel,
  type ValidationPanelProps,
} from "./ValidationPanel.js";
export { RedirectFlow, type RedirectFlowProps } from "./RedirectFlow.js";
export { TagTable, type TagTableProps } from "./TagTable.js";
export { Result, type ResultProps } from "./Result.js";

export {
  derivePreviewData,
  safeImageSrc,
  type PreviewData,
} from "./derivePreviewData.js";

export {
  DEFAULT_LANG,
  LANGS,
  format,
  getDict,
  hasLang,
  resolveDict,
  type DeepPartial,
  type Dict,
  type Lang,
} from "./dict.js";
