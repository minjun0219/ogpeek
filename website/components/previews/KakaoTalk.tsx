import type { PreviewData } from "./shared";

export function KakaoTalk({ data }: { data: PreviewData }) {
  const title = data.title.length > 60 ? `${data.title.slice(0, 60)}…` : data.title;
  const desc =
    data.description.length > 80
      ? `${data.description.slice(0, 80)}…`
      : data.description;

  return (
    <figure className="overflow-hidden rounded-2xl border border-[color:rgb(var(--border))] bg-[#b2c7da] p-4">
      <figcaption className="mb-2 text-xs font-medium text-slate-700">카카오톡</figcaption>
      <div className="overflow-hidden rounded-xl bg-white">
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
          <div className="text-[11px] text-slate-500">{data.domain}</div>
          <div className="mt-0.5 line-clamp-1 text-sm font-semibold">{title || data.domain}</div>
          {desc ? (
            <div className="mt-1 line-clamp-2 text-xs text-slate-600">{desc}</div>
          ) : null}
        </div>
      </div>
    </figure>
  );
}
