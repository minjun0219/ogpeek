import type { Metadata } from "next";
import { Noto_Sans_KR } from "next/font/google";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { getDict, hasLang, LANGS, type Lang } from "@/lib/i18n";
import { TranslateProvider } from "@/lib/translate-context";
import "../globals.css";
import "@ogpeek/react/styles.css";

const notoSansKr = Noto_Sans_KR({
  subsets: [
    "latin",
  ],
  weight: [
    "400",
    "500",
    "600",
    "700",
  ],
  display: "swap",
  variable: "--font-sans-kr",
});

export function generateStaticParams(): Array<{
  lang: Lang;
}> {
  return LANGS.map((lang) => ({
    lang,
  }));
}

type Params = Promise<{
  lang: string;
}>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLang(lang)) {
    return {};
  }
  const dict = getDict(lang);
  return {
    title: dict.meta.title,
    description: dict.meta.description,
    alternates: {
      languages: {
        en: "/en",
        ko: "/ko",
      },
    },
  };
}

export default async function LangLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Params;
}) {
  const { lang } = await params;
  if (!hasLang(lang)) {
    notFound();
  }
  const dict = getDict(lang);
  return (
    <html lang={lang} className={notoSansKr.variable}>
      <body className="min-h-screen font-sans">
        <TranslateProvider
          value={{
            lang,
            dict,
          }}
        >
          {children}
        </TranslateProvider>
      </body>
    </html>
  );
}
