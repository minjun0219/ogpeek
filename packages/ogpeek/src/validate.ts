import { KNOWN_OG_TYPES, OG_URL_PROPERTIES } from "./known-types.js";
import type { HeadScan } from "./meta.js";
import type { TreeBuildResult } from "./tree.js";
import type { Warning } from "./types.js";

export function validate(head: HeadScan, tree: TreeBuildResult, baseUrl: string | undefined): Warning[] {
  const warnings: Warning[] = [];
  const { ogp, orphans, invalidDimensions, duplicateSingletons } = tree;

  if (!ogp.title) {
    warnings.push({
      code: "OG_TITLE_MISSING",
      severity: "error",
      message: "og:title is required.",
    });
  } else if (ogp.title.length > 60) {
    warnings.push({
      code: "OG_TITLE_TOO_LONG",
      severity: "warn",
      message: `og:title is ${ogp.title.length} chars — KakaoTalk truncates past 60.`,
      property: "og:title",
      value: ogp.title,
    });
  }
  if (!ogp.type) {
    warnings.push({
      code: "OG_TYPE_MISSING",
      severity: "error",
      message: "og:type is required.",
    });
  } else if (!KNOWN_OG_TYPES.has(ogp.type)) {
    warnings.push({
      code: "OG_TYPE_UNKNOWN",
      severity: "warn",
      message: `og:type "${ogp.type}" is not in the OGP spec's known type list.`,
      property: "og:type",
      value: ogp.type,
    });
  }
  if (!ogp.url) {
    warnings.push({
      code: "OG_URL_MISSING",
      severity: "error",
      message: "og:url is required.",
    });
  } else if (baseUrl && !sameResource(ogp.url, baseUrl)) {
    warnings.push({
      code: "OG_URL_MISMATCH",
      severity: "warn",
      message: `og:url "${ogp.url}" differs from the requested URL "${baseUrl}".`,
      property: "og:url",
      value: ogp.url,
    });
  }
  if (ogp.images.length === 0) {
    warnings.push({
      code: "OG_IMAGE_MISSING",
      severity: "error",
      message: "og:image is required.",
    });
  }

  const base = baseUrl ?? ogp.url;
  for (const raw of tree.ogRaw) {
    if (!OG_URL_PROPERTIES.has(raw.property)) continue;
    if (!isAbsoluteUrl(raw.content, base)) {
      warnings.push({
        code: "URL_NOT_ABSOLUTE",
        severity: "warn",
        message: `${raw.property} value "${raw.content}" is not an absolute URL.`,
        property: raw.property,
        value: raw.content,
      });
    }
  }

  for (const dup of duplicateSingletons) {
    warnings.push({
      code: "DUPLICATE_SINGLETON",
      severity: "warn",
      message: `${dup.property} is declared more than once.`,
      property: dup.property,
      value: dup.value,
    });
  }

  for (const orphan of orphans) {
    warnings.push({
      code: "ORPHAN_STRUCTURED_PROPERTY",
      severity: "warn",
      message: `${orphan.property} appeared before any parent og:image / og:video / og:audio.`,
      property: orphan.property,
      value: orphan.value,
    });
  }

  for (const inv of invalidDimensions) {
    warnings.push({
      code: "INVALID_DIMENSION",
      severity: "warn",
      message: `${inv.property} value "${inv.value}" is not a non-negative integer.`,
      property: inv.property,
      value: inv.value,
    });
  }

  if (!head.prefixDeclared) {
    warnings.push({
      code: "MISSING_PREFIX_ATTR",
      severity: "info",
      message: '<html prefix="og: https://ogp.me/ns#"> is recommended by the OGP spec.',
    });
  }

  return warnings;
}

function isAbsoluteUrl(value: string, _base: string | undefined): boolean {
  // OGP requires full URLs (scheme + authority). We don't resolve against base
  // — the spec is explicit that these must be absolute. `_base` is retained
  // for future relative-to-absolute helpers.
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function sameResource(a: string, b: string): boolean {
  try {
    const ua = new URL(a);
    const ub = new URL(b);
    return ua.host.toLowerCase() === ub.host.toLowerCase() && stripSlash(ua.pathname) === stripSlash(ub.pathname);
  } catch {
    return a === b;
  }
}

function stripSlash(p: string): string {
  return p.length > 1 && p.endsWith("/") ? p.slice(0, -1) : p;
}
