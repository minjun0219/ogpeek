import { scanHead } from "./meta.js";
import { buildTree } from "./tree.js";
import { validate } from "./validate.js";
import type { OgDebugResult, ParseOptions } from "./types.js";

export function parse(html: string, options: ParseOptions = {}): OgDebugResult {
  const head = scanHead(html);
  const tree = buildTree(head.raw);
  const warnings = validate(head, tree, options.url);

  return {
    ogp: tree.ogp,
    typed: tree.typed,
    twitter: tree.twitter,
    raw: tree.ogRaw,
    warnings,
    meta: {
      title: head.title,
      canonical: head.canonical,
      prefixDeclared: head.prefixDeclared,
      charset: head.charset,
    },
  };
}
