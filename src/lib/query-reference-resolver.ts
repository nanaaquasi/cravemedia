import { searchAnime } from "./anilist";
import { searchMovie, searchTV } from "./tmdb";
import { ContentType, ReferenceTitle } from "./types";
import { getRedis } from "./redis";

const CACHE_TTL_SEC = 24 * 60 * 60; // 24h
const REDIS_KEY_PREFIX = "ref-resolve:";
const MAX_CANDIDATES = 3;
const MAX_RESOLVED_REFERENCES = 2;

const LIKE_PATTERNS: RegExp[] = [
  /(?:more\s+)?like\s+["“]?([^"“”\n]+?)["”]?(?=\s*(?:,|\.|!|\?|;|:|—|-|$))/gi,
  /similar\s+to\s+["“]?([^"“”\n]+?)["”]?(?=\s*(?:,|\.|!|\?|;|:|—|-|$))/gi,
  /inspired\s+by\s+["“]?([^"“”\n]+?)["”]?(?=\s*(?:,|\.|!|\?|;|:|—|-|$))/gi,
  /along\s+the\s+lines\s+of\s+["“]?([^"“”\n]+?)["”]?(?=\s*(?:,|\.|!|\?|;|:|—|-|$))/gi,
];

const TMDB_GENRE_MAP: Record<number, string> = {
  12: "Adventure",
  14: "Fantasy",
  16: "Animation",
  18: "Drama",
  27: "Horror",
  28: "Action",
  35: "Comedy",
  53: "Thriller",
  80: "Crime",
  878: "Sci-Fi",
  9648: "Mystery",
  10749: "Romance",
  10751: "Family",
  10759: "Action & Adventure",
  10762: "Kids",
  10765: "Sci-Fi & Fantasy",
  10768: "War & Politics",
};

function normalizeForMatch(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .replace(/^(the|a|an)\s+/i, "");
}

function titleSimilarity(a: string, b: string): number {
  const normA = normalizeForMatch(a);
  const normB = normalizeForMatch(b);
  if (!normA || !normB) return 0;
  if (normA === normB) return 1;
  if (normA.includes(normB) || normB.includes(normA)) return 0.9;

  const tokensA = new Set(normA.split(" "));
  const tokensB = new Set(normB.split(" "));
  let overlap = 0;
  for (const t of tokensA) {
    if (tokensB.has(t)) overlap++;
  }
  const denom = Math.max(tokensA.size, tokensB.size);
  return denom > 0 ? overlap / denom : 0;
}

function cleanCandidate(raw: string): string {
  let candidate = raw.trim();
  candidate = candidate.replace(/\s+/g, " ");
  candidate = candidate.replace(/^critical\s+role['’]s?\s+/i, "");
  candidate = candidate.replace(
    /\b(campaign|arc|show|series|movie|film|book|books|anime|manga)\b\s*$/i,
    "",
  );
  return candidate.trim();
}

function extractQuotedCandidates(query: string): string[] {
  const out: string[] = [];
  const re = /["“]([^"“”]{2,90})["”]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(query)) !== null) {
    const cleaned = cleanCandidate(m[1]);
    if (cleaned.length >= 2 && cleaned.length <= 90) out.push(cleaned);
  }
  return out;
}

/**
 * Extract likely reference titles from plain-language "like X" queries.
 * Examples:
 * - "More like The Mighty Nein"
 * - "Shows similar to Arcane"
 * - "Inspired by Critical Role's Mighty Nein campaign"
 */
export function extractReferenceCandidatesFromQuery(query: string): string[] {
  const candidates: string[] = [];
  const pushCandidate = (value: string) => {
    const cleaned = cleanCandidate(value);
    if (cleaned.length < 2 || cleaned.length > 90) return;
    const key = normalizeForMatch(cleaned);
    if (!key) return;
    if (candidates.some((c) => normalizeForMatch(c) === key)) return;
    candidates.push(cleaned);
  };

  for (const re of LIKE_PATTERNS) {
    let m: RegExpExecArray | null;
    while ((m = re.exec(query)) !== null) {
      pushCandidate(m[1]);
    }
  }

  // Quoted titles are strong signals when users type free-form prompts.
  for (const q of extractQuotedCandidates(query)) {
    pushCandidate(q);
  }

  return candidates.slice(0, MAX_CANDIDATES);
}

function toTypeArray(type: ContentType | ContentType[]): ContentType[] {
  return Array.isArray(type) ? type : [type];
}

function mapGenreIds(ids: number[] | undefined): string[] {
  if (!ids || ids.length === 0) return [];
  return ids
    .map((id) => TMDB_GENRE_MAP[id])
    .filter((g): g is string => Boolean(g))
    .slice(0, 4);
}

type MovieResult = Awaited<ReturnType<typeof searchMovie>>[number];
type TVResult = Awaited<ReturnType<typeof searchTV>>[number];

function scoreMovieCandidate(queryTitle: string, item: MovieResult): number {
  const title = item.title ?? "";
  if (!title) return 0;
  const base = titleSimilarity(queryTitle, title);
  const ratingBonus = Math.min((item.vote_average ?? 0) / 50, 0.2);
  return base + ratingBonus;
}

function scoreTVCandidate(queryTitle: string, item: TVResult): number {
  const title = item.name ?? "";
  if (!title) return 0;
  const base = titleSimilarity(queryTitle, title);
  const ratingBonus = Math.min((item.vote_average ?? 0) / 50, 0.2);
  return base + ratingBonus;
}

async function resolveWithMovie(queryTitle: string): Promise<{
  score: number;
  ref: ReferenceTitle | null;
}> {
  const results = await searchMovie(queryTitle);
  let bestScore = 0;
  let best: MovieResult | null = null;
  for (const item of results.slice(0, 8)) {
    const score = scoreMovieCandidate(queryTitle, item);
    if (score > bestScore) {
      bestScore = score;
      best = item;
    }
  }
  if (!best || bestScore < 0.45) return { score: 0, ref: null };
  return {
    score: bestScore,
    ref: {
      title: best.title ?? queryTitle,
      type: "movie",
      year: best.release_date?.slice(0, 4) ?? null,
      description: best.overview ?? null,
      genres: mapGenreIds(best.genre_ids),
    },
  };
}

async function resolveWithTV(queryTitle: string): Promise<{
  score: number;
  ref: ReferenceTitle | null;
}> {
  const results = await searchTV(queryTitle);
  let bestScore = 0;
  let best: TVResult | null = null;
  for (const item of results.slice(0, 8)) {
    const score = scoreTVCandidate(queryTitle, item);
    if (score > bestScore) {
      bestScore = score;
      best = item;
    }
  }
  if (!best || bestScore < 0.45) return { score: 0, ref: null };
  return {
    score: bestScore,
    ref: {
      title: best.name ?? queryTitle,
      type: "tv",
      year: best.first_air_date?.slice(0, 4) ?? null,
      description: best.overview ?? null,
      genres: mapGenreIds(best.genre_ids),
    },
  };
}

async function resolveWithAnime(queryTitle: string): Promise<{
  score: number;
  ref: ReferenceTitle | null;
}> {
  const results = await searchAnime(queryTitle);
  let bestScore = 0;
  let best: (typeof results)[number] | null = null;
  for (const item of results.slice(0, 8)) {
    const score = titleSimilarity(queryTitle, item.title) + 0.05;
    if (score > bestScore) {
      bestScore = score;
      best = item;
    }
  }
  if (!best || bestScore < 0.45) return { score: 0, ref: null };
  return {
    score: bestScore,
    ref: {
      title: best.title,
      type: "anime",
      year: best.year ?? null,
      genres: ["Anime"],
    },
  };
}

async function resolveSingleCandidate(
  queryTitle: string,
  type: ContentType | ContentType[],
): Promise<ReferenceTitle | null> {
  const typeArray = toTypeArray(type);
  const allowsAll = typeArray.includes("all");
  const runMovie = allowsAll || typeArray.includes("movie");
  const runTV = allowsAll || typeArray.includes("tv");
  const runAnime = allowsAll || typeArray.includes("anime");

  const jobs: Array<Promise<{ score: number; ref: ReferenceTitle | null }>> = [];
  if (runMovie) jobs.push(resolveWithMovie(queryTitle));
  if (runTV) jobs.push(resolveWithTV(queryTitle));
  if (runAnime) jobs.push(resolveWithAnime(queryTitle));
  if (jobs.length === 0) return null;

  const resolved = await Promise.allSettled(jobs);
  let bestScore = 0;
  let bestRef: ReferenceTitle | null = null;
  for (const item of resolved) {
    if (item.status !== "fulfilled") continue;
    if (item.value.ref && item.value.score > bestScore) {
      bestScore = item.value.score;
      bestRef = item.value.ref;
    }
  }
  return bestRef;
}

function getResolverCacheKey(query: string, type: ContentType | ContentType[]): string {
  const normalized = query.trim().toLowerCase().replace(/\s+/g, " ");
  const typeStr = Array.isArray(type) ? [...type].sort().join(",") : type;
  return `${REDIS_KEY_PREFIX}${typeStr}:${normalized}`;
}

/**
 * Resolve implicit reference titles from free-form plain query text.
 * Uses Redis cache for 24h and falls back gracefully to [] on lookup failures.
 */
export async function resolveReferenceTitlesFromQuery(
  query: string,
  type: ContentType | ContentType[],
): Promise<ReferenceTitle[]> {
  const redis = getRedis();
  const cacheKey = getResolverCacheKey(query, type);

  if (redis) {
    try {
      const raw = await redis.get<string>(cacheKey);
      if (raw) {
        const parsed = JSON.parse(raw as string) as ReferenceTitle[];
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // Fall through to live resolve.
    }
  }

  const candidates = extractReferenceCandidatesFromQuery(query);
  if (candidates.length === 0) return [];

  const resolved = await Promise.all(
    candidates.map((c) => resolveSingleCandidate(c, type)),
  );

  const out: ReferenceTitle[] = [];
  for (const item of resolved) {
    if (!item) continue;
    const key = normalizeForMatch(item.title);
    if (!key) continue;
    if (out.some((r) => normalizeForMatch(r.title) === key)) continue;
    out.push(item);
    if (out.length >= MAX_RESOLVED_REFERENCES) break;
  }

  if (redis) {
    try {
      await redis.set(cacheKey, JSON.stringify(out), { ex: CACHE_TTL_SEC });
    } catch {
      // Ignore cache write failures.
    }
  }

  return out;
}
