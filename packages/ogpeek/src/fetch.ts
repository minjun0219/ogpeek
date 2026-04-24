import { isIP } from "node:net";

// `node:dns/promises`는 strict 모드에서만 필요하므로 모듈 최상단에서 정적
// import 하지 않는다. dns 모듈 자체가 없는 (Vercel Edge 등) 런타임에서도
// hostname 모드/false 모드는 영향 없이 로드되어야 한다.
// assertResolvesToPublic() 안에서 동적 import.

// SSRF 가드 모드.
// - "strict": DNS 리졸브 + 사설/루프백/링크로컬 대역 차단. node:dns/promises의
//   resolve4/resolve6 로 A·AAAA 레코드를 직접 조회하므로 Node.js 와
//   `nodejs_compat` 플래그가 켜진 Cloudflare Workers 양쪽에서 동작한다.
//   resolve4/6 자체가 구현되지 않은 런타임이면 명시적 SSRF_UNSUPPORTED 에러로
//   안내한다. 기본값.
// - "hostname": hostname 문자열 검사만 — localhost·.localhost·리터럴 사설 IP 차단.
//   DNS 리졸브 없음. node:dns 의존이 전혀 발생하지 않으므로 엣지 런타임 호환이며
//   DNS subrequest 비용도 아낄 수 있다.
// - false: SSRF 검사 비활성화 (소비자 책임).
export type SsrfMode = "strict" | "hostname" | false;

export type FetchOptions = {
  userAgent?: string;
  timeoutMs?: number;
  maxBytes?: number;
  ssrf?: SsrfMode;
  /**
   * @deprecated `ssrf: false`를 사용하라. `ssrf` 옵션이 명시되지 않은 경우에만
   *   레거시 호환으로 처리된다 (true → ssrf: false와 동등).
   */
  allowPrivateNetwork?: boolean;
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
  const ssrf = resolveSsrfMode(opts);

  const target = parseUrl(rawUrl);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let finalRes: Response;
  let finalUrl: string;
  try {
    const hop = await followRedirects(target, {
      userAgent,
      ssrf,
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

// Manual redirect following so every hop's hostname goes through the SSRF
// guard *before* an outbound request is made. `redirect: "follow"` would let
// fetch() silently hit an intermediate private host that we only notice in
// the final response — too late.
async function followRedirects(
  start: URL,
  opts: { userAgent: string; ssrf: SsrfMode; signal: AbortSignal },
): Promise<{ res: Response; finalUrl: string }> {
  const visited = new Set<string>([start.toString()]);
  let current = start;

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    await guardHost(current.hostname, opts.ssrf);

    const res = await fetch(current.toString(), {
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

function resolveSsrfMode(opts: FetchOptions): SsrfMode {
  if (opts.ssrf !== undefined) return opts.ssrf;
  // legacy: `allowPrivateNetwork: true` 는 가드를 끄는 것과 동등.
  if (opts.allowPrivateNetwork === true) return false;
  return "strict";
}

async function guardHost(hostname: string, mode: SsrfMode): Promise<void> {
  if (mode === false) return;
  // hostname 모드 검사는 모든 모드의 공통 1차 방어선이다 — strict도 먼저 통과해야 한다.
  assertSafeHostname(hostname);
  if (mode === "strict") {
    await assertResolvesToPublic(hostname);
  }
}

// 문자열만 보고 차단할 수 있는 케이스 — DNS 리졸브 없이 안전하게 결정.
// 엣지 런타임에서도 동일하게 동작한다.
function assertSafeHostname(hostname: string): void {
  if (!hostname) {
    throw new FetchError("BLOCKED_HOST", 400, "hostname is empty");
  }
  const lower = hostname.toLowerCase();
  if (lower === "localhost" || lower.endsWith(".localhost")) {
    throw new FetchError("BLOCKED_PRIVATE_HOST", 400, `hostname "${hostname}" is a loopback name`);
  }
  const literalKind = isIP(hostname);
  if (literalKind !== 0 && isPrivateIp(hostname, literalKind)) {
    throw new FetchError("BLOCKED_PRIVATE_IP", 400, `ip ${hostname} is in a private range`);
  }
}

// NOTE: DNS rebinding — this check resolves the hostname with
// dns.resolve4()/resolve6() *before* the request, but fetch() will re-resolve
// it at connect time. An attacker-controlled DNS that returns a public IP for
// the first lookup and a private IP for the connect opens a TOCTOU gap. Fully
// mitigating this would require connecting to the literal IP we validated
// and sending the original Host header (plus SNI for HTTPS) — not feasible
// without pulling in a custom undici Agent, which would outweigh the risk
// for the current scope. If that changes, revisit here.
async function assertResolvesToPublic(hostname: string): Promise<void> {
  // 리터럴 IP는 이미 assertSafeHostname에서 사설 여부를 판정했으므로 통과시켜야 한다.
  if (isIP(hostname) !== 0) return;

  let resolve4: typeof import("node:dns/promises").resolve4;
  let resolve6: typeof import("node:dns/promises").resolve6;
  try {
    ({ resolve4, resolve6 } = await import("node:dns/promises"));
  } catch {
    throw new FetchError(
      "SSRF_UNSUPPORTED",
      500,
      'current runtime does not support node:dns/promises; switch to ssrf: "hostname"',
    );
  }

  // resolve4/resolve6 는 A/AAAA 레코드를 DNS 서버에서 직접 가져와 IP 문자열
  // 배열을 돌려준다. lookup()과 달리 CNAME 체인은 DNS 서버가 따라가 최종
  // 레코드만 반환하므로, Cloudflare Workers nodejs_compat 의 lookup() 폴리필이
  // CNAME 체인의 호스트명을 address 로 반환하는 버그를 우회할 수 있다.
  const [v4, v6] = await Promise.allSettled([resolve4(hostname), resolve6(hostname)]);

  if (v4.status === "fulfilled") {
    for (const ip of v4.value) {
      if (isPrivateIp(ip, 4)) {
        throw new FetchError(
          "BLOCKED_PRIVATE_IP",
          400,
          `hostname "${hostname}" resolves to private ip ${ip}`,
        );
      }
    }
  }
  if (v6.status === "fulfilled") {
    for (const ip of v6.value) {
      if (isPrivateIp(ip, 6)) {
        throw new FetchError(
          "BLOCKED_PRIVATE_IP",
          400,
          `hostname "${hostname}" resolves to private ip ${ip}`,
        );
      }
    }
  }

  // AAAA-only 도메인에서 resolve4 가 ENODATA 로 실패하는 건 정상이므로
  // "하나라도 성공" 이면 통과. 둘 다 실패일 때만 에러를 구분해서 올린다.
  if (v4.status === "rejected" && v6.status === "rejected") {
    const msg4 = v4.reason instanceof Error ? v4.reason.message : String(v4.reason);
    const msg6 = v6.reason instanceof Error ? v6.reason.message : String(v6.reason);
    if (/not implemented/i.test(msg4) || /not implemented/i.test(msg6)) {
      throw new FetchError(
        "SSRF_UNSUPPORTED",
        500,
        'current runtime does not implement dns.resolve4/resolve6; switch to ssrf: "hostname"',
      );
    }
    throw new FetchError("DNS_FAILED", 400, `failed to resolve "${hostname}"`);
  }
}

function isPrivateIp(ip: string, family: number): boolean {
  if (family === 4) return isPrivateIpv4(ip);
  if (family === 6) return isPrivateIpv6(ip);
  return false;
}

function isPrivateIpv4(ip: string): boolean {
  const parts = ip.split(".").map((p) => Number.parseInt(p, 10));
  if (parts.length !== 4 || parts.some((p) => !Number.isInteger(p) || p < 0 || p > 255)) {
    return true; // malformed → treat as unsafe
  }
  const [a, b] = parts as [number, number, number, number];
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 0) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT 100.64.0.0/10
  if (a >= 224) return true; // multicast / reserved
  return false;
}

function isPrivateIpv6(ip: string): boolean {
  const lower = ip.toLowerCase();
  if (lower === "::" || lower === "::1") return true;
  if (lower.startsWith("fe80:") || lower.startsWith("fe8") || lower.startsWith("fe9")) return true;
  if (lower.startsWith("fea") || lower.startsWith("feb")) return true;
  if (lower.startsWith("fc") || lower.startsWith("fd")) return true; // fc00::/7
  if (lower.startsWith("::ffff:")) {
    const v4 = lower.slice("::ffff:".length);
    if (isIP(v4) === 4) return isPrivateIpv4(v4);
  }
  return false;
}
