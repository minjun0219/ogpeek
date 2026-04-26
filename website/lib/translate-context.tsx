"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { Dict, Lang } from "./i18n";

type TranslateValue = { lang: Lang; dict: Dict };

const TranslateContext = createContext<TranslateValue | null>(null);

export function TranslateProvider({
  value,
  children,
}: {
  value: TranslateValue;
  children: ReactNode;
}) {
  return <TranslateContext.Provider value={value}>{children}</TranslateContext.Provider>;
}

export function useTranslate(): TranslateValue {
  const ctx = useContext(TranslateContext);
  if (!ctx) {
    throw new Error("useTranslate() must be used inside <TranslateProvider>");
  }
  return ctx;
}
