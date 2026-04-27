import type { OgDebugResult } from "ogpeek";
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
import { derivePreviewData } from "../derivePreviewData.js";
import { previewBody } from "./preview.js";
import { validationPanelBody } from "./validationPanel.js";
import { tagTableBody } from "./tagTable.js";
import { redirectFlowBody } from "./redirectFlow.js";

export type ResultRenderProps = {
  result: OgDebugResult;
  finalUrl: string;
  status: number;
  redirects: RedirectHop[];
  canonical: string | null;
  lang?: Lang;
  dict?: DeepPartial<Dict>;
};

// Composite body shared by both the standalone <og-peek-result> shadow root
// and the imperative client API. Emits a single <style> + the four section
// bodies wrapped in a vertical stack.
export function resultShadowBody(
  props: ResultRenderProps,
): { html: string; lang: Lang } {
  const lang = props.lang ?? DEFAULT_LANG;
  const dict = resolveDict(lang, props.dict);
  const preview = derivePreviewData(props.result, props.finalUrl);

  const body = html`
    <style>${raw(STYLES)}</style>
    <div class="og-stack">
      ${redirectFlowBody({
        finalUrl: props.finalUrl,
        status: props.status,
        redirects: props.redirects,
        canonical: props.canonical,
        dict,
      })}
      ${validationPanelBody({ warnings: props.result.warnings, dict })}
      ${previewBody({ data: preview })}
      ${tagTableBody({ result: props.result, dict })}
    </div>
  `;
  return { html: body, lang };
}
