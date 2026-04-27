"use client";

import type { OgDebugResult } from "ogpeek";
import type { DeepPartial, Dict, Lang } from "./dict.js";
import { TagTable as TagTableCore } from "./core/TagTable.js";
import { useOgPeekContext } from "./context.js";

export type TagTableProps = {
  result: OgDebugResult;
  lang?: Lang;
  dict?: DeepPartial<Dict>;
  className?: string;
};

export function TagTable({
  result,
  lang,
  dict,
  className,
}: TagTableProps) {
  const ctx = useOgPeekContext();
  return (
    <TagTableCore
      result={result}
      lang={lang ?? ctx?.lang}
      dict={dict ?? ctx?.dictOverride}
      composed={!!ctx?.composed}
      className={className}
    />
  );
}
