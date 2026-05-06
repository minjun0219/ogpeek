"use client";

import { useState } from "react";
import { useTranslate } from "@/lib/translate-context";

const MANAGERS = ["npm", "pnpm", "yarn"] as const;
type Manager = (typeof MANAGERS)[number];

function commandFor(manager: Manager, pkg: string): string {
  return manager === "npm" ? `npm install ${pkg}` : `${manager} add ${pkg}`;
}

export function InstallCopy({ pkg }: { pkg: string }) {
  const { dict } = useTranslate();
  const [manager, setManager] = useState<Manager>("npm");
  const [copied, setCopied] = useState(false);
  const command = commandFor(manager, pkg);

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
    <div className="flex w-full max-w-xl flex-col gap-2 font-mono text-sm">
      <div className="flex gap-1 text-xs">
        {MANAGERS.map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setManager(m)}
            aria-pressed={m === manager}
            className={
              m === manager
                ? "rounded px-2 py-0.5 text-[color:rgb(var(--foreground))]"
                : "rounded px-2 py-0.5 text-[color:rgb(var(--muted))] transition hover:text-[color:rgb(var(--foreground))]"
            }
          >
            {m}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2 rounded-lg border border-[color:rgb(var(--border))] bg-[color:rgb(var(--surface))] px-4 py-2 text-left">
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
    </div>
  );
}
