import type { PreviewData } from "./shared";

export function Slack({ data }: { data: PreviewData }) {
  return (
    <figure className="overflow-hidden rounded-2xl border border-[color:rgb(var(--border))] bg-white p-4">
      <figcaption className="mb-2 text-xs font-medium text-slate-700">Slack</figcaption>
      <div className="flex gap-3 border-l-4 border-slate-300 pl-3">
        <div className="flex-1">
          <div className="text-[11px] text-slate-500">{data.siteName}</div>
          <a
            className="mt-0.5 block text-sm font-semibold text-[#1264a3] hover:underline"
            href={data.finalUrl}
          >
            {data.title || data.domain}
          </a>
          {data.description ? (
            <p className="mt-1 line-clamp-3 text-sm text-slate-700">{data.description}</p>
          ) : null}
          {data.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={data.image}
              alt=""
              className="mt-2 max-h-48 rounded border border-slate-200 object-cover"
            />
          ) : null}
        </div>
      </div>
    </figure>
  );
}
