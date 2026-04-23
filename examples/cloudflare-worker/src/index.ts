import { parse } from "og-debug";

const USER_AGENT = "og-debug-example/0.1 (+https://ogp.me)";
const FETCH_TIMEOUT_MS = 8000;
const MAX_BYTES = 2 * 1024 * 1024; // 2 MiB

type JsonBody = Record<string, unknown>;

export default {
  async fetch(req: Request): Promise<Response> {
    const url = new URL(req.url);
    if (url.pathname !== "/") return json({ error: "not found" }, 404);

    const target = url.searchParams.get("url");
    if (!target) return json({ error: "missing ?url=<target>" }, 400);

    let targetUrl: URL;
    try {
      targetUrl = new URL(target);
    } catch {
      return json({ error: "invalid url" }, 400);
    }
    if (targetUrl.protocol !== "http:" && targetUrl.protocol !== "https:") {
      return json({ error: "only http(s) urls are supported" }, 400);
    }

    try {
      const fetched = await fetchHtml(targetUrl);
      const result = parse(fetched.html, { url: fetched.finalUrl });
      return json(
        { target: fetched.finalUrl, status: fetched.status, ...result },
        200,
        { "cache-control": "public, max-age=60" },
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const status = err instanceof HttpError ? err.status : 500;
      return json({ error: message }, status);
    }
  },
};

class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function fetchHtml(target: URL): Promise<{ html: string; finalUrl: string; status: number }> {
  const res = await fetch(target.toString(), {
    headers: {
      "user-agent": USER_AGENT,
      accept: "text/html,application/xhtml+xml",
    },
    redirect: "follow",
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });

  if (!res.ok) throw new HttpError(502, `upstream responded ${res.status}`);

  const contentType = res.headers.get("content-type") ?? "";
  if (!/\b(?:text\/html|application\/xhtml\+xml)\b/i.test(contentType)) {
    throw new HttpError(415, `upstream content-type "${contentType}" is not html`);
  }

  const reader = res.body?.getReader();
  if (!reader) throw new HttpError(502, "upstream body missing");

  const decoder = new TextDecoder("utf-8");
  let received = 0;
  let buf = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    received += value.byteLength;
    if (received > MAX_BYTES) {
      await reader.cancel();
      throw new HttpError(413, `upstream exceeded ${MAX_BYTES} bytes`);
    }
    buf += decoder.decode(value, { stream: true });
  }
  buf += decoder.decode();

  return { html: buf, finalUrl: res.url || target.toString(), status: res.status };
}

function json(body: JsonBody, status = 200, extraHeaders: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...extraHeaders,
    },
  });
}
