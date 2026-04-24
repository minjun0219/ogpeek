import type { Warning } from "ogpeek";
import { cn } from "@/lib/cn";

const SEVERITY_LABEL: Record<Warning["severity"], string> = {
  error: "에러",
  warn: "경고",
  info: "안내",
};

const SEVERITY_STYLE: Record<Warning["severity"], string> = {
  error: "bg-red-500/10 text-red-700 ring-red-500/30 dark:text-red-300",
  warn: "bg-amber-500/10 text-amber-700 ring-amber-500/30 dark:text-amber-300",
  info: "bg-blue-500/10 text-blue-700 ring-blue-500/30 dark:text-blue-300",
};

const ORDER: Record<Warning["severity"], number> = { error: 0, warn: 1, info: 2 };

export function ValidationPanel({ warnings }: { warnings: Warning[] }) {
  const sorted = [...warnings].sort((a, b) => ORDER[a.severity] - ORDER[b.severity]);
  const counts = warnings.reduce<Record<Warning["severity"], number>>(
    (acc, w) => {
      acc[w.severity]++;
      return acc;
    },
    { error: 0, warn: 0, info: 0 },
  );

  if (warnings.length === 0) {
    return (
      <section className="rounded-xl border border-[color:rgb(var(--border))] bg-emerald-500/5 px-5 py-4">
        <h2 className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
          검증 통과 — 확인된 문제 없음
        </h2>
        <p className="mt-1 text-xs text-[color:rgb(var(--muted))]">
          필수 OG 태그가 모두 존재하고 스펙 위반이 감지되지 않았습니다.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-[color:rgb(var(--border))] bg-[color:rgb(var(--surface))] px-5 py-4">
      <header className="flex items-center justify-between">
        <h2 className="text-sm font-medium">검증 결과</h2>
        <div className="flex gap-2 text-xs">
          {(["error", "warn", "info"] as const).map((s) =>
            counts[s] ? (
              <span
                key={s}
                className={cn(
                  "rounded-full px-2 py-0.5 ring-1",
                  SEVERITY_STYLE[s],
                )}
              >
                {SEVERITY_LABEL[s]} {counts[s]}
              </span>
            ) : null,
          )}
        </div>
      </header>
      <ul className="mt-3 space-y-2">
        {sorted.map((w, idx) => (
          <li
            key={`${w.code}-${idx}`}
            className={cn(
              "rounded-lg px-3 py-2 text-sm ring-1",
              SEVERITY_STYLE[w.severity],
            )}
          >
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide">
              <span>{SEVERITY_LABEL[w.severity]}</span>
              <span className="opacity-60">{w.code}</span>
            </div>
            <div className="mt-1">{w.message}</div>
            {w.value ? (
              <div className="mt-1 truncate font-mono text-xs opacity-80">
                {w.property ? `${w.property}: ` : ""}
                {w.value}
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
