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
  toggle: { ariaLabel: string };
};

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
