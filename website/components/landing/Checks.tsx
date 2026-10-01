import type { WarningCode, WarningSeverity } from "ogpeek";
import { Section } from "@/components/landing/Section";
import type { Dict } from "@/lib/i18n";

// Mirrors the severities in packages/ogpeek/src/validate.ts, ordered by
// severity for display. Typed as a full Record so a new WarningCode fails
// the website typecheck until it is listed here and in the dictionaries.
const RULES: Record<WarningCode, WarningSeverity> = {
  OG_TITLE_MISSING: "error",
  OG_TYPE_MISSING: "error",
  OG_IMAGE_MISSING: "error",
  OG_URL_MISSING: "error",
  OG_TITLE_TOO_LONG: "warn",
  OG_URL_MISMATCH: "warn",
  OG_TYPE_UNKNOWN: "warn",
  URL_NOT_ABSOLUTE: "warn",
  DUPLICATE_SINGLETON: "warn",
  ORPHAN_STRUCTURED_PROPERTY: "warn",
  INVALID_DIMENSION: "warn",
  JSONLD_PARSE_ERROR: "warn",
  MISSING_PREFIX_ATTR: "info",
};

const SEVERITY_TOKEN: Record<WarningSeverity, string> = {
  error: "--danger",
  warn: "--warning",
  info: "--info",
};

export function Checks({ dict }: { dict: Dict }) {
  const rules = Object.entries(RULES) as Array<[WarningCode, WarningSeverity]>;

  return (
    <Section id="checks" title={dict.checks.title} lead={dict.checks.lead}>
      <ul className="divide-y divide-[color:rgb(var(--border))] overflow-hidden rounded-xl border border-[color:rgb(var(--border))]">
        {rules.map(([code, severity]) => {
          const token = SEVERITY_TOKEN[severity];
          return (
            <li
              key={code}
              className="flex flex-col gap-1 px-4 py-2.5 text-sm sm:flex-row sm:items-center sm:gap-4"
            >
              <div className="flex items-center gap-3 sm:w-[22rem] sm:shrink-0">
                <span
                  className="w-12 shrink-0 rounded px-1.5 py-0.5 text-center text-[11px] font-medium"
                  style={{
                    color: `rgb(var(${token}))`,
                    backgroundColor: `rgb(var(${token}) / 0.12)`,
                  }}
                >
                  {dict.validation.severity[severity]}
                </span>
                <code className="break-all font-mono text-xs">{code}</code>
              </div>
              <span className="text-[color:rgb(var(--muted))]">
                {dict.checks.rules[code]}
              </span>
            </li>
          );
        })}
      </ul>
    </Section>
  );
}
