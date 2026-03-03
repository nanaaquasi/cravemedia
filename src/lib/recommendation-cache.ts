import { ContentType, JourneyResponse, RecommendationResponse } from "./types";
import { getRedis } from "./redis";

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const CACHE_TTL_SEC = 3600; // 1 hour for Redis
const MAX_ENTRIES = 200;
const REDIS_KEY_PREFIX = "rec:";

type CacheMode = "list" | "journey";

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

/** In-memory LRU-style cache for recommendation responses */
const listCache = new Map<string, CacheEntry<RecommendationResponse>>();
const journeyCache = new Map<string, CacheEntry<JourneyResponse>>();
const accessOrder: string[] = [];

function getCacheKey(
  query: string,
  type: ContentType | ContentType[],
  mode: CacheMode,
): string {
  const normalized = query.trim().toLowerCase().replace(/\s+/g, " ");
  const typeStr = Array.isArray(type) ? type.sort().join(",") : type;
  return `${mode}:${typeStr}:${normalized}`;
}

function evictIfNeeded(): void {
  const totalSize = listCache.size + journeyCache.size;
  if (totalSize < MAX_ENTRIES) return;
  while (
    accessOrder.length > 0 &&
    listCache.size + journeyCache.size >= MAX_ENTRIES
  ) {
    const key = accessOrder.shift();
    if (key) {
      listCache.delete(key);
      journeyCache.delete(key);
    }
  }
}

export function getCachedRecommendation(
  query: string,
  type: ContentType | ContentType[],
): RecommendationResponse | null {
  const key = getCacheKey(query, type, "list");
  const entry = listCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    listCache.delete(key);
    const idx = accessOrder.indexOf(key);
    if (idx >= 0) accessOrder.splice(idx, 1);
    return null;
  }
  const idx = accessOrder.indexOf(key);
  if (idx >= 0) accessOrder.splice(idx, 1);
  accessOrder.push(key);
  return entry.data;
}

export function setCachedRecommendation(
  query: string,
  type: ContentType | ContentType[],
  data: RecommendationResponse,
): void {
  const key = getCacheKey(query, type, "list");
  evictIfNeeded();
  listCache.set(key, {
    data,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
  const idx = accessOrder.indexOf(key);
  if (idx >= 0) accessOrder.splice(idx, 1);
  accessOrder.push(key);
}

export function getCachedJourney(
  query: string,
  type: ContentType | ContentType[],
): JourneyResponse | null {
  const key = getCacheKey(query, type, "journey");
  const entry = journeyCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    journeyCache.delete(key);
    const idx = accessOrder.indexOf(key);
    if (idx >= 0) accessOrder.splice(idx, 1);
    return null;
  }
  const idx = accessOrder.indexOf(key);
  if (idx >= 0) accessOrder.splice(idx, 1);
  accessOrder.push(key);
  return entry.data;
}

export function setCachedJourney(
  query: string,
  type: ContentType | ContentType[],
  data: JourneyResponse,
): void {
  const key = getCacheKey(query, type, "journey");
  evictIfNeeded();
  journeyCache.set(key, {
    data,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
  const idx = accessOrder.indexOf(key);
  if (idx >= 0) accessOrder.splice(idx, 1);
  accessOrder.push(key);
}

/** Redis-backed async get; falls back to in-memory when Redis unavailable */
export async function getCachedRecommendationAsync(
  query: string,
  type: ContentType | ContentType[],
): Promise<RecommendationResponse | null> {
  const key = getCacheKey(query, type, "list");
  const redisKey = REDIS_KEY_PREFIX + key;

  const redis = getRedis();
  if (redis) {
    try {
      const raw = await redis.get<string>(redisKey);
      if (raw) {
        const parsed = JSON.parse(raw as string) as RecommendationResponse;
        return parsed;
      }
    } catch {
      // Fall through to in-memory
    }
  }

  return getCachedRecommendation(query, type);
}

/** Redis-backed async set; also writes to in-memory fallback */
export async function setCachedRecommendationAsync(
  query: string,
  type: ContentType | ContentType[],
  data: RecommendationResponse,
): Promise<void> {
  setCachedRecommendation(query, type, data);

  const redis = getRedis();
  if (redis) {
    try {
      const redisKey = REDIS_KEY_PREFIX + getCacheKey(query, type, "list");
      await redis.set(redisKey, JSON.stringify(data), { ex: CACHE_TTL_SEC });
    } catch {
      // In-memory already set
    }
  }
}

/** Redis-backed async get; falls back to in-memory when Redis unavailable */
export async function getCachedJourneyAsync(
  query: string,
  type: ContentType | ContentType[],
): Promise<JourneyResponse | null> {
  const key = getCacheKey(query, type, "journey");
  const redisKey = REDIS_KEY_PREFIX + key;

  const redis = getRedis();
  if (redis) {
    try {
      const raw = await redis.get<string>(redisKey);
      if (raw) {
        const parsed = JSON.parse(raw as string) as JourneyResponse;
        return parsed;
      }
    } catch {
      // Fall through to in-memory
    }
  }

  return getCachedJourney(query, type);
}

/** Redis-backed async set; also writes to in-memory fallback */
export async function setCachedJourneyAsync(
  query: string,
  type: ContentType | ContentType[],
  data: JourneyResponse,
): Promise<void> {
  setCachedJourney(query, type, data);

  const redis = getRedis();
  if (redis) {
    try {
      const redisKey = REDIS_KEY_PREFIX + getCacheKey(query, type, "journey");
      await redis.set(redisKey, JSON.stringify(data), { ex: CACHE_TTL_SEC });
    } catch {
      // In-memory already set
    }
  }
}
