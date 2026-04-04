"use client";

import { useState, useEffect } from "react";
import { randomCuratingIndex } from "@/config/curating-loader-messages";

const DEFAULT_INTERVAL_MS = 2800;

/**
 * Cycles through predefined loader lines (same timing as CuratingLoader).
 * When `active` is false, the interval is cleared (e.g. overlay hidden).
 */
export function useRotatingCuratingMessage(
  messages: readonly string[],
  options?: { intervalMs?: number; active?: boolean },
): { message: string; index: number } {
  const intervalMs = options?.intervalMs ?? DEFAULT_INTERVAL_MS;
  const active = options?.active ?? true;

  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!active) return;
    if (messages.length === 0) {
      setIndex(0);
      return;
    }
    if (messages.length === 1) {
      setIndex(0);
      return;
    }
    setIndex(randomCuratingIndex(messages.length));
    const id = setInterval(() => {
      setIndex((i) => randomCuratingIndex(messages.length, i));
    }, intervalMs);
    return () => clearInterval(id);
  }, [active, messages.length, intervalMs]);

  const safeIdx =
    messages.length === 0 ? 0 : Math.min(index, messages.length - 1);
  return {
    message: messages[safeIdx] ?? "",
    index: safeIdx,
  };
}
