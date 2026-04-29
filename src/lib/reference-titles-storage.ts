import type { ContentType, ReferenceTitle } from "./types";

/**
 * SessionStorage-backed pass-through for "Similar To" reference titles.
 *
 * The /search page is reached via URL params (q + type), but rich reference
 * metadata (title, year, type, description, genres) is too large for a clean
 * URL. We stash it under a deterministic key tied to (query + type) so the
 * search page can read it and forward to /api/recommend.
 */

const STORAGE_PREFIX = "ref-titles:";
const TTL_MS = 10 * 60 * 1000; // 10 minutes

interface StoredEntry {
  refs: ReferenceTitle[];
  expiresAt: number;
}

function makeKey(query: string, type: ContentType | ContentType[]): string {
  const normalizedQuery = query.trim().toLowerCase().replace(/\s+/g, " ");
  const typeStr = Array.isArray(type) ? [...type].sort().join(",") : type;
  return `${STORAGE_PREFIX}${typeStr}:${normalizedQuery}`;
}

function safeStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

export function storeReferenceTitles(
  query: string,
  type: ContentType | ContentType[],
  refs: ReferenceTitle[],
): void {
  const storage = safeStorage();
  if (!storage || refs.length === 0) return;
  try {
    const entry: StoredEntry = {
      refs,
      expiresAt: Date.now() + TTL_MS,
    };
    storage.setItem(makeKey(query, type), JSON.stringify(entry));
  } catch {
    // Quota exceeded or serialization error — silently ignore.
  }
}

export function readReferenceTitles(
  query: string,
  type: ContentType | ContentType[],
): ReferenceTitle[] {
  const storage = safeStorage();
  if (!storage) return [];
  const key = makeKey(query, type);
  try {
    const raw = storage.getItem(key);
    if (!raw) return [];
    const entry = JSON.parse(raw) as StoredEntry;
    if (!entry?.refs || Date.now() > entry.expiresAt) {
      storage.removeItem(key);
      return [];
    }
    return entry.refs;
  } catch {
    return [];
  }
}

export function clearReferenceTitles(
  query: string,
  type: ContentType | ContentType[],
): void {
  const storage = safeStorage();
  if (!storage) return;
  try {
    storage.removeItem(makeKey(query, type));
  } catch {
    // Ignore.
  }
}
