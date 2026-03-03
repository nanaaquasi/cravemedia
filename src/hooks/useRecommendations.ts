"use client";

import { useState, useCallback } from "react";
import {
  ContentType,
  JourneyResponse,
  RecommendationResponse,
} from "@/lib/types";
import { useLocalStorage } from "./useLocalStorage";

export type RecommendMode = "list" | "journey";

function getCacheKey(
  query: string,
  type: ContentType | ContentType[],
  mode: RecommendMode,
): string {
  const q = query.trim().toLowerCase().replace(/\s+/g, " ");
  const typeStr = Array.isArray(type) ? [...type].sort().join(",") : type;
  return `${mode}:${typeStr}:${q}`;
}

const MAX_CACHED_SEARCHES = 20;

/** Module-level cache so results survive navigation (e.g. back from media detail) */
const searchResultsCache = new Map<
  string,
  RecommendationResponse | JourneyResponse
>();
const cacheKeyOrder: string[] = [];

function evictCacheIfNeeded() {
  while (cacheKeyOrder.length >= MAX_CACHED_SEARCHES) {
    const oldest = cacheKeyOrder.shift();
    if (oldest) searchResultsCache.delete(oldest);
  }
}

export function useRecommendations() {
  const [results, setResults] = useState<RecommendationResponse | null>(null);
  const [journeyResults, setJourneyResults] = useState<JourneyResponse | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [queryHistory, setQueryHistory] = useLocalStorage<string[]>(
    "query-history",
    [],
  );

  const fetchRecommendations = useCallback(
    async (
      query: string,
      type: ContentType | ContentType[],
      mode: RecommendMode = "list",
      options?: {
        excludeTitles?: string[];
        signal?: AbortSignal;
      },
    ) => {
      if (!query.trim()) return;

      const excludeTitles = options?.excludeTitles ?? [];
      const signal = options?.signal;
      const cacheKey = getCacheKey(query, type, mode);
      const useCache = excludeTitles.length === 0;
      const cached = useCache ? searchResultsCache.get(cacheKey) : undefined;
      if (cached) {
        setError(null);
        if (mode === "journey") {
          setJourneyResults(cached as JourneyResponse);
        } else {
          setResults(cached as RecommendationResponse);
        }
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/recommend", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query, type, mode, excludeTitles }),
          signal,
        });

        if (signal?.aborted) return;

        if (!response.ok) {
          const errorData = await response.json().catch(() => null);
          throw new Error(errorData?.error || "Failed to get recommendations");
        }

        const data = await response.json();

        if (signal?.aborted) return;

        if (!searchResultsCache.has(cacheKey)) {
          evictCacheIfNeeded();
          cacheKeyOrder.push(cacheKey);
        }
        searchResultsCache.set(cacheKey, data);

        setError(null); // Clear any stale error from a prior failed request
        if (mode === "journey") {
          setJourneyResults(data as JourneyResponse);
        } else {
          setResults(data as RecommendationResponse);
        }

        // Save to history (max 20, no duplicates)
        setQueryHistory((prev) => {
          const filtered = prev.filter((q) => q !== query);
          return [query, ...filtered].slice(0, 20);
        });
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;
        if (signal?.aborted) return;
        setError(err instanceof Error ? err.message : "Something went wrong");
      } finally {
        if (!signal?.aborted) {
          setIsLoading(false);
        }
      }
    },
    [setQueryHistory],
  );

  const clearResults = useCallback(() => {
    setResults(null);
    setJourneyResults(null);
    setError(null);
    searchResultsCache.clear();
  }, []);

  return {
    results,
    journeyResults,
    isLoading,
    error,
    queryHistory,
    fetchRecommendations,
    clearResults,
  };
}
