export type OgImage = {
  url?: string;
  secure_url?: string;
  type?: string;
  width?: number;
  height?: number;
  alt?: string;
};

export type OgVideo = {
  url?: string;
  secure_url?: string;
  type?: string;
  width?: number;
  height?: number;
  alt?: string;
};

export type OgAudio = {
  url?: string;
  secure_url?: string;
  type?: string;
};

export type OpenGraph = {
  title?: string;
  type?: string;
  url?: string;
  description?: string;
  site_name?: string;
  determiner?: string;
  locale?: string;
  locale_alternate: string[];
  images: OgImage[];
  videos: OgVideo[];
  audios: OgAudio[];
};

export type TypedObject = {
  kind: string;
  properties: Record<string, string | string[]>;
};

export type WarningSeverity = "error" | "warn" | "info";

export type WarningCode =
  | "OG_TITLE_MISSING"
  | "OG_TYPE_MISSING"
  | "OG_IMAGE_MISSING"
  | "OG_URL_MISSING"
  | "OG_TYPE_UNKNOWN"
  | "URL_NOT_ABSOLUTE"
  | "DUPLICATE_SINGLETON"
  | "ORPHAN_STRUCTURED_PROPERTY"
  | "INVALID_DIMENSION"
  | "MISSING_PREFIX_ATTR";

export type Warning = {
  code: WarningCode;
  severity: WarningSeverity;
  message: string;
  property?: string;
  value?: string;
};

export type RawMeta = {
  property: string;
  content: string;
};

export type OgDebugResult = {
  ogp: OpenGraph;
  typed: TypedObject | null;
  twitter: Record<string, string>;
  raw: RawMeta[];
  warnings: Warning[];
  meta: {
    title: string | null;
    canonical: string | null;
    prefixDeclared: boolean;
    charset: string | null;
  };
};

export type ParseOptions = {
  url?: string;
};
