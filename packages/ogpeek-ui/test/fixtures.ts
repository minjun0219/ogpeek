import type { OgDebugResult } from "ogpeek";
import type { RedirectHop } from "ogpeek/fetch";

export function makeResult(
  overrides: Partial<OgDebugResult> = {},
): OgDebugResult {
  const base: OgDebugResult = {
    ogp: {
      title: "Hello",
      type: "website",
      url: "https://example.com/",
      description: "An example",
      site_name: "Example",
      locale: "en_US",
      locale_alternate: [],
      images: [
        {
          url: "https://example.com/img.png",
          width: 1200,
          height: 630,
        },
      ],
      videos: [],
      audios: [],
    },
    typed: null,
    twitter: { "twitter:card": "summary_large_image" },
    raw: [
      { property: "og:title", content: "Hello" },
      { property: "og:type", content: "website" },
      { property: "description", content: "An example" },
    ],
    warnings: [],
    meta: {
      title: "Hello — Example",
      canonical: "https://example.com/",
      prefixDeclared: true,
      charset: "utf-8",
    },
  };
  return { ...base, ...overrides };
}

export const FINAL_URL = "https://example.com/";
export const STATUS = 200;
export const REDIRECTS: RedirectHop[] = [];
