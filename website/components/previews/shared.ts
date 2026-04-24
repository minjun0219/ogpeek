import type { OgDebugResult } from "ogpeek";

export type PreviewData = {
  title: string;
  description: string;
  image: string | null;
  siteName: string;
  domain: string;
  finalUrl: string;
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
    siteName: og.site_name || tw["twitter:site"] || domain,
    domain,
    finalUrl,
  };
}
