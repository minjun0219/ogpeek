import type { PreviewData } from "./shared";

export function Facebook({ data }: { data: PreviewData }) {
  return (
    <figure className="overflow-hidden rounded-2xl border border-[color:rgb(var(--border))] bg-white">
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
      <div className="bg-[#f0f2f5] px-4 py-3 text-slate-900">
        <div className="text-[11px] uppercase tracking-wide text-slate-500">
          {data.domain}
        </div>
        <div className="mt-0.5 line-clamp-2 text-[15px] font-semibold leading-snug">
          {data.title || data.domain}
        </div>
        {data.description ? (
          <div className="mt-0.5 line-clamp-1 text-xs text-slate-600">
            {data.description}
          </div>
        ) : null}
      </div>
    </figure>
  );
}
