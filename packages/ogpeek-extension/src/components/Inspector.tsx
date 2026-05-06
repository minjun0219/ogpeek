import { Result } from "@ogpeek/react";
import { type OgDebugResult, parse } from "ogpeek";
import type { FetchResult } from "ogpeek/fetch";
import { type FormEvent, useEffect, useState } from "react";
import { browser } from "../lib/browser.js";
import type { FetchResponse } from "../lib/messaging.js";

type Inspection = {
  parsed: OgDebugResult;
  fetched: FetchResult;
};

type ErrorState = {
  code: string;
  status: number;
  message: string;
};

// Korean copy lives inline (AGENTS.md principle 4: user-facing text in
// Korean, codes/keys in English). The engine's FetchError.code surfaces in
// the error block so users can match it to the README, but the headline is
// translated.
const ERROR_HEADLINES: Record<string, string> = {
  TIMEOUT: "응답 시간을 초과했어요.",
  NETWORK: "대상 서버에 연결할 수 없어요.",
  UPSTREAM_STATUS: "대상 서버가 오류 상태로 응답했어요.",
  NOT_HTML: "이 URL은 HTML 페이지가 아니에요.",
  EMPTY_BODY: "응답 본문이 비어 있어요.",
  TOO_LARGE: "응답이 너무 커서 잘라냈어요.",
  READ_ERROR: "응답을 읽는 중 오류가 발생했어요.",
  TOO_MANY_REDIRECTS: "리디렉션이 너무 많아요.",
  BAD_REDIRECT: "리디렉션 위치 헤더가 잘못됐어요.",
  REDIRECT_LOOP: "리디렉션이 순환하고 있어요.",
  INVALID_URL: "URL 형식이 올바르지 않아요.",
  UNSUPPORTED_SCHEME: "http 또는 https URL만 검사할 수 있어요.",
  GUARD_FAILED: "내부 가드가 요청을 차단했어요.",
  UNKNOWN: "알 수 없는 오류가 발생했어요.",
};

export type InspectorProps = {
  initialUrl?: string;
  // When provided, the component skips the fetch round-trip and parses
  // this HTML directly. The popup uses this to feed the active tab's
  // live DOM (via chrome.scripting.executeScript) so we don't replay a
  // request the user just made — same auth state, no second hit.
  preloaded?: { html: string; finalUrl: string };
  // Compact = popup mode (480px-tight layout, single-column).
  // false = full page (responsive container, room to breathe).
  compact?: boolean;
  // When provided, surfaces the "open in full page" button. The popup
  // wires this; the full page leaves it undefined.
  onOpenFull?: () => void;
  // When provided, fired after each successful inspection so the host
  // page can mirror the inspected URL into its location bar (full page).
  onInspectedUrlChange?: (url: string) => void;
};

export function Inspector({
  initialUrl = "",
  preloaded,
  compact = false,
  onOpenFull,
  onInspectedUrlChange,
}: InspectorProps) {
  const [url, setUrl] = useState(initialUrl);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<ErrorState | null>(null);
  const [data, setData] = useState<Inspection | null>(null);

  // Re-sync the input when the host swaps initialUrl (e.g. full page
  // location change via back/forward).
  useEffect(() => {
    setUrl(initialUrl);
  }, [initialUrl]);

  // Run an inspection automatically once on mount when the host
  // pre-fills enough context: a preloaded DOM snapshot (popup) or a
  // URL passed via query param (full page). Manual typed inspections
  // always go through the form submit, so we deliberately ignore prop
  // updates here.
  // biome-ignore lint/correctness/useExhaustiveDependencies: mount-only
  useEffect(() => {
    if (preloaded) {
      runFromHtml(preloaded.html, preloaded.finalUrl);
      return;
    }
    if (!compact && initialUrl) {
      void inspectViaFetch(initialUrl);
    }
  }, []);

  function runFromHtml(html: string, finalUrl: string) {
    try {
      const parsed = parse(html, { url: finalUrl });
      setData({
        parsed,
        fetched: { html, finalUrl, status: 200, redirects: [] },
      });
      setError(null);
      onInspectedUrlChange?.(finalUrl);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError({ code: "PARSE_ERROR", status: 500, message });
    }
  }

  async function inspectViaFetch(target: string) {
    setPending(true);
    setError(null);
    setData(null);
    try {
      const response = (await browser.runtime.sendMessage({
        type: "ogpeek:fetch",
        url: target,
      })) as FetchResponse | undefined;
      if (!response) {
        setError({
          code: "UNKNOWN",
          status: 500,
          message: "background did not respond",
        });
        return;
      }
      if (!response.ok) {
        setError({
          code: response.code,
          status: response.status,
          message: response.message,
        });
        return;
      }
      const parsed = parse(response.result.html, {
        url: response.result.finalUrl,
      });
      setData({ parsed, fetched: response.result });
      onInspectedUrlChange?.(target);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError({ code: "UNKNOWN", status: 500, message });
    } finally {
      setPending(false);
    }
  }

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = url.trim();
    if (!trimmed || pending) {
      return;
    }
    void inspectViaFetch(trimmed);
  }

  const headline = error
    ? (ERROR_HEADLINES[error.code] ?? error.message)
    : null;

  return (
    <div className={compact ? "ogp-shell ogp-shell--compact" : "ogp-shell"}>
      <header className="ogp-header">
        <h1 className="ogp-title">ogpeek</h1>
        {onOpenFull ? (
          <button
            type="button"
            className="ogp-link-button"
            onClick={onOpenFull}
          >
            전체 화면으로 열기 ↗
          </button>
        ) : null}
      </header>
      <form className="ogp-form" onSubmit={onSubmit}>
        <input
          className="ogp-input"
          type="text"
          inputMode="url"
          autoComplete="url"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          placeholder="https://example.com"
          aria-label="검사할 URL"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        <button
          type="submit"
          className="ogp-button"
          disabled={!url.trim() || pending}
        >
          {pending ? "검사 중…" : "검사"}
        </button>
      </form>

      {error ? (
        <div className="ogp-error" role="alert">
          <div>{headline}</div>
          <div className="ogp-error__meta">
            <code>{error.code}</code>
            {error.status ? ` · ${error.status}` : null}
          </div>
        </div>
      ) : null}

      {data ? (
        <Result
          result={data.parsed}
          finalUrl={data.fetched.finalUrl}
          status={data.fetched.status}
          redirects={data.fetched.redirects}
          canonical={data.parsed.meta.canonical}
        />
      ) : !error && !pending ? (
        <div className="ogp-status">
          확인할 URL을 입력하면 사용자의 브라우저에서 직접 요청을 보냅니다.
        </div>
      ) : null}
    </div>
  );
}
