import type { PreviewData } from "./shared";

export function X({ data }: { data: PreviewData }) {
  const isLarge = true; // summary_large_image 대응 기본값
  return (
    <figure className="overflow-hidden rounded-2xl border border-[color:rgb(var(--border))] bg-white">
      <figcaption className="border-b border-slate-200 px-4 py-2 text-xs font-medium text-slate-700">
        X (Twitter)
      </figcaption>
      <div className="overflow-hidden rounded-2xl border border-slate-200 m-3">
        {isLarge && data.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={data.image}
            alt=""
            className="aspect-[1.91/1] w-full object-cover"
          />
        ) : null}
        <div className="relative px-3 py-2">
          {data.image && !isLarge ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={data.image}
              alt=""
              className="absolute left-0 top-0 h-full w-28 object-cover"
            />
          ) : null}
          <div className="line-clamp-1 text-[13px] font-semibold text-slate-900">
            {data.title || data.domain}
          </div>
          {data.description ? (
            <div className="line-clamp-1 text-[12px] text-slate-600">
              {data.description}
            </div>
          ) : null}
          <div className="text-[12px] text-slate-500">{data.domain}</div>
        </div>
      </div>
    </figure>
  );
}
