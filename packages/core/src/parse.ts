import { scanHead } from "./meta";
import { buildTree } from "./tree";
import { validate } from "./validate";
import type { OgDebugResult, ParseOptions } from "./types";

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
