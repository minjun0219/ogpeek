import type { OgDebugResult } from "ogpeek-core";

export function TagTable({ result }: { result: OgDebugResult }) {
  const groups = buildGroups(result);

  return (
    <section className="overflow-hidden rounded-xl border border-[color:rgb(var(--border))]">
      <div className="flex items-center justify-between border-b border-[color:rgb(var(--border))] bg-[color:rgb(var(--surface))] px-5 py-3">
        <h2 className="text-sm font-medium">메타 태그</h2>
        <span className="text-xs text-[color:rgb(var(--muted))]">
          총 {result.raw.length}개
        </span>
      </div>
      <div className="divide-y divide-[color:rgb(var(--border))]">
        {groups.map((group) =>
          group.rows.length ? (
            <div key={group.title} className="px-5 py-3">
              <h3 className="text-xs font-medium uppercase tracking-wide text-[color:rgb(var(--muted))]">
                {group.title}
              </h3>
              <table className="mt-2 w-full text-left text-sm">
                <tbody>
                  {group.rows.map((row, idx) => (
                    <tr key={`${group.title}-${idx}`} className="align-top">
                      <th className="w-[28%] py-1 pr-4 font-mono text-xs text-[color:rgb(var(--muted))]">
                        {row.key}
                      </th>
                      <td className="py-1 break-all font-mono text-xs">
                        {row.value || <span className="opacity-40">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null,
        )}
      </div>
    </section>
  );
}

type Row = { key: string; value: string };
type Group = { title: string; rows: Row[] };

function buildGroups(result: OgDebugResult): Group[] {
  const { ogp, twitter, meta, raw } = result;

  const og: Row[] = [];
  addIf(og, "og:title", ogp.title);
  addIf(og, "og:type", ogp.type);
  addIf(og, "og:url", ogp.url);
  addIf(og, "og:description", ogp.description);
  addIf(og, "og:site_name", ogp.site_name);
  addIf(og, "og:locale", ogp.locale);
  if (ogp.locale_alternate.length) {
    og.push({ key: "og:locale:alternate", value: ogp.locale_alternate.join(", ") });
  }
  ogp.images.forEach((img, i) => {
    const label = ogp.images.length > 1 ? `og:image[${i}]` : "og:image";
    addIf(og, `${label}`, img.url);
    addIf(og, `${label}:secure_url`, img.secure_url);
    addIf(og, `${label}:type`, img.type);
    if (img.width !== undefined) og.push({ key: `${label}:width`, value: String(img.width) });
    if (img.height !== undefined) og.push({ key: `${label}:height`, value: String(img.height) });
    addIf(og, `${label}:alt`, img.alt);
  });
  ogp.videos.forEach((v, i) => {
    const label = ogp.videos.length > 1 ? `og:video[${i}]` : "og:video";
    addIf(og, label, v.url);
    addIf(og, `${label}:secure_url`, v.secure_url);
  });

  const tw: Row[] = Object.entries(twitter).map(([k, v]) => ({
    key: k,
    value: v,
  }));

  const m: Row[] = [];
  addIf(m, "<title>", meta.title);
  addIf(m, "canonical", meta.canonical);
  addIf(m, "charset", meta.charset);
  m.push({ key: "html prefix", value: meta.prefixDeclared ? "선언됨" : "없음" });

  const others: Row[] = raw
    .filter((r) => !r.property.startsWith("og:") && !r.property.startsWith("twitter:"))
    .map((r) => ({ key: r.property, value: r.content }));

  return [
    { title: "Open Graph", rows: og },
    { title: "Twitter Card", rows: tw },
    { title: "기본 메타", rows: m },
    { title: "기타", rows: others },
  ];
}

function addIf(rows: Row[], key: string, value: string | undefined | null) {
  if (value) rows.push({ key, value });
}
