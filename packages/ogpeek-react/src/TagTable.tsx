"use client";

import type { OgDebugResult } from "ogpeek";
import {
  DEFAULT_LANG,
  format,
  resolveDict,
  type DeepPartial,
  type Dict,
  type Lang,
} from "./dict.js";
import { cls } from "./cls.js";
import { useOgPeekContext } from "./context.js";

export type TagTableProps = {
  result: OgDebugResult;
  lang?: Lang;
  dict?: DeepPartial<Dict>;
  className?: string;
};

type Row = { key: string; value: string };
type Group = { title: string; rows: Row[] };

export function TagTable({
  result,
  lang: langProp,
  dict: dictProp,
  className,
}: TagTableProps) {
  const ctx = useOgPeekContext();
  const lang = langProp ?? ctx?.lang ?? DEFAULT_LANG;
  const dictOverride = dictProp ?? ctx?.dictOverride;
  const dict = resolveDict(lang, dictOverride);
  const groups = buildGroups(result, dict).filter((g) => g.rows.length > 0);

  return (
    <section
      className={cls(
        ctx?.composed ? null : "ogpeek-root",
        "ogpeek-section--flat",
        className,
      )}
    >
      <div className="ogpeek-table-header">
        <h2 className="ogpeek-h2">{dict.tagTable.title}</h2>
        <span className="ogpeek-text-xs ogpeek-muted">
          {format(dict.tagTable.totalTemplate, { n: result.raw.length })}
        </span>
      </div>
      {groups.map((group) => (
        <div key={group.title} className="ogpeek-table-group">
          <h3 className="ogpeek-h3">{group.title}</h3>
          <table className="ogpeek-table">
            <tbody>
              {group.rows.map((row, i) => (
                <tr key={`${row.key}-${i}`}>
                  <th>{row.key}</th>
                  <td>
                    {row.value ? (
                      row.value
                    ) : (
                      <span className="ogpeek-table-empty">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </section>
  );
}

function buildGroups(result: OgDebugResult, dict: Dict): Group[] {
  const { ogp, twitter, meta, raw: rawTags } = result;

  const og: Row[] = [];
  addIf(og, "og:title", ogp.title);
  addIf(og, "og:type", ogp.type);
  addIf(og, "og:url", ogp.url);
  addIf(og, "og:description", ogp.description);
  addIf(og, "og:site_name", ogp.site_name);
  addIf(og, "og:locale", ogp.locale);
  if (ogp.locale_alternate.length) {
    og.push({
      key: "og:locale:alternate",
      value: ogp.locale_alternate.join(", "),
    });
  }
  ogp.images.forEach((img, i) => {
    const label = ogp.images.length > 1 ? `og:image[${i}]` : "og:image";
    addIf(og, label, img.url);
    addIf(og, `${label}:secure_url`, img.secure_url);
    addIf(og, `${label}:type`, img.type);
    if (img.width !== undefined)
      og.push({ key: `${label}:width`, value: String(img.width) });
    if (img.height !== undefined)
      og.push({ key: `${label}:height`, value: String(img.height) });
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
  m.push({
    key: "html prefix",
    value: meta.prefixDeclared
      ? dict.tagTable.prefixDeclared
      : dict.tagTable.prefixAbsent,
  });

  const others: Row[] = rawTags
    .filter(
      (r) =>
        !r.property.startsWith("og:") && !r.property.startsWith("twitter:"),
    )
    .map((r) => ({ key: r.property, value: r.content }));

  return [
    { title: "Open Graph", rows: og },
    { title: "Twitter Card", rows: tw },
    { title: dict.tagTable.groupBasic, rows: m },
    { title: dict.tagTable.groupOther, rows: others },
  ];
}

function addIf(rows: Row[], key: string, value: string | undefined | null) {
  if (value) rows.push({ key, value });
}
