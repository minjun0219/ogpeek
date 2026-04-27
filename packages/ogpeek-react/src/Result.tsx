"use client";

import type { OgDebugResult } from "ogpeek";
import type { RedirectHop } from "ogpeek/fetch";
import {
  DEFAULT_LANG,
  resolveDict,
  type DeepPartial,
  type Dict,
  type Lang,
} from "./dict.js";
import { derivePreviewData } from "./derivePreviewData.js";
import { cls } from "./cls.js";
import { Preview } from "./Preview.js";
import { ValidationPanel } from "./ValidationPanel.js";
import { TagTable } from "./TagTable.js";
import { RedirectFlow } from "./RedirectFlow.js";
import { OgPeekProvider } from "./context.js";

export type ResultProps = {
  result: OgDebugResult;
  finalUrl: string;
  status: number;
  redirects: RedirectHop[];
  canonical: string | null;
  lang?: Lang;
  dict?: DeepPartial<Dict>;
  className?: string;
};

// Client composite: wraps the panels in <OgPeekProvider> so children
// pick up `lang` / `dict` / `composed: true` via Context. The wrapping
// div is the only `.ogpeek-root` in the subtree (children read
// composed=true and skip their own root class) so inline token
// overrides on the wrapper cascade into every panel.
//
// For server components / RSC consumers, import from
// `@ogpeek/react/server` — same layout, no Context, no client JS.
export function Result({
  result,
  finalUrl,
  status,
  redirects,
  canonical,
  lang = DEFAULT_LANG,
  dict: dictOverride,
  className,
}: ResultProps) {
  const dict = resolveDict(lang, dictOverride);
  const preview = derivePreviewData(result, finalUrl);

  return (
    <OgPeekProvider lang={lang} dict={dictOverride} composed={true}>
      <div className={cls("ogpeek-root ogpeek-stack", className)}>
        <ValidationPanel warnings={result.warnings} />
        <RedirectFlow
          finalUrl={finalUrl}
          status={status}
          redirects={redirects}
          canonical={canonical}
        />
        <TagTable result={result} />
        <section className="ogpeek-preview-section">
          <h2 className="ogpeek-h2">{dict.preview.heading}</h2>
          <Preview data={preview} />
        </section>
      </div>
    </OgPeekProvider>
  );
}
