// `/server` subpath: server-component-friendly entry. The components
// below are the same renderers the default subpath uses internally,
// minus the React Context layer — they accept `lang` / `dict` /
// `composed` directly as props so they can run in non-DOM runtimes
// (Node SSR, Cloudflare Workers, React Server Components) without
// pulling client-only code into the bundle.
//
// Trade-off vs the default subpath: no `<OgPeekProvider>` cascade, so
// `<Result lang="en">` drills `lang` / `dict` to every child internally
// instead of relying on context. Standalone children must be passed
// `lang` / `dict` directly. There's no client JS at all on this path.

export {
  Preview,
  type PreviewCoreProps as PreviewProps,
} from "./core/Preview.js";
export {
  ValidationPanel,
  type ValidationPanelCoreProps as ValidationPanelProps,
} from "./core/ValidationPanel.js";
export {
  RedirectFlow,
  type RedirectFlowCoreProps as RedirectFlowProps,
} from "./core/RedirectFlow.js";
export {
  TagTable,
  type TagTableCoreProps as TagTableProps,
} from "./core/TagTable.js";
export { Result, type ResultCoreProps as ResultProps } from "./core/Result.js";

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
