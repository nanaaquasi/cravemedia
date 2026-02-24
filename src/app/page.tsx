"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { track } from "@vercel/analytics";
import { ContentType, EnrichedRecommendation } from "@/lib/types";
import { useIntentRefine } from "@/hooks/useIntentRefine";
import SearchForm, { SearchMode } from "@/components/SearchForm";
import IntentRefineStep from "@/components/IntentRefineStep";
import SimilarToModal from "@/components/SimilarToModal";
import { HomeSections } from "@/components/HomeSections";
import { ENABLED_MEDIA_TYPES } from "@/config/media-types";
import {
  HERO_POSTERS,
  PLACEHOLDER_PROMPTS,
  EARLY_USERS_COUNT,
  AVG_MATCH_RATING,
  HERO_LABEL,
} from "@/config/home-page";
import { Star } from "lucide-react";

const AVATAR_BG_COLORS = [
  "#ec4899", // pink
  "#8b5cf6", // purple
  "#06b6d4", // cyan
  "#f59e0b", // amber
  "#22c55e", // green
] as const;

function getAvatarBgColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++)
    hash = (hash << 5) - hash + id.charCodeAt(i);
  return AVATAR_BG_COLORS[Math.abs(hash) % AVATAR_BG_COLORS.length];
}

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
  const [isSimilarToModalOpen, setIsSimilarToModalOpen] = useState(false);
  const [initialTypeSelection, setInitialTypeSelection] = useState<
    ContentType | ContentType[]
  >("all");
  const refine = useIntentRefine();

  const [isNavigating, setIsNavigating] = useState(false);

  const [heroAvatars, setHeroAvatars] = useState<
    {
      id: string;
      username: string | null;
      fullName: string | null;
      avatarUrl: string | null;
    }[]
  >([]);
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
      fetch("/api/hero-avatars").then((r) => r.json()),
    ]).then(([pick, featured, avatars]) => {
      setPickOfTheDay(pick.mediaId && pick.posterUrl ? pick : null);
      setFeaturedCollections(featured.collections ?? []);
      setHeroAvatars(avatars.avatars ?? []);
    });
  }, []);

  useEffect(() => {
    router.prefetch("/search");
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
            <div className="hidden items-center gap-2 px-3 py-1.5 rounded-full bg-purple-500/25 text-purple-300 border border-purple-500/30 text-xs font-semibold uppercase tracking-wide mb-6">
              <Star className="w-3.5 h-3.5" strokeWidth={2} />
              PERSOaNALIZED DISCOVERY ENGINE
            </div>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-4">
              <span className="text-white">Find what to watch</span>
              <br />
              <span className="text-white">or read </span>
              <span className="bg-linear-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent bg-size-[200%_auto] animate-[gradientShift_6s_ease_infinite]">
                next.
              </span>
            </h1>
            <p className="text-(--text-secondary) text-base md:text-md leading-relaxed px-6 md:px-3 mb-6">
              Describe what you&apos;re in the mood for — in plain English.
              Craveo finds the perfect match, not just what&apos;s trending.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-8 text-xs text-(--text-secondary)">
              <div className="flex items-center gap-1">
                <div className="flex -space-x-2">
                  {heroAvatars.slice(0, 5).map((a, i) => (
                    <div
                      key={a.id}
                      className="relative w-6 h-6 rounded-full border-2 border-(--bg-primary) overflow-hidden flex items-center justify-center shrink-0"
                      style={{
                        zIndex: 5 - i,
                        backgroundColor: getAvatarBgColor(a.id),
                      }}
                    >
                      {a.avatarUrl &&
                      (a.avatarUrl.startsWith("http://") ||
                        a.avatarUrl.startsWith("https://")) ? (
                        <Image
                          src={a.avatarUrl}
                          alt=""
                          fill
                          className="object-cover"
                          sizes="30px"
                          unoptimized
                        />
                      ) : (
                        <span className="text-xs font-medium text-white/90">
                          {(a.username ?? a.fullName ?? "?")
                            .slice(0, 1)
                            .toUpperCase()}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
                <span>Join {EARLY_USERS_COUNT} early users</span>
              </div>
              <div className="flex items-center gap-0.5">
                <div className="flex text-amber-400">
                  {[1, 2, 3, 4].map((n) => (
                    <Star
                      key={n}
                      className="w-4 h-4 fill-current"
                      strokeWidth={0}
                    />
                  ))}
                </div>
                <span>{AVG_MATCH_RATING} avg match rating</span>
              </div>
            </div>
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
