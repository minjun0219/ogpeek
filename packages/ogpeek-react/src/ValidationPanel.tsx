"use client";

import type { Warning } from "ogpeek";
import type { DeepPartial, Dict, Lang } from "./dict.js";
import { ValidationPanel as ValidationPanelCore } from "./core/ValidationPanel.js";
import { useOgPeekContext } from "./context.js";

export type ValidationPanelProps = {
  warnings: Warning[];
  lang?: Lang;
  dict?: DeepPartial<Dict>;
  className?: string;
};

// Client wrapper: explicit props win, Context fills in the gaps when
// rendered inside <Result />.
export function ValidationPanel({
  warnings,
  lang,
  dict,
  className,
}: ValidationPanelProps) {
  const ctx = useOgPeekContext();
  return (
    <ValidationPanelCore
      warnings={warnings}
      lang={lang ?? ctx?.lang}
      dict={dict ?? ctx?.dictOverride}
      composed={!!ctx?.composed}
      className={className}
    />
  );
}
