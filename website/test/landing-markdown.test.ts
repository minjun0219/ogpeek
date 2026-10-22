import { describe, expect, it } from "vitest";
import { getDict } from "../lib/i18n";
import { RULES } from "../lib/landing";
import {
  landingMarkdown,
  MARKDOWN_PATHS,
  serveLandingMarkdown,
} from "../lib/landing-markdown";

const ORIGIN = "https://minjun.kim";

// Claude Code's WebFetch and a browser navigation.
// Claude Code 의 WebFetch 와 브라우저 페이지 이동이다.
const AGENT_ACCEPT = "text/markdown, text/html, */*";
const BROWSER_ACCEPT =
  "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8";

// Next already varies the landing page on its router headers.
// Next 는 랜딩 페이지에 라우터 헤더로 Vary 를 이미 단다.
const NEXT_VARY = "rsc, next-router-state-tree";

// A stand-in for the OpenNext handler that records whether it was reached.
// OpenNext 핸들러 대신 쓰고, 요청이 여기까지 왔는지 기록한다.
function fakeNext() {
  const calls: number[] = [];
  const next = async () => {
    calls.push(1);
    return new Response("<!doctype html>", {
      headers: {
        "content-type": "text/html; charset=utf-8",
        vary: NEXT_VARY,
      },
    });
  };
  return { next, calls };
}

function get(path: string, accept: string, method = "GET") {
  return new Request(`${ORIGIN}${path}`, { method, headers: { accept } });
}

describe("MARKDOWN_PATHS", () => {
  it("follows mdwire's rule: the root is index.md, a page is its path + .md", () => {
    expect(MARKDOWN_PATHS).toEqual({ en: "/index.md", ko: "/ko.md" });
  });
});

describe("landingMarkdown", () => {
  for (const lang of ["en", "ko"] as const) {
    const md = landingMarkdown(lang);
    const dict = getDict(lang);

    describe(lang, () => {
      it("starts with the H1, the summary and the HTML address", () => {
        const page = lang === "en" ? "/ogpeek/" : "/ogpeek/ko";
        expect(md.startsWith("# ogpeek\n\n")).toBe(true);
        expect(md).toContain(`> ${dict.meta.description}\n`);
        expect(md).toContain(`HTML: ${ORIGIN}${page}\n`);
      });

      it("carries every landing section in the page's language", () => {
        for (const heading of [
          dict.how.title,
          dict.checks.title,
          dict.packages.sectionTitle,
          dict.extension.title,
        ]) {
          expect(md).toContain(`\n## ${heading}\n`);
        }
        expect(md).toContain(dict.hero.subtitle);
        expect(md).toContain(dict.how.steps.parse.body);
        expect(md).toContain(dict.packages.engine.tagline);
        for (const point of dict.extension.points) {
          expect(md).toContain(`- ${point}`);
        }
      });

      it("lists every warning code with its severity", () => {
        for (const [code, severity] of Object.entries(RULES)) {
          expect(md).toContain(
            `- ${dict.validation.severity[severity]} \`${code}\`: `,
          );
        }
      });

      it("links the examples to the inspect page of the same language", () => {
        const inspect =
          lang === "en" ? "/ogpeek/inspect" : "/ogpeek/ko/inspect";
        expect(md).toContain(`[ogp.me](${ORIGIN}${inspect}?url=ogp.me)`);
        expect(md).toContain(
          `${ORIGIN}${inspect}?url=github.com%2Fminjun0219%2Fogpeek`,
        );
      });

      it("keeps a tag in dictionary text from turning into raw HTML", () => {
        expect(md).toContain("`<html prefix>`");
        expect(md).not.toMatch(/(^|[^`])<html prefix>/);
      });

      it("links llms.txt with an absolute URL", () => {
        expect(md).toContain(`[llms.txt](${ORIGIN}/ogpeek/llms.txt)`);
      });
    });
  }
});

describe("serveLandingMarkdown", () => {
  describe("at a copy address", () => {
    it("answers with Markdown in the page's language, whatever the Accept", async () => {
      for (const [path, lang] of [
        ["/ogpeek/index.md", "en"],
        ["/ogpeek/ko.md", "ko"],
      ] as const) {
        for (const accept of [AGENT_ACCEPT, BROWSER_ACCEPT, "*/*"]) {
          const { next, calls } = fakeNext();
          const res = await serveLandingMarkdown(get(path, accept), next);
          expect(calls).toHaveLength(0);
          expect(res.status).toBe(200);
          expect(res.headers.get("content-type")).toBe(
            "text/markdown; charset=utf-8",
          );
          expect(res.headers.get("vary")).toBeNull();
          expect(await res.text()).toBe(landingMarkdown(lang));
        }
      }
    });

    it("sends the headers without a body for HEAD", async () => {
      const { next } = fakeNext();
      const res = await serveLandingMarkdown(
        get("/ogpeek/index.md", "*/*", "HEAD"),
        next,
      );
      expect(res.headers.get("content-type")).toBe(
        "text/markdown; charset=utf-8",
      );
      expect(res.body).toBeNull();
    });
  });

  describe("at the page URL", () => {
    it("answers with Markdown when the Accept prefers it", async () => {
      for (const [path, lang] of [
        ["/ogpeek/", "en"],
        ["/ogpeek/ko", "ko"],
      ] as const) {
        const { next, calls } = fakeNext();
        const res = await serveLandingMarkdown(get(path, AGENT_ACCEPT), next);
        expect(calls).toHaveLength(0);
        expect(res.headers.get("content-type")).toBe(
          "text/markdown; charset=utf-8",
        );
        expect(res.headers.get("vary")).toBe("Accept");
        expect(await res.text()).toBe(landingMarkdown(lang));
      }
    });

    it("leaves HTML to Next and adds Accept to its Vary", async () => {
      for (const path of ["/ogpeek/", "/ogpeek/ko"]) {
        for (const accept of [BROWSER_ACCEPT, "*/*", "text/html"]) {
          const { next, calls } = fakeNext();
          const res = await serveLandingMarkdown(get(path, accept), next);
          expect(calls).toHaveLength(1);
          expect(res.headers.get("content-type")).toBe(
            "text/html; charset=utf-8",
          );
          expect(res.headers.get("vary")).toBe(`${NEXT_VARY}, Accept`);
        }
      }
    });

    it("sends the headers without a body for HEAD", async () => {
      const { next } = fakeNext();
      const res = await serveLandingMarkdown(
        get("/ogpeek/", AGENT_ACCEPT, "HEAD"),
        next,
      );
      expect(res.headers.get("vary")).toBe("Accept");
      expect(res.body).toBeNull();
    });
  });

  it("leaves other methods and other paths to Next untouched", async () => {
    const cases: Array<[string, string]> = [
      ["POST", "/ogpeek/index.md"],
      ["POST", "/ogpeek/"],
      ["GET", "/ogpeek/ko/"],
      ["GET", "/ogpeek/inspect"],
      ["GET", "/ogpeek/en.md"],
      ["GET", "/ogpeek/ko/index.md"],
      ["GET", "/index.md"],
    ];
    for (const [method, path] of cases) {
      const { next, calls } = fakeNext();
      const res = await serveLandingMarkdown(
        get(path, AGENT_ACCEPT, method),
        next,
      );
      expect(calls).toHaveLength(1);
      expect(res.headers.get("content-type")).toBe("text/html; charset=utf-8");
      expect(res.headers.get("vary")).toBe(NEXT_VARY);
    }
  });
});
