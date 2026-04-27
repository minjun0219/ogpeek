import type { Warning } from "ogpeek";
import { html, raw, type HtmlSafe } from "../html.js";
import type { Dict } from "../dict.js";

export type ValidationPanelRenderProps = {
  warnings: Warning[];
  dict: Dict;
};

const ORDER: Record<Warning["severity"], number> = { error: 0, warn: 1, info: 2 };

export function validationPanelBody(
  props: ValidationPanelRenderProps,
): HtmlSafe {
  const { warnings, dict } = props;
  const severityLabel = dict.validation.severity;

  if (warnings.length === 0) {
    return raw(html`
      <section class="og-section--pass">
        <h2 class="og-pass-title">${dict.validation.passTitle}</h2>
        <p class="og-pass-body">${dict.validation.passBody}</p>
      </section>
    `);
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

  const pillsHtml = (["error", "warn", "info"] as const)
    .filter((s) => counts[s])
    .map(
      (s) => html`
        <span class="og-pill og-pill--${s}">
          ${severityLabel[s]} ${counts[s]}
        </span>
      `,
    )
    .join("");

  const itemsHtml = sorted
    .map(
      (w) => html`
        <li class="og-warning-item og-warning-item--${w.severity}">
          <div class="og-warning-meta">
            <span>${severityLabel[w.severity]}</span>
            <span class="og-warning-meta-code">${w.code}</span>
          </div>
          <div class="og-warning-message">${w.message}</div>
          ${w.value
            ? html`<div class="og-warning-value">${w.property
                ? `${w.property}: `
                : ""}${w.value}</div>`
            : ""}
        </li>
      `,
    )
    .join("");

  return raw(html`
    <section class="og-section">
      <header class="og-section-header">
        <h2 class="og-h2">${dict.validation.resultsTitle}</h2>
        <div class="og-pill-row">${raw(pillsHtml)}</div>
      </header>
      <ul class="og-warning-list">${raw(itemsHtml)}</ul>
    </section>
  `);
}
