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

// Composite layout that mirrors the order rendered by the demo site:
// redirect flow → validation → preview → tag table. Each child handles
// its own ogpeek-root scoping; the wrapping div provides the vertical
// stack and ogpeek-root token scope so any tokens not already covered
// by children resolve here.
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
  const rootClass = className
    ? `ogpeek-root ogpeek-stack ${className}`
    : "ogpeek-root ogpeek-stack";

  return (
    <div className={rootClass}>
      <RedirectFlow
        finalUrl={finalUrl}
        status={status}
        redirects={redirects}
        canonical={canonical}
        lang={lang}
        dict={dict}
      />
      <ValidationPanel
        warnings={result.warnings}
        lang={lang}
        dict={dict}
      />
      <Preview data={preview} />
      <TagTable result={result} lang={lang} dict={dict} />
    </div>
  );
}
