import { describe, expect, it } from "vitest";
import { prefersMarkdown } from "../lib/prefers-markdown";

describe("prefersMarkdown", () => {
  const markdown: Array<[string, string]> = [
    ["text/markdown, text/html, */*", "Claude Code's WebFetch: a tie"],
    ["text/markdown", "Markdown only"],
    ["TEXT/Markdown", "case-insensitive"],
    ["text/markdown; q=0.9, text/html; q=0.9", "a tie with spaces"],
    ["text/markdown;q=0.5, text/*;q=0.4", "above text/*"],
    ["text/html;q=0, text/markdown;q=0.1", "HTML refused"],
    ["text/markdown;q=0.5, application/json", "nothing covers text/html"],
  ];
  for (const [accept, why] of markdown) {
    it(`Markdown for "${accept}" (${why})`, () => {
      expect(prefersMarkdown(accept)).toBe(true);
    });
  }

  const html: Array<[string | null, string]> = [
    [null, "no Accept header"],
    ["", "an empty Accept header"],
    ["*/*", "curl, fetch() and claude.ai"],
    [
      "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "a browser navigation",
    ],
    ["text/html", "HTML only"],
    ["text/*", "a wildcard is not a request for Markdown"],
    ["application/json", "no Markdown listed"],
    ["text/markdown;q=0.5, text/html", "below text/html"],
    ["text/markdown;q=0, */*", "Markdown refused"],
    ["text/markdown;q=x", "an unreadable q"],
  ];
  for (const [accept, why] of html) {
    it(`HTML for ${JSON.stringify(accept)} (${why})`, () => {
      expect(prefersMarkdown(accept)).toBe(false);
    });
  }
});
