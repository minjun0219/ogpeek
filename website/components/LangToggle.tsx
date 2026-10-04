"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/cn";
import { LANGS, type Lang, langPath, stripLangPrefix } from "@/lib/i18n";
import { withBase } from "@/lib/site";
import { useTranslate } from "@/lib/translate-context";

const LABELS: Record<Lang, string> = { en: "EN", ko: "KO" };

export function LangToggle() {
  const { lang, dict } = useTranslate();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const query = searchParams.toString();
  const suffix = query ? `?${query}` : "";
  const base = stripLangPrefix(pathname);
  const path = base === "/" ? "" : base;
  const HREF: Record<Lang, string> = {
    en: langPath("en", path),
    ko: langPath("ko", path),
  };

  return (
    <nav
      aria-label={dict.toggle.ariaLabel}
      className="inline-flex items-center gap-0.5 rounded-full border border-[color:rgb(var(--border))] bg-[color:rgb(var(--surface))] p-0.5 text-[11px] font-medium uppercase tracking-wide"
    >
      {LANGS.map((target) => {
        const active = target === lang;
        return (
          // A plain <a>: next/link would render the English root as "/ogpeek"
          // without the app root's trailing slash.
          // 일반 <a> 다. next/link 는 영어 루트를 앱 루트의 끝 슬래시 없이 "/ogpeek" 으로 만든다.
          <a
            key={target}
            href={`${withBase(HREF[target])}${suffix}`}
            aria-current={active ? "true" : undefined}
            className={cn(
              "rounded-full px-2.5 py-1 transition",
              active
                ? "bg-[color:rgb(var(--foreground))] text-[color:rgb(var(--background))]"
                : "text-[color:rgb(var(--muted))] hover:text-[color:rgb(var(--foreground))]",
            )}
          >
            {LABELS[target]}
          </a>
        );
      })}
    </nav>
  );
}
