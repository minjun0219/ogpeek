import type { MetadataRoute } from "next";
import { LANGS } from "@/lib/i18n";
import { SITE_URL } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  // 언어별 정적 페이지 두 장이 전부다. inspect 의 ?url= 결과 페이지는
  // 무한하므로 sitemap 에 올리지 않는다 (canonical 이 /inspect 로 수렴).
  return ["", "/inspect"].map((path) => ({
    url: `${SITE_URL}/en${path}`,
    alternates: {
      languages: Object.fromEntries(
        LANGS.map((lang) => [lang, `${SITE_URL}/${lang}${path}`]),
      ),
    },
  }));
}
