"use client";

import type { PreviewData } from "./derivePreviewData.js";
import { Preview as PreviewCore } from "./core/Preview.js";
import { useOgPeekContext } from "./context.js";

export type PreviewProps = {
  data: PreviewData;
  className?: string;
};

// Client wrapper: reads `composed` from Context (set by <Result />) and
// hands everything off to the core. Preview itself doesn't render any
// localized strings, so there's nothing else to read from context.
export function Preview({ data, className }: PreviewProps) {
  const ctx = useOgPeekContext();
  return (
    <PreviewCore
      data={data}
      composed={!!ctx?.composed}
      className={className}
    />
  );
}
