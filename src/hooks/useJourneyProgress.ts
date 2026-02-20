"use client";

import { useCallback } from "react";
import { useLocalStorage } from "./useLocalStorage";

export interface JourneyProgress {
  currentPosition: number;
  completed: number[];
}

/** Generate a stable id for a journey from search results (before save) */
export function getJourneyIdFromResults(
  journeyTitle: string,
  query: string,
  type: string | string[],
): string {
  const typeStr = Array.isArray(type) ? type.join(",") : type;
  const slug = `${journeyTitle}:${query}:${typeStr}`
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-:]/g, "")
    .slice(0, 80);
  return slug;
}

export function useJourneyProgress(journeyId: string | null) {
  const [allProgress, setAllProgress] = useLocalStorage<
    Record<string, JourneyProgress>
  >("journey-progress-map", {});

  const progress: JourneyProgress | undefined = journeyId
    ? allProgress[journeyId]
    : undefined;

  const setProgress = useCallback(
    (jid: string, p: JourneyProgress) => {
      setAllProgress((prev) => ({ ...prev, [jid]: p }));
    },
    [setAllProgress],
  );

  const markWatched = useCallback(
    (jid: string, position: number) => {
      setAllProgress((prev) => {
        const current = prev[jid] ?? {
          currentPosition: 1,
          completed: [],
        };
        const completed = current.completed.includes(position)
          ? current.completed
          : [...current.completed, position].sort((a, b) => a - b);
        const nextPosition = Math.max(current.currentPosition, position + 1);
        return {
          ...prev,
          [jid]: {
            currentPosition: nextPosition,
            completed,
          },
        };
      });
    },
    [setAllProgress],
  );

  const getProgressForJourney = useCallback(
    (jid: string): JourneyProgress => {
      return allProgress[jid] ?? { currentPosition: 1, completed: [] };
    },
    [allProgress],
  );

  return {
    progress: journeyId ? getProgressForJourney(journeyId) : undefined,
    setProgress,
    markWatched,
    getProgressForJourney,
  };
}
