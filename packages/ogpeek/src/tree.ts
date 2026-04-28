import type {
  OgAudio,
  OgImage,
  OgVideo,
  OpenGraph,
  RawMeta,
  TypedObject,
  Warning,
} from "./types.js";

type OrphanHit = {
  property: string;
  value: string;
};

export type TreeBuildResult = {
  ogp: OpenGraph;
  typed: TypedObject | null;
  twitter: Record<string, string>;
  ogRaw: RawMeta[];
  orphans: OrphanHit[];
  invalidDimensions: Array<{
    property: string;
    value: string;
  }>;
  duplicateSingletons: Array<{
    property: string;
    value: string;
  }>;
  _warningsFromTree?: Warning[]; // reserved
};

type ImageField = keyof OgImage;
type VideoField = keyof OgVideo;
type AudioField = keyof OgAudio;

const IMAGE_SUBPROPS: Record<string, ImageField> = {
  "og:image": "url",
  "og:image:url": "url",
  "og:image:secure_url": "secure_url",
  "og:image:type": "type",
  "og:image:width": "width",
  "og:image:height": "height",
  "og:image:alt": "alt",
};

const VIDEO_SUBPROPS: Record<string, VideoField> = {
  "og:video": "url",
  "og:video:url": "url",
  "og:video:secure_url": "secure_url",
  "og:video:type": "type",
  "og:video:width": "width",
  "og:video:height": "height",
  "og:video:alt": "alt",
};

const AUDIO_SUBPROPS: Record<string, AudioField> = {
  "og:audio": "url",
  "og:audio:url": "url",
  "og:audio:secure_url": "secure_url",
  "og:audio:type": "type",
};

const SINGLE_OG_FIELDS: Record<string, keyof OpenGraph> = {
  "og:title": "title",
  "og:type": "type",
  "og:url": "url",
  "og:description": "description",
  "og:site_name": "site_name",
  "og:determiner": "determiner",
  "og:locale": "locale",
};

const TYPED_NAMESPACES = new Set([
  "article",
  "book",
  "profile",
  "music",
  "video",
]);

export function buildTree(raw: RawMeta[]): TreeBuildResult {
  const ogp: OpenGraph = {
    locale_alternate: [],
    images: [],
    videos: [],
    audios: [],
  };
  const twitter: Record<string, string> = {};
  const ogRaw: RawMeta[] = [];
  const orphans: OrphanHit[] = [];
  const invalidDimensions: Array<{
    property: string;
    value: string;
  }> = [];
  const duplicateSingletons: Array<{
    property: string;
    value: string;
  }> = [];

  let typedKind: string | null = null;
  const typedProps: Record<string, string | string[]> = {};

  for (const { property, content } of raw) {
    if (property.startsWith("og:") || isTypedProperty(property)) {
      ogRaw.push({
        property,
        content,
      });
    }
    if (property.startsWith("twitter:")) {
      twitter[property] = content;
      continue;
    }

    // Structured image/video/audio first (so og:image:width doesn't collide
    // with og:image as a singleton).
    if (property in IMAGE_SUBPROPS) {
      applySub(
        ogp.images,
        IMAGE_SUBPROPS[property]!,
        property,
        content,
        orphans,
        invalidDimensions,
        property === "og:image",
      );
      continue;
    }
    if (property in VIDEO_SUBPROPS) {
      applySub(
        ogp.videos,
        VIDEO_SUBPROPS[property]!,
        property,
        content,
        orphans,
        invalidDimensions,
        property === "og:video",
      );
      continue;
    }
    if (property in AUDIO_SUBPROPS) {
      applySub(
        ogp.audios,
        AUDIO_SUBPROPS[property]!,
        property,
        content,
        orphans,
        invalidDimensions,
        property === "og:audio",
      );
      continue;
    }

    if (property === "og:locale:alternate") {
      ogp.locale_alternate.push(content);
      continue;
    }

    if (property in SINGLE_OG_FIELDS) {
      const field = SINGLE_OG_FIELDS[property]!;
      if (typeof ogp[field] !== "undefined" && field !== "locale_alternate") {
        duplicateSingletons.push({
          property,
          value: content,
        });
      } else {
        (ogp as Record<string, unknown>)[field] = content;
      }
      continue;
    }

    // Typed-object properties: article:author, music:duration, video:tag, etc.
    const ns = property.split(":")[0] ?? "";
    if (TYPED_NAMESPACES.has(ns) && property.includes(":")) {
      if (typedKind === null && ogp.type) {
        typedKind = ogp.type;
      }
      const key = property.slice(ns.length + 1);
      const existing = typedProps[key];
      if (Array.isArray(existing)) {
        existing.push(content);
      } else if (typeof existing === "string") {
        typedProps[key] = [
          existing,
          content,
        ];
      } else {
        typedProps[key] = content;
      }
    }
  }

  const typed: TypedObject | null =
    // biome-ignore lint/complexity/useOptionalChain: explicit short-circuit chain reads more clearly than `?.` here
    ogp.type &&
    ogp.type.split(".")[0] &&
    TYPED_NAMESPACES.has(ogp.type.split(".")[0]!)
      ? {
          kind: ogp.type,
          properties: typedProps,
        }
      : null;

  return {
    ogp,
    typed,
    twitter,
    ogRaw,
    orphans,
    invalidDimensions,
    duplicateSingletons,
  };
}

function isTypedProperty(property: string): boolean {
  const ns = property.split(":")[0] ?? "";
  return TYPED_NAMESPACES.has(ns);
}

function applySub<T extends Record<string, unknown>>(
  list: T[],
  field: keyof T,
  property: string,
  content: string,
  orphans: OrphanHit[],
  invalidDimensions: Array<{
    property: string;
    value: string;
  }>,
  isParent: boolean,
): void {
  if (isParent) {
    const next = {
      [field]: content,
    } as unknown as T;
    list.push(next);
    return;
  }
  const current = list[list.length - 1];
  if (!current) {
    orphans.push({
      property,
      value: content,
    });
    return;
  }
  if (field === "width" || field === "height") {
    const n = Number.parseInt(content, 10);
    if (!Number.isFinite(n) || String(n) !== content.trim()) {
      invalidDimensions.push({
        property,
        value: content,
      });
      return;
    }
    (current as Record<string, unknown>)[field as string] = n;
    return;
  }
  (current as Record<string, unknown>)[field as string] = content;
}
