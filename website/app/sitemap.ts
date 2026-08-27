import type { MetadataRoute } from "next";
import { LANGS } from "@/lib/i18n";
import { SITE_URL } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  // Two static pages per language. Every localized URL gets its own entry
  // carrying the reciprocal alternate set — sitemap-based hreflang requires
  // this symmetry. /inspect?url= result pages are unbounded, so they stay
  // out of the sitemap (their canonical collapses to /inspect).
  return ["", "/inspect"].flatMap((path) =>
    LANGS.map((lang) => ({
      url: `${SITE_URL}/${lang}${path}`,
      alternates: {
        languages: Object.fromEntries(
          LANGS.map((l) => [l, `${SITE_URL}/${l}${path}`]),
        ),
      },
    })),
  );
}
