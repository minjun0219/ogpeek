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

  return raw(html`
    <figure class="og-preview">
      ${safeImage
        ? html`<img class="og-preview-image" src="${safeImage}" alt="" />`
        : html`<div class="og-preview-image-empty"></div>`}
      <div class="og-preview-body">
        <div class="og-preview-domain">${data.domain}</div>
        <div class="og-preview-title">${data.title || data.domain}</div>
        ${data.description
          ? html`<div class="og-preview-description">${data.description}</div>`
          : ""}
      </div>
    </figure>
  `);
}
