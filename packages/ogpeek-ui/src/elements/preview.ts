import { html, raw } from "../html.js";
import { STYLES } from "../styles.js";
import { previewBody } from "../render/preview.js";
import type { PreviewData } from "../derivePreviewData.js";
import { OgPeekElement } from "./base.js";

export class OgPeekPreviewElement extends OgPeekElement {
  #data: PreviewData | null = null;

  get data(): PreviewData | null {
    return this.#data;
  }
  set data(value: PreviewData | null) {
    this.#data = value;
    this.markDirty();
  }

  protected shadowHtml(): string {
    if (!this.#data) return `<style>${STYLES}</style>`;
    return html`
      <style>${raw(STYLES)}</style>
      ${previewBody({ data: this.#data })}
    `;
  }
}
