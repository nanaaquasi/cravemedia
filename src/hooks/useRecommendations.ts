"use client";

import { useState, useCallback } from "react";
import {
  ContentType,
  JourneyResponse,
  RecommendationResponse,
} from "@/lib/types";
import { useLocalStorage } from "./useLocalStorage";

export type RecommendMode = "list" | "journey";

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
    ) => {
      if (!query.trim()) return;
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/recommend", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query, type, mode }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => null);
          throw new Error(errorData?.error || "Failed to get recommendations");
        }

        const data = await response.json();

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
        setError(err instanceof Error ? err.message : "Something went wrong");
      } finally {
        setIsLoading(false);
      }
    },
    [setQueryHistory],
  );

  const clearResults = useCallback(() => {
    setResults(null);
    setJourneyResults(null);
    setError(null);
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
