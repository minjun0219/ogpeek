import { hasLang, DEFAULT_LANG, type Lang } from "../dict.js";

export abstract class OgPeekElement extends HTMLElement {
  static observedAttributes = ["lang"];

  protected propsDirty = false;

  // Returns the inner shadow-root HTML for the current props. Concrete
  // subclasses build this from their own typed property storage.
  protected abstract shadowHtml(): string;

  // True once the consumer has set any property. Until then, a shadow
  // root that arrived via Declarative Shadow DOM is left untouched so
  // server-rendered content survives upgrade.
  protected hasProps(): boolean {
    return this.propsDirty;
  }

  protected getLang(): Lang {
    const raw = this.getAttribute("lang");
    return raw && hasLang(raw) ? raw : DEFAULT_LANG;
  }

  connectedCallback() {
    if (!this.shadowRoot) {
      this.attachShadow({ mode: "open" });
      this.render();
    } else if (this.hasProps()) {
      this.render();
    }
  }

  attributeChangedCallback(_name: string, oldVal: string | null, newVal: string | null) {
    if (oldVal === newVal) return;
    if (this.shadowRoot && this.hasProps()) this.render();
  }

  protected markDirty() {
    this.propsDirty = true;
    if (this.isConnected) {
      if (!this.shadowRoot) this.attachShadow({ mode: "open" });
      this.render();
    }
  }

  protected render() {
    if (!this.shadowRoot) return;
    this.shadowRoot.innerHTML = this.shadowHtml();
  }
}
