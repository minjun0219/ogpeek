"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

export function UrlInput({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const params = useSearchParams();
  const initial = params.get("url") ?? "";
  const [value, setValue] = useState(initial);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    setValue(params.get("url") ?? "");
  }, [params]);

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) return;
    setPending(true);
    const next = new URLSearchParams();
    next.set("url", trimmed);
    router.push(`/?${next.toString()}`);
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
        type="url"
        inputMode="url"
        autoComplete="url"
        placeholder="https://ogp.me"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => setPending(false)}
        className="flex-1 rounded-lg border border-[color:rgb(var(--border))] bg-[color:rgb(var(--surface))] px-4 py-3 text-base outline-none transition focus:border-[color:rgb(var(--accent))] focus:ring-2 focus:ring-[color:rgb(var(--accent))]/30"
      />
      <button
        type="submit"
        disabled={!value.trim() || pending}
        className="rounded-lg bg-[color:rgb(var(--foreground))] px-5 py-3 text-sm font-medium text-[color:rgb(var(--background))] transition hover:opacity-90 disabled:opacity-40"
      >
        {pending ? "불러오는 중…" : "OG 태그 보기"}
      </button>
    </form>
  );
}
