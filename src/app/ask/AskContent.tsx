"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { track } from "@vercel/analytics";
import { ContentType, EnrichedRecommendation } from "@/lib/types";
import { useIntentRefine } from "@/hooks/useIntentRefine";
import SearchForm, { SearchMode } from "@/components/SearchForm";
import IntentRefineStep from "@/components/IntentRefineStep";
import SimilarToModal from "@/components/SimilarToModal";
import { ENABLED_MEDIA_TYPES } from "@/config/media-types";
import { ensureQueryReflectsTypes } from "@/lib/query-utils";
import {
  HERO_POSTERS,
  PLACEHOLDER_PROMPTS,
  HERO_LABEL,
} from "@/config/home-page";
import { MOOD_CARDS, SURPRISE_QUERIES } from "@/config/home-sections";

function inferContentTypesFromQuery(
  query: string,
): ContentType | ContentType[] {
  const q = query.toLowerCase();
  const matched: ContentType[] = [];

  if (/\b(movie|movies|film|films)\b/.test(q)) matched.push("movie");
  if (/\b(tv|television|show|shows|series)\b/.test(q)) matched.push("tv");
  if (/\b(book|books|read|reading)\b/.test(q)) matched.push("book");
  if (/\b(anime|manga)\b/.test(q)) matched.push("anime");

  const filtered = matched.filter((t) =>
    ENABLED_MEDIA_TYPES.includes(t as "movie" | "tv" | "book" | "anime"),
  );

  if (filtered.length === 0) return "all";
  if (filtered.length === 1) return filtered[0];
  return filtered;
}

export default function AskContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQueryHandled = useRef(false);
  const [contentType, setContentType] = useState<ContentType | ContentType[]>(
    "all",
  );
  const [pendingQuery, setPendingQuery] = useState("");
  const [pendingMode, setPendingMode] = useState<SearchMode>("list");
  const [showTypeSelect, setShowTypeSelect] = useState(false);
  const [showModeSelect, setShowModeSelect] = useState(false);
  const [isSimilarToModalOpen, setIsSimilarToModalOpen] = useState(false);
  const [initialTypeSelection, setInitialTypeSelection] = useState<
    ContentType | ContentType[]
  >("all");
  const refine = useIntentRefine();
  const [isNavigating, setIsNavigating] = useState(false);

  useEffect(() => {
    router.prefetch("/search");
  }, [router]);

  const handleSubmit = useCallback((query: string) => {
    track("Search", { query: query.trim() });
    setPendingQuery(query);
    const inferred = inferContentTypesFromQuery(query);
    setInitialTypeSelection(inferred);
    setContentType(inferred);
    setShowTypeSelect(true);
  }, []);

  const qParam = searchParams.get("q");
  useEffect(() => {
    if (qParam && !initialQueryHandled.current) {
      initialQueryHandled.current = true;
      handleSubmit(qParam);
    }
  }, [qParam, handleSubmit]);

  useEffect(() => {
    if (refine.step === "complete" && !isNavigating) {
      setIsNavigating(true);
      let query = refine.refinedQuery || pendingQuery;
      query = ensureQueryReflectsTypes(query, contentType);

      const typeStr = Array.isArray(contentType)
        ? contentType.join(",")
        : contentType;
      const params = new URLSearchParams({ q: query, type: typeStr });
      if (pendingMode === "journey") params.set("mode", "journey");
      router.push(`/search?${params.toString()}`);
    }
  }, [
    refine.step,
    refine.refinedQuery,
    pendingQuery,
    contentType,
    pendingMode,
    router,
    isNavigating,
  ]);

  const handleTypeSelected = useCallback(
    (type: ContentType | ContentType[]) => {
      setContentType(type);
      setShowTypeSelect(false);
      setShowModeSelect(true);
    },
    [],
  );

  const handleModeSelected = useCallback(
    (mode: SearchMode) => {
      track("Mode Selected", { mode });
      setPendingMode(mode);
      setShowModeSelect(false);
      refine.startRefine(pendingQuery, contentType);
    },
    [refine, pendingQuery, contentType],
  );

  const handleSimilarToFind = useCallback(
    (params: {
      items: EnrichedRecommendation[];
      mood?: string;
      mode: SearchMode;
      type: ContentType;
      synthesizedQuery: string;
    }) => {
      setPendingQuery(params.synthesizedQuery);
      setContentType(params.type);
      setPendingMode(params.mode);
      setShowTypeSelect(false);
      setShowModeSelect(false);
      setInitialTypeSelection(params.type);
      setIsSimilarToModalOpen(false);
      refine.startRefine(params.synthesizedQuery, params.type);
    },
    [refine],
  );

  const handleBackToTypeSelect = useCallback(() => {
    setShowModeSelect(false);
    setShowTypeSelect(true);
  }, []);

  const handleBackToModeSelect = useCallback(() => {
    refine.reset();
    setShowModeSelect(true);
  }, [refine]);

  const handleCancelRefine = useCallback(() => {
    refine.reset();
    setPendingQuery("");
    setShowTypeSelect(false);
    setShowModeSelect(false);
    setIsNavigating(false);
    initialQueryHandled.current = false;
    router.replace("/", { scroll: false });
  }, [refine, router]);

  const handleSkipRefine = useCallback(async () => {
    track("Intent Refine Skipped");
    refine.skipRefine();
    setShowModeSelect(false);
    setIsNavigating(true);

    let query = ensureQueryReflectsTypes(pendingQuery, contentType);
    const typeStr = Array.isArray(contentType)
      ? contentType.join(",")
      : contentType;
    const params = new URLSearchParams({ q: query, type: typeStr });
    if (pendingMode === "journey") params.set("mode", "journey");
    router.push(`/search?${params.toString()}`);
  }, [refine, pendingQuery, contentType, pendingMode, router]);

  const isRefining =
    showTypeSelect || showModeSelect || refine.step !== "idle" || isNavigating;

  return (
    <main className="flex-1 flex flex-col relative">
      {isRefining && (
        <IntentRefineStep
          questions={refine.questions}
          round={refine.round}
          isLoading={refine.step === "loading" || isNavigating}
          onSubmitAnswers={(answers) => {
            track("Intent Refine Completed", {
              questionCount: answers.length,
            });
            refine.submitAnswers(pendingQuery, contentType, answers);
          }}
          onSkip={handleSkipRefine}
          onCancel={handleCancelRefine}
          onBackToTypeSelect={handleBackToTypeSelect}
          onBackToModeSelect={handleBackToModeSelect}
          onModeSelected={handleModeSelected}
          onTypeSelected={handleTypeSelected}
          showTypeSelect={showTypeSelect}
          showModeSelect={showModeSelect}
          initialTypeSelection={contentType}
          initialQuery={pendingQuery}
          selectedType={contentType}
          selectedMode={pendingMode}
          previousAnswers={refine.answers}
        />
      )}

      <div className="flex flex-col justify-center relative min-h-[calc(100dvh-8rem)] shrink-0">
        <div
          className="absolute inset-0 pointer-events-none motion-reduce:opacity-0"
          aria-hidden
        >
          {HERO_POSTERS.map((src, i) => (
            <div
              key={i}
              className="absolute w-32 h-48 md:w-40 md:h-60 opacity-[0.07] blur-2xl"
              style={{
                left: `${12 + i * 18}%`,
                top: `${20 + (i % 3) * 25}%`,
              }}
            >
              <Image
                src={src}
                alt=""
                fill
                className="object-cover rounded-lg"
                sizes="160px"
                priority
              />
            </div>
          ))}
        </div>
        <div className="relative z-10 flex flex-col items-center">
          <div className="text-center w-full max-w-3xl mx-auto px-1 md:px-6 lg:px-8 xl:px-10 mb-2 mt-10">
            <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">
              <span className="text-white">Ask Craveo</span>
              <br />
              <span className="bg-linear-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent bg-size-[200%_auto] animate-[gradientShift_6s_ease_infinite]">
                what to watch or read next
              </span>
            </h1>
            <p className="text-(--text-secondary) text-base md:text-md leading-relaxed px-6 md:px-3 mb-6">
              Describe what you&apos;re in the mood for — in plain English.
            </p>
          </div>

          <SearchForm
            onSubmit={handleSubmit}
            isLoading={false}
            placeholderPrompts={PLACEHOLDER_PROMPTS}
            labelText={HERO_LABEL}
            onSimilarToClick={() => setIsSimilarToModalOpen(true)}
          />
        </div>
      </div>

      <SimilarToModal
        isOpen={isSimilarToModalOpen}
        onClose={() => setIsSimilarToModalOpen(false)}
        onFindSimilar={handleSimilarToFind}
      />

      <div className="hidden relative pt-0 sm:pt-8 pb-16">
        <section className="flex flex-col items-center">
          <h2 className="text-xl sm:text-2xl font-bold text-white mb-4">
            For Every Mood, Every Moment
          </h2>
          <p className="text-zinc-400 text-sm sm:text-base text-center mb-6">
            No doomscrolling. Recommendations that actually match your vibe.
          </p>
          <div className="w-full max-w-4xl flex flex-wrap justify-center gap-2 sm:gap-3 mb-6">
            {MOOD_CARDS.map((mood) => (
              <div key={mood.label} className="group/mood relative">
                <div
                  className="absolute -inset-[6px] rounded-full opacity-0 group-hover/mood:opacity-100 transition-opacity duration-500 pointer-events-none"
                  style={{
                    background: mood.gradient,
                    filter: "blur(24px)",
                  }}
                  aria-hidden
                />
                <button
                  type="button"
                  onClick={() => handleSubmit(mood.query)}
                  className="relative z-10 rounded-full liquid-glass-strong overflow-visible border border-white/10 group-hover/mood:border-white/20 group-hover/mood:bg-white/5 text-white text-base sm:text-lg font-medium transition-all group-hover/mood:scale-[1.02] group-hover/mood:translate-y-[-2px] px-6 py-3.5 sm:px-8 sm:py-4 cursor-pointer"
                >
                  {mood.label}
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() =>
              handleSubmit(
                SURPRISE_QUERIES[
                  Math.floor(Math.random() * SURPRISE_QUERIES.length)
                ],
              )
            }
            className="flex items-center gap-3 px-8 py-4 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 text-white text-lg font-medium transition-all shadow-lg shadow-purple-500/25 cursor-pointer"
          >
            <span className="text-xl">✦</span>
            Surprise me
          </button>
        </section>
      </div>
    </main>
  );
}
