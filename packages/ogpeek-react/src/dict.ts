export type Lang = "ko" | "en";

export const LANGS: readonly Lang[] = ["ko", "en"];
export const DEFAULT_LANG: Lang = "ko";

export type Dict = {
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
  preview: {
    heading: string;
  };
};

const ko: Dict = {
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
  preview: {
    heading: "미리보기",
  },
};

const en: Dict = {
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
  preview: {
    heading: "Preview",
  },
};

const DICTIONARIES: Record<Lang, Dict> = { ko, en };

export function getDict(lang: Lang): Dict {
  return DICTIONARIES[lang];
}

export function hasLang(value: string): value is Lang {
  return value === "ko" || value === "en";
}

export function format(
  template: string,
  values: Record<string, string | number>,
): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) =>
    key in values ? String(values[key]) : `{${key}}`,
  );
}

export type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
};

// Selective override: any field not present in `override` falls back to the
// base dict for the given language.
export function resolveDict(
  lang: Lang,
  override?: DeepPartial<Dict>,
): Dict {
  const base = getDict(lang);
  if (!override) return base;
  return {
    validation: {
      ...base.validation,
      ...override.validation,
      severity: {
        ...base.validation.severity,
        ...override.validation?.severity,
      },
    },
    tagTable: { ...base.tagTable, ...override.tagTable },
    redirectFlow: { ...base.redirectFlow, ...override.redirectFlow },
    preview: { ...base.preview, ...override.preview },
  };
}
