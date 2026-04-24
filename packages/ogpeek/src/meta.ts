import { Parser } from "htmlparser2";
import type { RawMeta } from "./types";

export type HeadScan = {
  raw: RawMeta[];
  title: string | null;
  canonical: string | null;
  prefixDeclared: boolean;
  charset: string | null;
};

/**
 * Stream-parses the input HTML and collects everything we need from <head>.
 * We stop feeding the parser the moment </head> closes — the rest of the
 * document is irrelevant for OGP debugging.
 */
export function scanHead(html: string): HeadScan {
  const raw: RawMeta[] = [];
  let title: string | null = null;
  let canonical: string | null = null;
  let prefixDeclared = false;
  let charset: string | null = null;

  let inHead = false;
  let inTitle = false;
  let titleBuf = "";
  let done = false;

  const parser = new Parser(
    {
      onopentag(name, attrs) {
        if (done) return;
        if (name === "html") {
          if (typeof attrs.prefix === "string" && /\bog:\s*https?:\/\/ogp\.me\/ns#/i.test(attrs.prefix)) {
            prefixDeclared = true;
          }
          return;
        }
        if (name === "head") {
          inHead = true;
          return;
        }
        if (!inHead) return;
        if (name === "title") {
          inTitle = true;
          titleBuf = "";
          return;
        }
        if (name === "meta") {
          const property = attrs.property ?? attrs.name;
          const content = attrs.content;
          if (typeof property === "string" && typeof content === "string") {
            raw.push({ property: property.trim().toLowerCase(), content });
          }
          if (typeof attrs.charset === "string" && charset === null) {
            charset = attrs.charset.trim();
          }
          if (
            charset === null &&
            typeof attrs["http-equiv"] === "string" &&
            attrs["http-equiv"].toLowerCase() === "content-type" &&
            typeof attrs.content === "string"
          ) {
            const match = /charset=([^;]+)/i.exec(attrs.content);
            if (match && match[1]) charset = match[1].trim();
          }
          return;
        }
        if (name === "link") {
          const rel = typeof attrs.rel === "string" ? attrs.rel.trim().toLowerCase() : "";
          if (rel === "canonical" && typeof attrs.href === "string" && canonical === null) {
            canonical = attrs.href.trim();
          }
        }
      },
      ontext(text) {
        if (inTitle) titleBuf += text;
      },
      onclosetag(name) {
        if (done) return;
        if (name === "title" && inTitle) {
          inTitle = false;
          if (title === null) title = titleBuf.trim() || null;
          return;
        }
        if (name === "head") {
          inHead = false;
          done = true;
          parser.reset();
        }
      },
    },
    { decodeEntities: true, lowerCaseTags: true, lowerCaseAttributeNames: true },
  );

  parser.write(html);
  parser.end();

  return { raw, title, canonical, prefixDeclared, charset };
}
