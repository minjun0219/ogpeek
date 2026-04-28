"use client";

import { useState } from "react";
import { useTranslate } from "@/lib/translate-context";

export function InstallCopy({ command }: { command: string }) {
  const { dict } = useTranslate();
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard API may be unavailable on insecure origins; silently ignore.
    }
  }

  return (
    <div className="flex w-full max-w-xl items-center gap-2 rounded-lg border border-[color:rgb(var(--border))] bg-[color:rgb(var(--surface))] px-4 py-2 text-left font-mono text-sm">
      <span className="flex-1 truncate">
        <span className="text-[color:rgb(var(--muted))]">$ </span>
        {command}
      </span>
      <button
        type="button"
        onClick={copy}
        aria-label={dict.install.ariaLabel}
        className="shrink-0 rounded px-2 py-1 text-xs text-[color:rgb(var(--muted))] transition hover:bg-[color:rgb(var(--background))] hover:text-[color:rgb(var(--foreground))]"
      >
        {copied ? dict.install.copied : dict.install.copy}
      </button>
    </div>
  );
}
