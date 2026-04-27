import type { PreviewData } from "./derivePreviewData.js";
import { safeImageSrc } from "./derivePreviewData.js";

export type PreviewProps = {
  data: PreviewData;
  className?: string;
};

export function Preview({ data, className }: PreviewProps) {
  const safeImage = data.image ? safeImageSrc(data.image) : "";
  const rootClass = className
    ? `ogpeek-root ogpeek-preview ${className}`
    : "ogpeek-root ogpeek-preview";

  return (
    <figure className={rootClass}>
      {safeImage ? (
        <img className="ogpeek-preview-image" src={safeImage} alt="" />
      ) : (
        <div className="ogpeek-preview-image-empty" />
      )}
      <div className="ogpeek-preview-body">
        <div className="ogpeek-preview-domain">{data.domain}</div>
        <div className="ogpeek-preview-title">
          {data.title || data.domain}
        </div>
        {data.description ? (
          <div className="ogpeek-preview-description">{data.description}</div>
        ) : null}
      </div>
    </figure>
  );
}
