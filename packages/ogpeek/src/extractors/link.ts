import type { Icon } from "../types.js";
import type { HeadExtractor, ScanState } from "./types.js";

// Single-token rel values the engine treats as "icon-shaped". `<link rel>`
// is a space-separated token set (HTML living standard), so we tokenize the
// attribute and match per-token rather than against the raw string. This
// catches:
//   - `rel="icon"` / `rel="apple-touch-icon"` (canonical case)
//   - `rel="shortcut icon"` (legacy IE form — `shortcut` is a sibling token,
//     `icon` carries the meaning)
//   - `rel="icon shortcut"` (same tokens, reverse order)
//   - `rel="icon apple-touch-icon"` (multi-role declaration — emit one Icon
//     per matched token)
// Sources: Google "Define a favicon" guide + Wikipedia favicon article.
// We do NOT chase manifest.json from here — that is a separate fetch and
// belongs outside the parser.
const ICON_RELS = new Set<string>([
  "icon",
  "apple-touch-icon",
  "apple-touch-icon-precomposed",
  "mask-icon",
  "fluid-icon",
]);

// Captures `<link rel="canonical">` and every icon-shaped <link> in <head>.
export class LinkExtractor implements HeadExtractor {
  canonical: string | null = null;
  icons: Icon[] = [];

  onOpenTag(
    name: string,
    attrs: Record<string, string>,
    state: ScanState,
  ): void {
    if (!state.inHead || name !== "link") {
      return;
    }
    const relRaw = typeof attrs.rel === "string" ? attrs.rel.trim() : "";
    const href = typeof attrs.href === "string" ? attrs.href.trim() : "";
    if (!relRaw || !href) {
      return;
    }

    const tokens = relRaw.toLowerCase().split(/\s+/).filter(Boolean);
    if (tokens.length === 0) {
      return;
    }

    if (this.canonical === null && tokens.includes("canonical")) {
      this.canonical = href;
      return;
    }

    // A single <link> can declare multiple icon roles in one rel token set
    // (e.g. `rel="icon apple-touch-icon"`). Emit one Icon per matched token
    // so the resulting list reflects exactly what the browser sees, with
    // the stored `rel` normalized to the specific matched token.
    for (const token of tokens) {
      if (!ICON_RELS.has(token)) {
        continue;
      }
      const icon: Icon = {
        rel: token,
        href,
      };
      if (typeof attrs.sizes === "string" && attrs.sizes.trim()) {
        icon.sizes = attrs.sizes.trim();
      }
      if (typeof attrs.type === "string" && attrs.type.trim()) {
        icon.type = attrs.type.trim();
      }
      if (typeof attrs.color === "string" && attrs.color.trim()) {
        icon.color = attrs.color.trim();
      }
      this.icons.push(icon);
    }
  }
}
