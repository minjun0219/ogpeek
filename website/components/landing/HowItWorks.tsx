import { Section } from "@/components/landing/Section";
import type { Dict } from "@/lib/i18n";

const PIPELINE = ["URL", "fetch", "parse", "validate", "preview"];

export function HowItWorks({ dict }: { dict: Dict }) {
  const steps = [
    { code: "ogpeek/fetch", ...dict.how.steps.fetch },
    { code: "parse()", ...dict.how.steps.parse },
    { code: "result.warnings", ...dict.how.steps.validate },
  ];

  return (
    <Section id="how" title={dict.how.title} lead={dict.how.lead}>
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border border-[color:rgb(var(--border))] bg-[color:rgb(var(--surface))] px-4 py-3 font-mono text-xs">
        {PIPELINE.map((stage, i) => (
          <span key={stage} className="flex items-center gap-2">
            {i > 0 ? (
              <span aria-hidden className="text-[color:rgb(var(--muted))]">
                →
              </span>
            ) : null}
            <span>{stage}</span>
          </span>
        ))}
      </p>
      <ol className="grid gap-4 sm:grid-cols-3">
        {steps.map((step, i) => (
          <li
            key={step.code}
            className="flex flex-col gap-2 rounded-xl border border-[color:rgb(var(--border))] px-5 py-4"
          >
            <div className="flex items-baseline justify-between gap-2">
              <h3 className="font-medium">
                <span className="mr-2 text-[color:rgb(var(--accent))]">
                  {i + 1}.
                </span>
                {step.title}
              </h3>
              <code className="truncate font-mono text-[11px] text-[color:rgb(var(--muted))]">
                {step.code}
              </code>
            </div>
            <p className="text-sm leading-relaxed text-[color:rgb(var(--muted))]">
              {step.body}
            </p>
          </li>
        ))}
      </ol>
    </Section>
  );
}
