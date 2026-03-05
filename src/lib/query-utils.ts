import type { ContentType } from "./types";

/** Streaming services we can detect in queries (pattern → display name) */
const STREAMING_SERVICE_PATTERNS: { pattern: RegExp; name: string }[] = [
  { pattern: /\bnetflix\b/i, name: "Netflix" },
  { pattern: /\bhbo\s*(max)?\b/i, name: "HBO Max" },
  { pattern: /\bdisney\s*\+?\b|disneyplus\b/i, name: "Disney+" },
  { pattern: /\bprime\s*(video)?\b|\bamazon\s*prime\b/i, name: "Prime Video" },
  { pattern: /\bpeacock\b/i, name: "Peacock" },
  { pattern: /\bapple\s*tv\s*\+?\b/i, name: "Apple TV+" },
  { pattern: /\bparamount\s*\+?\b/i, name: "Paramount+" },
  { pattern: /\bmax\b(?!\s*\d)/i, name: "Max" }, // "max" but not "max 3"
  { pattern: /\bhulu\b/i, name: "Hulu" },
];

/**
 * Detect if the query mentions a specific streaming service.
 * Returns the service display name (e.g. "Netflix") or null.
 */
export function detectStreamingServiceInQuery(query: string): string | null {
  if (!query?.trim()) return null;
  for (const { pattern, name } of STREAMING_SERVICE_PATTERNS) {
    if (pattern.test(query)) return name;
  }
  return null;
}

/**
 * Check if the query requests content ONLY from a specific streaming service.
 * Used to enforce filtering in recommendations.
 * Returns the service name when the user clearly wants that service only.
 */
export function queryRequestsStreamingOnly(query: string): string | null {
  const service = detectStreamingServiceInQuery(query);
  if (!service) return null;

  const q = query.toLowerCase();

  // Explicit opt-out: user said they don't want to restrict (from refine)
  if (/\b(no|any)\s+(streaming\s+)?service\b/i.test(q)) return null;
  if (/\bany\s+(platform|service)\b/i.test(q)) return null;

  // Explicit strict phrases
  const strictPatterns = [
    /\bonly\s+(on\s+)?(netflix|hbo|disney|prime|peacock|apple|paramount|max|hulu)\b/i,
    /\b(netflix|hbo|disney|prime|peacock|apple|paramount|max|hulu)\s+only\b/i,
    /\bexclusively\s+(on\s+)?/i,
    /\bavailable\s+(only\s+)?on\s+/i,
    /\byes,?\s+[^,]+only\b/i, // from refine: "Yes, Netflix only"
  ];
  if (strictPatterns.some((p) => p.test(q))) return service;

  // Query mentions a service in a requesting context (e.g. "Netflix series", "shows on HBO")
  // Assume they want that service unless they opted out via refine
  return service;
}

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
