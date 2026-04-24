import { headers } from "next/headers";
import { UrlInput } from "@/components/UrlInput";
import { ValidationPanel } from "@/components/ValidationPanel";
import { TagTable } from "@/components/TagTable";
import { RawHtmlToggle } from "@/components/RawHtmlToggle";
import { Facebook } from "@/components/previews/Facebook";
import { derivePreviewData } from "@/components/previews/shared";
import { Hero } from "@/components/landing/Hero";
import { Footer } from "@/components/landing/Footer";
import { runParse, type ServerParseOutcome } from "@/lib/server-parse";
import { clientIpFromHeaders, isPublicMode, rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ url?: string | string[] }>;
type PageOutcome = ServerParseOutcome | { ok: false; target: string; error: { code: "RATE_LIMITED"; status: 429; message: string } };

const MODE = (process.env.NEXT_PUBLIC_MODE ?? "public") as "public" | "internal";

export default async function Page({ searchParams }: { searchParams: SearchParams }) {
  const { url } = await searchParams;
  const target = Array.isArray(url) ? url[0] : url;
  const outcome = target ? await runWithRateLimit(target) : null;

  if (MODE === "internal") {
    return <InternalLayout outcome={outcome} />;
  }
  return <PublicLayout outcome={outcome} />;
}

async function runWithRateLimit(target: string): Promise<PageOutcome> {
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
          message: `요청이 너무 많습니다. ${decision.retryAfterSec}초 후 다시 시도해 주세요.`,
        },
      };
    }
  }
  // Raw HTML is only embedded in internal-mode SSR — public deployments skip
  // it so the rendered page doesn't balloon with arbitrary upstream content
  // or become a de facto HTML proxy.
  return runParse(target, { includeHtml: MODE === "internal" });
}

function InternalLayout({ outcome }: { outcome: PageOutcome | null }) {
  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-6 px-6 py-8">
      <header className="flex items-baseline justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">ogpeek</h1>
          <p className="text-xs text-[color:rgb(var(--muted))]">
            internal mode — 어느 페이지든 오픈그래프 메타태그를 바로 들여다봅니다.
          </p>
        </div>
        <span className="rounded-full bg-[color:rgb(var(--surface))] px-2.5 py-1 text-[11px] uppercase tracking-wide text-[color:rgb(var(--muted))]">
          internal
        </span>
      </header>

      <UrlInput compact />

      {outcome ? <Results outcome={outcome} /> : <EmptyState />}
    </main>
  );
}

function PublicLayout({ outcome }: { outcome: PageOutcome | null }) {
  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-8 px-6 py-6">
      <Hero />

      {outcome ? (
        <section className="flex flex-col gap-6">
          <Results outcome={outcome} />
        </section>
      ) : (
        <EmptyState />
      )}

      <Footer />
    </main>
  );
}

function EmptyState() {
  return (
    <section className="rounded-xl border border-dashed border-[color:rgb(var(--border))] px-6 py-10 text-center text-sm text-[color:rgb(var(--muted))]">
      URL을 입력하면 OG 태그, 검증 결과, 미리보기가 여기에 표시됩니다.
    </section>
  );
}

function Results({ outcome }: { outcome: PageOutcome }) {
  if (!outcome.ok) {
    return (
      <section className="rounded-xl border border-red-500/40 bg-red-500/5 px-5 py-4">
        <h2 className="text-sm font-medium text-red-700 dark:text-red-300">
          {outcome.error.code === "RATE_LIMITED" ? "잠시 후 다시 시도해 주세요" : "가져오기 실패"}
        </h2>
        <p className="mt-1 text-xs text-[color:rgb(var(--muted))]">
          <span className="font-mono">{outcome.error.code}</span> · {outcome.error.message}
        </p>
        <p className="mt-1 text-xs text-[color:rgb(var(--muted))]">
          대상: {outcome.target}
        </p>
      </section>
    );
  }

  const preview = derivePreviewData(outcome.result, outcome.finalUrl);

  return (
    <div className="flex flex-col gap-6">
      <ValidationPanel warnings={outcome.result.warnings} />

      <TagTable result={outcome.result} />

      <section className="flex flex-col gap-2">
        <header className="flex items-baseline justify-between">
          <h2 className="text-sm font-medium">미리보기</h2>
          <span className="text-xs text-[color:rgb(var(--muted))]">
            {outcome.finalUrl} · HTTP {outcome.status}
          </span>
        </header>
        <div className="max-w-md">
          <Facebook data={preview} />
        </div>
      </section>

      {outcome.html ? <RawHtmlToggle html={outcome.html} /> : null}
    </div>
  );
}
