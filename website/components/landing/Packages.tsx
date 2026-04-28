import Link from "next/link";
import type { Dict, Lang } from "@/lib/i18n";

export function Packages({ dict, lang }: { dict: Dict; lang: Lang }) {
  return (
    <section className="rounded-2xl border border-[color:rgb(var(--border))] bg-[color:rgb(var(--surface))] px-6 py-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <h2 className="text-base font-semibold tracking-tight">
            {dict.packages.title}
          </h2>
          <p className="text-sm text-[color:rgb(var(--muted))]">
            {dict.packages.subtitle}
          </p>
        </div>
        <Link
          href={`/${lang}/packages`}
          className="self-start text-sm font-medium text-[color:rgb(var(--accent))] hover:underline sm:self-auto"
          prefetch={false}
        >
          {dict.packages.detailLink}
        </Link>
      </div>
    </section>
  );
}
