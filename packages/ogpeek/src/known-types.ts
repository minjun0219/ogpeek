// OGP spec (https://ogp.me) — object types and their namespace prefixes.
// Any type not listed here triggers OG_TYPE_UNKNOWN (warn).

export const KNOWN_OG_TYPES: ReadonlySet<string> = new Set([
  "website",
  "article",
  "book",
  "profile",
  "music.song",
  "music.album",
  "music.playlist",
  "music.radio_station",
  "video.movie",
  "video.episode",
  "video.tv_show",
  "video.other",
]);

// Namespace prefix → allowed property list. We don't hard-fail unknown
// subproperties (warn level is sufficient), but having the map handy lets
// future rules classify them.
export const TYPE_NAMESPACES: Readonly<Record<string, readonly string[]>> = {
  article: [
    "published_time",
    "modified_time",
    "expiration_time",
    "author",
    "section",
    "tag",
  ],
  book: ["author", "isbn", "release_date", "tag"],
  profile: ["first_name", "last_name", "username", "gender"],
};

// Properties that must appear at most once. Extra occurrences → DUPLICATE_SINGLETON.
export const OG_SINGLETON_PROPERTIES: ReadonlySet<string> = new Set([
  "og:title",
  "og:type",
  "og:url",
  "og:description",
  "og:site_name",
  "og:determiner",
]);

// URL-valued OG properties — checked against URL_NOT_ABSOLUTE.
export const OG_URL_PROPERTIES: ReadonlySet<string> = new Set([
  "og:url",
  "og:image",
  "og:image:url",
  "og:image:secure_url",
  "og:video",
  "og:video:url",
  "og:video:secure_url",
  "og:audio",
  "og:audio:url",
  "og:audio:secure_url",
]);
