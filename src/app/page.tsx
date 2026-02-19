"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ContentType, EnrichedRecommendation } from "@/lib/types";
import { useIntentRefine } from "@/hooks/useIntentRefine";
import SearchForm, { SearchMode } from "@/components/SearchForm";
import IntentRefineStep from "@/components/IntentRefineStep";

const ROTATING_WORDS = [
  "craving?",
  "in the mood for?",
  "looking for?",
  "obsessed with?",
];

const SUGGESTION_QUERIES = [
  "Movies to watch after a hard day's work",
  "Dark psychological thrillers that make you question reality",
  "Cozy feel-good stories for a rainy day",
  "Epic sci-fi world building like Dune",
  "Hidden gems from the 2010s",
  "Stories about found family and belonging",
  "Movies that will make you cry",
  "TV shows that will get you hooked immediately",
  "Spiciest books to read",
  "I just finished The Bear and need something similar",
  "Christopher Nolan movies",
  "Movies like The Matrix",
  "TV shows like The Office",
  "Books like Harry Potter",
];

export default function Home() {
  const router = useRouter();
  const [contentType, setContentType] = useState<ContentType>("all");
  const [pendingQuery, setPendingQuery] = useState("");
  const [pendingMode, setPendingMode] = useState<SearchMode>("list");
  const [showModeSelect, setShowModeSelect] = useState(false);
  const refine = useIntentRefine();

  // Cycling headline word
  const [wordIndex, setWordIndex] = useState(0);
  const [isFading, setIsFading] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);

  useEffect(() => {
    // Prefetch search page for faster transition
    router.prefetch("/search");

    const interval = setInterval(() => {
      setIsFading(true);
      setTimeout(() => {
        setWordIndex((i) => (i + 1) % ROTATING_WORDS.length);
        setIsFading(false);
      }, 400);
    }, 3000);
    return () => clearInterval(interval);
  }, [router]);

  // Navigate to search when refinement completes
  useEffect(() => {
    if (refine.step === "complete" && !isNavigating) {
      setIsNavigating(true);
      const query = refine.refinedQuery || pendingQuery;
      const params = new URLSearchParams({ q: query, type: contentType });
      if (pendingMode === "journey") {
        params.set("mode", "journey");
      }

      router.push(`/search?${params.toString()}`);

      // Cleanup refine state only after delay/unmount to prevent flash
      // The component will unmount on navigation, so this timeout acts as a backup
      setTimeout(() => {
        if (window.location.pathname === "/") {
          setIsNavigating(false);
          refine.reset();
        }
      }, 2000);
    }
  }, [
    refine.step,
    refine.refinedQuery,
    pendingQuery,
    contentType,
    pendingMode,
    router,
    refine,
    isNavigating,
  ]);

  // Step 1: User submits a query → show mode selection (static, no AI call)
  const handleSubmit = useCallback((query: string, type: ContentType) => {
    setPendingQuery(query);
    setContentType(type);
    setShowModeSelect(true);
  }, []);

  // Step 2: User picks List or Journey → start AI refine flow
  const handleModeSelected = useCallback(
    (mode: SearchMode) => {
      setPendingMode(mode);
      setShowModeSelect(false);
      refine.startRefine(pendingQuery, contentType);
    },
    [refine, pendingQuery, contentType],
  );

  const handleSkipRefine = useCallback(() => {
    refine.skipRefine();
    setShowModeSelect(false);
    setIsNavigating(true);
    // Navigate with original query
    const params = new URLSearchParams({ q: pendingQuery, type: contentType });
    if (pendingMode === "journey") {
      params.set("mode", "journey");
    }
    router.push(`/search?${params.toString()}`);
  }, [refine, pendingQuery, contentType, pendingMode, router]);

  const isRefining = showModeSelect || refine.step !== "idle" || isNavigating;

  return (
    <main className="flex-1 flex flex-col relative pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] sm:pl-[max(1.5rem,env(safe-area-inset-left))] sm:pr-[max(1.5rem,env(safe-area-inset-right))]">
      {/* Intent refinement overlay */}
      {isRefining && (
        <IntentRefineStep
          questions={refine.questions}
          round={refine.round}
          isLoading={refine.step === "loading" || isNavigating}
          onSubmitAnswers={(answers) =>
            refine.submitAnswers(pendingQuery, contentType, answers)
          }
          onSkip={handleSkipRefine}
          onModeSelected={handleModeSelected}
          showModeSelect={showModeSelect}
        />
      )}

      {/* "What are you craving?" + Search form - centered */}
      <div className="flex-1 flex flex-col justify-center">
        <div className="text-center w-full max-w-3xl mx-auto px-4 sm:px-6 mb-2 sm:mb-6">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
            <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent bg-[length:200%_auto] animate-[gradientShift_6s_ease_infinite]">
              What are you
            </span>
            <br />
            <span
              className={`text-white inline-block transition-all duration-400 ${isFading ? "opacity-0 translate-y-2" : "opacity-100 translate-y-0"}`}
            >
              {ROTATING_WORDS[wordIndex]}
            </span>
          </h1>
          <p className="text-[var(--text-secondary)] text-base leading-relaxed max-w-md mx-auto px-4 sm:px-0">
            Discover your next favorite show, movie, or book through
            personalized journeys that actually make sense.
          </p>
        </div>

        <SearchForm
          onSubmit={handleSubmit}
          isLoading={false}
          selectedType={contentType}
          onTypeChange={setContentType}
          quickSuggestions={SUGGESTION_QUERIES}
        />
      </div>
    </main>
  );
}
