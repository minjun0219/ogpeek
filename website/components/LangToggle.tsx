"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/cn";
import { LANGS, type Lang } from "@/lib/i18n";
import { useTranslate } from "@/lib/translate-context";

const LABELS: Record<Lang, string> = { en: "EN", ko: "KO" };

export function LangToggle() {
  const { lang, dict } = useTranslate();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const query = searchParams.toString();
  const suffix = query ? `?${query}` : "";
  const subPath = pathname.replace(/^\/(en|ko)(?=\/|$)/, "");

  return (
    <nav
      aria-label={dict.toggle.ariaLabel}
      className="inline-flex items-center gap-0.5 rounded-full border border-[color:rgb(var(--border))] bg-[color:rgb(var(--surface))] p-0.5 text-[11px] font-medium uppercase tracking-wide"
    >
      {LANGS.map((target) => {
        const active = target === lang;
        return (
          <Link
            key={target}
            href={`/${target}${subPath}${suffix}`}
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
