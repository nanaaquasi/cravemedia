"use client";

import { useState, useCallback } from "react";
import {
  ContentType,
  RefineAnswer,
  RefineQuestion,
  RefineResponse,
} from "@/lib/types";

export type RefineStep = "idle" | "loading" | "questions" | "complete";

export function useIntentRefine() {
  const [step, setStep] = useState<RefineStep>("idle");
  const [questions, setQuestions] = useState<RefineQuestion[]>([]);
  const [answers, setAnswers] = useState<RefineAnswer[]>([]);
  const [refinedQuery, setRefinedQuery] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [round, setRound] = useState(0);

  const callRefineAPI = useCallback(
    async (
      query: string,
      type: ContentType | ContentType[],
      previousAnswers: RefineAnswer[],
    ): Promise<RefineResponse | null> => {
      try {
        const minTime = new Promise((resolve) => setTimeout(resolve, 800));
        const request = fetch("/api/refine", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query, type, previousAnswers }),
        });

        const [_, res] = await Promise.all([minTime, request]);

        if (!res.ok) {
          const errorData = await res.json().catch(() => null);
          throw new Error(
            errorData?.error || "Failed to generate follow-up questions",
          );
        }

        return (await res.json()) as RefineResponse;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
        setStep("idle");
        return null;
      }
    },
    [],
  );

  const startRefine = useCallback(
    async (query: string, type: ContentType | ContentType[]) => {
      setStep("loading");
      setError(null);
      setAnswers([]);
      setRefinedQuery(null);
      setRound(1);

      const result = await callRefineAPI(query, type, []);
      if (result) {
        if (result.isComplete && result.refinedQuery) {
          setRefinedQuery(result.refinedQuery);
          setStep("complete");
        } else {
          setQuestions(result.questions);
          setStep("questions");
        }
      }
    },
    [callRefineAPI],
  );

  const submitAnswers = useCallback(
    async (
      query: string,
      type: ContentType | ContentType[],
      newAnswers: RefineAnswer[],
    ) => {
      const allAnswers = [...answers, ...newAnswers];
      setAnswers(allAnswers);
      setStep("loading");
      setRound((r) => r + 1);

      const result = await callRefineAPI(query, type, allAnswers);
      if (result) {
        if (result.isComplete && result.refinedQuery) {
          setRefinedQuery(result.refinedQuery);
          setStep("complete");
        } else {
          setQuestions(result.questions);
          setStep("questions");
        }
      }
    },
    [answers, callRefineAPI],
  );

  const skipRefine = useCallback(() => {
    setStep("idle");
    setQuestions([]);
    setAnswers([]);
    setRefinedQuery(null);
    setRound(0);
  }, []);

  const reset = useCallback(() => {
    setStep("idle");
    setQuestions([]);
    setAnswers([]);
    setRefinedQuery(null);
    setError(null);
    setRound(0);
  }, []);

  return {
    step,
    questions,
    answers,
    refinedQuery,
    error,
    round,
    startRefine,
    submitAnswers,
    skipRefine,
    reset,
  };
}
