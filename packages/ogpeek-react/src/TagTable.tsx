import type { Icon, JsonLd, OgDebugResult } from "ogpeek";
import {
  DEFAULT_LANG,
  format,
  resolveDict,
  type DeepPartial,
  type Dict,
  type Lang,
} from "./dict.js";
import { cls } from "./cls.js";

export type TagTableProps = {
  result: OgDebugResult;
  lang?: Lang;
  dict?: DeepPartial<Dict>;
  composed?: boolean;
  className?: string;
};

type Row = { key: string; value: string; pre?: boolean };
type Group = { title: string; rows: Row[] };

export function TagTable({
  result,
  lang = DEFAULT_LANG,
  dict: dictOverride,
  composed = false,
  className,
}: TagTableProps) {
  const dict = resolveDict(lang, dictOverride);
  const groups = buildGroups(result, dict).filter((g) => g.rows.length > 0);

  return (
    <section
      className={cls(
        composed ? null : "ogpeek-root",
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
                      row.pre ? (
                        <pre className="ogpeek-table-pre">{row.value}</pre>
                      ) : (
                        row.value
                      )
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
  const { ogp, twitter, meta, raw: rawTags, icons, jsonld } = result;

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
  addIf(m, "application-name", meta.applicationName);
  addIf(m, "theme-color", meta.themeColor);
  addIf(m, "msapplication-TileImage", meta.msTileImage);
  addIf(m, "msapplication-TileColor", meta.msTileColor);

  const ic: Row[] = icons.map((icon) => ({
    key: icon.rel,
    value: formatIcon(icon),
  }));

  const jl: Row[] = [];
  jsonld.forEach((block, i) => {
    const indexLabel = jsonld.length > 1 ? `[${i}]` : "";
    if (block.error) {
      // Show the parser message and the original payload so the user can see
      // exactly which character broke the block.
      jl.push({
        key: `${dict.tagTable.jsonldError}${indexLabel}`,
        value: `${block.error}\n\n${block.raw}`,
        pre: true,
      });
      return;
    }
    const typeLabel = block.types.length
      ? block.types.join(", ")
      : dict.tagTable.jsonldNoType;
    jl.push({
      key: `${typeLabel}${indexLabel}`,
      value: prettyJson(block.parsed),
      pre: true,
    });
  });

  // Reserve "Other" for tags that are not OG / twitter / already-surfaced
  // auxiliary signals. Without this filter the meta-name auxiliary tags
  // (application-name, theme-color, msapplication-*) would render twice.
  const surfacedNames = new Set([
    "application-name",
    "theme-color",
    "msapplication-tileimage",
    "msapplication-tilecolor",
  ]);
  const others: Row[] = rawTags
    .filter(
      (r) =>
        !r.property.startsWith("og:") &&
        !r.property.startsWith("twitter:") &&
        !surfacedNames.has(r.property),
    )
    .map((r) => ({ key: r.property, value: r.content }));

  return [
    { title: "Open Graph", rows: og },
    { title: "Twitter Card", rows: tw },
    { title: dict.tagTable.groupBasic, rows: m },
    { title: dict.tagTable.groupIcons, rows: ic },
    { title: dict.tagTable.groupJsonLd, rows: jl },
    { title: dict.tagTable.groupOther, rows: others },
  ];
}

function addIf(rows: Row[], key: string, value: string | undefined | null) {
  if (value) rows.push({ key, value });
}

function formatIcon(icon: Icon): string {
  const parts = [icon.href];
  if (icon.sizes) parts.push(`sizes: ${icon.sizes}`);
  if (icon.type) parts.push(`type: ${icon.type}`);
  if (icon.color) parts.push(`color: ${icon.color}`);
  return parts.join(" · ");
}

function prettyJson(parsed: unknown): string {
  try {
    return JSON.stringify(parsed, null, 2);
  } catch {
    // JSON.stringify can throw on circular refs, which we shouldn't see from
    // a fresh JSON.parse — but stay defensive so a weird block can't crash
    // the whole table.
    return String(parsed);
  }
}

// Re-export the JsonLd type so callers picking up the auxiliary section
// don't need a second import path.
export type { JsonLd };
