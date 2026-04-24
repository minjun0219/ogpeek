import type { PreviewData } from "./shared";

export function LinkedIn({ data }: { data: PreviewData }) {
  return (
    <figure className="overflow-hidden rounded-2xl border border-[color:rgb(var(--border))] bg-white">
      <figcaption className="border-b border-slate-200 px-4 py-2 text-xs font-medium text-slate-700">
        LinkedIn
      </figcaption>
      {data.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={data.image}
          alt=""
          className="aspect-[1.91/1] w-full object-cover"
        />
      ) : (
        <div className="aspect-[1.91/1] w-full bg-slate-100" />
      )}
      <div className="px-4 py-3 text-slate-900">
        <div className="line-clamp-2 text-sm font-semibold leading-snug">
          {data.title || data.domain}
        </div>
        <div className="mt-1 text-[11px] text-slate-500">{data.domain}</div>
      </div>
    </figure>
  );
}
