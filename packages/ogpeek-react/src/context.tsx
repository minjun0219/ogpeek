import { createContext, useContext, type ReactNode } from "react";
import type { DeepPartial, Dict, Lang } from "./dict.js";

// Carries shared `lang` / `dict` overrides plus a `composed` flag that
// tells panel components their `.ogpeek-root` / token scope is already
// established by an outer composite. With `composed: true`, children skip
// emitting their own `.ogpeek-root` class — that's the only way an inline
// token override on the outer element (e.g. `<Result style={{
// "--ogpeek-fg": ... }} />`) can cascade into the panels, since CSS
// custom-property declarations on each nested `.ogpeek-root` would
// otherwise reset the inherited value.
type OgPeekContextValue = {
  lang: Lang;
  dictOverride: DeepPartial<Dict> | undefined;
  composed: boolean;
};

const OgPeekContext = createContext<OgPeekContextValue | null>(null);

export function useOgPeekContext(): OgPeekContextValue | null {
  return useContext(OgPeekContext);
}

export function OgPeekProvider({
  lang,
  dict,
  composed,
  children,
}: {
  lang: Lang;
  dict: DeepPartial<Dict> | undefined;
  composed: boolean;
  children: ReactNode;
}) {
  return (
    <OgPeekContext.Provider value={{ lang, dictOverride: dict, composed }}>
      {children}
    </OgPeekContext.Provider>
  );
}
