import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

export type FetchOptions = {
  userAgent?: string;
  timeoutMs?: number;
  maxBytes?: number;
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

const DEFAULT_USER_AGENT = "ogpeek/0.2 (+https://github.com/)";
const DEFAULT_TIMEOUT_MS = 8000;
const DEFAULT_MAX_BYTES = 5 * 1024 * 1024;
const MAX_REDIRECTS = 5;

export async function fetchHtml(rawUrl: string, opts: FetchOptions = {}): Promise<FetchResult> {
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxBytes = opts.maxBytes ?? DEFAULT_MAX_BYTES;
  const userAgent = opts.userAgent ?? DEFAULT_USER_AGENT;
  const allowPrivate = opts.allowPrivateNetwork ?? false;

  const target = parseUrl(rawUrl);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let finalRes: Response;
  let finalUrl: string;
  try {
    const hop = await followRedirects(target, {
      userAgent,
      allowPrivate,
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
  opts: { userAgent: string; allowPrivate: boolean; signal: AbortSignal },
): Promise<{ res: Response; finalUrl: string }> {
  const visited = new Set<string>([start.toString()]);
  let current = start;

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    if (!opts.allowPrivate) {
      await assertPublicHost(current.hostname);
    }

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

async function assertPublicHost(hostname: string): Promise<void> {
  if (!hostname) {
    throw new FetchError("BLOCKED_HOST", 400, "hostname is empty");
  }
  const lower = hostname.toLowerCase();
  if (lower === "localhost" || lower.endsWith(".localhost")) {
    throw new FetchError("BLOCKED_PRIVATE_HOST", 400, `hostname "${hostname}" is a loopback name`);
  }

  const literalKind = isIP(hostname);
  if (literalKind !== 0) {
    if (isPrivateIp(hostname, literalKind)) {
      throw new FetchError("BLOCKED_PRIVATE_IP", 400, `ip ${hostname} is in a private range`);
    }
    return;
  }

  let resolved;
  try {
    resolved = await lookup(hostname, { all: true });
  } catch {
    throw new FetchError("DNS_FAILED", 400, `failed to resolve "${hostname}"`);
  }
  for (const { address, family } of resolved) {
    if (isPrivateIp(address, family)) {
      throw new FetchError(
        "BLOCKED_PRIVATE_IP",
        400,
        `hostname "${hostname}" resolves to private ip ${address}`,
      );
    }
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
