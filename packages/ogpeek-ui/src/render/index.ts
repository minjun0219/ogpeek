import type { OgDebugResult, Warning } from "ogpeek";
import type { RedirectHop } from "ogpeek/fetch";
import { html, raw } from "../html.js";
import {
  resolveDict,
  DEFAULT_LANG,
  type DeepPartial,
  type Dict,
  type Lang,
} from "../dict.js";
import { STYLES } from "../styles.js";
import {
  derivePreviewData,
  type PreviewData,
} from "../derivePreviewData.js";
import { previewBody } from "./preview.js";
import { validationPanelBody } from "./validationPanel.js";
import { tagTableBody } from "./tagTable.js";
import { redirectFlowBody } from "./redirectFlow.js";
import { resultShadowBody, type ResultRenderProps } from "./result.js";

export {
  previewBody,
  validationPanelBody,
  tagTableBody,
  redirectFlowBody,
  resultShadowBody,
  type ResultRenderProps,
};

// Wraps `body` in `<TAG><template shadowrootmode="open">...</template></TAG>`.
// Modern browsers materialize the shadow root immediately on parse, so the
// SSR'd result is visible without waiting for client JS.
function dsd(tag: string, attrs: string, body: string): string {
  return `<${tag}${attrs}><template shadowrootmode="open">${body}</template></${tag}>`;
}

function langAttr(lang: Lang): string {
  return ` lang="${lang}"`;
}

export type PreviewProps = {
  data: PreviewData;
};

export function renderPreview(props: PreviewProps): string {
  const body = html`
    <style>${raw(STYLES)}</style>
    ${previewBody({ data: props.data })}
  `;
  return dsd("og-peek-preview", "", body);
}

export type ValidationPanelProps = {
  warnings: Warning[];
  lang?: Lang;
  dict?: DeepPartial<Dict>;
};

export function renderValidationPanel(props: ValidationPanelProps): string {
  const lang = props.lang ?? DEFAULT_LANG;
  const dict = resolveDict(lang, props.dict);
  const body = html`
    <style>${raw(STYLES)}</style>
    ${validationPanelBody({ warnings: props.warnings, dict })}
  `;
  return dsd("og-peek-validation-panel", langAttr(lang), body);
}

export type TagTableProps = {
  result: OgDebugResult;
  lang?: Lang;
  dict?: DeepPartial<Dict>;
};

export function renderTagTable(props: TagTableProps): string {
  const lang = props.lang ?? DEFAULT_LANG;
  const dict = resolveDict(lang, props.dict);
  const body = html`
    <style>${raw(STYLES)}</style>
    ${tagTableBody({ result: props.result, dict })}
  `;
  return dsd("og-peek-tag-table", langAttr(lang), body);
}

export type RedirectFlowProps = {
  finalUrl: string;
  status: number;
  redirects: RedirectHop[];
  canonical: string | null;
  lang?: Lang;
  dict?: DeepPartial<Dict>;
};

export function renderRedirectFlow(props: RedirectFlowProps): string {
  const lang = props.lang ?? DEFAULT_LANG;
  const dict = resolveDict(lang, props.dict);
  const body = html`
    <style>${raw(STYLES)}</style>
    ${redirectFlowBody({
      finalUrl: props.finalUrl,
      status: props.status,
      redirects: props.redirects,
      canonical: props.canonical,
      dict,
    })}
  `;
  return dsd("og-peek-redirect-flow", langAttr(lang), body);
}

export function renderResult(props: ResultRenderProps): string {
  const { html: body, lang } = resultShadowBody(props);
  return dsd("og-peek-result", langAttr(lang), body);
}

// Re-export the helper so consumers can build their own composite layouts
// without recomputing the preview shape.
export { derivePreviewData, type PreviewData };
