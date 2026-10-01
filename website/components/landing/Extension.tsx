import { Section } from "@/components/landing/Section";
import type { Dict, Lang } from "@/lib/i18n";

const GUIDE_HREF: Record<Lang, string> = {
  en: "https://github.com/minjun0219/ogpeek/tree/main/packages/ogpeek-extension#readme",
  ko: "https://github.com/minjun0219/ogpeek/blob/main/packages/ogpeek-extension/README.ko.md",
};

export function Extension({ lang, dict }: { lang: Lang; dict: Dict }) {
  return (
    <Section id="extension" title={dict.extension.title}>
      <div className="flex flex-col gap-4 rounded-2xl border border-[color:rgb(var(--border))] bg-[color:rgb(var(--surface))] px-6 py-6 sm:px-8">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-[color:rgb(var(--border))] px-2.5 py-0.5 font-mono text-[11px] text-[color:rgb(var(--muted))]">
            Chrome · MV3
          </span>
        </div>
        <p className="text-sm leading-relaxed">{dict.extension.body}</p>
        <ul className="flex flex-col gap-1.5 text-sm text-[color:rgb(var(--muted))]">
          {dict.extension.points.map((point) => (
            <li key={point} className="flex gap-2">
              <span aria-hidden className="text-[color:rgb(var(--accent))]">
                ✓
              </span>
              <span>{point}</span>
            </li>
          ))}
        </ul>
        <div>
          <a
            href={GUIDE_HREF[lang]}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex rounded-lg border border-[color:rgb(var(--border))] bg-[color:rgb(var(--background))] px-4 py-2 text-sm font-medium transition hover:border-[color:rgb(var(--accent))]"
          >
            {dict.extension.guideLink} →
          </a>
        </div>
      </div>
    </Section>
  );
}
