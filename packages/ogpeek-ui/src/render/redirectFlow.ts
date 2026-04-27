import type { RedirectHop } from "ogpeek/fetch";
import { html, raw, type HtmlSafe } from "../html.js";
import { format, type Dict } from "../dict.js";

export type RedirectFlowRenderProps = {
  finalUrl: string;
  status: number;
  redirects: RedirectHop[];
  canonical: string | null;
  dict: Dict;
};

export function redirectFlowBody(props: RedirectFlowRenderProps): HtmlSafe {
  const { finalUrl, status, redirects, canonical, dict } = props;
  const canonicalDiffers =
    canonical != null && !sameResource(canonical, finalUrl);
  const initialUrl = redirects[0]?.from ?? finalUrl;

  const canonicalRow = canonicalDiffers
    ? html`
        <dt>${dict.redirectFlow.canonicalUrl}</dt>
        <dd>
          <span class="og-mono og-text-xs og-break">${canonical}</span>
          <p class="og-flow-note">${dict.redirectFlow.canonicalNote}</p>
        </dd>
      `
    : "";

  const redirectRow =
    redirects.length > 0
      ? html`
          <dt>${dict.redirectFlow.redirectPath}</dt>
          <dd>
            <ol class="og-flow-list">
              <li>
                <span class="og-flow-tag">${dict.redirectFlow.input}</span>
                <span class="og-mono og-break">${initialUrl}</span>
              </li>
              ${raw(
                redirects
                  .map(
                    (hop) => html`
                      <li>
                        <span class="og-flow-tag og-flow-tag--redirect">
                          ${format(dict.redirectFlow.redirectStatusTemplate, {
                            status: hop.status,
                          })}
                        </span>
                        <span class="og-mono og-break">${hop.to}</span>
                      </li>
                    `,
                  )
                  .join(""),
              )}
            </ol>
          </dd>
        `
      : "";

  return raw(html`
    <section class="og-section">
      <header class="og-section-header">
        <h2 class="og-h2">${dict.redirectFlow.title}</h2>
        <span class="og-text-xs og-muted">HTTP ${status}</span>
      </header>
      <dl class="og-flow-grid">
        <dt>${dict.redirectFlow.fetchedUrl}</dt>
        <dd><span class="og-mono og-text-xs og-break">${finalUrl}</span></dd>
        ${raw(canonicalRow)}
        ${raw(redirectRow)}
      </dl>
    </section>
  `);
}

function sameResource(a: string, b: string): boolean {
  try {
    const ua = new URL(a);
    const ub = new URL(b);
    return (
      ua.protocol === ub.protocol &&
      ua.host.toLowerCase() === ub.host.toLowerCase() &&
      stripSlash(ua.pathname) === stripSlash(ub.pathname) &&
      ua.search === ub.search
    );
  } catch {
    return a === b;
  }
}

function stripSlash(p: string): string {
  return p.length > 1 && p.endsWith("/") ? p.slice(0, -1) : p;
}
