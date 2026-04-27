import type { PreviewData } from "./derivePreviewData.js";
import { safeImageSrc } from "./derivePreviewData.js";
import { cls } from "./cls.js";
import { useOgPeekContext } from "./context.js";

export type PreviewProps = {
  data: PreviewData;
  className?: string;
};

export function Preview({ data, className }: PreviewProps) {
  const ctx = useOgPeekContext();
  const safeImage = data.image ? safeImageSrc(data.image) : "";

  return (
    <figure
      className={cls(
        ctx?.composed ? null : "ogpeek-root",
        "ogpeek-preview",
        className,
      )}
    >
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
