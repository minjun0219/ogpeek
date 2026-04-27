// Default subpath: client surface. Panels are `"use client"` and consume
// `lang` / `dict` / `composed` from `<OgPeekProvider>` so consumers can
// drop them in standalone or inside `<Result />` without prop drilling.
// Server-component consumers should import from `@ogpeek/react/server`
// instead — same layout, no Context, no client JS.

export { Preview, type PreviewProps } from "./Preview.js";
export {
  ValidationPanel,
  type ValidationPanelProps,
} from "./ValidationPanel.js";
export { RedirectFlow, type RedirectFlowProps } from "./RedirectFlow.js";
export { TagTable, type TagTableProps } from "./TagTable.js";
export { Result, type ResultProps } from "./Result.js";

export { OgPeekProvider, useOgPeekContext } from "./context.js";

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
