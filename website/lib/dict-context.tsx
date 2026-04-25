"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { Dict } from "./i18n";

const DictContext = createContext<Dict | null>(null);

export function DictProvider({ value, children }: { value: Dict; children: ReactNode }) {
  return <DictContext.Provider value={value}>{children}</DictContext.Provider>;
}

export function useDict(): Dict {
  const dict = useContext(DictContext);
  if (!dict) {
    throw new Error("useDict() must be used inside <DictProvider>");
  }
  return dict;
}
