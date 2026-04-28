import { Parser } from "htmlparser2";
import { HtmlPrefixExtractor } from "./extractors/html-prefix.js";
import { JsonLdExtractor } from "./extractors/jsonld.js";
import { LinkExtractor } from "./extractors/link.js";
import { MetaTagExtractor } from "./extractors/meta-tag.js";
import { TitleExtractor } from "./extractors/title.js";
import type { HeadExtractor, ScanState } from "./extractors/types.js";
import type { Icon, JsonLd, RawMeta } from "./types.js";

export type HeadScan = {
  raw: RawMeta[];
  title: string | null;
  canonical: string | null;
  prefixDeclared: boolean;
  charset: string | null;
  applicationName: string | null;
  msTileImage: string | null;
  msTileColor: string | null;
  themeColor: string | null;
  icons: Icon[];
  jsonld: JsonLd[];
};

export type ScanOptions = {
  // Where to harvest JSON-LD blocks from. Default "head".
  jsonldScope?: "head" | "document";
};

/**
 * Stream-parses the input HTML and runs every head extractor against the same
 * htmlparser2 walk. By default we stop feeding the parser the moment </head>
 * closes; the JSON-LD scope can extend that to the full document when callers
 * opt in via `jsonldScope: "document"`.
 */
export function scanHead(html: string, options: ScanOptions = {}): HeadScan {
  const jsonldScope = options.jsonldScope ?? "head";
  const stopAtHeadClose = jsonldScope === "head";

  const state: ScanState = { inHead: false, done: false };

  const htmlPrefix = new HtmlPrefixExtractor();
  const title = new TitleExtractor();
  const metaTag = new MetaTagExtractor();
  const link = new LinkExtractor();
  const jsonld = new JsonLdExtractor(jsonldScope);

  const extractors: HeadExtractor[] = [
    htmlPrefix,
    title,
    metaTag,
    link,
    jsonld,
  ];

  const parser = new Parser(
    {
      onopentag(name, attrs) {
        if (state.done) {
          return;
        }
        if (name === "head") {
          state.inHead = true;
        }
        for (const ex of extractors) {
          ex.onOpenTag?.(name, attrs, state);
        }
      },
      ontext(text) {
        if (state.done) {
          return;
        }
        for (const ex of extractors) {
          ex.onText?.(text, state);
        }
      },
      onclosetag(name) {
        if (state.done) {
          return;
        }
        for (const ex of extractors) {
          ex.onCloseTag?.(name, state);
        }
        if (name === "head") {
          state.inHead = false;
          if (stopAtHeadClose) {
            state.done = true;
            parser.reset();
          }
        }
      },
    },
    {
      decodeEntities: true,
      lowerCaseTags: true,
      lowerCaseAttributeNames: true,
    },
  );

  parser.write(html);
  parser.end();

  return {
    raw: metaTag.raw,
    title: title.title,
    canonical: link.canonical,
    prefixDeclared: htmlPrefix.prefixDeclared,
    charset: metaTag.charset,
    applicationName: metaTag.applicationName,
    msTileImage: metaTag.msTileImage,
    msTileColor: metaTag.msTileColor,
    themeColor: metaTag.themeColor,
    icons: link.icons,
    jsonld: jsonld.blocks,
  };
}
