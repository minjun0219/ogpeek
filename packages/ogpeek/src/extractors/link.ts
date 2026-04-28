import type { Icon } from "../types.js";
import type { HeadExtractor, ScanState } from "./types.js";

// rel values the engine treats as "icon-shaped". The Google "Define a favicon"
// guide and Wikipedia's favicon article between them list:
//   - icon, shortcut icon — classic favicon (incl. legacy IE form)
//   - apple-touch-icon, apple-touch-icon-precomposed — iOS home-screen
//   - mask-icon — Safari pinned-tab SVG (carries `color`)
//   - fluid-icon — Fluid (macOS) site-specific browser icons
// We do NOT chase manifest.json from here — that is a separate fetch and
// belongs outside the parser.
const ICON_RELS = new Set<string>([
  "icon",
  "shortcut icon",
  "apple-touch-icon",
  "apple-touch-icon-precomposed",
  "mask-icon",
  "fluid-icon",
]);

// Captures `<link rel="canonical">` and every icon-shaped <link> in <head>.
export class LinkExtractor implements HeadExtractor {
  canonical: string | null = null;
  icons: Icon[] = [];

  onOpenTag(name: string, attrs: Record<string, string>, state: ScanState): void {
    if (!state.inHead || name !== "link") return;
    const rel = typeof attrs.rel === "string" ? attrs.rel.trim().toLowerCase() : "";
    const href = typeof attrs.href === "string" ? attrs.href.trim() : "";
    if (!rel || !href) return;

    if (rel === "canonical" && this.canonical === null) {
      this.canonical = href;
      return;
    }

    if (ICON_RELS.has(rel)) {
      const icon: Icon = { rel, href };
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
