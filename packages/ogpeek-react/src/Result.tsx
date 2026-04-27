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
import { Preview } from "./Preview.js";
import { ValidationPanel } from "./ValidationPanel.js";
import { TagTable } from "./TagTable.js";
import { RedirectFlow } from "./RedirectFlow.js";
import { cls } from "./cls.js";

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

// Composite layout that mirrors the demo site's section order:
// validation → redirect flow → tag table → preview. Each child handles
// its own ogpeek-root scoping; the wrapping div provides the vertical
// stack and an ogpeek-root token scope so any tokens not covered by a
// child resolve here. The Preview is wrapped in a small section with a
// heading because the bare card looks abrupt without one (Preview itself
// stays headless so it can also be rendered standalone).
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
    <div className={cls("ogpeek-root ogpeek-stack", className)}>
      <ValidationPanel
        warnings={result.warnings}
        lang={lang}
        dict={dict}
      />
      <RedirectFlow
        finalUrl={finalUrl}
        status={status}
        redirects={redirects}
        canonical={canonical}
        lang={lang}
        dict={dict}
      />
      <TagTable result={result} lang={lang} dict={dict} />
      <section className="ogpeek-preview-section">
        <h2 className="ogpeek-h2">{dict.preview.heading}</h2>
        <Preview data={preview} />
      </section>
    </div>
  );
}
