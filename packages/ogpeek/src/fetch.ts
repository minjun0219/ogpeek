export type FetchOptions = {
  userAgent?: string;
  timeoutMs?: number;
  maxBytes?: number;
  /**
   * 초기 요청 + 모든 리디렉션 hop 직전에 호출된다. 차단하려면 FetchError 를
   * throw, 통과시키려면 return. 미지정 시 아무 검사도 하지 않는다. ogpeek 은
   * SSRF 정책을 판단하지 않는다 — 배포 환경(클라우드/온프렘/엣지)마다
   * 적절한 가드 구현이 다르므로 호출자 책임이다.
   */
  guard?: (url: URL) => Promise<void> | void;
  /**
   * 한 hop 의 HTTP 전송만 수행하는 함수. fetchHtml 이 각 리디렉션 hop 마다
   * 이 함수를 호출해서 단일 Response 를 받는다. 리디렉션 추적 · timeout ·
   * maxBytes · content-type 판정 · guard 호출은 fetchHtml 이 계속 소유하므로
   * 이 주입점은 "전송 정책만" 바꾸는 좁은 슬롯이다 (커스텀 dispatcher,
   * DoH 리졸버, mTLS 등). 기본값은 globalThis.fetch.
   */
  fetch?: (url: string, init: RequestInit) => Promise<Response>;
};

export type FetchResult = {
  html: string;
  finalUrl: string;
  status: number;
};

export class FetchError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(code: string, status: number, message: string) {
    super(message);
    this.name = "FetchError";
    this.code = code;
    this.status = status;
  }
}

// Browser-like UA by default so corporate sites and CDNs (Cloudflare,
// Akamai) don't 403 an obvious bot identifier. Callers can override with
// options.userAgent when they need a more honest fingerprint.
const DEFAULT_USER_AGENT =
  "Mozilla/5.0 (compatible; ogpeek/0.2; +https://github.com/) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";
const DEFAULT_TIMEOUT_MS = 8000;
const DEFAULT_MAX_BYTES = 5 * 1024 * 1024;
const MAX_REDIRECTS = 5;

export async function fetchHtml(rawUrl: string, opts: FetchOptions = {}): Promise<FetchResult> {
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxBytes = opts.maxBytes ?? DEFAULT_MAX_BYTES;
  const userAgent = opts.userAgent ?? DEFAULT_USER_AGENT;
  const fetchImpl = opts.fetch ?? fetch;

  const target = parseUrl(rawUrl);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let finalRes: Response;
  let finalUrl: string;
  try {
    const hop = await followRedirects(target, {
      userAgent,
      guard: opts.guard,
      fetch: fetchImpl,
      signal: controller.signal,
    });
    finalRes = hop.res;
    finalUrl = hop.finalUrl;
  } catch (err) {
    if (err instanceof FetchError) throw err;
    if (err instanceof Error && err.name === "AbortError") {
      throw new FetchError("TIMEOUT", 504, `upstream did not respond within ${timeoutMs}ms`);
    }
    const message = err instanceof Error ? err.message : String(err);
    throw new FetchError("NETWORK", 502, `upstream network error: ${message}`);
  } finally {
    clearTimeout(timer);
  }

  if (!finalRes.ok) {
    throw new FetchError("UPSTREAM_STATUS", 502, `upstream responded ${finalRes.status}`);
  }

  const contentType = finalRes.headers.get("content-type") ?? "";
  if (!/\b(?:text\/html|application\/xhtml\+xml)\b/i.test(contentType)) {
    throw new FetchError("NOT_HTML", 415, `upstream content-type "${contentType}" is not html`);
  }

  const reader = finalRes.body?.getReader();
  if (!reader) {
    throw new FetchError("EMPTY_BODY", 502, "upstream body missing");
  }

  const decoder = new TextDecoder("utf-8");
  let received = 0;
  let buf = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      received += value.byteLength;
      if (received > maxBytes) {
        await reader.cancel();
        throw new FetchError("TOO_LARGE", 413, `upstream exceeded ${maxBytes} bytes`);
      }
      buf += decoder.decode(value, { stream: true });
    }
  } catch (err) {
    if (err instanceof FetchError) throw err;
    const message = err instanceof Error ? err.message : String(err);
    throw new FetchError("READ_ERROR", 502, `failed reading upstream body: ${message}`);
  }
  buf += decoder.decode();

  return { html: buf, finalUrl, status: finalRes.status };
}

// Manual redirect following so every hop's URL goes through the caller-
// supplied guard *before* an outbound request is made. `redirect: "follow"`
// would let fetch() silently hit an intermediate host that we only notice in
// the final response — too late for a guard to matter.
async function followRedirects(
  start: URL,
  opts: {
    userAgent: string;
    guard: ((url: URL) => Promise<void> | void) | undefined;
    fetch: (url: string, init: RequestInit) => Promise<Response>;
    signal: AbortSignal;
  },
): Promise<{ res: Response; finalUrl: string }> {
  const visited = new Set<string>([start.toString()]);
  let current = start;

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    await runGuard(opts.guard, current);

    const res = await opts.fetch(current.toString(), {
      headers: {
        "user-agent": opts.userAgent,
        accept: "text/html,application/xhtml+xml",
      },
      redirect: "manual",
      signal: opts.signal,
    });

    if (!isRedirect(res.status) || !res.headers.has("location")) {
      return { res, finalUrl: current.toString() };
    }

    await discard(res);

    if (hop === MAX_REDIRECTS) {
      throw new FetchError("TOO_MANY_REDIRECTS", 502, `exceeded ${MAX_REDIRECTS} redirects`);
    }

    const location = res.headers.get("location")!;
    let next: URL;
    try {
      next = new URL(location, current);
    } catch {
      throw new FetchError("BAD_REDIRECT", 502, `invalid Location header "${location}"`);
    }
    if (next.protocol !== "http:" && next.protocol !== "https:") {
      throw new FetchError(
        "UNSUPPORTED_SCHEME",
        400,
        `redirect to unsupported scheme ${next.protocol}`,
      );
    }
    const key = next.toString();
    if (visited.has(key)) {
      throw new FetchError("REDIRECT_LOOP", 502, `redirect loop detected at ${key}`);
    }
    visited.add(key);
    current = next;
  }

  throw new FetchError("TOO_MANY_REDIRECTS", 502, `exceeded ${MAX_REDIRECTS} redirects`);
}

async function runGuard(
  guard: ((url: URL) => Promise<void> | void) | undefined,
  url: URL,
): Promise<void> {
  if (!guard) return;
  try {
    await guard(url);
  } catch (err) {
    // FetchError 는 그대로 전파 — 호출자가 의도한 차단 코드/상태를 그대로
    // 노출한다. 그 외 에러는 호출자 구현 버그로 보고 GUARD_FAILED 로 래핑한다.
    if (err instanceof FetchError) throw err;
    const message = err instanceof Error ? err.message : String(err);
    throw new FetchError("GUARD_FAILED", 500, `guard threw: ${message}`);
  }
}

function isRedirect(status: number): boolean {
  return status === 301 || status === 302 || status === 303 || status === 307 || status === 308;
}

async function discard(res: Response): Promise<void> {
  try {
    await res.body?.cancel();
  } catch {
    // best-effort
  }
}

function parseUrl(raw: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new FetchError("INVALID_URL", 400, "url is malformed");
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new FetchError("UNSUPPORTED_SCHEME", 400, "only http and https urls are supported");
  }
  return parsed;
}
