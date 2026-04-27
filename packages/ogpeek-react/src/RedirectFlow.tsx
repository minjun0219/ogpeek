"use client";

import type { RedirectHop } from "ogpeek/fetch";
import type { DeepPartial, Dict, Lang } from "./dict.js";
import { RedirectFlow as RedirectFlowCore } from "./core/RedirectFlow.js";
import { useOgPeekContext } from "./context.js";

export type RedirectFlowProps = {
  finalUrl: string;
  status: number;
  redirects: RedirectHop[];
  canonical: string | null;
  lang?: Lang;
  dict?: DeepPartial<Dict>;
  className?: string;
};

export function RedirectFlow({
  finalUrl,
  status,
  redirects,
  canonical,
  lang,
  dict,
  className,
}: RedirectFlowProps) {
  const ctx = useOgPeekContext();
  return (
    <RedirectFlowCore
      finalUrl={finalUrl}
      status={status}
      redirects={redirects}
      canonical={canonical}
      lang={lang ?? ctx?.lang}
      dict={dict ?? ctx?.dictOverride}
      composed={!!ctx?.composed}
      className={className}
    />
  );
}
