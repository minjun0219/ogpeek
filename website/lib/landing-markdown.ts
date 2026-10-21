import type { WarningCode, WarningSeverity } from "ogpeek";
import { getDict, LANGS, type Lang, langPath } from "./i18n";
import {
  ENGINE_QUICK_START,
  EXAMPLES,
  EXTENSION_BADGE,
  EXTENSION_GUIDE_HREF,
  LICENSE_URL,
  PACKAGES,
  PIPELINE,
  REPO_URL,
  RULES,
  STEP_CODES,
} from "./landing";
import { SITE_ORIGIN, withBase } from "./site";

// The landing page as Markdown, so an agent reads the page's own text
// instead of HTML converted on its side. It is built from the dictionary and
// constants the page renders (lib/i18n.ts, lib/landing.ts); a section added
// to the page goes here too. The worker entry serves it, and the page points
// at it with rel="alternate".
// 랜딩 페이지의 마크다운 사본이다. 에이전트가 자기 쪽에서 HTML 을 변환한 결과 대신 페이지의
// 글을 그대로 읽는다. 페이지가 그리는 사전과 상수(lib/i18n.ts, lib/landing.ts)로 만들고,
// 페이지에 섹션을 더하면 여기에도 더한다. 워커 엔트리가 응답하고, 페이지는
// rel="alternate" 로 이 사본을 알린다.

/**
 * Copy address per language, below BASE_PATH. Same rule as mdwire on the
 * shared origin: the root is index.md, any other page is its path plus .md.
 * 언어별 사본 주소(BASE_PATH 아래)다. 같은 origin 의 mdwire 와 같은 규칙으로,
 * 루트는 index.md, 다른 페이지는 경로에 .md 를 붙인다.
 */
export const MARKDOWN_PATHS: Record<Lang, string> = {
  en: "/index.md",
  ko: "/ko.md",
};

// Same as the Cache-Control Next sends for the landing page (force-dynamic),
// so neither form of the page is cached longer than the other.
// Next 가 랜딩 페이지(force-dynamic)에 붙이는 Cache-Control 과 같다. 같은 페이지의
// 두 형태 중 어느 쪽도 더 오래 캐시되지 않는다.
const MARKDOWN_HEADERS = {
  "content-type": "text/markdown; charset=utf-8",
  "cache-control": "private, no-cache, no-store, max-age=0, must-revalidate",
};

function absolute(path: string): string {
  return `${SITE_ORIGIN}${withBase(path)}`;
}

// Dictionary text is plain text on the page. A tag in it ("<html prefix>")
// would be raw HTML in Markdown, so it becomes a code span.
// 사전의 문구는 페이지에서 평문이다. 그 안의 태그("<html prefix>")는 마크다운에서 raw
// HTML 이 되므로 코드 스팬으로 바꾼다.
function text(value: string): string {
  return value.replace(/<[a-z][^<>]*>/gi, (tag) => `\`${tag}\``);
}

function packageLinks(
  pkg: { npmHref: string; readmeHref: string },
  npmLabel: string,
  readmeLabel: string,
): string {
  return `[${npmLabel}](${pkg.npmHref}) · [${readmeLabel}](${pkg.readmeHref})`;
}

export function landingMarkdown(lang: Lang): string {
  const dict = getDict(lang);
  const inspect = (target: string) =>
    `${absolute(langPath(lang, "/inspect"))}?url=${encodeURIComponent(target)}`;
  const examples = EXAMPLES.map(
    (example) => `[${example}](${inspect(example)})`,
  );
  const steps = (["fetch", "parse", "validate"] as const).map((key, i) => {
    const step = dict.how.steps[key];
    return `${i + 1}. **${text(step.title)}** (\`${STEP_CODES[key]}\`): ${text(step.body)}`;
  });
  const rules = (
    Object.entries(RULES) as Array<[WarningCode, WarningSeverity]>
  ).map(
    ([code, severity]) =>
      `- ${dict.validation.severity[severity]} \`${code}\`: ${text(dict.checks.rules[code])}`,
  );
  const { npmLink, readmeLink } = dict.packages;

  return [
    "# ogpeek",
    "",
    `> ${text(dict.meta.description)}`,
    "",
    `HTML: ${absolute(langPath(lang))}`,
    "",
    `**${text(dict.hero.title)}**`,
    "",
    text(dict.hero.subtitle),
    "",
    `${dict.hero.examplesLabel}: ${examples.join(" · ")}`,
    "",
    `## ${dict.how.title}`,
    "",
    text(dict.how.lead),
    "",
    "```",
    PIPELINE.join(" → "),
    "```",
    "",
    ...steps,
    "",
    `## ${dict.checks.title}`,
    "",
    text(dict.checks.lead),
    "",
    ...rules,
    "",
    `## ${dict.packages.sectionTitle}`,
    "",
    text(dict.packages.sectionLead),
    "",
    `### ${PACKAGES.engine.name}`,
    "",
    text(dict.packages.engine.tagline),
    "",
    "```sh",
    `npm install ${PACKAGES.engine.name}`,
    "```",
    "",
    `#### ${dict.packages.quickStartTitle}`,
    "",
    "```ts",
    ENGINE_QUICK_START,
    "```",
    "",
    packageLinks(PACKAGES.engine, npmLink, readmeLink),
    "",
    `### ${PACKAGES.react.name}`,
    "",
    text(dict.packages.react.tagline),
    "",
    "```sh",
    `npm install ${PACKAGES.react.name}`,
    "```",
    "",
    packageLinks(PACKAGES.react, npmLink, readmeLink),
    "",
    `## ${dict.extension.title}`,
    "",
    EXTENSION_BADGE,
    "",
    text(dict.extension.body),
    "",
    ...dict.extension.points.map((point) => `- ${text(point)}`),
    "",
    `[${dict.extension.guideLink}](${EXTENSION_GUIDE_HREF[lang]})`,
    "",
    "---",
    "",
    `[GitHub](${REPO_URL}) · [MIT License](${LICENSE_URL}) · [llms.txt](${absolute("/llms.txt")})`,
    "",
  ].join("\n");
}

// The language whose copy lives at `pathname` ("/ogpeek/index.md",
// "/ogpeek/ko.md"), or null.
// `pathname` 에 사본이 있는 언어("/ogpeek/index.md", "/ogpeek/ko.md")이고, 없으면 null.
function copyAt(pathname: string): Lang | null {
  return (
    LANGS.find((lang) => pathname === withBase(MARKDOWN_PATHS[lang])) ?? null
  );
}

function markdownResponse(request: Request, lang: Lang): Response {
  const body = request.method === "HEAD" ? null : landingMarkdown(lang);
  return new Response(body, { headers: MARKDOWN_HEADERS });
}

/**
 * Answers GET and HEAD at a copy address with the landing page's Markdown and
 * leaves every other request to `next` (the OpenNext handler).
 * 사본 주소로 온 GET·HEAD 에는 랜딩 페이지의 마크다운으로 응답하고, 나머지 요청은
 * `next`(OpenNext 핸들러)에 넘긴다.
 */
export async function serveLandingMarkdown(
  request: Request,
  next: () => Promise<Response>,
): Promise<Response> {
  const safe = request.method === "GET" || request.method === "HEAD";
  const lang = safe ? copyAt(new URL(request.url).pathname) : null;
  if (lang) {
    return markdownResponse(request, lang);
  }
  return next();
}
