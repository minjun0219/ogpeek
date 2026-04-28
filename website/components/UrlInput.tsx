"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";
import { useTranslate } from "@/lib/translate-context";

export function UrlInput({ compact = false }: { compact?: boolean }) {
  const { lang, dict } = useTranslate();
  const router = useRouter();
  const params = useSearchParams();
  const currentUrl = params.get("url") ?? "";
  const [value, setValue] = useState(currentUrl);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    // Sync the input and release the disabled state whenever the URL query
    // param changes — covers both submit-triggered navigation and external
    // permalink changes.
    setValue(currentUrl);
    setPending(false);
  }, [currentUrl]);

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) {
      return;
    }
    if (trimmed === currentUrl) {
      return;
    }
    setPending(true);
    const next = new URLSearchParams();
    next.set("url", trimmed);
    router.push(`/${lang}/inspect?${next.toString()}`);
  }

  return (
    <form
      onSubmit={submit}
      className={
        compact
          ? "flex w-full items-center gap-2"
          : "flex w-full flex-col gap-2 sm:flex-row sm:items-center"
      }
    >
      <input
        type="text"
        inputMode="url"
        autoComplete="url"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        placeholder={dict.urlInput.placeholder}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="flex-1 rounded-lg border border-[color:rgb(var(--border))] bg-[color:rgb(var(--surface))] px-4 py-3 text-base outline-none transition focus:border-[color:rgb(var(--accent))] focus:ring-2 focus:ring-[color:rgb(var(--accent))]/30"
      />
      <button
        type="submit"
        disabled={!value.trim() || pending}
        className="rounded-lg bg-[color:rgb(var(--foreground))] px-5 py-3 text-sm font-medium text-[color:rgb(var(--background))] transition hover:opacity-90 disabled:opacity-40"
      >
        {pending ? dict.urlInput.loading : dict.urlInput.submit}
      </button>
    </form>
  );
}
