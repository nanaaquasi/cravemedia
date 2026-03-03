"use client";

import { saveJourneyData } from "@/app/actions/journey";

import { useState, useCallback, useEffect, useMemo, Suspense } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import { ContentType, EnrichedRecommendation, JourneyItem } from "@/lib/types";
import { useRecommendations, RecommendMode } from "@/hooks/useRecommendations";
import { useSession } from "@/context/SessionContext";
import { useLists } from "@/hooks/useLists";
import { getJourneyIdFromResults } from "@/hooks/useJourneyProgress";
import ContentTypeSelector from "@/components/ContentTypeSelector";
import RecommendationItem from "@/components/RecommendationItem";
import JourneyPath from "@/components/JourneyPath";
import CuratingLoader from "@/components/CuratingLoader";
import FloatingSearchButton from "@/components/FloatingSearchButton";
import RefineBar from "@/components/RefineBar";
import Toast from "@/components/Toast";
import SaveJourneyModal from "@/components/SaveJourneyModal";
import SaveCollectionModal from "@/components/SaveCollectionModal";
import ShareModal from "@/components/ShareModal";
import AddToCollectionModal from "@/components/AddToCollectionModal";
import { VALID_CONTENT_TYPES } from "@/config/media-types";

// ...

function SearchContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const [saveToast, setSaveToast] = useState<string | null>(null);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [isSaveCollectionModalOpen, setIsSaveCollectionModalOpen] =
    useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareConfig, setShareConfig] = useState<{
    url: string;
    title: string;
  } | null>(null);
  const [itemToAdd, setItemToAdd] = useState<EnrichedRecommendation | null>(
    null,
  );
  const [savedCollectionId, setSavedCollectionId] = useState<string | null>(
    null,
  );
  const [showImmersiveLoader, setShowImmersiveLoader] = useState(false);
  const { user } = useSession();

  const { results, journeyResults, isLoading, error, fetchRecommendations } =
    useRecommendations();
  const { createList, refreshLists } = useLists();

  const q = searchParams.get("q");
  const typeParam = searchParams.get("type");
  const modeParam = searchParams.get("mode");

  const contentType = useMemo(() => {
    if (!typeParam) return "all" as ContentType;
    if (typeParam.includes(",")) {
      const parts = typeParam
        .split(",")
        .filter((t) =>
          VALID_CONTENT_TYPES.includes(t as ContentType),
        ) as ContentType[];
      return parts.length > 0 ? parts : ("all" as ContentType);
    }
    return (
      VALID_CONTENT_TYPES.includes(typeParam as ContentType) ? typeParam : "all"
    ) as ContentType | ContentType[];
  }, [typeParam]);

  const viewMode: RecommendMode = modeParam === "journey" ? "journey" : "list";

  const isAnyLoading = isLoading;

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isAnyLoading) {
      timer = setTimeout(() => setShowImmersiveLoader(true), 500);
    } else {
      setShowImmersiveLoader((prev) => (prev ? false : prev));
    }
    return () => clearTimeout(timer);
  }, [isAnyLoading]);

  useEffect(() => {
    if (!q || !typeParam) {
      router.replace("/");
      return;
    }
    const controller = new AbortController();
    fetchRecommendations(q, contentType, viewMode, {
      signal: controller.signal,
    });
    return () => {
      controller.abort();
    };
  }, [q, typeParam, contentType, viewMode, fetchRecommendations, router]);

  // Clear saved collection when search changes (new results)
  useEffect(() => {
    setSavedCollectionId(null);
  }, [q, typeParam]);

  const updateSearchParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(updates).forEach(([key, value]) => {
        if (value === null) {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      });
      router.replace(`${pathname}?${params.toString()}`);
    },
    [searchParams, router, pathname],
  );

  const handleContentTypeChange = useCallback(
    (newType: ContentType | ContentType[]) => {
      const typeStr = Array.isArray(newType) ? newType.join(",") : newType;
      updateSearchParams({ type: typeStr });
    },
    [updateSearchParams],
  );

  const handleAuthGuard = useCallback(() => {
    if (!user) {
      const currentUrl = `${pathname}?${searchParams.toString()}`;
      router.push(`/login?next=${encodeURIComponent(currentUrl)}`);
      return false;
    }
    return true;
  }, [user, pathname, searchParams, router]);

  const handleAddToList = useCallback(
    (item: EnrichedRecommendation | JourneyItem) => {
      if (!handleAuthGuard()) return;
      setItemToAdd(item as EnrichedRecommendation);
    },
    [handleAuthGuard],
  );

  const handleSaveAll = useCallback(() => {
    if (!handleAuthGuard()) return;
    setIsSaveCollectionModalOpen(true);
  }, [handleAuthGuard]);

  const handleConfirmSaveCollection = useCallback(
    async ({ title, description }: { title: string; description?: string }) => {
      if (results) {
        setSaveToast("Saving cravelist...");
        try {
          const saved = await createList(
            title,
            description || "",
            results.items,
          );
          if (saved) {
            setSavedCollectionId(saved.id);
            setSaveToast(`Saved "${title}" with ${results.items.length} items`);
            await refreshLists();
          } else {
            setSaveToast("Failed to save cravelist");
          }
        } catch {
          setSaveToast("Failed to save cravelist");
        }
        setTimeout(() => setSaveToast(null), 2500);
      }
    },
    [results, createList, refreshLists],
  );

  const handleSaveJourney = useCallback(() => {
    if (!handleAuthGuard()) return;
    setIsSaveModalOpen(true);
  }, [handleAuthGuard]);

  const handleConfirmSaveJourney = useCallback(
    async ({
      title,
      goalAmount,
      goalUnit,
    }: {
      title: string;
      goalAmount?: number;
      goalUnit?: string;
    }) => {
      if (journeyResults && q) {
        // Show saving state
        setSaveToast("Saving journey...");

        try {
          const rawResult = await saveJourneyData({
            title,
            query: q,
            goal_amount: goalAmount,
            goal_unit: goalUnit,
            results: journeyResults,
          });

          const result = rawResult as {
            success: boolean;
            journeyId?: string;
            error?: any;
          };

          if (result.success) {
            setSaveToast(`Saved "${title}" to your profile`);
            // Refresh the lists (sidebar) to show the new journey
            await refreshLists();
          } else {
            setSaveToast(`Error: ${result.error}`);
          }
        } catch {
          setSaveToast("Failed to save journey");
        }

        setTimeout(() => setSaveToast(null), 2500);
      }
    },
    [journeyResults, q, refreshLists],
  );

  const handleShareJourney = useCallback(async () => {
    if (!journeyResults || !q) return;

    setSaveToast("Preparing link...");

    try {
      // 1. Save it implicitly (if it fails, it fails, but we try)
      const rawResult = await saveJourneyData({
        title: journeyResults.journeyTitle,
        query: q,
        results: journeyResults,
        is_public: true, // Auto-make it public so guests can view
      });

      const result = rawResult as {
        success: boolean;
        journeyId?: string;
        error?: any;
      };

      if (result.success && result.journeyId) {
        // We have a persisted journey ID
        const url = `${window.location.origin}/journey/${result.journeyId}`;
        setShareConfig({ url, title: journeyResults.journeyTitle });
        setIsShareModalOpen(true);
        setSaveToast(null);
      } else {
        throw new Error(String(result.error) || "Failed to generate link");
      }
    } catch (e: unknown) {
      console.error(e);
      setSaveToast("Failed to prepare sharing link.");
      setTimeout(() => setSaveToast(null), 2500);
    }
  }, [journeyResults, q]);

  const handleShareCollection = useCallback(async () => {
    if (!results) return;

    setSaveToast("Preparing link...");

    try {
      // 1. Save it implicitly
      const result = await createList(
        results.collectionTitle || "My List",
        results.collectionDescription || "",
        results.items,
        {
          isPublic: true,
          isExplicitlySaved: false,
        },
      );

      if (result && result.id) {
        // We have a persisted collection ID
        const url = `${window.location.origin}/collections/${result.id}`;
        setShareConfig({ url, title: result.name });
        setIsShareModalOpen(true);
        setSaveToast(null);
      } else {
        throw new Error("Failed to generate link");
      }
    } catch (e: unknown) {
      console.error(e);
      setSaveToast("Failed to prepare sharing link.");
      setTimeout(() => setSaveToast(null), 2500);
    }
  }, [results, createList]);

  const handleViewModeChange = useCallback(
    (mode: RecommendMode) => {
      if (mode === viewMode) return;
      updateSearchParams({ mode });
    },
    [viewMode, updateSearchParams],
  );

  const handleRefine = useCallback(
    (feedback: string) => {
      if (!q) return;
      const refinedQuery = `${q} (refine: ${feedback})`;
      updateSearchParams({ q: refinedQuery });
    },
    [q, updateSearchParams],
  );

  const handleRefresh = useCallback(() => {
    if (!q) return;
    const excludeTitles =
      viewMode === "list" && results
        ? results.items.map((i) => i.title)
        : viewMode === "journey" && journeyResults
          ? journeyResults.items.map((i) => i.title)
          : [];
    fetchRecommendations(q, contentType, viewMode, { excludeTitles });
  }, [q, contentType, viewMode, results, journeyResults, fetchRecommendations]);

  const handleMoreLikeThis = useCallback(
    (item: EnrichedRecommendation | JourneyItem) => {
      const typeLabel =
        {
          book: "books",
          tv: "TV shows",
          movie: "movies",
          anime: "anime",
        }[item.type as string] || "media";
      const query = `More ${typeLabel} like "${item.title}" by ${item.creator}`;
      const itemType = item.type;
      const params = new URLSearchParams({ q: query, type: itemType });
      router.replace(`${pathname}?${params.toString()}`);
    },
    [router, pathname],
  );

  const filteredItems = useMemo(() => {
    if (!results) return [];
    if (contentType === "all") return results.items;
    const types = Array.isArray(contentType) ? contentType : [contentType];
    return results.items.filter((item) => types.includes(item.type));
  }, [results, contentType]);

  return (
    <main className="min-h-screen flex flex-col relative">
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

          <AnimatePresence>
            {showImmersiveLoader && (
              <CuratingLoader mode={viewMode} mediaType={contentType} />
            )}
          </AnimatePresence>

          {error && !results && !journeyResults && (
            <div className="flex-1 flex flex-col justify-center items-center min-h-0">
              <div className="text-center py-16 sm:py-20 px-4 sm:px-6 animate-fade-in-up">
                <p className="text-3xl mb-3">😵</p>
                <p className="text-[var(--text-secondary)] text-base mb-1">
                  {error}
                </p>
                <button
                  onClick={() =>
                    fetchRecommendations(q ?? "", contentType, viewMode)
                  }
                  className="text-base text-purple-400 hover:text-purple-300 mt-3 cursor-pointer"
                >
                  Try again
                </button>
              </div>
            </div>
          )}

          {viewMode === "list" && results && (
            <div className="flex flex-col lg:flex-row lg:gap-8 lg:min-h-0 lg:flex-1 mt-6 sm:mt-8 animate-fade-in-up">
              {/* Left: List info - sticky on desktop, 5/12 of width */}
              <aside className="lg:flex-[5] lg:min-w-0 lg:sticky lg:top-1/2 lg:-translate-y-1/2 lg:self-start mb-6 lg:mb-0">
                <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-3">
                  {results.collectionTitle}
                </h2>
                <p className="text-sm text-purple-300/80 mb-2 flex items-center gap-1.5">
                  {results.collectionDescription}
                </p>
                <div className="flex flex-wrap items-center gap-3 mb-4">
                  {false && (
                    <ContentTypeSelector
                      selected={contentType}
                      onChange={handleContentTypeChange}
                    />
                  )}
                  <p className="text-base text-[var(--text-muted)]">
                    {filteredItems.length} recommendations
                  </p>
                </div>
                <div className="flex gap-2">
                  {savedCollectionId ? (
                    <button
                      onClick={() =>
                        router.push(`/collections/${savedCollectionId}`)
                      }
                      className="inline-flex items-center gap-2 py-2.5 px-5 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 text-white font-medium text-sm hover:brightness-110 transition-all cursor-pointer shadow-lg shadow-purple-500/25"
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M9 18l6-6-6-6" />
                      </svg>
                      Go to list
                    </button>
                  ) : (
                    <button
                      onClick={handleSaveAll}
                      className="inline-flex py-2.5 px-5 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 text-white font-medium text-sm hover:brightness-110 transition-all cursor-pointer shadow-lg shadow-purple-500/25"
                    >
                      Save list
                    </button>
                  )}
                  {user && (
                    <button
                      onClick={handleShareCollection}
                      className="inline-flex items-center gap-2 py-2.5 px-5 rounded-xl bg-white/5 border border-white/10 text-white font-medium text-sm hover:bg-white/10 transition-all cursor-pointer"
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <circle cx="18" cy="5" r="3"></circle>
                        <circle cx="6" cy="12" r="3"></circle>
                        <circle cx="18" cy="19" r="3"></circle>
                        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
                        <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
                      </svg>
                      Share
                    </button>
                  )}
                </div>
                <div className="mt-4">
                  <RefineBar
                  onRefine={handleRefine}
                  onRefresh={handleRefresh}
                  isLoading={isLoading}
                />
                </div>
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
                      No items matching your selection in this list
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {viewMode === "journey" && journeyResults && (
            <div className="flex-1 flex flex-col min-h-0 mt-6 animate-fade-in-up">
              <JourneyPath
                journey={journeyResults}
                journeyId={getJourneyIdFromResults(
                  journeyResults.journeyTitle,
                  q ?? "",
                  contentType,
                )}
                onSaveJourney={handleSaveJourney}
                onShareJourney={user ? handleShareJourney : undefined}
                onAddToList={handleAddToList}
                onMoreLikeThis={handleMoreLikeThis}
                onRefine={handleRefine}
                onRefresh={handleRefresh}
                isLoading={isLoading}
              />
            </div>
          )}
        </div>
      </div>

      <FloatingSearchButton
        onClick={() => router.push("/")}
        isLoading={isLoading}
        showSpinner={!showImmersiveLoader}
      />

      <Toast message={saveToast} onClose={() => setSaveToast(null)} />

      {journeyResults && (
        <SaveJourneyModal
          isOpen={isSaveModalOpen}
          onClose={() => setIsSaveModalOpen(false)}
          defaultTitle={journeyResults.journeyTitle}
          onConfirm={handleConfirmSaveJourney}
        />
      )}

      {results && (
        <SaveCollectionModal
          isOpen={isSaveCollectionModalOpen}
          onClose={() => setIsSaveCollectionModalOpen(false)}
          defaultTitle={results.collectionTitle}
          defaultDescription={results.collectionDescription}
          onConfirm={handleConfirmSaveCollection}
        />
      )}

      {shareConfig && (
        <ShareModal
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          url={shareConfig.url}
          title={shareConfig.title}
        />
      )}

      <AddToCollectionModal
        isOpen={!!itemToAdd}
        onClose={() => setItemToAdd(null)}
        item={itemToAdd}
      />
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
