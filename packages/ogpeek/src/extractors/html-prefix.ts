import type { HeadExtractor, ScanState } from "./types.js";

// Detects `<html prefix="og: https://ogp.me/ns# ...">`. Runs against the
// root <html> element, before <head> opens.
export class HtmlPrefixExtractor implements HeadExtractor {
  prefixDeclared = false;

  onOpenTag(
    name: string,
    attrs: Record<string, string>,
    _state: ScanState,
  ): void {
    if (name !== "html") {
      return;
    }
    if (
      typeof attrs.prefix === "string" &&
      /\bog:\s*https?:\/\/ogp\.me\/ns#/i.test(attrs.prefix)
    ) {
      this.prefixDeclared = true;
    }
  }
}
