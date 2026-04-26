import type { RedirectHop } from "ogpeek/fetch";
import { format, type Dict } from "@/lib/i18n";

type Props = {
  finalUrl: string;
  status: number;
  redirects: RedirectHop[];
  canonical: string | null;
  dict: Dict;
};

export function RedirectFlow({ finalUrl, status, redirects, canonical, dict }: Props) {
  const canonicalDiffers = canonical != null && !sameResource(canonical, finalUrl);
  const initialUrl = redirects[0]?.from ?? finalUrl;

  return (
    <section className="rounded-xl border border-[color:rgb(var(--border))] bg-[color:rgb(var(--surface))] px-5 py-4">
      <header className="flex items-center justify-between">
        <h2 className="text-sm font-medium">{dict.redirectFlow.title}</h2>
        <span className="text-xs text-[color:rgb(var(--muted))]">HTTP {status}</span>
      </header>

      <dl className="mt-3 grid grid-cols-[max-content_1fr] gap-x-4 gap-y-2 text-sm">
        <dt className="text-xs text-[color:rgb(var(--muted))]">{dict.redirectFlow.fetchedUrl}</dt>
        <dd className="break-all font-mono text-xs">{finalUrl}</dd>

        {canonicalDiffers ? (
          <>
            <dt className="text-xs text-[color:rgb(var(--muted))]">{dict.redirectFlow.canonicalUrl}</dt>
            <dd className="break-all font-mono text-xs">
              {canonical}
              <p className="mt-1 font-sans text-[11px] text-[color:rgb(var(--muted))]">
                {dict.redirectFlow.canonicalNote}
              </p>
            </dd>
          </>
        ) : null}

        {redirects.length > 0 ? (
          <>
            <dt className="text-xs text-[color:rgb(var(--muted))]">{dict.redirectFlow.redirectPath}</dt>
            <dd>
              <ol className="space-y-1.5 text-xs">
                <li className="flex items-baseline gap-3">
                  <span className="shrink-0 rounded bg-[color:rgb(var(--background))] px-2 py-0.5 text-[10px] uppercase tracking-wide text-[color:rgb(var(--muted))] ring-1 ring-[color:rgb(var(--border))]">
                    {dict.redirectFlow.input}
                  </span>
                  <span className="break-all font-mono">{initialUrl}</span>
                </li>
                {redirects.map((hop, idx) => (
                  <li key={`${hop.from}-${idx}`} className="flex items-baseline gap-3">
                    <span className="shrink-0 rounded bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-amber-700 ring-1 ring-amber-500/30 dark:text-amber-300">
                      {format(dict.redirectFlow.redirectStatusTemplate, { status: hop.status })}
                    </span>
                    <span className="break-all font-mono">{hop.to}</span>
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
