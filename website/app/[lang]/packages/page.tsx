import Link from "next/link";
import { notFound } from "next/navigation";
import { LangToggle } from "@/components/LangToggle";
import { Footer } from "@/components/landing/Footer";
import { PackageDetail } from "@/components/packages/PackageDetail";
import { getDict, hasLang, type Lang } from "@/lib/i18n";

export const dynamic = "force-dynamic";

type Params = Promise<{ lang: string }>;

const ENGINE_QUICK_START = `import { parse } from "ogpeek";
import { fetchHtml } from "ogpeek/fetch";

const { html, finalUrl } = await fetchHtml(url);
const result = parse(html, finalUrl);`;

const REACT_QUICK_START = `import { Result } from "@ogpeek/react";
import "@ogpeek/react/styles.css";

<Result result={result} finalUrl={finalUrl} />`;

export default async function PackagesPage({ params }: { params: Params }) {
  const { lang: rawLang } = await params;
  if (!hasLang(rawLang)) {
    notFound();
  }
  const lang: Lang = rawLang;
  const dict = getDict(lang);

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-10 px-6 py-6">
      <div className="flex items-center justify-between gap-4">
        <Link
          href={`/${lang}`}
          prefetch={false}
          className="text-sm text-[color:rgb(var(--muted))] hover:text-[color:rgb(var(--foreground))] hover:underline"
        >
          {dict.packages.backToHome}
        </Link>
        <LangToggle />
      </div>

      <header className="flex flex-col gap-4 py-10">
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          {dict.packages.title}
        </h1>
        <p className="max-w-2xl text-base leading-relaxed text-[color:rgb(var(--muted))]">
          {dict.packages.pageLead}
        </p>
      </header>

      <div className="flex flex-col gap-6">
        <PackageDetail
          name="ogpeek"
          command="npm install ogpeek"
          tagline={dict.packages.engine.tagline}
          quickStartTitle={dict.packages.quickStartTitle}
          quickStartCode={ENGINE_QUICK_START}
          npmHref="https://www.npmjs.com/package/ogpeek"
          readmeHref="https://github.com/minjun0219/ogpeek/tree/main/packages/ogpeek#readme"
          npmLinkLabel={dict.packages.npmLink}
          readmeLinkLabel={dict.packages.readmeLink}
          badges={[
            {
              src: "https://img.shields.io/npm/v/ogpeek?style=flat-square&color=10b981",
              alt: "npm version",
            },
            {
              src: "https://img.shields.io/npm/dm/ogpeek?style=flat-square",
              alt: "npm monthly downloads",
            },
            {
              src: "https://img.shields.io/bundlephobia/minzip/ogpeek?style=flat-square&label=gzip",
              alt: "minzipped size",
            },
          ]}
        />
        <PackageDetail
          name="@ogpeek/react"
          command="npm install @ogpeek/react"
          tagline={dict.packages.react.tagline}
          quickStartTitle={dict.packages.quickStartTitle}
          quickStartCode={REACT_QUICK_START}
          npmHref="https://www.npmjs.com/package/@ogpeek/react"
          readmeHref="https://github.com/minjun0219/ogpeek/tree/main/packages/ogpeek-react#readme"
          npmLinkLabel={dict.packages.npmLink}
          readmeLinkLabel={dict.packages.readmeLink}
          badges={[
            {
              src: "https://img.shields.io/npm/v/%40ogpeek/react?style=flat-square&color=10b981",
              alt: "npm version",
            },
            {
              src: "https://img.shields.io/npm/dm/%40ogpeek/react?style=flat-square",
              alt: "npm monthly downloads",
            },
            {
              src: "https://img.shields.io/bundlephobia/minzip/%40ogpeek/react?style=flat-square&label=gzip",
              alt: "minzipped size",
            },
          ]}
        />
      </div>

      <Footer />
    </main>
  );
}
