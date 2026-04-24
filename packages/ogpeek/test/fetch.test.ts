import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("node:dns/promises", () => {
  return {
    resolve4: vi.fn(async (hostname: string) => {
      if (hostname === "public.test") return ["93.184.216.34"];
      if (hostname === "internal.test") return ["10.0.0.5"];
      if (hostname === "edge-private.test") return ["10.0.0.5"];
      if (hostname === "missing.test") {
        throw Object.assign(new Error("ENOTFOUND"), { code: "ENOTFOUND" });
      }
      if (hostname === "loopback6.test") {
        throw Object.assign(new Error("ENODATA"), { code: "ENODATA" });
      }
      return ["93.184.216.34"];
    }),
    resolve6: vi.fn(async (hostname: string) => {
      if (hostname === "loopback6.test") return ["::1"];
      throw Object.assign(new Error("ENODATA"), { code: "ENODATA" });
    }),
  };
});

import * as dnsPromises from "node:dns/promises";
import { FetchError, fetchHtml } from "../src/fetch";

const mockedResolve4 = vi.mocked(dnsPromises.resolve4);
const mockedResolve6 = vi.mocked(dnsPromises.resolve6);

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

  it("blocks a redirect that points to a private IP", async () => {
    globalThis.fetch = vi.fn(async () =>
      redirectResponse("http://10.0.0.1/admin"),
    ) as typeof fetch;
    await expect(fetchHtml("https://public.test/")).rejects.toMatchObject({
      code: "BLOCKED_PRIVATE_IP",
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
      if (call === 1) return redirectResponse("https://public.test/final");
      return mockResponse({ body: "<html>ok</html>" });
    }) as typeof fetch;

    const result = await fetchHtml("https://public.test/");
    expect(call).toBe(2);
    expect(result.finalUrl).toBe("https://public.test/final");
    expect(result.html).toContain("ok");
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

    await expect(fetchHtml("https://public.test/", { timeoutMs: 10 })).rejects.toBeInstanceOf(
      FetchError,
    );
    await expect(fetchHtml("https://public.test/", { timeoutMs: 10 })).rejects.toMatchObject({
      code: "TIMEOUT",
    });
  });
});

describe("fetchHtml() — ssrf modes", () => {
  it('"hostname" mode blocks loopback names without DNS lookup', async () => {
    await expect(fetchHtml("http://localhost/", { ssrf: "hostname" })).rejects.toMatchObject({
      code: "BLOCKED_PRIVATE_HOST",
    });
  });

  it('"hostname" mode blocks literal private IPs', async () => {
    await expect(fetchHtml("http://10.0.0.1/", { ssrf: "hostname" })).rejects.toMatchObject({
      code: "BLOCKED_PRIVATE_IP",
    });
    await expect(fetchHtml("http://169.254.169.254/", { ssrf: "hostname" })).rejects.toMatchObject({
      code: "BLOCKED_PRIVATE_IP",
    });
  });

  it('"hostname" mode allows public hostnames whose DNS resolves to private (no lookup)', async () => {
    globalThis.fetch = vi.fn(async () => mockResponse({ body: "<html>ok</html>" })) as typeof fetch;
    mockedResolve4.mockClear();
    mockedResolve6.mockClear();
    const result = await fetchHtml("http://edge-private.test/", { ssrf: "hostname" });
    expect(result.html).toContain("ok");
    // hostname 모드는 DNS 를 절대 부르지 않는다 — 회귀 방지.
    expect(mockedResolve4).not.toHaveBeenCalled();
    expect(mockedResolve6).not.toHaveBeenCalled();
  });

  it("ssrf: false skips all checks (private IP literal allowed) and does not call lookup", async () => {
    globalThis.fetch = vi.fn(async () => mockResponse({ body: "<html>ok</html>" })) as typeof fetch;
    mockedResolve4.mockClear();
    mockedResolve6.mockClear();
    const result = await fetchHtml("http://10.0.0.5/", { ssrf: false });
    expect(result.html).toContain("ok");
    expect(mockedResolve4).not.toHaveBeenCalled();
    expect(mockedResolve6).not.toHaveBeenCalled();
  });

  it("explicit ssrf option takes precedence over legacy allowPrivateNetwork", async () => {
    // ssrf: "strict" overrides allowPrivateNetwork: true
    await expect(
      fetchHtml("http://10.0.0.1/", { ssrf: "strict", allowPrivateNetwork: true }),
    ).rejects.toMatchObject({ code: "BLOCKED_PRIVATE_IP" });
  });

  it('strict mode reports SSRF_UNSUPPORTED when resolve4/resolve6 throw "Not implemented"', async () => {
    mockedResolve4.mockImplementationOnce(async () => {
      throw new Error("Not implemented");
    });
    mockedResolve6.mockImplementationOnce(async () => {
      throw new Error("Not implemented");
    });
    await expect(
      fetchHtml("https://public.test/", { ssrf: "strict" }),
    ).rejects.toMatchObject({ code: "SSRF_UNSUPPORTED" });
  });

  // Workers nodejs_compat lookup() 폴리필이 CNAME 체인의 호스트명을 address
  // 로 반환하던 버그(예: www.naver.com → www.naver.com.nheos.com)를 resolve4
  // 는 재현하지 않는다 — 최종 A 레코드 문자열 배열만 돌려준다. 회귀 방지.
  it("public resolve4 returns proper IPv4 array and hostname passes strict", async () => {
    globalThis.fetch = vi.fn(async () =>
      mockResponse({ body: "<html>ok</html>", url: "https://public.test/" }),
    ) as typeof fetch;
    mockedResolve4.mockClear();
    mockedResolve6.mockClear();
    const result = await fetchHtml("https://public.test/", { ssrf: "strict" });
    expect(result.html).toContain("ok");
    expect(mockedResolve4).toHaveBeenCalledWith("public.test");
  });
});
