import type { OgDebugResult } from "ogpeek";
import { html, raw } from "../html.js";
import { STYLES } from "../styles.js";
import { tagTableBody } from "../render/tagTable.js";
import { resolveDict, type DeepPartial, type Dict } from "../dict.js";
import { OgPeekElement } from "./base.js";

export class OgPeekTagTableElement extends OgPeekElement {
  #result: OgDebugResult | null = null;
  #dict: DeepPartial<Dict> | undefined;

  get result(): OgDebugResult | null {
    return this.#result;
  }
  set result(value: OgDebugResult | null) {
    this.#result = value;
    this.markDirty();
  }

  get dict(): DeepPartial<Dict> | undefined {
    return this.#dict;
  }
  set dict(value: DeepPartial<Dict> | undefined) {
    this.#dict = value;
    this.markDirty();
  }

  protected shadowHtml(): string {
    if (!this.#result) return `<style>${STYLES}</style>`;
    const dict = resolveDict(this.getLang(), this.#dict);
    return html`
      <style>${raw(STYLES)}</style>
      ${tagTableBody({ result: this.#result, dict })}
    `;
  }
}
