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

// Auxiliary metadata: favicons / app icons declared via <link rel>.
// `rel` is normalized to lowercase. `sizes` retains its raw form (e.g.
// "32x32 16x16" or "any") since the spec allows multi-size declarations.
export type Icon = {
  rel: string;
  href: string;
  sizes?: string;
  type?: string;
  color?: string;
};

// Auxiliary metadata: a single <script type="application/ld+json"> block.
// `raw` is the original script body, `parsed` is the JSON.parse result (or
// null on failure), `types` is every @type seen (recursing into @graph), and
// `error` carries the parser message when the block didn't parse.
export type JsonLd = {
  raw: string;
  parsed: unknown | null;
  types: string[];
  error?: string;
};

export type WarningSeverity = "error" | "warn" | "info";

export type WarningCode =
  | "OG_TITLE_MISSING"
  | "OG_TITLE_TOO_LONG"
  | "OG_TYPE_MISSING"
  | "OG_IMAGE_MISSING"
  | "OG_URL_MISSING"
  | "OG_URL_MISMATCH"
  | "OG_TYPE_UNKNOWN"
  | "URL_NOT_ABSOLUTE"
  | "DUPLICATE_SINGLETON"
  | "ORPHAN_STRUCTURED_PROPERTY"
  | "INVALID_DIMENSION"
  | "MISSING_PREFIX_ATTR"
  | "JSONLD_PARSE_ERROR";

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
  // Auxiliary metadata. OG remains the primary signal; these are surfaced
  // alongside it for "how does this page advertise itself elsewhere?" debugging.
  icons: Icon[];
  jsonld: JsonLd[];
  meta: {
    title: string | null;
    canonical: string | null;
    prefixDeclared: boolean;
    charset: string | null;
    applicationName: string | null;
    msTileImage: string | null;
    msTileColor: string | null;
    themeColor: string | null;
  };
};

export type ParseOptions = {
  url?: string;
  // Where to harvest <script type="application/ld+json"> from. JSON-LD often
  // lives in <body>, but the engine defaults to "head" to stay consistent
  // with the rest of the scan and keep cost predictable. Pass "document" to
  // walk the whole tree.
  jsonldScope?: "head" | "document";
};
