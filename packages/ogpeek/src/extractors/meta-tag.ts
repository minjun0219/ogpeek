import type { RawMeta } from "../types.js";
import type { HeadExtractor, ScanState } from "./types.js";

// Collects every `<meta property|name + content>` pair (the OGP / Twitter raw
// stream) plus a small set of `<meta name>` signals that overlap with the
// auxiliary metadata view: charset, application-name, msapplication-*.
export class MetaTagExtractor implements HeadExtractor {
  raw: RawMeta[] = [];
  charset: string | null = null;
  applicationName: string | null = null;
  msTileImage: string | null = null;
  msTileColor: string | null = null;
  themeColor: string | null = null;

  onOpenTag(
    name: string,
    attrs: Record<string, string>,
    state: ScanState,
  ): void {
    if (!state.inHead || name !== "meta") {
      return;
    }

    const property = attrs.property ?? attrs.name;
    const content = attrs.content;
    if (typeof property === "string" && typeof content === "string") {
      this.raw.push({ property: property.trim().toLowerCase(), content });
    }

    if (typeof attrs.charset === "string" && this.charset === null) {
      this.charset = attrs.charset.trim();
    }
    if (
      this.charset === null &&
      typeof attrs["http-equiv"] === "string" &&
      attrs["http-equiv"].toLowerCase() === "content-type" &&
      typeof attrs.content === "string"
    ) {
      const match = /charset=([^;]+)/i.exec(attrs.content);
      if (match?.[1]) {
        this.charset = match[1].trim();
      }
    }

    const nameAttr =
      typeof attrs.name === "string" ? attrs.name.trim().toLowerCase() : "";
    const contentStr =
      typeof attrs.content === "string" ? attrs.content.trim() : "";
    if (!nameAttr || !contentStr) {
      return;
    }
    if (nameAttr === "application-name" && this.applicationName === null) {
      this.applicationName = contentStr;
    } else if (
      nameAttr === "msapplication-tileimage" &&
      this.msTileImage === null
    ) {
      this.msTileImage = contentStr;
    } else if (
      nameAttr === "msapplication-tilecolor" &&
      this.msTileColor === null
    ) {
      this.msTileColor = contentStr;
    } else if (nameAttr === "theme-color" && this.themeColor === null) {
      this.themeColor = contentStr;
    }
  }
}
