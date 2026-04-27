import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { Result } from "@ogpeek/react/server";
import { Hero } from "@/components/landing/Hero";
import { Footer } from "@/components/landing/Footer";
import { LangToggle } from "@/components/LangToggle";
import { runParse, type ServerParseOutcome } from "@/lib/server-parse";
import { clientIpFromHeaders, rateLimit } from "@/lib/rate-limit";
import { getDict, hasLang, format, type Dict, type Lang } from "@/lib/i18n";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ url?: string | string[] }>;
type Params = Promise<{ lang: string }>;
type PageOutcome =
  | ServerParseOutcome
  | { ok: false; target: string; error: { code: "RATE_LIMITED"; status: 429; message: string } };

export default async function Page({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { lang: rawLang } = await params;
  if (!hasLang(rawLang)) notFound();
  const lang: Lang = rawLang;
  const dict = getDict(lang);

  const { url } = await searchParams;
  const target = Array.isArray(url) ? url[0] : url;
  const outcome = target ? await runWithRateLimit(target, dict) : null;

  return <PageLayout dict={dict} outcome={outcome} lang={lang} />;
}

async function runWithRateLimit(target: string, dict: Dict): Promise<PageOutcome> {
  // SSR page visits hit runParse directly, so they share the same per-IP
  // limiter as /api/parse — otherwise /?url=... would bypass it.
  const ip = clientIpFromHeaders(await headers());
  const decision = rateLimit(ip);
  if (!decision.ok) {
    return {
      ok: false,
      target,
      error: {
        code: "RATE_LIMITED",
        status: 429,
        message: format(dict.page.rateLimitTemplate, { sec: decision.retryAfterSec }),
      },
    };
  }
  return runParse(target);
}

function PageLayout({
  dict,
  outcome,
  lang,
}: {
  dict: Dict;
  outcome: PageOutcome | null;
  lang: Lang;
}) {
  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-8 px-6 py-6">
      <div className="flex justify-end">
        <LangToggle />
      </div>
      <Hero />

      {outcome ? (
        <Results outcome={outcome} dict={dict} lang={lang} />
      ) : (
        <EmptyState dict={dict} />
      )}

      <Footer />
    </main>
  );
}

function EmptyState({ dict }: { dict: Dict }) {
  return (
    <section className="rounded-xl border border-dashed border-[color:rgb(var(--border))] px-6 py-10 text-center text-sm text-[color:rgb(var(--muted))]">
      {dict.page.emptyState}
    </section>
  );
}

function Results({
  outcome,
  dict,
  lang,
}: {
  outcome: PageOutcome;
  dict: Dict;
  lang: Lang;
}) {
  if (!outcome.ok) {
    return (
      <section className="rounded-xl border border-red-500/40 bg-red-500/5 px-5 py-4">
        <h2 className="text-sm font-medium text-red-700 dark:text-red-300">
          {outcome.error.code === "RATE_LIMITED" ? dict.page.retryLater : dict.page.fetchFailed}
        </h2>
        <p className="mt-1 text-xs text-[color:rgb(var(--muted))]">
          <span className="font-mono">{outcome.error.code}</span> · {outcome.error.message}
        </p>
        <p className="mt-1 text-xs text-[color:rgb(var(--muted))]">
          {dict.page.target}: {outcome.target}
        </p>
      </section>
    );
  }

  return (
    <Result
      result={outcome.result}
      finalUrl={outcome.finalUrl}
      status={outcome.status}
      redirects={outcome.redirects}
      canonical={outcome.result.meta.canonical}
      lang={lang}
    />
  );
}
