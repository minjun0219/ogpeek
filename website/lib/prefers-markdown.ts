// Ranges that cover text/html, by specificity: the most specific one listed
// sets HTML's q.
// text/html 에 적용되는 범위와 그 구체성이다. 적힌 것 중 가장 구체적인 범위가 HTML 의 q 를 정한다.
const HTML_RANGES = new Map([
  ["text/html", 2],
  ["text/*", 1],
  ["*/*", 0],
]);

// Whether an Accept header asks for Markdown over HTML. The same rule as
// mdwire on the shared origin: `text/markdown` is listed explicitly with
// q > 0, at or above HTML's q. A tie goes to Markdown, since Claude Code's
// WebFetch sends `text/markdown, text/html, */*`. Matching through `*/*` or
// `text/*` alone is HTML, so browsers and clients that send `Accept: */*`
// (curl, fetch() defaults) keep getting HTML.
// Accept 헤더가 HTML 보다 마크다운을 원하는지 본다. 같은 origin 의 mdwire 와 같은 규칙으로,
// `text/markdown` 이 q > 0 으로 직접 적혀 있고 그 q 가 HTML 의 q 이상이어야 한다. 동점은
// 마크다운이다. Claude Code 의 WebFetch 가 `text/markdown, text/html, */*` 로 보낸다.
// `*/*` · `text/*` 로만 맞으면 HTML 이라, 브라우저와 `Accept: */*` 를 보내는 쪽(curl,
// fetch() 기본값)은 그대로 HTML 을 받는다.
export function prefersMarkdown(accept: string | null): boolean {
  if (!accept) {
    return false;
  }
  let markdown = 0;
  // With no range covering text/html, HTML's q is 0.
  // text/html 에 적용되는 범위가 없으면 HTML 의 q 는 0 이다.
  let html = { rank: -1, q: 0 };
  for (const item of accept.split(",")) {
    const [range = "", ...params] = item
      .split(";")
      .map((part) => part.trim().toLowerCase());
    const qParam = params.find((param) => param.startsWith("q="));
    const q = qParam === undefined ? 1 : Number(qParam.slice(2));
    if (Number.isNaN(q)) {
      continue;
    }
    if (range === "text/markdown") {
      markdown = Math.max(markdown, q);
    }
    const rank = HTML_RANGES.get(range);
    if (rank === undefined) {
      continue;
    }
    if (rank > html.rank || (rank === html.rank && q > html.q)) {
      html = { rank, q };
    }
  }
  return markdown > 0 && markdown >= html.q;
}
