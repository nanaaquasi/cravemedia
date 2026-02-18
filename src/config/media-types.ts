import { ContentType } from "@/lib/types";

/**
 * Media types to enable in the app.
 *
 * Edit this array to enable/disable types:
 * - ["movie", "tv"] — Movies and TV only (no books)
 * - ["movie", "tv", "book"] — All three
 * - ["movie"] — Movies only
 */
export const ENABLED_MEDIA_TYPES: ("movie" | "tv" | "book")[] = [
  "movie",
  "tv",
  "book",
];

/** All valid content types: "all" + enabled media types */
export const VALID_CONTENT_TYPES: ContentType[] = [
  "all",
  ...ENABLED_MEDIA_TYPES,
];

export function isMediaTypeEnabled(type: "movie" | "tv" | "book"): boolean {
  return ENABLED_MEDIA_TYPES.includes(type);
}

export function getTypeLabel(type: ContentType): string {
  switch (type) {
    case "movie":
      return "movies";
    case "tv":
      return "TV shows";
    case "book":
      return "books";
    case "all":
      return ENABLED_MEDIA_TYPES.map((t) => getTypeLabel(t)).join(" and ");
    default:
      return "media";
  }
}
