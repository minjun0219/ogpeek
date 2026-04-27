import { html, raw, safeImageSrc, type HtmlSafe } from "../html.js";
import type { PreviewData } from "../derivePreviewData.js";

export type PreviewRenderProps = {
  data: PreviewData;
};

// Body-only render (no <style>, no shadow wrapper). Used by both the
// standalone preview element and the composite Result element so the
// shared stylesheet is only emitted once per shadow root.
export function previewBody(props: PreviewRenderProps): HtmlSafe {
  const { data } = props;
  const safeImage = data.image ? safeImageSrc(data.image) : "";

  // Nested html`` calls return plain strings; without raw() the outer
  // template re-escapes them and the markup leaks as text.
  return raw(html`
    <figure class="og-preview">
      ${raw(
        safeImage
          ? html`<img class="og-preview-image" src="${safeImage}" alt="" />`
          : html`<div class="og-preview-image-empty"></div>`,
      )}
      <div class="og-preview-body">
        <div class="og-preview-domain">${data.domain}</div>
        <div class="og-preview-title">${data.title || data.domain}</div>
        ${data.description
          ? raw(html`<div class="og-preview-description">${data.description}</div>`)
          : ""}
      </div>
    </figure>
  `);
}
