import type { JsonLd } from "../types.js";
import type { HeadExtractor, ScanState } from "./types.js";

// Captures `<script type="application/ld+json">` blocks. By default only the
// blocks inside <head> are picked up; pass `scope: "document"` to also collect
// blocks from <body>. We deliberately stop at "did it parse, what @type does
// it claim?" — deep schema.org validation belongs to dedicated tools (Google
// Rich Results Test, Schema.org Validator), not to ogpeek.
export class JsonLdExtractor implements HeadExtractor {
  blocks: JsonLd[] = [];
  private inScript = false;
  private buf = "";
  private readonly scope: "head" | "document";

  constructor(scope: "head" | "document" = "head") {
    this.scope = scope;
  }

  onOpenTag(
    name: string,
    attrs: Record<string, string>,
    state: ScanState,
  ): void {
    if (this.inScript) {
      return;
    }
    if (name !== "script") {
      return;
    }
    if (this.scope === "head" && !state.inHead) {
      return;
    }
    // `type` is a MIME literal that may carry parameters
    // (e.g. `application/ld+json; charset=utf-8`). Strip everything past
    // the first `;` before comparing.
    const typeRaw =
      typeof attrs.type === "string" ? attrs.type.trim().toLowerCase() : "";
    const mime = typeRaw.split(";")[0]?.trim() ?? "";
    if (mime !== "application/ld+json") {
      return;
    }
    this.inScript = true;
    this.buf = "";
  }

  onText(text: string, _state: ScanState): void {
    if (this.inScript) {
      this.buf += text;
    }
  }

  onCloseTag(name: string, _state: ScanState): void {
    if (!this.inScript || name !== "script") {
      return;
    }
    this.inScript = false;
    const raw = this.buf.trim();
    this.buf = "";
    if (!raw) {
      return;
    }
    const block: JsonLd = {
      raw,
      parsed: null,
      types: [],
    };
    try {
      const parsed = JSON.parse(raw);
      block.parsed = parsed;
      block.types = collectTypes(parsed);
    } catch (e) {
      block.error = e instanceof Error ? e.message : "JSON parse error";
    }
    this.blocks.push(block);
  }
}

// Walk @graph children too — JSON-LD pages routinely use the @graph form to
// pack several typed nodes into one script block.
function collectTypes(parsed: unknown): string[] {
  const types: string[] = [];
  const visit = (node: unknown): void => {
    if (!node || typeof node !== "object") {
      return;
    }
    if (Array.isArray(node)) {
      for (const item of node) {
        visit(item);
      }
      return;
    }
    const obj = node as Record<string, unknown>;
    const t = obj["@type"];
    if (typeof t === "string") {
      types.push(t);
    } else if (Array.isArray(t)) {
      for (const x of t) {
        if (typeof x === "string") {
          types.push(x);
        }
      }
    }
    const graph = obj["@graph"];
    if (Array.isArray(graph)) {
      for (const item of graph) {
        visit(item);
      }
    }
  };
  visit(parsed);
  return types;
}
