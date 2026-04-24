import type { RedirectHop } from "ogpeek/fetch";

type Props = {
  finalUrl: string;
  status: number;
  redirects: RedirectHop[];
  canonical: string | null;
};

export function RedirectFlow({ finalUrl, status, redirects, canonical }: Props) {
  const canonicalDiffers = canonical != null && !sameResource(canonical, finalUrl);
  if (redirects.length === 0 && !canonicalDiffers) return null;

  const initialUrl = redirects[0]?.from ?? finalUrl;

  return (
    <section className="rounded-xl border border-[color:rgb(var(--border))] bg-[color:rgb(var(--surface))] px-5 py-4">
      <header className="flex items-center justify-between">
        <h2 className="text-sm font-medium">요청 흐름</h2>
        <span className="text-xs text-[color:rgb(var(--muted))]">HTTP {status}</span>
      </header>

      <dl className="mt-3 grid grid-cols-[max-content_1fr] gap-x-4 gap-y-2 text-sm">
        <dt className="text-xs text-[color:rgb(var(--muted))]">가져온 URL</dt>
        <dd className="break-all font-mono text-xs">{finalUrl}</dd>

        {canonicalDiffers ? (
          <>
            <dt className="text-xs text-[color:rgb(var(--muted))]">표준 URL</dt>
            <dd className="break-all font-mono text-xs">
              {canonical}
              <p className="mt-1 font-sans text-[11px] text-[color:rgb(var(--muted))]">
                페이지가 선언한 캐노니컬이 가져온 URL과 다릅니다 — 소셜 플랫폼은 이
                URL을 기준으로 메타데이터를 수집할 수 있습니다.
              </p>
            </dd>
          </>
        ) : null}

        {redirects.length > 0 ? (
          <>
            <dt className="text-xs text-[color:rgb(var(--muted))]">리디렉션 경로</dt>
            <dd>
              <ol className="space-y-1.5 text-xs">
                <li className="flex items-baseline gap-3">
                  <span className="shrink-0 rounded bg-[color:rgb(var(--background))] px-2 py-0.5 text-[10px] uppercase tracking-wide text-[color:rgb(var(--muted))] ring-1 ring-[color:rgb(var(--border))]">
                    URL 입력
                  </span>
                  <span className="break-all font-mono">{initialUrl}</span>
                </li>
                {redirects.map((hop, idx) => (
                  <li key={`${hop.from}-${idx}`} className="flex items-baseline gap-3">
                    <span className="shrink-0 rounded bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-amber-700 ring-1 ring-amber-500/30 dark:text-amber-300">
                      {hop.status} 리디렉션
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
