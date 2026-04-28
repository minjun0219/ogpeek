import type { OgDebugResult } from "ogpeek";
import type { RedirectHop } from "ogpeek/fetch";
import {
  DEFAULT_LANG,
  getDict,
  type DeepPartial,
  type Dict,
  type Lang,
} from "./dict.js";
import { derivePreviewData } from "./derivePreviewData.js";
import { cls } from "./cls.js";
import { Preview } from "./Preview.js";
import { ValidationPanel } from "./ValidationPanel.js";
import { RedirectFlow } from "./RedirectFlow.js";
import { TagTable } from "./TagTable.js";

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

// Composite layout that mirrors the demo site: validation → redirect
// flow → tag table → preview. Drills `lang` / `dict` (the user's
// partial override) plus `composed=true` to every child; each child
// resolves its own slice from the bundled dict so we don't materialize
// a fully-resolved Dict here just to throw most of it away. The
// wrapping div is the only `.ogpeek-root` in the subtree — children
// skip their own root class so token overrides on the wrapper still
// cascade. Preview gets a small section wrapper with a heading because
// the bare card looks abrupt without one (standalone <Preview /> stays
// headless).
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
  const preview = derivePreviewData(result, finalUrl);
  // Result renders exactly one localized string itself (the preview
  // heading). Resolve only that one slice instead of paying for a full
  // Dict resolution — the children already do their own resolution.
  const previewHeading =
    dictOverride?.preview?.heading ?? getDict(lang).preview.heading;

  return (
    <div className={cls("ogpeek-root ogpeek-stack", className)}>
      <ValidationPanel
        warnings={result.warnings}
        lang={lang}
        dict={dictOverride}
        composed
      />
      <RedirectFlow
        finalUrl={finalUrl}
        status={status}
        redirects={redirects}
        canonical={canonical}
        lang={lang}
        dict={dictOverride}
        composed
      />
      <TagTable
        result={result}
        lang={lang}
        dict={dictOverride}
        composed
      />
      <section className="ogpeek-preview-section">
        <h2 className="ogpeek-h2">{previewHeading}</h2>
        <Preview data={preview} composed />
      </section>
    </div>
  );
}
