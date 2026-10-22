import type { WarningCode, WarningSeverity } from "ogpeek";
import type { Lang } from "./i18n";

// Landing-page values that are not translated. The page components and the
// Markdown copy (lib/landing-markdown.ts) both read them, so the copy keeps
// saying what the page says.
// 번역하지 않는 랜딩 페이지 값이다. 페이지 컴포넌트와 마크다운 사본
// (lib/landing-markdown.ts)이 함께 읽어서 사본이 페이지와 같은 내용을 유지한다.

export const REPO_URL = "https://github.com/minjun0219/ogpeek";

export const LICENSE_URL = `${REPO_URL}/blob/main/LICENSE`;

// Pages with well-formed OG markup, so a first click shows a full result.
export const EXAMPLES = [
  "ogp.me",
  "github.com/minjun0219/ogpeek",
  "nextjs.org",
];

export const PIPELINE = ["URL", "fetch", "parse", "validate", "preview"];

// The engine API behind each step of dict.how.steps.
// dict.how.steps 의 각 단계를 맡는 엔진 API 다.
export const STEP_CODES = {
  fetch: "ogpeek/fetch",
  parse: "parse()",
  validate: "result.warnings",
} as const;

// Mirrors the severities in packages/ogpeek/src/validate.ts, ordered by
// severity for display. Typed as a full Record so a new WarningCode fails
// the website typecheck until it is listed here and in the dictionaries.
export const RULES: Record<WarningCode, WarningSeverity> = {
  OG_TITLE_MISSING: "error",
  OG_TYPE_MISSING: "error",
  OG_IMAGE_MISSING: "error",
  OG_URL_MISSING: "error",
  OG_TITLE_TOO_LONG: "warn",
  OG_URL_MISMATCH: "warn",
  OG_TYPE_UNKNOWN: "warn",
  URL_NOT_ABSOLUTE: "warn",
  DUPLICATE_SINGLETON: "warn",
  ORPHAN_STRUCTURED_PROPERTY: "warn",
  INVALID_DIMENSION: "warn",
  JSONLD_PARSE_ERROR: "warn",
  MISSING_PREFIX_ATTR: "info",
};

export const ENGINE_QUICK_START = `import { parse } from "ogpeek";
import { fetchHtml } from "ogpeek/fetch";

const { html, finalUrl } = await fetchHtml(url);
const result = parse(html, { url: finalUrl });

result.ogp.title; // normalized Open Graph tree
result.warnings; // [{ code, severity, message }]`;

export const PACKAGES = {
  engine: {
    name: "ogpeek",
    npmHref: "https://www.npmjs.com/package/ogpeek",
    readmeHref: `${REPO_URL}/tree/main/packages/ogpeek#readme`,
  },
  react: {
    name: "@ogpeek/react",
    npmHref: "https://www.npmjs.com/package/@ogpeek/react",
    readmeHref: `${REPO_URL}/tree/main/packages/ogpeek-react#readme`,
  },
} as const;

export const EXTENSION_BADGE = "Chrome · MV3";

export const EXTENSION_GUIDE_HREF: Record<Lang, string> = {
  en: `${REPO_URL}/tree/main/packages/ogpeek-extension#readme`,
  ko: `${REPO_URL}/blob/main/packages/ogpeek-extension/README.ko.md`,
};
