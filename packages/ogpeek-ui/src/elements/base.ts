import { hasLang, DEFAULT_LANG, type Lang } from "../dict.js";

// Importing this module evaluates the class declaration below — which
// references HTMLElement. In non-DOM runtimes (Node SSR without globals,
// Workers' isolate without DOM, etc.) HTMLElement is undefined and the
// declaration would throw ReferenceError before any consumer code runs.
// Falling back to an empty class lets the SSR-only render functions and
// types be imported safely; element registration is a no-op there
// because `register()` already early-returns when `customElements` is
// missing.
const HTMLElementBase: typeof HTMLElement =
  typeof globalThis !== "undefined" &&
  typeof (globalThis as { HTMLElement?: typeof HTMLElement }).HTMLElement !==
    "undefined"
    ? (globalThis as { HTMLElement: typeof HTMLElement }).HTMLElement
    : (class {} as unknown as typeof HTMLElement);

export abstract class OgPeekElement extends HTMLElementBase {
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
