import type { RedirectHop } from "ogpeek/fetch";
import { cls } from "./cls.js";
import {
  DEFAULT_LANG,
  type DeepPartial,
  type Dict,
  format,
  type Lang,
  resolveDict,
} from "./dict.js";

export type RedirectFlowProps = {
  finalUrl: string;
  status: number;
  redirects: RedirectHop[];
  canonical: string | null;
  lang?: Lang;
  dict?: DeepPartial<Dict>;
  composed?: boolean;
  className?: string;
};

export function RedirectFlow({
  finalUrl,
  status,
  redirects,
  canonical,
  lang = DEFAULT_LANG,
  dict: dictOverride,
  composed = false,
  className,
}: RedirectFlowProps) {
  const dict = resolveDict(lang, dictOverride);
  const canonicalDiffers =
    canonical != null && !sameResource(canonical, finalUrl);
  const initialUrl = redirects[0]?.from ?? finalUrl;

  return (
    <section
      className={cls(
        composed ? null : "ogpeek-root",
        "ogpeek-section",
        className,
      )}
    >
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
    // Pass `b` as base so a relative canonical (e.g. "/" or "/page")
    // resolves against the absolute fetched URL before comparison —
    // ogpeek's parser exposes the raw canonical href, which can be
    // relative. Without the base argument `new URL("/")` throws and the
    // catch path mistakenly reports the resources as different.
    const ua = new URL(a, b);
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
