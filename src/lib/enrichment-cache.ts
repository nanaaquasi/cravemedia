import { getRedis } from "./redis";
import { enrichMovieOrTV } from "./tmdb";
import { enrichAnime } from "./anilist";
import { enrichBook } from "./books";

const ENRICH_TTL_SEC = 24 * 60 * 60; // 24 hours
const REDIS_KEY_PREFIX = "enrich:";

export interface EnrichmentResult {
  posterUrl: string | null;
  rating: number | null;
  runtime: string | null;
  externalId: string | null;
}

function normalize(str: string): string {
  return str.trim().toLowerCase().replace(/\s+/g, " ");
}

async function getCachedEnrichment(key: string): Promise<EnrichmentResult | null> {
  const redis = getRedis();
  if (!redis) return null;
  try {
    const raw = await redis.get<string>(key);
    if (raw) {
      return JSON.parse(raw as string) as EnrichmentResult;
    }
  } catch {
    // Fall through
  }
  return null;
}

async function setCachedEnrichment(key: string, data: EnrichmentResult): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  try {
    await redis.set(key, JSON.stringify(data), { ex: ENRICH_TTL_SEC });
  } catch {
    // Ignore cache write errors
  }
}

export async function cachedEnrichMovieOrTV(
  title: string,
  year: number,
  type: "movie" | "tv",
): Promise<EnrichmentResult> {
  const normalizedTitle = normalize(title);
  const yearNum = typeof year === "number" ? year : Number(year) || 0;
  const key = `${REDIS_KEY_PREFIX}tmdb:${type}:${normalizedTitle}:${yearNum}`;

  const cached = await getCachedEnrichment(key);
  if (cached) return cached;

  const result = await enrichMovieOrTV(title, year, type);
  await setCachedEnrichment(key, result);
  return result;
}

export async function cachedEnrichAnime(
  title: string,
  year: number,
): Promise<EnrichmentResult> {
  const normalizedTitle = normalize(title);
  const yearNum = typeof year === "number" ? year : Number(year) || 0;
  const key = `${REDIS_KEY_PREFIX}anilist:${normalizedTitle}:${yearNum}`;

  const cached = await getCachedEnrichment(key);
  if (cached) return cached;

  const result = await enrichAnime(title, year);
  await setCachedEnrichment(key, result);
  return result;
}

export async function cachedEnrichBook(
  title: string,
  author: string,
): Promise<EnrichmentResult> {
  const normalizedTitle = normalize(title);
  const normalizedAuthor = normalize(author);
  const key = `${REDIS_KEY_PREFIX}book:${normalizedTitle}:${normalizedAuthor}`;

  const cached = await getCachedEnrichment(key);
  if (cached) return cached;

  const result = await enrichBook(title, author);
  await setCachedEnrichment(key, result);
  return result;
}
