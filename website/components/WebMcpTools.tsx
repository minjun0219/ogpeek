"use client";

import { useEffect } from "react";

// WebMCP: pages can hand tools to an in-browser agent through
// `navigator.modelContext.registerTool`. The API is still a proposal, so it is
// feature-detected and typed locally; browsers without it never see the tools.
type ToolResult = {
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
};

type ModelContext = {
  registerTool(tool: {
    name: string;
    description: string;
    inputSchema: Record<string, unknown>;
    execute(input: Record<string, unknown>): Promise<ToolResult>;
  }): unknown;
};

const text = (value: string, isError = false): ToolResult => ({
  content: [{ type: "text", text: value }],
  isError,
});

function trackToolCall(tool: string, ok: boolean) {
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) {
    return;
  }
  import("posthog-js")
    .then(({ default: posthog }) => {
      if (posthog.__loaded) {
        posthog.capture("webmcp_tool_called", { tool, ok });
      }
    })
    .catch(() => {
      // Analytics is best-effort.
    });
}

async function inspect(input: Record<string, unknown>): Promise<ToolResult> {
  const { url } = input;
  if (typeof url !== "string" || !url.trim()) {
    return text("url must be a non-empty string", true);
  }
  // Same-origin API route: it shares the SSRF guard and the per-IP rate
  // limiter with every other way into the site.
  const res = await fetch(`/api/parse?url=${encodeURIComponent(url.trim())}`);
  const body = await res.text();
  return text(body, !res.ok);
}

async function parseHtml(input: Record<string, unknown>): Promise<ToolResult> {
  const { html, url } = input;
  if (typeof html !== "string") {
    return text("html must be a string", true);
  }
  if (url !== undefined && typeof url !== "string") {
    return text("url must be a string when given", true);
  }
  // Loaded on first call so the engine stays out of the page's initial bundle.
  const { parse } = await import("ogpeek");
  return text(JSON.stringify(parse(html, url ? { url } : {})));
}

const TOOLS = [
  {
    name: "ogpeek_inspect",
    description:
      "Fetch a public web page and report its Open Graph tags the way ogpeek does: the normalized og:* tree (title, type, url, description, images with width/height/alt), twitter:* tags, favicons, JSON-LD blocks, every redirect hop, and OGP spec warnings with stable codes and severities. Use it to see why a shared link shows the wrong title or image. Returns JSON { ok, finalUrl, status, redirects, result } or { ok: false, error }. Public hosts only, rate-limited per IP.",
    inputSchema: {
      type: "object",
      properties: {
        url: {
          type: "string",
          description:
            "The page to inspect. A bare host like ogp.me is fine; https:// is assumed.",
        },
      },
      required: ["url"],
    },
    execute: inspect,
  },
  {
    name: "ogpeek_parse",
    description:
      "Parse and validate Open Graph tags in an HTML string you already have — a page under development, a localhost build, or markup you just wrote — without any network request. Runs ogpeek locally in this page and returns JSON: the og:* tree, twitter:* tags, favicons, JSON-LD and OGP spec warnings (code + severity).",
    inputSchema: {
      type: "object",
      properties: {
        html: {
          type: "string",
          description:
            "The full HTML document. Tags are read from <head> only.",
        },
        url: {
          type: "string",
          description:
            "Where the page lives (final URL after redirects). Used to check og:url; relative URLs are flagged, not resolved.",
        },
      },
      required: ["html"],
    },
    execute: parseHtml,
  },
];

// The [lang] layout can remount (language switch, Strict Mode double effects)
// and the API has no reliable unregister yet, so register once per document.
let registered = false;

export function WebMcpTools() {
  useEffect(() => {
    if (registered) {
      return;
    }
    type WithContext = { modelContext?: ModelContext };
    const context =
      (document as WithContext).modelContext ??
      (navigator as WithContext).modelContext;
    if (typeof context?.registerTool !== "function") {
      return;
    }
    registered = true;
    for (const tool of TOOLS) {
      try {
        context.registerTool({
          ...tool,
          async execute(input) {
            try {
              const result = await tool.execute(input ?? {});
              trackToolCall(tool.name, !result.isError);
              return result;
            } catch (err) {
              trackToolCall(tool.name, false);
              return text(
                err instanceof Error ? err.message : String(err),
                true,
              );
            }
          },
        });
      } catch {
        // A tool with the same name is already registered; keep the first.
      }
    }
  }, []);

  return null;
}
