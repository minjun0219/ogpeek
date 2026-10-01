import type { WarningCode } from "ogpeek";

export type Lang = "en" | "ko";

export const LANGS = ["en", "ko"] as const;
export const DEFAULT_LANG: Lang = "en";

export type Dict = {
  meta: { title: string; description: string };
  install: { copy: string; copied: string; ariaLabel: string };
  urlInput: { placeholder: string; submit: string; loading: string };
  validation: {
    severity: { error: string; warn: string; info: string };
    passTitle: string;
    passBody: string;
    resultsTitle: string;
  };
  tagTable: {
    title: string;
    totalTemplate: string;
    prefixDeclared: string;
    prefixAbsent: string;
    groupBasic: string;
    groupOther: string;
  };
  redirectFlow: {
    title: string;
    fetchedUrl: string;
    canonicalUrl: string;
    canonicalNote: string;
    redirectPath: string;
    input: string;
    redirectStatusTemplate: string;
  };
  page: {
    emptyState: string;
    preview: string;
    fetchFailed: string;
    retryLater: string;
    target: string;
    rateLimitTemplate: string;
  };
  nav: {
    ariaLabel: string;
    how: string;
    checks: string;
    packages: string;
    extension: string;
  };
  hero: { title: string; subtitle: string; examplesLabel: string };
  how: {
    title: string;
    lead: string;
    steps: { fetch: Step; parse: Step; validate: Step };
  };
  checks: {
    title: string;
    lead: string;
    rules: Record<WarningCode, string>;
  };
  extension: {
    title: string;
    body: string;
    points: string[];
    guideLink: string;
  };
  packages: {
    sectionTitle: string;
    sectionLead: string;
    quickStartTitle: string;
    engine: { tagline: string };
    react: { tagline: string };
    npmLink: string;
    readmeLink: string;
  };
  toggle: { ariaLabel: string };
};

type Step = { title: string; body: string };

const en: Dict = {
  meta: {
    title: "ogpeek — peek into any page's Open Graph tags",
    description:
      "Inspect how OG cards render and catch OGP spec violations from a single URL.",
  },
  install: {
    copy: "Copy",
    copied: "Copied",
    ariaLabel: "Copy command",
  },
  urlInput: {
    placeholder: "ogp.me or https://ogp.me",
    submit: "View OG tags",
    loading: "Loading…",
  },
  validation: {
    severity: { error: "Error", warn: "Warning", info: "Info" },
    passTitle: "Validation passed — no issues detected",
    passBody:
      "All required OG tags are present and no spec violations were detected.",
    resultsTitle: "Validation results",
  },
  tagTable: {
    title: "Meta tags",
    totalTemplate: "{n} total",
    prefixDeclared: "declared",
    prefixAbsent: "absent",
    groupBasic: "Basic meta",
    groupOther: "Other",
  },
  redirectFlow: {
    title: "Request flow",
    fetchedUrl: "Fetched URL",
    canonicalUrl: "Canonical URL",
    canonicalNote:
      "The page's declared canonical differs from the fetched URL — social platforms may use this URL when collecting metadata.",
    redirectPath: "Redirect path",
    input: "URL input",
    redirectStatusTemplate: "{status} redirect",
  },
  page: {
    emptyState:
      "Enter a URL above to see OG tags, validation results, and a preview here.",
    preview: "Preview",
    fetchFailed: "Fetch failed",
    retryLater: "Please try again shortly",
    target: "Target",
    rateLimitTemplate: "Too many requests. Please try again in {sec} seconds.",
  },
  nav: {
    ariaLabel: "Sections",
    how: "How it works",
    checks: "Checks",
    packages: "Packages",
    extension: "Extension",
  },
  hero: {
    title: "Peek into any page's Open Graph tags",
    subtitle:
      "Paste a URL to see the card it renders, every meta tag it declares, and the OGP spec violations it ships with.",
    examplesLabel: "Try",
  },
  how: {
    title: "How it works",
    lead: "One URL goes through three steps. The same engine runs on this site's Workers, in your own Node server, and inside the browser extension.",
    steps: {
      fetch: {
        title: "Fetch",
        body: "Follows redirects one hop at a time, within a timeout and a response-size cap. A guard hook runs before every hop, so the caller decides which hosts are reachable.",
      },
      parse: {
        title: "Parse",
        body: "Builds a normalized Open Graph tree from real-world markup — structured properties like og:image:width attach to their parent — and extracts favicons, JSON-LD, and theme-color alongside it.",
      },
      validate: {
        title: "Validate",
        body: "Flags missing required tags, relative URLs, duplicate declarations, and other common OGP spec violations as errors, warnings, or info.",
      },
    },
  },
  checks: {
    title: "What it checks",
    lead: "Every warning carries a stable code and a severity, so you can filter on them in your own tooling.",
    rules: {
      OG_TITLE_MISSING: "og:title is missing",
      OG_TYPE_MISSING: "og:type is missing",
      OG_IMAGE_MISSING: "og:image is missing",
      OG_URL_MISSING: "og:url is missing",
      OG_TITLE_TOO_LONG:
        "og:title exceeds 60 characters — truncated by KakaoTalk",
      OG_URL_MISMATCH: "og:url host/path disagrees with the actual request URL",
      OG_TYPE_UNKNOWN: "og:type value is not in the OGP spec whitelist",
      URL_NOT_ABSOLUTE: "A URL-typed property is not absolute",
      DUPLICATE_SINGLETON:
        "A single-valued property is declared more than once",
      ORPHAN_STRUCTURED_PROPERTY:
        "A structured property appears with no parent",
      INVALID_DIMENSION: "width/height failed integer parsing",
      JSONLD_PARSE_ERROR: "A JSON-LD block did not parse as JSON",
      MISSING_PREFIX_ATTR: "<html prefix> is not declared",
    },
  },
  extension: {
    title: "Browser extension",
    body: "This site fetches pages from Cloudflare Workers, so it can't reach anything behind a VPN or on an intranet. The extension runs the same engine inside your browser — the request leaves your machine, not a server.",
    points: [
      "Inspects the active tab's live DOM — no second request, same login state",
      "Fetches any other URL through the browser's own network stack",
      "Opens a full-tab view you can bookmark and share",
    ],
    guideLink: "Install guide",
  },
  packages: {
    sectionTitle: "Packages",
    sectionLead:
      "The engine and the React components this site is built from, both published on npm.",
    quickStartTitle: "Quick start",
    engine: {
      tagline:
        "ogpeek parses, fetches, and validates OpenGraph tags from any URL. The fetcher traces redirects with timeout and size caps, the parser is tolerant of real-world markup, and the validator catches common OGP spec violations. One external dependency, runs on Node and edge runtimes alike.",
    },
    react: {
      tagline:
        "If you render results in React, you can drop in the same Result, Preview, ValidationPanel, RedirectFlow, and TagTable components this site uses.",
    },
    npmLink: "View on npm",
    readmeLink: "README",
  },
  toggle: { ariaLabel: "Switch language" },
};

const ko: Dict = {
  meta: {
    title: "ogpeek — 어느 페이지든 오픈그래프 메타태그를 바로 들여다봅니다",
    description:
      "URL 한 줄로 OG 카드가 어떻게 보이는지 즉시 확인하고 OGP 스펙 위반을 잡아냅니다.",
  },
  install: {
    copy: "복사",
    copied: "복사됨",
    ariaLabel: "명령어 복사",
  },
  urlInput: {
    placeholder: "ogp.me 또는 https://ogp.me",
    submit: "OG 태그 보기",
    loading: "불러오는 중…",
  },
  validation: {
    severity: { error: "에러", warn: "경고", info: "안내" },
    passTitle: "검증 통과 — 확인된 문제 없음",
    passBody: "필수 OG 태그가 모두 존재하고 스펙 위반이 감지되지 않았습니다.",
    resultsTitle: "검증 결과",
  },
  tagTable: {
    title: "메타 태그",
    totalTemplate: "총 {n}개",
    prefixDeclared: "선언됨",
    prefixAbsent: "없음",
    groupBasic: "기본 메타",
    groupOther: "기타",
  },
  redirectFlow: {
    title: "요청 흐름",
    fetchedUrl: "가져온 URL",
    canonicalUrl: "표준 URL",
    canonicalNote:
      "페이지가 선언한 캐노니컬이 가져온 URL과 다릅니다 — 소셜 플랫폼은 이 URL을 기준으로 메타데이터를 수집할 수 있습니다.",
    redirectPath: "리디렉션 경로",
    input: "URL 입력",
    redirectStatusTemplate: "{status} 리디렉션",
  },
  page: {
    emptyState:
      "URL을 입력하면 OG 태그, 검증 결과, 미리보기가 여기에 표시됩니다.",
    preview: "미리보기",
    fetchFailed: "가져오기 실패",
    retryLater: "잠시 후 다시 시도해 주세요",
    target: "대상",
    rateLimitTemplate: "요청이 너무 많습니다. {sec}초 후 다시 시도해 주세요.",
  },
  nav: {
    ariaLabel: "섹션",
    how: "동작 방식",
    checks: "검증 항목",
    packages: "패키지",
    extension: "확장 프로그램",
  },
  hero: {
    title: "어느 페이지든 오픈그래프 메타태그를 바로 들여다봅니다",
    subtitle:
      "URL 하나만 넣으면 렌더링될 카드, 선언된 모든 메타 태그, OGP 스펙 위반 사항을 한 번에 보여 줍니다.",
    examplesLabel: "예시",
  },
  how: {
    title: "동작 방식",
    lead: "URL 하나가 세 단계를 거칩니다. 이 사이트의 Workers, 여러분의 Node 서버, 브라우저 확장 프로그램에서 같은 엔진이 동작합니다.",
    steps: {
      fetch: {
        title: "가져오기",
        body: "타임아웃과 응답 크기 한도 안에서 리디렉션을 한 단계씩 따라갑니다. 매 요청 직전에 guard 훅이 실행되므로, 어떤 호스트에 접근할지는 호출하는 쪽이 결정합니다.",
      },
      parse: {
        title: "파싱",
        body: "실제 웹의 어수선한 마크업에서 정규화된 오픈그래프 트리를 만듭니다. og:image:width 같은 구조화 속성은 부모 속성에 붙고, 파비콘·JSON-LD·theme-color도 함께 추출합니다.",
      },
      validate: {
        title: "검증",
        body: "필수 태그 누락, 상대 URL, 중복 선언 같은 흔한 OGP 스펙 위반을 에러·경고·안내로 나눠 알려 줍니다.",
      },
    },
  },
  checks: {
    title: "검증 항목",
    lead: "모든 경고에는 고정된 코드와 심각도가 붙어 있어, 직접 만든 도구에서도 그대로 걸러 쓸 수 있습니다.",
    rules: {
      OG_TITLE_MISSING: "og:title이 없습니다",
      OG_TYPE_MISSING: "og:type이 없습니다",
      OG_IMAGE_MISSING: "og:image가 없습니다",
      OG_URL_MISSING: "og:url이 없습니다",
      OG_TITLE_TOO_LONG: "og:title이 60자를 넘습니다 — 카카오톡에서 잘립니다",
      OG_URL_MISMATCH: "og:url의 호스트·경로가 실제 요청 URL과 다릅니다",
      OG_TYPE_UNKNOWN: "og:type 값이 OGP 스펙 목록에 없습니다",
      URL_NOT_ABSOLUTE: "URL 속성 값이 절대 URL이 아닙니다",
      DUPLICATE_SINGLETON:
        "한 번만 선언해야 하는 속성이 여러 번 선언되었습니다",
      ORPHAN_STRUCTURED_PROPERTY: "구조화 속성이 부모 속성 없이 나타났습니다",
      INVALID_DIMENSION: "width·height 값을 정수로 해석할 수 없습니다",
      JSONLD_PARSE_ERROR: "JSON-LD 블록을 JSON으로 파싱할 수 없습니다",
      MISSING_PREFIX_ATTR: "<html prefix>가 선언되지 않았습니다",
    },
  },
  extension: {
    title: "브라우저 확장 프로그램",
    body: "이 사이트는 Cloudflare Workers에서 페이지를 가져오기 때문에 VPN 뒤나 사내망 페이지에는 닿지 않습니다. 확장 프로그램은 같은 엔진을 브라우저 안에서 실행하므로, 요청이 서버가 아니라 내 컴퓨터에서 나갑니다.",
    points: [
      "현재 탭의 실제 DOM을 바로 검사합니다 — 추가 요청 없이, 로그인 상태 그대로",
      "다른 URL은 브라우저 자체의 네트워크 스택으로 가져옵니다",
      "북마크하고 공유할 수 있는 전체 화면 보기를 제공합니다",
    ],
    guideLink: "설치 안내",
  },
  packages: {
    sectionTitle: "패키지",
    sectionLead:
      "이 사이트를 이루는 엔진과 React 컴포넌트를 npm에서 바로 설치할 수 있습니다.",
    quickStartTitle: "Quick start",
    engine: {
      tagline:
        "ogpeek은 임의의 URL에서 OpenGraph 메타태그를 파싱·페치·검증합니다. 페처는 타임아웃과 응답 크기 한도 안에서 리디렉션을 추적하고, 파서는 실제 웹의 어수선한 마크업을 잘 허용하며, 검증기는 흔한 OGP 스펙 위반을 잡아냅니다. 외부 의존성은 하나뿐이며 Node와 엣지 런타임에서 동일하게 동작합니다.",
    },
    react: {
      tagline:
        "React에서 결과를 렌더링한다면, 이 사이트가 쓰는 Result, Preview, ValidationPanel, RedirectFlow, TagTable 컴포넌트를 그대로 가져다 쓸 수 있습니다.",
    },
    npmLink: "npm에서 보기",
    readmeLink: "README",
  },
  toggle: { ariaLabel: "언어 전환" },
};

const DICTIONARIES: Record<Lang, Dict> = { en, ko };

export function getDict(lang: Lang): Dict {
  return DICTIONARIES[lang];
}

export function hasLang(value: string): value is Lang {
  return value === "en" || value === "ko";
}

// Returns the first language we support that the browser explicitly prefers.
// Falls back to DEFAULT_LANG when nothing matches. Only the language
// subtag is used (so "ko-KR" matches "ko").
export function pickLangFromAcceptLanguage(header: string | null): Lang {
  if (!header) {
    return DEFAULT_LANG;
  }
  const tags = header
    .split(",")
    .map((entry) => {
      const parts = entry.trim().split(";");
      const tag = (parts[0] ?? "").toLowerCase();
      const q = parts
        .slice(1)
        .map((p) => p.trim())
        .find((p) => p.startsWith("q="));
      const quality = q ? Number(q.slice(2)) : 1;
      return { tag, quality: Number.isFinite(quality) ? quality : 0 };
    })
    .filter((t) => t.tag && t.quality > 0)
    .sort((a, b) => b.quality - a.quality);
  for (const { tag } of tags) {
    const primary = tag.split("-")[0] ?? "";
    if (hasLang(primary)) {
      return primary;
    }
  }
  return DEFAULT_LANG;
}

export function format(
  template: string,
  values: Record<string, string | number>,
): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) =>
    key in values ? String(values[key]) : `{${key}}`,
  );
}

// Removes a leading lang segment (/en or /ko) from a pathname so callers can
// reason about the language-agnostic part. "/en" → "/", "/ko/inspect" →
// "/inspect", "/inspect" → "/inspect" (no prefix). The lookahead guards
// against false positives like "/enable" or "/koala".
export function stripLangPrefix(pathname: string): string {
  const m = pathname.match(/^\/(en|ko)(?=\/|$)(.*)$/);
  if (!m) {
    return pathname;
  }
  const rest = m[2] ?? "";
  return rest === "" ? "/" : rest;
}
