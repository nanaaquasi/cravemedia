"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { track } from "@vercel/analytics";
import { ContentType } from "@/lib/types";
import { useIntentRefine } from "@/hooks/useIntentRefine";
import SearchForm, { SearchMode } from "@/components/SearchForm";
import IntentRefineStep from "@/components/IntentRefineStep";
import { HomeSections } from "@/components/HomeSections";
import { ENABLED_MEDIA_TYPES } from "@/config/media-types";
import {
  HERO_POSTERS,
  ROTATING_WORDS,
  PLACEHOLDER_PROMPTS,
} from "@/config/home-page";

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

type FeaturedCollection = import("@/lib/supabase/types").Collection & {
  items?: { image_url: string | null }[];
  item_count?: number;
};

export default function Home() {
  const router = useRouter();
  const [contentType, setContentType] = useState<ContentType | ContentType[]>(
    "all",
  );
  const [pendingQuery, setPendingQuery] = useState("");
  const [pendingMode, setPendingMode] = useState<SearchMode>("list");
  const [showTypeSelect, setShowTypeSelect] = useState(false);
  const [showModeSelect, setShowModeSelect] = useState(false);
  const [initialTypeSelection, setInitialTypeSelection] = useState<
    ContentType | ContentType[]
  >("all");
  const refine = useIntentRefine();

  // Cycling headline word
  const [wordIndex, setWordIndex] = useState(0);
  const [isFading, setIsFading] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);

  const [pickOfTheDay, setPickOfTheDay] = useState<{
    mediaId: string;
    type: string;
    title: string;
    posterUrl: string;
  } | null>(null);
  const [featuredCollections, setFeaturedCollections] = useState<
    FeaturedCollection[]
  >([]);

  useEffect(() => {
    Promise.all([
      fetch("/api/pick-of-the-day").then((r) => r.json()),
      fetch("/api/featured-collections").then((r) => r.json()),
    ]).then(([pick, featured]) => {
      setPickOfTheDay(pick.mediaId && pick.posterUrl ? pick : null);
      setFeaturedCollections(featured.collections ?? []);
    });
  }, []);

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

  useEffect(() => {
    if (refine.step === "complete" && !isNavigating) {
      setIsNavigating(true);
      const query = refine.refinedQuery || pendingQuery;

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

  // Step 1: User submits a query → show type selection
  const handleSubmit = useCallback((query: string) => {
    track("Search", { query: query.trim() });
    setPendingQuery(query);
    const inferred = inferContentTypesFromQuery(query);
    setInitialTypeSelection(inferred);
    setContentType(inferred);
    setShowTypeSelect(true);
  }, []);

  // Step 2: User picks types → show mode selection
  const handleTypeSelected = useCallback(
    (type: ContentType | ContentType[]) => {
      setContentType(type);
      setShowTypeSelect(false);
      setShowModeSelect(true);
    },
    [],
  );

  // Step 3: User picks List or Journey → start AI refine flow
  const handleModeSelected = useCallback(
    (mode: SearchMode) => {
      track("Mode Selected", { mode });
      setPendingMode(mode);
      setShowModeSelect(false);
      // For refining, we'll pass the first type if multiple, or "all"
      // Alternatively, we could update startRefine to handle multiple types.
      // For now, let's pass it as is and potentially update lib later.
      refine.startRefine(pendingQuery, contentType);
    },
    [refine, pendingQuery, contentType],
  );

  const handleSkipRefine = useCallback(async () => {
    track("Intent Refine Skipped");
    refine.skipRefine();
    setShowModeSelect(false);
    setIsNavigating(true);

    const typeStr = Array.isArray(contentType)
      ? contentType.join(",")
      : contentType;
    const params = new URLSearchParams({ q: pendingQuery, type: typeStr });
    if (pendingMode === "journey") params.set("mode", "journey");
    router.push(`/search?${params.toString()}`);
  }, [refine, pendingQuery, contentType, pendingMode, router]);

  const isRefining =
    showTypeSelect || showModeSelect || refine.step !== "idle" || isNavigating;

  return (
    <main className="flex-1 flex flex-col relative">
      {/* Intent refinement overlay */}
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
          onModeSelected={handleModeSelected}
          onTypeSelected={handleTypeSelected}
          showTypeSelect={showTypeSelect}
          showModeSelect={showModeSelect}
          initialTypeSelection={initialTypeSelection}
          initialQuery={pendingQuery}
          selectedType={showTypeSelect ? initialTypeSelection : contentType}
          selectedMode={showModeSelect ? undefined : pendingMode}
          previousAnswers={refine.answers}
        />
      )}

      {/* "What are you craving?" + Search form - centered in viewport */}
      <div className="flex flex-col justify-center relative min-h-[calc(100dvh-5rem)] shrink-0">
        {/* Floating poster background */}
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
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-4">
              <span className="bg-linear-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent bg-size-[200%_auto] animate-[gradientShift_6s_ease_infinite]">
                What are you
              </span>
              <br />
              <span
                className={`text-white inline-block transition-all duration-400 ${isFading ? "opacity-0 translate-y-2" : "opacity-100 translate-y-0"}`}
              >
                {ROTATING_WORDS[wordIndex]}
              </span>
            </h1>
            <p className="text-(--text-secondary) text-base md:text-lg leading-relaxed  px-6 md:px-0">
              Discover your next favorite show, movie, or book through
              personalized journeys that actually make sense.
            </p>
          </div>

          <SearchForm
            onSubmit={handleSubmit}
            isLoading={false}
            placeholderPrompts={PLACEHOLDER_PROMPTS}
          />
        </div>
      </div>

      <div className="relative pt-0 sm:pt-4 pb-16">
        <HomeSections
          onSearch={handleSubmit}
          pickOfTheDay={pickOfTheDay}
          featuredCollections={featuredCollections}
        />
      </div>
    </main>
  );
}
