import { cls } from "./cls.js";
import type { PreviewData } from "./derivePreviewData.js";
import { safeImageSrc } from "./derivePreviewData.js";

export type PreviewProps = {
  data: PreviewData;
  // When true, this component is rendered inside an outer `.ogpeek-root`
  // (e.g. composed inside <Result />) and skips emitting its own root
  // class. That keeps token overrides on the outer element from being
  // shadowed by a nested re-declaration.
  composed?: boolean;
  className?: string;
};

export function Preview({ data, composed = false, className }: PreviewProps) {
  const safeImage = data.image ? safeImageSrc(data.image) : "";

  return (
    <figure className={cls(composed ? null : "ogpeek-root", "ogpeek-preview", className)}>
      {safeImage ? (
        <img className="ogpeek-preview-image" src={safeImage} alt="" />
      ) : (
        <div className="ogpeek-preview-image-empty" />
      )}
      <div className="ogpeek-preview-body">
        <div className="ogpeek-preview-domain">{data.domain}</div>
        <div className="ogpeek-preview-title">{data.title || data.domain}</div>
        {data.description ? (
          <div className="ogpeek-preview-description">{data.description}</div>
        ) : null}
      </div>
    </figure>
  );
}
