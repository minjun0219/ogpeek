import { notFound } from "next/navigation";
import { LangToggle } from "@/components/LangToggle";
import { Footer } from "@/components/landing/Footer";
import { Hero } from "@/components/landing/Hero";
import { InstallCopy } from "@/components/landing/InstallCopy";
import { PackageDetail } from "@/components/packages/PackageDetail";
import { getDict, hasLang, type Lang } from "@/lib/i18n";

export const dynamic = "force-dynamic";

type Params = Promise<{ lang: string }>;

const ENGINE_QUICK_START = `import { parse } from "ogpeek";
import { fetchHtml } from "ogpeek/fetch";

const { html, finalUrl } = await fetchHtml(url);
const result = parse(html, finalUrl);`;

export default async function Page({ params }: { params: Params }) {
  const { lang: rawLang } = await params;
  if (!hasLang(rawLang)) {
    notFound();
  }
  const lang: Lang = rawLang;
  const dict = getDict(lang);

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-10 px-6 py-6">
      <div className="flex justify-end">
        <LangToggle />
      </div>
      <Hero />

      <PackageDetail
        name="ogpeek"
        pkg="ogpeek"
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

      <aside className="flex flex-col gap-3 rounded-2xl border border-dashed border-[color:rgb(var(--border))] px-6 py-5">
        <div className="flex flex-col gap-1">
          <h2 className="font-mono text-base font-medium tracking-tight">
            @ogpeek/react
          </h2>
          <p className="text-sm leading-relaxed text-[color:rgb(var(--muted))]">
            {dict.packages.react.tagline}
          </p>
        </div>
        <InstallCopy pkg="@ogpeek/react" />
        <div className="flex flex-wrap gap-3 text-xs text-[color:rgb(var(--muted))]">
          <a
            className="hover:text-[color:rgb(var(--foreground))] hover:underline"
            href="https://www.npmjs.com/package/@ogpeek/react"
            target="_blank"
            rel="noopener noreferrer"
          >
            {dict.packages.npmLink}
          </a>
          <span aria-hidden>·</span>
          <a
            className="hover:text-[color:rgb(var(--foreground))] hover:underline"
            href="https://github.com/minjun0219/ogpeek/tree/main/packages/ogpeek-react#readme"
            target="_blank"
            rel="noopener noreferrer"
          >
            {dict.packages.readmeLink}
          </a>
        </div>
      </aside>

      <Footer />
    </main>
  );
}
