import { UrlInput } from "@/components/UrlInput";
import { ValidationPanel } from "@/components/ValidationPanel";
import { TagTable } from "@/components/TagTable";
import { RawHtmlToggle } from "@/components/RawHtmlToggle";
import { KakaoTalk } from "@/components/previews/KakaoTalk";
import { Slack } from "@/components/previews/Slack";
import { Facebook } from "@/components/previews/Facebook";
import { X } from "@/components/previews/X";
import { LinkedIn } from "@/components/previews/LinkedIn";
import { derivePreviewData } from "@/components/previews/shared";
import { Hero } from "@/components/landing/Hero";
import { Features } from "@/components/landing/Features";
import { Footer } from "@/components/landing/Footer";
import { runParse, type ServerParseOutcome } from "@/lib/server-parse";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ url?: string | string[] }>;

const MODE = (process.env.NEXT_PUBLIC_MODE ?? "public") as "public" | "internal";

export default async function Page({ searchParams }: { searchParams: SearchParams }) {
  const { url } = await searchParams;
  const target = Array.isArray(url) ? url[0] : url;
  const outcome = target ? await runParse(target) : null;

  if (MODE === "internal") {
    return <InternalLayout outcome={outcome} />;
  }
  return <PublicLayout outcome={outcome} />;
}

function InternalLayout({ outcome }: { outcome: ServerParseOutcome | null }) {
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

function PublicLayout({ outcome }: { outcome: ServerParseOutcome | null }) {
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

      <Features />
      <Footer />
    </main>
  );
}

function EmptyState() {
  return (
    <section className="rounded-xl border border-dashed border-[color:rgb(var(--border))] px-6 py-10 text-center text-sm text-[color:rgb(var(--muted))]">
      URL을 입력하면 OG 태그, 검증 결과, 플랫폼별 미리보기가 여기에 표시됩니다.
    </section>
  );
}

function Results({ outcome }: { outcome: ServerParseOutcome }) {
  if (!outcome.ok) {
    return (
      <section className="rounded-xl border border-red-500/40 bg-red-500/5 px-5 py-4">
        <h2 className="text-sm font-medium text-red-700 dark:text-red-300">
          가져오기 실패
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

      <section className="flex flex-col gap-2">
        <header className="flex items-baseline justify-between">
          <h2 className="text-sm font-medium">플랫폼 미리보기</h2>
          <span className="text-xs text-[color:rgb(var(--muted))]">
            {outcome.finalUrl} · HTTP {outcome.status}
          </span>
        </header>
        <div className="grid gap-4 md:grid-cols-2">
          <KakaoTalk data={preview} />
          <Slack data={preview} />
          <Facebook data={preview} />
          <X data={preview} />
          <LinkedIn data={preview} />
        </div>
      </section>

      <TagTable result={outcome.result} />

      <RawHtmlToggle html={outcome.html} />
    </div>
  );
}
