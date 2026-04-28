import { scanHead } from "./meta.js";
import { buildTree } from "./tree.js";
import type { OgDebugResult, ParseOptions } from "./types.js";
import { validate } from "./validate.js";

export function parse(html: string, options: ParseOptions = {}): OgDebugResult {
  const head = scanHead(html, {
    jsonldScope: options.jsonldScope,
  });
  const tree = buildTree(head.raw);
  const warnings = validate(head, tree, options.url);

  return {
    ogp: tree.ogp,
    typed: tree.typed,
    twitter: tree.twitter,
    raw: tree.ogRaw,
    warnings,
    icons: head.icons,
    jsonld: head.jsonld,
    meta: {
      title: head.title,
      canonical: head.canonical,
      prefixDeclared: head.prefixDeclared,
      charset: head.charset,
      applicationName: head.applicationName,
      msTileImage: head.msTileImage,
      msTileColor: head.msTileColor,
      themeColor: head.themeColor,
    },
  };
}
