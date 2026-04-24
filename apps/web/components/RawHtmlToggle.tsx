"use client";

import { useState } from "react";

export function RawHtmlToggle({ html }: { html: string }) {
  const [open, setOpen] = useState(false);

  return (
    <section className="rounded-xl border border-[color:rgb(var(--border))]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-5 py-3 text-sm font-medium"
      >
        <span>Raw HTML</span>
        <span className="text-xs text-[color:rgb(var(--muted))]">
          {open ? "접기" : `펼치기 (${formatSize(html.length)})`}
        </span>
      </button>
      {open ? (
        <pre className="max-h-[480px] overflow-auto border-t border-[color:rgb(var(--border))] bg-[color:rgb(var(--surface))] px-5 py-4 font-mono text-xs leading-relaxed">
          {html}
        </pre>
      ) : null}
    </section>
  );
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)}MB`;
}
