import type { ContentType } from "./types";

/**
 * When the user selects multiple types (e.g. movies + TV shows), ensure the query
 * text reflects that—e.g. "recent movies" becomes "recent movies and TV shows".
 * Fixes the case where the user types "movies" but explicitly chose TV too.
 */
export function ensureQueryReflectsTypes(
  query: string,
  types: ContentType | ContentType[],
): string {
  const arr = Array.isArray(types) ? types : [types];
  if (arr.length < 2) return query;

  const hasMovie = arr.includes("movie");
  const hasTv = arr.includes("tv");
  const q = query.trim();

  // Only apply when both movie and TV are selected
  if (!hasMovie || !hasTv) return query;

  const mentionsMoviesOnly = /\b(movie|movies)\b/i.test(q);
  const mentionsTv = /\b(tv|television|shows?|series)\b/i.test(q);

  if (mentionsMoviesOnly && !mentionsTv) {
    return q.replace(/\bmovies\b/gi, "movies and TV shows").replace(
      /\bmovie\b/gi,
      "movie and TV show",
    );
  }
  if (mentionsTv && !mentionsMoviesOnly) {
    return q
      .replace(/\bTV shows\b/gi, "movies and TV shows")
      .replace(/\bTV show\b/gi, "movies and TV shows")
      .replace(/\bTV series\b/gi, "movies and TV series")
      .replace(/\btelevision shows\b/gi, "movies and television shows");
  }

  return query;
}
