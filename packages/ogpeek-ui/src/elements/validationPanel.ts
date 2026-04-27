import type { Warning } from "ogpeek";
import { html, raw } from "../html.js";
import { STYLES } from "../styles.js";
import { validationPanelBody } from "../render/validationPanel.js";
import { resolveDict, type DeepPartial, type Dict } from "../dict.js";
import { OgPeekElement } from "./base.js";

export class OgPeekValidationPanelElement extends OgPeekElement {
  #warnings: Warning[] = [];
  #dict: DeepPartial<Dict> | undefined;

  get warnings(): Warning[] {
    return this.#warnings;
  }
  set warnings(value: Warning[]) {
    this.#warnings = value ?? [];
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
    const dict = resolveDict(this.getLang(), this.#dict);
    return html`
      <style>${raw(STYLES)}</style>
      ${validationPanelBody({ warnings: this.#warnings, dict })}
    `;
  }
}
