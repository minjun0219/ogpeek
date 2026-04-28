import type { Warning } from "ogpeek";
import { cls } from "./cls.js";
import {
  DEFAULT_LANG,
  type DeepPartial,
  type Dict,
  type Lang,
  resolveDict,
} from "./dict.js";

export type ValidationPanelProps = {
  warnings: Warning[];
  lang?: Lang;
  dict?: DeepPartial<Dict>;
  composed?: boolean;
  className?: string;
};

const ORDER: Record<Warning["severity"], number> = {
  error: 0,
  warn: 1,
  info: 2,
};

export function ValidationPanel({
  warnings,
  lang = DEFAULT_LANG,
  dict: dictOverride,
  composed = false,
  className,
}: ValidationPanelProps) {
  const dict = resolveDict(lang, dictOverride);
  const severityLabel = dict.validation.severity;
  const rootClass = composed ? null : "ogpeek-root";

  if (warnings.length === 0) {
    return (
      <section className={cls(rootClass, "ogpeek-section--pass", className)}>
        <h2 className="ogpeek-pass-title">{dict.validation.passTitle}</h2>
        <p className="ogpeek-pass-body">{dict.validation.passBody}</p>
      </section>
    );
  }

  const sorted = [...warnings].sort(
    (a, b) => ORDER[a.severity] - ORDER[b.severity],
  );
  const counts = warnings.reduce<Record<Warning["severity"], number>>(
    (acc, w) => {
      acc[w.severity]++;
      return acc;
    },
    { error: 0, warn: 0, info: 0 },
  );

  return (
    <section className={cls(rootClass, "ogpeek-section", className)}>
      <header className="ogpeek-section-header">
        <h2 className="ogpeek-h2">{dict.validation.resultsTitle}</h2>
        <div className="ogpeek-pill-row">
          {(["error", "warn", "info"] as const)
            .filter((s) => counts[s])
            .map((s) => (
              <span key={s} className={`ogpeek-pill ogpeek-pill--${s}`}>
                {severityLabel[s]} {counts[s]}
              </span>
            ))}
        </div>
      </header>
      <ul className="ogpeek-warning-list">
        {sorted.map((w, i) => (
          <li
            key={`${w.code}-${i}`}
            className={`ogpeek-warning-item ogpeek-warning-item--${w.severity}`}
          >
            <div className="ogpeek-warning-meta">
              <span>{severityLabel[w.severity]}</span>
              <span className="ogpeek-warning-meta-code">{w.code}</span>
            </div>
            <div className="ogpeek-warning-message">{w.message}</div>
            {w.value ? (
              <div className="ogpeek-warning-value">
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
