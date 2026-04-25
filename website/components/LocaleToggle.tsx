"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { cn } from "@/lib/cn";
import { LOCALES, type Dict, type Locale } from "@/lib/i18n";

const LABELS: Record<Locale, string> = { en: "EN", ko: "KO" };

export function LocaleToggle({ locale, dict }: { locale: Locale; dict: Dict }) {
  const searchParams = useSearchParams();
  const query = searchParams.toString();
  const suffix = query ? `?${query}` : "";

  return (
    <nav
      aria-label={dict.toggle.ariaLabel}
      className="inline-flex items-center gap-0.5 rounded-full border border-[color:rgb(var(--border))] bg-[color:rgb(var(--surface))] p-0.5 text-[11px] font-medium uppercase tracking-wide"
    >
      {LOCALES.map((target) => {
        const active = target === locale;
        return (
          <Link
            key={target}
            href={`/${target}${suffix}`}
            aria-current={active ? "true" : undefined}
            prefetch={false}
            className={cn(
              "rounded-full px-2.5 py-1 transition",
              active
                ? "bg-[color:rgb(var(--foreground))] text-[color:rgb(var(--background))]"
                : "text-[color:rgb(var(--muted))] hover:text-[color:rgb(var(--foreground))]",
            )}
          >
            {LABELS[target]}
          </Link>
        );
      })}
    </nav>
  );
}
