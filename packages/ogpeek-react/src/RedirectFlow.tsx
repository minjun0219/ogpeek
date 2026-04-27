import type { RedirectHop } from "ogpeek/fetch";
import {
  DEFAULT_LANG,
  format,
  resolveDict,
  type DeepPartial,
  type Dict,
  type Lang,
} from "./dict.js";

export type RedirectFlowProps = {
  finalUrl: string;
  status: number;
  redirects: RedirectHop[];
  canonical: string | null;
  lang?: Lang;
  dict?: DeepPartial<Dict>;
  className?: string;
};

export function RedirectFlow({
  finalUrl,
  status,
  redirects,
  canonical,
  lang = DEFAULT_LANG,
  dict: dictOverride,
  className,
}: RedirectFlowProps) {
  const dict = resolveDict(lang, dictOverride);
  const canonicalDiffers =
    canonical != null && !sameResource(canonical, finalUrl);
  const initialUrl = redirects[0]?.from ?? finalUrl;

  const rootClass = className
    ? `ogpeek-root ogpeek-section ${className}`
    : "ogpeek-root ogpeek-section";

  return (
    <section className={rootClass}>
      <header className="ogpeek-section-header">
        <h2 className="ogpeek-h2">{dict.redirectFlow.title}</h2>
        <span className="ogpeek-text-xs ogpeek-muted">HTTP {status}</span>
      </header>
      <dl className="ogpeek-flow-grid">
        <dt>{dict.redirectFlow.fetchedUrl}</dt>
        <dd>
          <span className="ogpeek-mono ogpeek-text-xs ogpeek-break">
            {finalUrl}
          </span>
        </dd>

        {canonicalDiffers ? (
          <>
            <dt>{dict.redirectFlow.canonicalUrl}</dt>
            <dd>
              <span className="ogpeek-mono ogpeek-text-xs ogpeek-break">
                {canonical}
              </span>
              <p className="ogpeek-flow-note">
                {dict.redirectFlow.canonicalNote}
              </p>
            </dd>
          </>
        ) : null}

        {redirects.length > 0 ? (
          <>
            <dt>{dict.redirectFlow.redirectPath}</dt>
            <dd>
              <ol className="ogpeek-flow-list">
                <li>
                  <span className="ogpeek-flow-tag">
                    {dict.redirectFlow.input}
                  </span>
                  <span className="ogpeek-mono ogpeek-break">{initialUrl}</span>
                </li>
                {redirects.map((hop, i) => (
                  <li key={`${hop.from}-${i}`}>
                    <span className="ogpeek-flow-tag ogpeek-flow-tag--redirect">
                      {format(dict.redirectFlow.redirectStatusTemplate, {
                        status: hop.status,
                      })}
                    </span>
                    <span className="ogpeek-mono ogpeek-break">{hop.to}</span>
                  </li>
                ))}
              </ol>
            </dd>
          </>
        ) : null}
      </dl>
    </section>
  );
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
