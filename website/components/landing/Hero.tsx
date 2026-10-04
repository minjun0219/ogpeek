import Link from "next/link";
import { UrlInput } from "@/components/UrlInput";
import type { Dict, Lang } from "@/lib/i18n";
import { withBase } from "@/lib/site";

// Pages with well-formed OG markup, so a first click shows a full result.
const EXAMPLES = ["ogp.me", "github.com/minjun0219/ogpeek", "nextjs.org"];

export function Hero({
  lang,
  dict,
  intro = false,
}: {
  lang: Lang;
  dict: Dict;
  // The landing page introduces the tool; /inspect keeps the input compact so
  // results stay above the fold.
  intro?: boolean;
}) {
  return (
    <section
      className={
        intro
          ? "flex flex-col items-center gap-6 py-12 text-center"
          : "flex flex-col items-center gap-4 py-4 text-center"
      }
    >
      {intro ? (
        <>
          <img
            src={withBase("/logo.png")}
            alt=""
            width={88}
            height={88}
            className="h-[88px] w-[88px]"
          />
          <div className="flex flex-col gap-3">
            <h1 className="text-5xl font-semibold tracking-tight sm:text-6xl">
              ogpeek
            </h1>
            <p className="text-lg font-medium tracking-tight sm:text-xl">
              {dict.hero.title}
            </p>
            <p className="mx-auto max-w-xl text-sm leading-relaxed text-[color:rgb(var(--muted))]">
              {dict.hero.subtitle}
            </p>
          </div>
        </>
      ) : (
        <h1 className="sr-only">ogpeek</h1>
      )}
      <div className="flex w-full max-w-xl flex-col gap-3">
        <UrlInput />
        <p className="flex flex-wrap items-center justify-center gap-2 text-xs text-[color:rgb(var(--muted))]">
          <span>{dict.hero.examplesLabel}</span>
          {EXAMPLES.map((example) => (
            <Link
              key={example}
              href={`/${lang}/inspect?url=${encodeURIComponent(example)}`}
              prefetch={false}
              className="rounded-full border border-[color:rgb(var(--border))] px-2.5 py-0.5 font-mono transition hover:border-[color:rgb(var(--accent))] hover:text-[color:rgb(var(--foreground))]"
            >
              {example}
            </Link>
          ))}
        </p>
      </div>
    </section>
  );
}
