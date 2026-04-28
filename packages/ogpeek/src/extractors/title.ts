import type { HeadExtractor, ScanState } from "./types.js";

// Captures `<title>` text content. Only the first title in <head> wins.
export class TitleExtractor implements HeadExtractor {
  title: string | null = null;
  private inTitle = false;
  private buf = "";

  onOpenTag(name: string, _attrs: Record<string, string>, state: ScanState): void {
    if (!state.inHead) return;
    if (name === "title" && this.title === null) {
      this.inTitle = true;
      this.buf = "";
    }
  }

  onText(text: string, _state: ScanState): void {
    if (this.inTitle) this.buf += text;
  }

  onCloseTag(name: string, _state: ScanState): void {
    if (name === "title" && this.inTitle) {
      this.inTitle = false;
      this.title = this.buf.trim() || null;
    }
  }
}
