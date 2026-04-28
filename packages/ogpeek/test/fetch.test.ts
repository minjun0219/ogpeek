import { afterEach, describe, expect, it, vi } from "vitest";
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
  const chunks =
    init.chunks ?? (init.body != null ? [encoder.encode(init.body)] : []);

  const stream = new ReadableStream({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(chunk);
      }
      controller.close();
    },
  });

  const res = new Response(stream, { status, headers });
  Object.defineProperty(res, "url", {
    value: init.url ?? "",
    configurable: true,
  });
  return res;
}

function redirectResponse(location: string, status = 302): Response {
  return new Response("", {
    status,
    headers: { location, "content-type": "text/html" },
  });
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
    await expect(fetchHtml("not-a-url")).rejects.toMatchObject({
      code: "INVALID_URL",
    });
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
    expect(result.redirects).toEqual([]);
  });

  it("rejects non-html content types", async () => {
    globalThis.fetch = vi.fn(async () =>
      mockResponse({
        body: "{}",
        headers: { "content-type": "application/json" },
      }),
    ) as typeof fetch;

    await expect(fetchHtml("https://public.test/")).rejects.toMatchObject({
      code: "NOT_HTML",
      status: 415,
    });
  });

  it("rejects upstream non-2xx", async () => {
    globalThis.fetch = vi.fn(async () =>
      mockResponse({ status: 500 }),
    ) as typeof fetch;
    await expect(fetchHtml("https://public.test/")).rejects.toMatchObject({
      code: "UPSTREAM_STATUS",
    });
  });

  it("enforces the size cap via streaming", async () => {
    const big = new Uint8Array(1024).fill(65); // 'A' * 1024
    globalThis.fetch = vi.fn(async () =>
      mockResponse({ chunks: [big, big, big, big] }),
    ) as typeof fetch;

    await expect(
      fetchHtml("https://public.test/", { maxBytes: 2048 }),
    ).rejects.toMatchObject({
      code: "TOO_LARGE",
      status: 413,
    });
  });

  it("blocks a redirect to a non-http scheme", async () => {
    globalThis.fetch = vi.fn(async () =>
      redirectResponse("file:///etc/passwd"),
    ) as typeof fetch;
    await expect(fetchHtml("https://public.test/")).rejects.toMatchObject({
      code: "UNSUPPORTED_SCHEME",
    });
  });

  it("follows a safe redirect chain", async () => {
    let call = 0;
    globalThis.fetch = vi.fn(async () => {
      call++;
      if (call === 1) {
        return redirectResponse("https://public.test/final");
      }
      return mockResponse({ body: "<html>ok</html>" });
    }) as typeof fetch;

    const result = await fetchHtml("https://public.test/");
    expect(call).toBe(2);
    expect(result.finalUrl).toBe("https://public.test/final");
    expect(result.html).toContain("ok");
    expect(result.redirects).toEqual([
      {
        from: "https://public.test/",
        to: "https://public.test/final",
        status: 302,
      },
    ]);
  });

  it("exposes status code per hop in the redirect chain", async () => {
    let call = 0;
    globalThis.fetch = vi.fn(async () => {
      call++;
      if (call === 1) {
        return redirectResponse("https://public.test/hop1", 301);
      }
      if (call === 2) {
        return redirectResponse("https://public.test/final", 308);
      }
      return mockResponse({ body: "<html>ok</html>" });
    }) as typeof fetch;

    const result = await fetchHtml("https://public.test/start");
    expect(result.finalUrl).toBe("https://public.test/final");
    expect(result.redirects).toEqual([
      {
        from: "https://public.test/start",
        to: "https://public.test/hop1",
        status: 301,
      },
      {
        from: "https://public.test/hop1",
        to: "https://public.test/final",
        status: 308,
      },
    ]);
  });

  it("rejects redirect loops", async () => {
    globalThis.fetch = vi.fn(async () =>
      redirectResponse("https://public.test/"),
    ) as typeof fetch;
    await expect(fetchHtml("https://public.test/")).rejects.toMatchObject({
      code: "REDIRECT_LOOP",
    });
  });

  it("caps redirect hops", async () => {
    let call = 0;
    globalThis.fetch = vi.fn(async () =>
      redirectResponse(`https://public.test/next${call++}`),
    ) as typeof fetch;
    await expect(fetchHtml("https://public.test/")).rejects.toMatchObject({
      code: "TOO_MANY_REDIRECTS",
    });
  });

  it("converts AbortError into a TIMEOUT FetchError", async () => {
    globalThis.fetch = vi.fn(async () => {
      const err = new Error("aborted");
      err.name = "AbortError";
      throw err;
    }) as typeof fetch;

    await expect(
      fetchHtml("https://public.test/", { timeoutMs: 10 }),
    ).rejects.toBeInstanceOf(FetchError);
    await expect(
      fetchHtml("https://public.test/", { timeoutMs: 10 }),
    ).rejects.toMatchObject({
      code: "TIMEOUT",
    });
  });

  it("uses injected fetch over globalThis.fetch", async () => {
    globalThis.fetch = vi.fn(async () => {
      throw new Error("globalThis.fetch should not be called");
    }) as typeof fetch;
    const customFetch = vi.fn(async () =>
      mockResponse({
        body: "<html>injected</html>",
        url: "https://public.test/",
      }),
    );

    const result = await fetchHtml("https://public.test/", {
      fetch: customFetch as unknown as typeof fetch,
    });

    expect(customFetch).toHaveBeenCalledTimes(1);
    expect(globalThis.fetch).not.toHaveBeenCalled();
    expect(result.html).toContain("injected");
  });
});

describe("fetchHtml() — guard hook", () => {
  it("no guard means any url passes through untouched", async () => {
    globalThis.fetch = vi.fn(async () =>
      mockResponse({ body: "<html>ok</html>" }),
    ) as typeof fetch;
    // A loopback literal that the old built-in SSRF guard would have blocked
    // should now pass through — the engine no longer makes policy decisions.
    const result = await fetchHtml("http://127.0.0.1/");
    expect(result.html).toContain("ok");
  });

  it("guard that returns allows the request through", async () => {
    globalThis.fetch = vi.fn(async () =>
      mockResponse({ body: "<html>ok</html>" }),
    ) as typeof fetch;
    const guard = vi.fn(async () => {});
    const result = await fetchHtml("https://public.test/", { guard });
    expect(result.html).toContain("ok");
    expect(guard).toHaveBeenCalledTimes(1);
    const calledWith = guard.mock.calls[0]?.[0];
    expect(calledWith).toBeInstanceOf(URL);
    expect((calledWith as URL).toString()).toBe("https://public.test/");
  });

  it("guard throwing a FetchError propagates code and status verbatim", async () => {
    globalThis.fetch = vi.fn(async () =>
      mockResponse({ body: "<html>ok</html>" }),
    ) as typeof fetch;
    const guard = () => {
      throw new FetchError("BLOCKED", 400, "nope");
    };
    await expect(
      fetchHtml("https://public.test/", { guard }),
    ).rejects.toMatchObject({
      code: "BLOCKED",
      status: 400,
      message: "nope",
    });
  });

  it("guard throwing a non-FetchError is wrapped as GUARD_FAILED", async () => {
    globalThis.fetch = vi.fn(async () =>
      mockResponse({ body: "<html>ok</html>" }),
    ) as typeof fetch;
    const guard = () => {
      throw new Error("boom");
    };
    await expect(
      fetchHtml("https://public.test/", { guard }),
    ).rejects.toMatchObject({
      code: "GUARD_FAILED",
      status: 500,
    });
  });

  it("guard runs on each redirect hop (initial URL and every target)", async () => {
    let call = 0;
    globalThis.fetch = vi.fn(async () => {
      call++;
      if (call === 1) {
        return redirectResponse("https://public.test/hop1");
      }
      if (call === 2) {
        return redirectResponse("https://public.test/final");
      }
      return mockResponse({ body: "<html>ok</html>" });
    }) as typeof fetch;

    const seen: string[] = [];
    const guard = async (url: URL) => {
      seen.push(url.toString());
    };

    const result = await fetchHtml("https://public.test/start", { guard });
    expect(result.finalUrl).toBe("https://public.test/final");
    expect(seen).toEqual([
      "https://public.test/start",
      "https://public.test/hop1",
      "https://public.test/final",
    ]);
  });

  it("guard can block a mid-chain redirect target", async () => {
    let call = 0;
    globalThis.fetch = vi.fn(async () => {
      call++;
      if (call === 1) {
        return redirectResponse("http://10.0.0.1/admin");
      }
      return mockResponse({ body: "<html>ok</html>" });
    }) as typeof fetch;

    const guard = (url: URL) => {
      if (url.hostname === "10.0.0.1") {
        throw new FetchError("BLOCKED_PRIVATE_IP", 400, "private");
      }
    };

    await expect(
      fetchHtml("https://public.test/", { guard }),
    ).rejects.toMatchObject({
      code: "BLOCKED_PRIVATE_IP",
      status: 400,
    });
  });
});
