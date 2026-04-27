export type HtmlSafe = { readonly __html: string };

const ESCAPE_RE = /[&<>"']/g;
const ESCAPE_MAP: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

export function escape(value: string): string {
  return value.replace(ESCAPE_RE, (c) => ESCAPE_MAP[c] ?? c);
}

export function raw(value: string): HtmlSafe {
  return { __html: value };
}

export function html(
  strings: TemplateStringsArray,
  ...values: unknown[]
): string {
  let out = "";
  for (let i = 0; i < strings.length; i++) {
    out += strings[i];
    if (i < values.length) out += interp(values[i]);
  }
  return out;
}

function interp(v: unknown): string {
  if (v == null || v === false || v === true) return "";
  if (Array.isArray(v)) return v.map(interp).join("");
  if (typeof v === "object" && v !== null && "__html" in v) {
    return (v as HtmlSafe).__html;
  }
  return escape(String(v));
}

// Returns a value safe to drop into href="" — empty string blocks navigation
// for unsafe schemes (javascript:, data:, vbscript:, etc.). The component
// caller is responsible for *not* emitting the href at all when this returns
// empty, if "no link" is the desired UX.
export function safeHref(url: string | null | undefined): string {
  if (!url) return "";
  const trimmed = url.trim();
  if (!trimmed) return "";
  if (/^(https?:|mailto:)/i.test(trimmed)) return trimmed;
  // Same-document or path-only references.
  if (/^[/?#]/.test(trimmed)) return trimmed;
  // Anything with a scheme that isn't on the allowlist gets blocked.
  if (/^[a-z][a-z0-9+\-.]*:/i.test(trimmed)) return "";
  // No-scheme relative reference.
  return trimmed;
}

// Image src allows the same set as safeHref. data: and javascript: stay
// blocked because data:image/svg+xml can carry script.
export function safeImageSrc(url: string | null | undefined): string {
  return safeHref(url);
}
