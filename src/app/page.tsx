"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ContentType, EnrichedRecommendation } from "@/lib/types";
import { useLists } from "@/hooks/useLists";
import { useIntentRefine } from "@/hooks/useIntentRefine";
import SavedListsPanel from "@/components/SavedListsPanel";
import SearchForm, { SearchMode } from "@/components/SearchForm";
import IntentRefineStep from "@/components/IntentRefineStep";

const SUGGESTION_QUERIES = [
  "Dark psychological thrillers that make you question reality",
  "Cozy feel-good stories for a rainy day",
  "Epic sci-fi world building like Dune",
  "Hidden gems from the 2010s",
  "Stories about found family and belonging",
];

export default function Home() {
  const router = useRouter();
  const [contentType, setContentType] = useState<ContentType>("all");
  const [showSavedLists, setShowSavedLists] = useState(false);
  const [pendingQuery, setPendingQuery] = useState("");
  const [pendingMode, setPendingMode] = useState<SearchMode>("list");
  const [showModeSelect, setShowModeSelect] = useState(false);
  const { lists, deleteList, removeItemFromList, exportListAsText } =
    useLists();
  const refine = useIntentRefine();

  // Navigate to search when refinement completes
  useEffect(() => {
    if (refine.step === "complete") {
      const query = refine.refinedQuery || pendingQuery;
      const params = new URLSearchParams({ q: query, type: contentType });
      if (pendingMode === "journey") {
        params.set("mode", "journey");
      }
      refine.reset();
      router.push(`/search?${params.toString()}`);
    }
  }, [
    refine.step,
    refine.refinedQuery,
    pendingQuery,
    contentType,
    pendingMode,
    router,
    refine,
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
    // Navigate with original query
    const params = new URLSearchParams({ q: pendingQuery, type: contentType });
    if (pendingMode === "journey") {
      params.set("mode", "journey");
    }
    router.push(`/search?${params.toString()}`);
  }, [refine, pendingQuery, contentType, pendingMode, router]);

  const handleMoreLikeThis = useCallback(
    (item: EnrichedRecommendation) => {
      const query = `More ${item.type === "book" ? "books" : item.type === "tv" ? "TV shows" : "movies"} like "${item.title}" by ${item.creator}`;
      const params = new URLSearchParams({ q: query, type: item.type });
      router.push(`/search?${params.toString()}`);
    },
    [router],
  );

  const isRefining = showModeSelect || refine.step !== "idle";

  return (
    <main className="min-h-screen flex flex-col relative pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] sm:pl-[max(1.5rem,env(safe-area-inset-left))] sm:pr-[max(1.5rem,env(safe-area-inset-right))]">
      {/* Intent refinement overlay */}
      {isRefining && (
        <IntentRefineStep
          questions={refine.questions}
          round={refine.round}
          isLoading={refine.step === "loading"}
          onSubmitAnswers={(answers) =>
            refine.submitAnswers(pendingQuery, contentType, answers)
          }
          onSkip={handleSkipRefine}
          onModeSelected={handleModeSelected}
          showModeSelect={showModeSelect}
        />
      )}

      {/* Header */}
      <header className="px-4 sm:px-6 md:px-8 py-4 sm:py-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-sm font-bold shadow-lg shadow-purple-500/25">
            C
          </div>
          <span className="text-lg font-semibold tracking-tight">CurateAI</span>
        </div>

        <button
          onClick={() => setShowSavedLists(true)}
          className="relative p-2.5 rounded-full bg-white/[0.04] hover:bg-white/[0.08] transition-colors cursor-pointer"
          aria-label="Saved lists"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" />
          </svg>
          {lists.length > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-purple-500 text-[10px] font-bold flex items-center justify-center">
              {lists.length}
            </span>
          )}
        </button>
      </header>

      {/* "What are you in the mood for?" + Search form - centered */}
      <div className="flex-1 flex flex-col justify-center">
        <div className="text-center max-w-lg mx-auto px-4 sm:px-6 mb-4 sm:mb-6">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
            <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent bg-[length:200%_auto] animate-[gradientShift_6s_ease_infinite]">
              What are you in
            </span>
            <br />
            <span className="text-white">the mood for?</span>
          </h1>
          <p className="text-[var(--text-secondary)] text-lg">
            Discover movies, shows & books
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

      <SavedListsPanel
        lists={lists}
        isOpen={showSavedLists}
        onClose={() => setShowSavedLists(false)}
        onDeleteList={deleteList}
        onRemoveItem={removeItemFromList}
        onExport={exportListAsText}
        onMoreLikeThis={handleMoreLikeThis}
      />
    </main>
  );
}
