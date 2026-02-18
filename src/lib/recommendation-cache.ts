import {
  ContentType,
  JourneyResponse,
  RecommendationResponse,
} from "./types";

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const MAX_ENTRIES = 200;

type CacheMode = "list" | "journey";

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

/** In-memory LRU-style cache for recommendation responses */
const listCache = new Map<string, CacheEntry<RecommendationResponse>>();
const journeyCache = new Map<string, CacheEntry<JourneyResponse>>();
const accessOrder: string[] = [];

function getCacheKey(query: string, type: ContentType, mode: CacheMode): string {
  const normalized = query.trim().toLowerCase().replace(/\s+/g, " ");
  return `${mode}:${type}:${normalized}`;
}

function evictIfNeeded(): void {
  const totalSize = listCache.size + journeyCache.size;
  if (totalSize < MAX_ENTRIES) return;
  while (accessOrder.length > 0 && listCache.size + journeyCache.size >= MAX_ENTRIES) {
    const key = accessOrder.shift();
    if (key) {
      listCache.delete(key);
      journeyCache.delete(key);
    }
  }
}

export function getCachedRecommendation(
  query: string,
  type: ContentType,
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
  type: ContentType,
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
  type: ContentType,
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
  type: ContentType,
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
