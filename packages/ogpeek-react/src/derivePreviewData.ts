import type { OgDebugResult } from "ogpeek";

export type PreviewData = {
  title: string;
  description: string;
  image: string | null;
  domain: string;
};

export function derivePreviewData(
  result: OgDebugResult,
  finalUrl: string,
): PreviewData {
  const og = result.ogp;
  const tw = result.twitter;

  const image =
    og.images[0]?.secure_url ||
    og.images[0]?.url ||
    tw["twitter:image"] ||
    null;

  let domain = "";
  try {
    domain = new URL(finalUrl).hostname.replace(/^www\./, "");
  } catch {
    domain = finalUrl;
  }

  return {
    title: og.title || tw["twitter:title"] || result.meta.title || domain,
    description: og.description || tw["twitter:description"] || "",
    image,
    domain,
  };
}

// Returns a value safe to drop into <img src=""> — empty string blocks
// any scheme that isn't http(s) or a relative reference. data:, javascript:,
// vbscript:, mailto:, etc. all get rejected (mailto: makes no sense in an
// <img> and the rest can carry script).
export function safeImageSrc(url: string | null | undefined): string {
  if (!url) return "";
  const trimmed = url.trim();
  if (!trimmed) return "";
  if (/^https?:/i.test(trimmed)) return trimmed;
  if (/^[/?#]/.test(trimmed)) return trimmed;
  if (/^[a-z][a-z0-9+\-.]*:/i.test(trimmed)) return "";
  return trimmed;
}
