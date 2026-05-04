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

export function App() {
  const [url, setUrl] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<ErrorState | null>(null);
  const [data, setData] = useState<Inspection | null>(null);

  useEffect(() => {
    // Pre-fill with the active tab's URL so the common case ("inspect this
    // page") is one click away.
    void browser.tabs
      .query({ active: true, currentWindow: true })
      .then((tabs) => {
        const tabUrl = tabs[0]?.url;
        if (tabUrl && /^https?:/.test(tabUrl)) {
          setUrl(tabUrl);
        }
      })
      .catch(() => {
        // activeTab access can fail on internal pages (chrome://, etc.) —
        // fall back to an empty input.
      });
  }, []);

  async function inspect(target: string) {
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
    void inspect(trimmed);
  }

  const headline = error
    ? (ERROR_HEADLINES[error.code] ?? error.message)
    : null;

  return (
    <div>
      <header className="popup-header">
        <h1 className="popup-title">ogpeek</h1>
      </header>
      <form className="popup-form" onSubmit={onSubmit}>
        <input
          className="popup-input"
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
          className="popup-button"
          disabled={!url.trim() || pending}
        >
          {pending ? "검사 중…" : "검사"}
        </button>
      </form>

      {error ? (
        <div className="popup-error" role="alert">
          <div>{headline}</div>
          <div style={{ marginTop: 4, fontSize: 12, opacity: 0.8 }}>
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
        <div className="popup-status">
          확인할 URL을 입력하면 사용자의 브라우저에서 직접 요청을 보냅니다.
        </div>
      ) : null}
    </div>
  );
}
