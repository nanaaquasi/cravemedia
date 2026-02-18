"use client";

import { useState, useCallback, useEffect, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ContentType, EnrichedRecommendation, JourneyItem } from "@/lib/types";
import { useRecommendations, RecommendMode } from "@/hooks/useRecommendations";
import { useLists } from "@/hooks/useLists";
import { getJourneyIdFromResults } from "@/hooks/useJourneyProgress";
import ContentTypeSelector from "@/components/ContentTypeSelector";
import RecommendationItem from "@/components/RecommendationItem";
import JourneyPath from "@/components/JourneyPath";
import CuratingLoader from "@/components/CuratingLoader";
import FloatingSearchButton from "@/components/FloatingSearchButton";
import RefineBar from "@/components/RefineBar";
import Toast from "@/components/Toast";
import { VALID_CONTENT_TYPES } from "@/config/media-types";

const VALID_TYPES = new Set<ContentType>(VALID_CONTENT_TYPES);

function SearchContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [contentType, setContentType] = useState<ContentType>("all");
  const [saveToast, setSaveToast] = useState<string | null>(null);
  const { results, journeyResults, isLoading, error, fetchRecommendations } =
    useRecommendations();
  const { lists, createList } = useLists();

  const q = searchParams.get("q");
  const type = searchParams.get("type") as ContentType | null;
  const modeParam = searchParams.get("mode");
  const viewMode: RecommendMode = modeParam === "journey" ? "journey" : "list";

  useEffect(() => {
    if (q && type && VALID_TYPES.has(type)) {
      setContentType(type);
      fetchRecommendations(q, type, viewMode);
    } else if (!q || !type) {
      router.replace("/");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-fetch when q/type/viewMode change
  }, [q, type, viewMode]);

  const handleAddToList = useCallback(
    (item: EnrichedRecommendation) => {
      const source = results ?? journeyResults;
      if (source) {
        const name =
          "journeyTitle" in source
            ? source.journeyTitle
            : source.collectionTitle;
        const description =
          "description" in source
            ? source.description
            : source.collectionDescription;
        const existingList = lists.find((l) => l.name === name);
        if (!existingList) {
          createList(name, description, [item]);
        } else {
          createList(name, description, [
            ...existingList.items.filter((i) => i.title !== item.title),
            item,
          ]);
        }
        setSaveToast(`Added "${item.title}" to list`);
        setTimeout(() => setSaveToast(null), 2000);
      }
    },
    [results, journeyResults, lists, createList],
  );

  const handleSaveAll = useCallback(() => {
    if (results) {
      createList(
        results.collectionTitle,
        results.collectionDescription,
        results.items,
      );
      setSaveToast(
        `Saved "${results.collectionTitle}" with ${results.items.length} items`,
      );
      setTimeout(() => setSaveToast(null), 2500);
    }
  }, [results, createList]);

  const handleSaveJourney = useCallback(() => {
    if (journeyResults) {
      createList(
        journeyResults.journeyTitle,
        journeyResults.description,
        journeyResults.items,
        {
          isJourney: true,
          journeyMetadata: journeyResults.items.map((item) => ({
            position: item.position,
            whyThisPosition: item.whyThisPosition,
            whatYoullLearn: item.whatYoullLearn,
            transitionToNext: item.transitionToNext,
            difficultyLevel: item.difficultyLevel,
          })),
        },
      );
      setSaveToast(
        `Saved "${journeyResults.journeyTitle}" with ${journeyResults.items.length} items`,
      );
      setTimeout(() => setSaveToast(null), 2500);
    }
  }, [journeyResults, createList]);

  const handleViewModeChange = useCallback(
    (mode: RecommendMode) => {
      if (mode === viewMode) return;
      if (q && type) {
        const params = new URLSearchParams({ q, type, mode });
        router.replace(`/search?${params.toString()}`);
      }
    },
    [viewMode, q, type, router],
  );

  const handleRefine = useCallback(
    (feedback: string) => {
      if (!q || !type) return;
      const refinedQuery = `${q} (refine: ${feedback})`;
      const params = new URLSearchParams({
        q: refinedQuery,
        type,
        mode: viewMode,
      });
      router.replace(`/search?${params.toString()}`);
    },
    [q, type, viewMode, router],
  );

  const handleMoreLikeThis = useCallback(
    (item: EnrichedRecommendation | JourneyItem) => {
      const query = `More ${item.type === "book" ? "books" : item.type === "tv" ? "TV shows" : "movies"} like "${item.title}" by ${item.creator}`;
      const itemType = item.type;
      const params = new URLSearchParams({ q: query, type: itemType });
      router.replace(`/search?${params.toString()}`);
      setContentType(itemType);
    },
    [router],
  );

  const filteredItems = useMemo(
    () =>
      results && contentType !== "all"
        ? results.items.filter((item) => item.type === contentType)
        : (results?.items ?? []),
    [results, contentType],
  );

  return (
    <main className="min-h-screen flex flex-col relative pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] sm:pl-[max(1.5rem,env(safe-area-inset-left))] sm:pr-[max(1.5rem,env(safe-area-inset-right))]">
      {/* Content area - always show results view on /search */}
      <div className="flex-1 flex flex-col min-h-0 pb-24 sm:pb-28">
        <div className="flex-1 flex flex-col min-h-0 px-4 sm:px-6 md:px-6 lg:px-0 max-w-6xl lg:max-w-7xl xl:max-w-[90rem] mx-auto w-full">
          {/* Back button + View mode toggle */}
          {(results || journeyResults) && (
            <div className="animate-fade-in-up">
              <button
                onClick={() => router.push("/")}
                className="flex items-center gap-1 text-[var(--text-secondary)] hover:text-white text-base mb-4 mt-2 transition-colors cursor-pointer"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <polyline points="15 18 9 12 15 6" />
                </svg>
                New search
              </button>

              {/* List / Journey toggle */}
              <div className="flex items-center justify-center gap-2 mb-4">
                <button
                  onClick={() => handleViewModeChange("list")}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors cursor-pointer ${
                    viewMode === "list"
                      ? "bg-purple-500/30 text-purple-300 border border-purple-500/50"
                      : "bg-white/[0.04] text-[var(--text-muted)] hover:bg-white/[0.08] border border-transparent"
                  }`}
                >
                  List
                </button>
                <button
                  onClick={() => handleViewModeChange("journey")}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors cursor-pointer ${
                    viewMode === "journey"
                      ? "bg-purple-500/30 text-purple-300 border border-purple-500/50"
                      : "bg-white/[0.04] text-[var(--text-muted)] hover:bg-white/[0.08] border border-transparent"
                  }`}
                >
                  Journey
                </button>
              </div>
            </div>
          )}

          {isLoading &&
            (viewMode === "journey" ? !journeyResults : !results) && (
              <CuratingLoader mode={viewMode} />
            )}

          {error && (
            <div className="text-center py-16 sm:py-20 px-4 sm:px-6 animate-fade-in-up">
              <p className="text-3xl mb-3">😵</p>
              <p className="text-[var(--text-secondary)] text-base mb-1">
                {error}
              </p>
              <button
                onClick={() => router.push("/")}
                className="text-base text-purple-400 hover:text-purple-300 mt-3 cursor-pointer"
              >
                Try again
              </button>
            </div>
          )}

          {results &&
            (viewMode === "list" || (viewMode === "journey" && isLoading)) && (
              <div className="animate-fade-in-up flex flex-col lg:flex-row lg:gap-8 lg:min-h-0 lg:flex-1 mt-6 sm:mt-8">
                {/* Left: List info - sticky on desktop, 5/12 of width */}
                <aside className="lg:flex-[5] lg:min-w-0 lg:sticky lg:top-1/2 lg:-translate-y-1/2 lg:self-start mb-6 lg:mb-0">
                  <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-3">
                    {results.collectionTitle}
                  </h2>
                  <p className="text-sm text-purple-300/80 mb-2 flex items-center gap-1.5">
                    {results.collectionDescription}
                  </p>
                  <div className="flex flex-wrap items-center gap-3 mb-4">
                    <ContentTypeSelector
                      selected={contentType}
                      onChange={setContentType}
                    />
                    <p className="text-base text-[var(--text-muted)]">
                      {filteredItems.length} recommendations
                    </p>
                  </div>
                  <button
                    onClick={handleSaveAll}
                    className="inline-flex py-2.5 px-5 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 text-white font-medium text-sm hover:brightness-110 transition-all cursor-pointer shadow-lg shadow-purple-500/25"
                  >
                    Save list
                  </button>
                  <RefineBar onRefine={handleRefine} isLoading={isLoading} />
                </aside>

                {/* Right: Cards grid - 3 per row on desktop, 7/12 of width */}
                <div className="flex-1 lg:flex-[7] lg:min-w-0 lg:overflow-y-auto lg:min-h-0">
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5">
                    {filteredItems.length > 0 ? (
                      filteredItems.map((item, i) => (
                        <RecommendationItem
                          key={`${item.title}-${i}`}
                          item={item}
                          index={i}
                          onAddToList={handleAddToList}
                          onMoreLikeThis={handleMoreLikeThis}
                        />
                      ))
                    ) : (
                      <p className="col-span-full text-center py-12 text-[var(--text-muted)]">
                        No{" "}
                        {contentType === "movie"
                          ? "movies"
                          : contentType === "tv"
                            ? "TV shows"
                            : "books"}{" "}
                        in this list
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

          {journeyResults &&
            (viewMode === "journey" || (viewMode === "list" && isLoading)) && (
              <div className="flex-1 flex flex-col min-h-0 mt-6">
                <JourneyPath
                  journey={journeyResults}
                  journeyId={getJourneyIdFromResults(
                    journeyResults.journeyTitle,
                    q ?? "",
                    type ?? "all",
                  )}
                  onSaveJourney={handleSaveJourney}
                  onAddToList={handleAddToList}
                  onMoreLikeThis={handleMoreLikeThis}
                  onRefine={handleRefine}
                  isLoading={isLoading}
                />
              </div>
            )}
        </div>
      </div>

      <FloatingSearchButton
        onClick={() => router.push("/")}
        isLoading={isLoading}
      />

      <Toast message={saveToast} onClose={() => setSaveToast(null)} />
    </main>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={null}>
      <SearchContent />
    </Suspense>
  );
}
