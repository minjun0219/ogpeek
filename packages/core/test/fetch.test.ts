import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("node:dns/promises", () => {
  return {
    lookup: vi.fn(async (hostname: string) => {
      if (hostname === "public.test") return [{ address: "93.184.216.34", family: 4 }];
      if (hostname === "internal.test") return [{ address: "10.0.0.5", family: 4 }];
      if (hostname === "loopback6.test") return [{ address: "::1", family: 6 }];
      if (hostname === "missing.test") throw new Error("ENOTFOUND");
      return [{ address: "93.184.216.34", family: 4 }];
    }),
  };
});

import { FetchError, fetchHtml } from "../src/fetch";

type MockResponseInit = {
  status?: number;
  headers?: Record<string, string>;
  body?: string;
  chunks?: Uint8Array[];
  url?: string;
};

function mockResponse(init: MockResponseInit = {}): Response {
  const status = init.status ?? 200;
  const headers = new Headers(init.headers ?? { "content-type": "text/html" });
  const encoder = new TextEncoder();
  const chunks = init.chunks ?? (init.body != null ? [encoder.encode(init.body)] : []);

  const stream = new ReadableStream({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(chunk);
      controller.close();
    },
  });

  const res = new Response(stream, { status, headers });
  Object.defineProperty(res, "url", { value: init.url ?? "", configurable: true });
  return res;
}

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

describe("fetchHtml()", () => {
  it("rejects non-http(s) schemes", async () => {
    await expect(fetchHtml("file:///etc/passwd")).rejects.toMatchObject({
      code: "UNSUPPORTED_SCHEME",
      status: 400,
    });
  });

  it("rejects malformed urls", async () => {
    await expect(fetchHtml("not-a-url")).rejects.toMatchObject({ code: "INVALID_URL" });
  });

  it("blocks loopback hostnames", async () => {
    await expect(fetchHtml("http://localhost/")).rejects.toMatchObject({
      code: "BLOCKED_PRIVATE_HOST",
    });
    await expect(fetchHtml("http://foo.localhost/")).rejects.toMatchObject({
      code: "BLOCKED_PRIVATE_HOST",
    });
  });

  it("blocks private ipv4 literals", async () => {
    await expect(fetchHtml("http://127.0.0.1/")).rejects.toMatchObject({
      code: "BLOCKED_PRIVATE_IP",
    });
    await expect(fetchHtml("http://10.0.0.1/")).rejects.toMatchObject({
      code: "BLOCKED_PRIVATE_IP",
    });
    await expect(fetchHtml("http://192.168.1.1/")).rejects.toMatchObject({
      code: "BLOCKED_PRIVATE_IP",
    });
    await expect(fetchHtml("http://169.254.169.254/")).rejects.toMatchObject({
      code: "BLOCKED_PRIVATE_IP",
    });
  });

  it("blocks hostnames that resolve into private ranges", async () => {
    await expect(fetchHtml("http://internal.test/")).rejects.toMatchObject({
      code: "BLOCKED_PRIVATE_IP",
    });
  });

  it("allows private ranges when allowPrivateNetwork is true", async () => {
    globalThis.fetch = vi.fn(async () => mockResponse({ body: "<html>ok</html>" })) as typeof fetch;
    const result = await fetchHtml("http://10.0.0.5/", { allowPrivateNetwork: true });
    expect(result.html).toContain("ok");
  });

  it("fetches and decodes an html body", async () => {
    globalThis.fetch = vi.fn(async () =>
      mockResponse({
        body: "<html><head><title>Hi</title></head></html>",
        url: "https://public.test/page",
      }),
    ) as typeof fetch;

    const result = await fetchHtml("https://public.test/page");
    expect(result.status).toBe(200);
    expect(result.finalUrl).toBe("https://public.test/page");
    expect(result.html).toContain("<title>Hi</title>");
  });

  it("rejects non-html content types", async () => {
    globalThis.fetch = vi.fn(async () =>
      mockResponse({ body: "{}", headers: { "content-type": "application/json" } }),
    ) as typeof fetch;

    await expect(fetchHtml("https://public.test/")).rejects.toMatchObject({
      code: "NOT_HTML",
      status: 415,
    });
  });

  it("rejects upstream non-2xx", async () => {
    globalThis.fetch = vi.fn(async () => mockResponse({ status: 500 })) as typeof fetch;
    await expect(fetchHtml("https://public.test/")).rejects.toMatchObject({
      code: "UPSTREAM_STATUS",
    });
  });

  it("enforces the size cap via streaming", async () => {
    const big = new Uint8Array(1024).fill(65); // 'A' * 1024
    globalThis.fetch = vi.fn(async () =>
      mockResponse({ chunks: [big, big, big, big] }),
    ) as typeof fetch;

    await expect(fetchHtml("https://public.test/", { maxBytes: 2048 })).rejects.toMatchObject({
      code: "TOO_LARGE",
      status: 413,
    });
  });

  it("converts AbortError into a TIMEOUT FetchError", async () => {
    globalThis.fetch = vi.fn(async () => {
      const err = new Error("aborted");
      err.name = "AbortError";
      throw err;
    }) as typeof fetch;

    await expect(fetchHtml("https://public.test/", { timeoutMs: 10 })).rejects.toBeInstanceOf(
      FetchError,
    );
    await expect(fetchHtml("https://public.test/", { timeoutMs: 10 })).rejects.toMatchObject({
      code: "TIMEOUT",
    });
  });
});
