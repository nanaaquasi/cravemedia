import { getRedis } from "./redis";

const EPISODE_TTL_SEC = 7 * 24 * 60 * 60; // 7 days
const REDIS_KEY_PREFIX = "ep:imdb:";

function cacheKey(seriesImdbId: string, season: number, episode: number): string {
  return `${REDIS_KEY_PREFIX}${seriesImdbId}:${season}:${episode}`;
}

export async function getCachedEpisodeRating(
  seriesImdbId: string,
  season: number,
  episode: number,
): Promise<number | null> {
  const redis = getRedis();
  if (!redis) return null;
  try {
    const raw = await redis.get<string>(cacheKey(seriesImdbId, season, episode));
    if (raw == null) return null;
    const n = Number(raw);
    return Number.isNaN(n) ? null : n;
  } catch {
    return null;
  }
}

export async function setCachedEpisodeRating(
  seriesImdbId: string,
  season: number,
  episode: number,
  rating: number,
): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  try {
    await redis.set(cacheKey(seriesImdbId, season, episode), String(rating), {
      ex: EPISODE_TTL_SEC,
    });
  } catch {
    // Ignore cache write errors
  }
}
