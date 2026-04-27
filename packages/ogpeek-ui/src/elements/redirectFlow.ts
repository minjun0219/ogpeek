import type { RedirectHop } from "ogpeek/fetch";
import { html, raw } from "../html.js";
import { STYLES } from "../styles.js";
import { redirectFlowBody } from "../render/redirectFlow.js";
import { resolveDict, type DeepPartial, type Dict } from "../dict.js";
import { OgPeekElement } from "./base.js";

export class OgPeekRedirectFlowElement extends OgPeekElement {
  #finalUrl: string = "";
  #status: number = 0;
  #redirects: RedirectHop[] = [];
  #canonical: string | null = null;
  #dict: DeepPartial<Dict> | undefined;

  get finalUrl(): string {
    return this.#finalUrl;
  }
  set finalUrl(v: string) {
    this.#finalUrl = v;
    this.markDirty();
  }

  get status(): number {
    return this.#status;
  }
  set status(v: number) {
    this.#status = v;
    this.markDirty();
  }

  get redirects(): RedirectHop[] {
    return this.#redirects;
  }
  set redirects(v: RedirectHop[]) {
    this.#redirects = v ?? [];
    this.markDirty();
  }

  get canonical(): string | null {
    return this.#canonical;
  }
  set canonical(v: string | null) {
    this.#canonical = v;
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
      ${redirectFlowBody({
        finalUrl: this.#finalUrl,
        status: this.#status,
        redirects: this.#redirects,
        canonical: this.#canonical,
        dict,
      })}
    `;
  }
}
