import type { OgDebugResult } from "ogpeek";
import type { RedirectHop } from "ogpeek/fetch";
import { resultShadowBody } from "../render/result.js";
import type { DeepPartial, Dict } from "../dict.js";
import { OgPeekElement } from "./base.js";

export class OgPeekResultElement extends OgPeekElement {
  #result: OgDebugResult | null = null;
  #finalUrl: string = "";
  #status: number = 0;
  #redirects: RedirectHop[] = [];
  #canonical: string | null = null;
  #dict: DeepPartial<Dict> | undefined;

  get result(): OgDebugResult | null {
    return this.#result;
  }
  set result(v: OgDebugResult | null) {
    this.#result = v;
    this.markDirty();
  }

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
  set dict(v: DeepPartial<Dict> | undefined) {
    this.#dict = v;
    this.markDirty();
  }

  protected shadowHtml(): string {
    if (!this.#result) return "";
    const { html: body } = resultShadowBody({
      result: this.#result,
      finalUrl: this.#finalUrl,
      status: this.#status,
      redirects: this.#redirects,
      canonical: this.#canonical,
      lang: this.getLang(),
      dict: this.#dict,
    });
    return body;
  }
}
