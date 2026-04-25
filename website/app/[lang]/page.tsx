import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { UrlInput } from "@/components/UrlInput";
import { ValidationPanel } from "@/components/ValidationPanel";
import { RedirectFlow } from "@/components/RedirectFlow";
import { TagTable } from "@/components/TagTable";
import { RawHtmlToggle } from "@/components/RawHtmlToggle";
import { Preview } from "@/components/previews/Preview";
import { derivePreviewData } from "@/components/previews/shared";
import { Hero } from "@/components/landing/Hero";
import { Footer } from "@/components/landing/Footer";
import { LocaleToggle } from "@/components/LocaleToggle";
import { runParse, type ServerParseOutcome } from "@/lib/server-parse";
import { clientIpFromHeaders, isPublicMode, rateLimit } from "@/lib/rate-limit";
import { getDict, hasLocale, format, type Dict, type Locale } from "@/lib/i18n";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ url?: string | string[] }>;
type Params = Promise<{ lang: string }>;
type PageOutcome =
  | ServerParseOutcome
  | { ok: false; target: string; error: { code: "RATE_LIMITED"; status: 429; message: string } };

const MODE = (process.env.NEXT_PUBLIC_MODE ?? "public") as "public" | "internal";

export default async function Page({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const locale: Locale = lang;
  const dict = getDict(locale);

  const { url } = await searchParams;
  const target = Array.isArray(url) ? url[0] : url;
  const outcome = target ? await runWithRateLimit(target, dict) : null;

  if (MODE === "internal") {
    return <InternalLayout locale={locale} dict={dict} outcome={outcome} />;
  }
  return <PublicLayout locale={locale} dict={dict} outcome={outcome} />;
}

async function runWithRateLimit(target: string, dict: Dict): Promise<PageOutcome> {
  // Public page visits hit runParse directly (SSR), so they must share the
  // same per-IP limiter as /api/parse — otherwise /?url=... would bypass it.
  if (isPublicMode()) {
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
  }
  // Raw HTML is only embedded in internal-mode SSR — public deployments skip
  // it so the rendered page doesn't balloon with arbitrary upstream content
  // or become a de facto HTML proxy.
  return runParse(target, { includeHtml: MODE === "internal" });
}

function InternalLayout({
  locale,
  dict,
  outcome,
}: {
  locale: Locale;
  dict: Dict;
  outcome: PageOutcome | null;
}) {
  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-6 px-6 py-8">
      <header className="flex items-baseline justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">ogpeek</h1>
          <p className="text-xs text-[color:rgb(var(--muted))]">{dict.page.internalSubtitle}</p>
        </div>
        <div className="flex items-center gap-3">
          <LocaleToggle locale={locale} dict={dict} />
          <span className="rounded-full bg-[color:rgb(var(--surface))] px-2.5 py-1 text-[11px] uppercase tracking-wide text-[color:rgb(var(--muted))]">
            internal
          </span>
        </div>
      </header>

      <UrlInput dict={dict} compact />

      {outcome ? <Results outcome={outcome} dict={dict} /> : <EmptyState dict={dict} />}
    </main>
  );
}

function PublicLayout({
  locale,
  dict,
  outcome,
}: {
  locale: Locale;
  dict: Dict;
  outcome: PageOutcome | null;
}) {
  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-8 px-6 py-6">
      <div className="flex justify-end">
        <LocaleToggle locale={locale} dict={dict} />
      </div>
      <Hero dict={dict} />

      {outcome ? (
        <section className="flex flex-col gap-6">
          <Results outcome={outcome} dict={dict} />
        </section>
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

function Results({ outcome, dict }: { outcome: PageOutcome; dict: Dict }) {
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

  const preview = derivePreviewData(outcome.result, outcome.finalUrl);

  return (
    <div className="flex flex-col gap-6">
      <ValidationPanel warnings={outcome.result.warnings} dict={dict} />

      <RedirectFlow
        finalUrl={outcome.finalUrl}
        status={outcome.status}
        redirects={outcome.redirects}
        canonical={outcome.result.meta.canonical}
        dict={dict}
      />

      <TagTable result={outcome.result} dict={dict} />

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium">{dict.page.preview}</h2>
        <div className="max-w-md">
          <Preview data={preview} />
        </div>
      </section>

      {outcome.html ? <RawHtmlToggle html={outcome.html} dict={dict} /> : null}
    </div>
  );
}
