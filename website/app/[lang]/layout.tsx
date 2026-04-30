import type { Metadata } from "next";
import { Inter, Noto_Sans_KR } from "next/font/google";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import {
  getDict,
  hasLang,
  LANGS,
  type Lang,
  stripLangPrefix,
} from "@/lib/i18n";
import { TranslateProvider } from "@/lib/translate-context";
import "../globals.css";
import "@ogpeek/react/styles.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
});

const notoSansKr = Noto_Sans_KR({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-sans-kr",
});

export function generateStaticParams(): Array<{ lang: Lang }> {
  return LANGS.map((lang) => ({ lang }));
}

type Params = Promise<{ lang: string }>;

async function getPublicPathname(fallback: string): Promise<string> {
  return (await headers()).get("x-public-pathname") ?? fallback;
}

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
  // For an English request the public path is whatever the user typed
  // (e.g. "/" or "/inspect"); for Korean it is the /ko-prefixed URL.
  const publicPath = await getPublicPathname(`/${lang}`);
  const base = stripLangPrefix(publicPath);
  const koPath = base === "/" ? "/ko" : `/ko${base}`;
  // English content lives canonically at the unprefixed URL, so /en is
  // treated as an alias of /. Korean canonical stays /ko-prefixed.
  const canonical = lang === "en" ? base : koPath;
  return {
    title: dict.meta.title,
    description: dict.meta.description,
    alternates: {
      canonical,
      languages: {
        en: base,
        ko: koPath,
        "x-default": base,
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
    <html lang={lang} className={`${inter.variable} ${notoSansKr.variable}`}>
      <body className="min-h-screen font-sans">
        <TranslateProvider value={{ lang, dict }}>{children}</TranslateProvider>
      </body>
    </html>
  );
}
