import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateRecommendations, generateJourney } from "@/lib/ai";
import { getUserRecommendContext } from "@/lib/user-context";
import { checkRecommendRateLimit } from "@/lib/ratelimit";
import {
  cachedEnrichMovieOrTV,
  cachedEnrichAnime,
  cachedEnrichBook,
} from "@/lib/enrichment-cache";
import {
  getCachedRecommendationAsync,
  setCachedRecommendationAsync,
  getCachedJourneyAsync,
  setCachedJourneyAsync,
} from "@/lib/recommendation-cache";
import {
  ContentType,
  EnrichedRecommendation,
  JourneyItem,
  JourneyItemRaw,
  JourneyResponse,
  RecommendationResponse,
  ReferenceTitle,
} from "@/lib/types";
import { getTypeLabel, VALID_CONTENT_TYPES } from "@/config/media-types";
import { createSearchSession } from "@/app/actions/search";
import { queryRequestsStreamingOnly } from "@/lib/query-utils";
import { resolveReferenceTitlesFromQuery } from "@/lib/query-reference-resolver";

/** Parse min year from query (e.g. "2015+", "after 2020", "from 2015") — returns null if none found */
function parseMinYearFromQuery(query: string): number | null {
  const q = query.toLowerCase();
  const plusMatch = /(?:^|\s)(\d{4})\s*\+/i.exec(q);
  if (plusMatch) return Number.parseInt(plusMatch[1], 10);
  const afterMatch = /(?:after|from|since|post[- ]?)\s*(\d{4})/i.exec(q);
  if (afterMatch) return Number.parseInt(afterMatch[1], 10);
  return null;
}

/** Filter items by year when query specifies a min year (e.g. 2015+) */
function filterByYearIfNeeded<T extends { year?: string | number }>(
  items: T[],
  query: string,
): T[] {
  const minYear = parseMinYearFromQuery(query);
  if (minYear == null) return items;
  return items.filter((item) => {
    const y = item.year;
    if (y == null || y === "") return false;
    const yearNum = typeof y === "string" ? Number.parseInt(y.slice(0, 4), 10) : Math.floor(y);
    return !Number.isNaN(yearNum) && yearNum >= minYear;
  });
}

/** Detect if query asks for single-season / one-season / miniseries / limited series TV */
function queryWantsSingleSeason(query: string): boolean {
  const q = query.toLowerCase();
  return (
    /\b(single[- ]?season|one[- ]?season|1[- ]?season)\b/.test(q) ||
    /\b(miniseries|mini[- ]?series)\b/.test(q) ||
    /\b(limited\s+series|limited\s+run)\b/.test(q)
  );
}

/** Filter out multi-season TV shows when query asks for single-season only */
function filterBySingleSeasonIfNeeded<
  T extends { type?: string; runtime?: string | null },
>(items: T[], query: string): T[] {
  if (!queryWantsSingleSeason(query)) return items;
  return items.filter((item) => {
    if (item.type !== "tv") return true;
    const r = item.runtime ?? "";
    const multiMatch = /^(\d+)\s*seasons?$/.exec(r.trim());
    if (multiMatch) {
      const num = Number.parseInt(multiMatch[1], 10);
      return num === 1;
    }
    return true;
  });
}

/** Ensure title/description reflect all requested types when multiple are selected */
function ensureMultiTypeLabel(
  title: string,
  description: string,
  type: ContentType | ContentType[],
): { title: string; description: string } {
  const typeArr = Array.isArray(type) ? type : [type];
  if (typeArr.length < 2 || typeArr.includes("all")) return { title, description };

  const typeLabel = typeArr.map((t) => getTypeLabel(t)).join(" & ");
  const lower = `${title} ${description}`.toLowerCase();
  const hasMovie = /\b(movie|movies|film|films)\b/.test(lower);
  const hasTV = /\b(tv|series|show|shows)\b/.test(lower);
  const hasBook = /\b(book|books)\b/.test(lower);
  const hasAnime = /\banime\b/.test(lower);

  const needsMovie = typeArr.includes("movie") && !hasMovie;
  const needsTV = typeArr.includes("tv") && !hasTV;
  const needsBook = typeArr.includes("book") && !hasBook;
  const needsAnime = typeArr.includes("anime") && !hasAnime;

  if (!needsMovie && !needsTV && !needsBook && !needsAnime) return { title, description };

  const suffix = ` (${typeLabel})`;
  return { title: `${title.trim()}${suffix}`, description };
}

/** Parse runtime string to minutes for total (e.g. "130 min" -> 130) */
function parseRuntimeMinutes(runtime: string | null): number {
  if (!runtime) return 0;
  const match = /(\d+)\s*min/.exec(runtime);
  if (match) return Number.parseInt(match[1], 10);
  // "X pages" -> ~2 min/page estimate
  const pageMatch = /(\d+)\s*pages?/i.exec(runtime);
  if (pageMatch) return Number.parseInt(pageMatch[1], 10) * 2;
  return 0;
}

/** Normalize title for comparison (handles "The Matrix" vs "Matrix", case, etc.) */
function normalizeTitleForMatch(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/^(the|a|an)\s+/i, "")
    .replace(/\s+/g, " ")
    .replace(/\s*[\(\[]\d{4}[\)\]]\s*$/, ""); // strip trailing (2010) or [2010]
}

/** Filter out items whose titles match the excluded list (LLM may ignore prompt) */
function filterByExcludedTitles<T extends { title?: string }>(
  items: T[],
  excludeTitles: string[],
): T[] {
  if (excludeTitles.length === 0) return items;
  const excludeSet = new Set(
    excludeTitles.map((t) => normalizeTitleForMatch(t)),
  );
  return items.filter((item) => {
    const norm = normalizeTitleForMatch(item.title ?? "");
    if (excludeSet.has(norm)) return false;
    // Also exclude if item title starts with excluded + space/colon (e.g. "Matrix" excludes "Matrix Reloaded")
    for (const ex of excludeSet) {
      if (norm.startsWith(ex + " ") || norm.startsWith(ex + ":")) return false;
    }
    return true;
  });
}

const MAX_REFERENCE_TITLES = 5;
const REFERENCE_DESCRIPTION_MAX = 600;
const VALID_REFERENCE_TYPES = new Set(["movie", "tv", "book", "anime"]);

/** Sanitize incoming reference titles from the client. */
function sanitizeReferenceTitles(input: unknown): ReferenceTitle[] {
  if (!Array.isArray(input)) return [];
  const out: ReferenceTitle[] = [];
  for (const raw of input) {
    if (!raw || typeof raw !== "object") continue;
    const r = raw as Record<string, unknown>;
    const title = typeof r.title === "string" ? r.title.trim() : "";
    const type = typeof r.type === "string" ? r.type : "";
    if (!title || !VALID_REFERENCE_TYPES.has(type)) continue;
    const ref: ReferenceTitle = {
      title: title.slice(0, 200),
      type: type as ReferenceTitle["type"],
    };
    if (typeof r.year === "string" || typeof r.year === "number") {
      ref.year = r.year;
    }
    if (typeof r.creator === "string" && r.creator.trim()) {
      ref.creator = r.creator.trim().slice(0, 200);
    }
    if (typeof r.description === "string" && r.description.trim()) {
      ref.description = r.description.trim().slice(0, REFERENCE_DESCRIPTION_MAX);
    }
    if (Array.isArray(r.genres)) {
      ref.genres = r.genres
        .filter((g): g is string => typeof g === "string" && g.trim().length > 0)
        .slice(0, 12)
        .map((g) => g.trim());
    }
    out.push(ref);
    if (out.length >= MAX_REFERENCE_TITLES) break;
  }
  return out;
}

/** Heuristic: at least one reference is animated (anime or Western animation). */
function referencesIncludeAnimatedRoute(refs: ReferenceTitle[]): boolean {
  const animatedHints = ["animation", "animated", "anime", "cartoon"];
  return refs.some((ref) => {
    if (ref.type === "anime") return true;
    const genres = (ref.genres ?? []).map((g) => g.toLowerCase());
    if (genres.some((g) => animatedHints.some((h) => g.includes(h)))) {
      return true;
    }
    const desc = (ref.description ?? "").toLowerCase();
    return /\b(animated|animation|anime)\b/.test(desc);
  });
}

/** Broaden type filter to include both tv & anime when reference is animated. */
function broadenTypeForAnimatedReferences(
  type: ContentType | ContentType[],
  refs: ReferenceTitle[],
): ContentType | ContentType[] {
  if (refs.length === 0 || !referencesIncludeAnimatedRoute(refs)) return type;
  const arr = Array.isArray(type) ? type : [type];
  if (arr.includes("all")) return type;
  const visualOnly = arr.every((t) => t === "tv" || t === "anime");
  if (!visualOnly) return type;
  const broadened = Array.from(new Set([...arr, "tv", "anime"])) as ContentType[];
  return broadened.length === 1 ? broadened[0] : broadened;
}

export async function POST(request: NextRequest) {
  const rateLimitResult = await checkRecommendRateLimit(request.headers);
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 },
    );
  }

  try {
    const body = await request.json();
    const {
      query,
      type,
      mode = "list",
      excludeTitles = [],
      referenceTitles: referenceTitlesRaw,
      maxOutputTokens = 4500, // Default value
      temperature = 0.4, // Default value
      responseMimeType = "application/json", // Default value
    } = body as {
      query: string;
      type: ContentType | ContentType[];
      mode?: "list" | "journey";
      excludeTitles?: string[];
      referenceTitles?: unknown;
      maxOutputTokens?: number;
      temperature?: number;
      responseMimeType?: string;
    };

    const sanitizedExcludeTitles = Array.isArray(excludeTitles)
      ? excludeTitles.filter((t) => typeof t === "string" && t.trim().length > 0).slice(0, 50)
      : [];

    const sanitizedClientReferenceTitles =
      sanitizeReferenceTitles(referenceTitlesRaw);

    // Validate input
    if (!query || typeof query !== "string" || query.trim().length === 0) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    // 2000 chars accommodates AI-refined queries (which expand the user's
    // ≤200-char input into a 1–3 sentence detailed brief), plus optional
    // "(refine: ...)" suffixes appended on subsequent refinements.
    if (query.length > 2000) {
      return NextResponse.json(
        { error: "Query must be 2000 characters or less" },
        { status: 400 },
      );
    }

    const types = Array.isArray(type) ? type : [type];
    const allValid = types.every((t) => VALID_CONTENT_TYPES.includes(t));

    if (!allValid) {
      return NextResponse.json(
        { error: "Invalid content type" },
        { status: 400 },
      );
    }

    const trimmedQuery = query.trim();
    const streamingServiceOnly = queryRequestsStreamingOnly(trimmedQuery);

    // ── Run independent startup work in parallel ──────────────────────────
    // - Auto-resolve reference titles from query text (TMDB+AniList lookups)
    // - Authenticate user + fetch personalization context (Supabase)
    // None of these depend on each other, so we kick them off concurrently.
    const supabase = await createClient();
    const autoReferencePromise: Promise<ReferenceTitle[]> =
      sanitizedClientReferenceTitles.length === 0
        ? resolveReferenceTitlesFromQuery(trimmedQuery, type).catch(() => [])
        : Promise.resolve([]);

    const userContextPromise: Promise<
      Awaited<ReturnType<typeof getUserRecommendContext>> | null
    > = supabase.auth
      .getUser()
      .then(async ({ data }) => {
        if (!data?.user) return null;
        try {
          return await getUserRecommendContext(data.user.id);
        } catch {
          return null;
        }
      })
      .catch(() => null);

    const [autoReferenceTitles, userContext] = await Promise.all([
      autoReferencePromise,
      userContextPromise,
    ]);

    const mergedReferenceTitles = [
      ...sanitizedClientReferenceTitles,
      ...autoReferenceTitles,
    ];
    const dedupedReferenceTitles: ReferenceTitle[] = [];
    const seenRefKeys = new Set<string>();
    for (const ref of mergedReferenceTitles) {
      const key = normalizeTitleForMatch(ref.title);
      if (!key || seenRefKeys.has(key)) continue;
      seenRefKeys.add(key);
      dedupedReferenceTitles.push(ref);
    }
    const sanitizedReferenceTitles = dedupedReferenceTitles;

    // When references are animated, broaden tv/anime so both animation ecosystems
    // can surface together.
    const aiType = broadenTypeForAnimatedReferences(type, sanitizedReferenceTitles);

    // Build a set of reference titles to exclude from results (the AI is told to
    // avoid them, but we enforce it post-response too).
    const referenceExcludeTitles = sanitizedReferenceTitles.map((r) => r.title);
    const allExcludeTitles = Array.from(
      new Set([...sanitizedExcludeTitles, ...referenceExcludeTitles]),
    );

    // Skip cache for explicit client references (e.g. Similar To modal) since
    // the same query string can be paired with different selected references.
    const hasClientReferences = sanitizedClientReferenceTitles.length > 0;
    const useCache =
      sanitizedExcludeTitles.length === 0 &&
      !hasClientReferences &&
      !userContext;

    if (mode === "journey") {
      // Journey mode — skip cache when excluding titles
      const cached = useCache
        ? await getCachedJourneyAsync(trimmedQuery, aiType)
        : null;
      if (cached) {
        const { title: jt, description: jd } = ensureMultiTypeLabel(
          cached.journeyTitle,
          cached.description ?? "",
          aiType,
        );
        const filteredItems = (cached.items ?? []).filter(
          (item) => item.externalId != null,
        );
        return NextResponse.json({
          ...cached,
          items: filteredItems,
          itemCount: filteredItems.length,
          journeyTitle: jt,
          description: jd,
        });
      }

      const aiResponse = await generateJourney(trimmedQuery, aiType, {
        excludeTitles: allExcludeTitles,
        userContext: userContext ?? undefined,
        streamingServiceOnly: streamingServiceOnly ?? undefined,
        referenceTitles: sanitizedReferenceTitles.length > 0 ? sanitizedReferenceTitles : undefined,
        maxOutputTokens,
        temperature,
        responseMimeType,
      });
      const journeyTitle =
        aiResponse.journey_title ?? aiResponse.journeyTitle ?? "Your Journey";
      const difficultyProgression =
        aiResponse.difficulty_progression ??
        aiResponse.difficultyProgression ??
        "";

      const journeyTypeArray = Array.isArray(aiType) ? aiType : [aiType];
      const isAnimeOnlyJourney =
        aiType === "anime" ||
        (journeyTypeArray.length === 1 && journeyTypeArray[0] === "anime");
      const filteredJourneyItems = filterByExcludedTitles(
        aiResponse.items,
        allExcludeTitles,
      );
      const hasExclusions = allExcludeTitles.length > 0;
      const journeyItems = isAnimeOnlyJourney
        ? filteredJourneyItems.slice(0, hasExclusions ? 16 : 12)
        : filteredJourneyItems;

      const enrichmentPromises = journeyItems.map(
        async (raw: JourneyItemRaw): Promise<JourneyItem> => {
          const typeArray = Array.isArray(aiType) ? aiType : [aiType];
          const isAll = typeArray.includes("all");

          // Determine the most appropriate single type for enrichment.
          // JourneyItemRaw.type is already one of: "movie" | "tv" | "book" | "anime"
          let effectiveType: "movie" | "tv" | "book" | "anime";
          if (isAll) {
            effectiveType = raw.type;
          } else {
            const types = typeArray.filter((t) => t !== "all") as (
              | "movie"
              | "tv"
              | "book"
              | "anime"
            )[];
            effectiveType = types.includes(raw.type) ? raw.type : types[0];
          }

          try {
            let enriched: {
              posterUrl: string | null;
              rating: number | null;
              runtime: string | null;
              externalId: string | null;
            };

            if (effectiveType === "book") {
              enriched = await cachedEnrichBook(raw.title, raw.creator);
            } else if (effectiveType === "anime") {
              enriched = await cachedEnrichAnime(raw.title, raw.year);
            } else {
              enriched = await cachedEnrichMovieOrTV(
                raw.title,
                raw.year,
                effectiveType,
              );
            }

            let ratingSource: string | null = null;
            if (effectiveType === "book") {
              ratingSource = "Google Books";
            } else if (effectiveType === "anime") {
              ratingSource = "Anilist";
            } else {
              ratingSource =
                (enriched as { ratingSource?: "imdb" | "tmdb" }).ratingSource ===
                "imdb"
                  ? "IMDb"
                  : "TMDB";
            }

            return {
              ...raw,
              type: effectiveType,
              description: raw.description ?? raw.whyThisPosition,
              genres: raw.genres ?? raw.keyThemes,
              posterUrl: enriched.posterUrl,
              rating: enriched.rating ?? raw.ratingScore ?? null,
              ratingSource,
              runtime: enriched.runtime,
              externalId: enriched.externalId,
              difficultyLevel: raw.difficultyLevel,
              aiRating: raw.ratingScore,
              aiPopularity: raw.popularityScore,
            };
          } catch {
            return {
              ...raw,
              type: effectiveType, // Use effectiveType instead of potentially invalid raw.type
              description: raw.description ?? raw.whyThisPosition,
              genres: raw.genres ?? raw.keyThemes,
              posterUrl: null,
              rating: raw.ratingScore ?? null,
              ratingSource: null,
              runtime: null,
              externalId: null,
              difficultyLevel: raw.difficultyLevel,
              aiRating: raw.ratingScore,
              aiPopularity: raw.popularityScore,
            };
          }
        },
      );

      const allEnriched = await Promise.all(enrichmentPromises);
      let enrichedItems = filterByYearIfNeeded(allEnriched, trimmedQuery);
      enrichedItems = filterBySingleSeasonIfNeeded(enrichedItems, trimmedQuery);
      // Filter out items without externalId (no match in DB)
      enrichedItems = enrichedItems.filter((item) => item.externalId != null);
      // Deduplicate by externalId
      const seenKeys = new Set<string>();
      enrichedItems = enrichedItems.filter((item) => {
        const key = String(item.externalId);
        if (seenKeys.has(key)) return false;
        seenKeys.add(key);
        return true;
      });
      const totalRuntimeMinutes =
        aiResponse.total_runtime_minutes ??
        aiResponse.totalRuntimeMinutes ??
        enrichedItems.reduce(
          (sum, item) => sum + parseRuntimeMinutes(item.runtime),
          0,
        );

      const { title: journeyTitleCorrected, description: descCorrected } =
        ensureMultiTypeLabel(
          journeyTitle,
          aiResponse.description ?? "",
          aiType,
        );
      const response: JourneyResponse = {
        journeyTitle: journeyTitleCorrected,
        description: descCorrected,
        totalRuntimeMinutes: totalRuntimeMinutes || undefined,
        difficultyProgression,
        items: enrichedItems,
        itemCount: enrichedItems.length,
      };

      if (useCache) {
        await setCachedJourneyAsync(trimmedQuery, aiType, response);
      }

      createSearchSession(trimmedQuery, aiType, mode).catch((err) =>
        console.error("createSearchSession:", err),
      );

      return NextResponse.json(response);
    }

    // List mode (default) — skip cache when excluding titles
    const cached = useCache
      ? await getCachedRecommendationAsync(trimmedQuery, aiType)
      : null;
    if (cached) {
      const { title: ct, description: cd } = ensureMultiTypeLabel(
        cached.collectionTitle,
        cached.collectionDescription,
        aiType,
      );
      const filteredItems = (cached.items ?? []).filter(
        (item) => item.externalId != null,
      );
      const sortedItems = filteredItems.sort(
        (a, b) => (b.rating ?? -1) - (a.rating ?? -1),
      );
      return NextResponse.json({
        ...cached,
        items: sortedItems,
        itemCount: sortedItems.length,
        collectionTitle: ct,
        collectionDescription: cd,
      });
    }

    const aiResponse = await generateRecommendations(trimmedQuery, aiType, {
      excludeTitles: allExcludeTitles,
      userContext: userContext ?? undefined,
      streamingServiceOnly: streamingServiceOnly ?? undefined,
      referenceTitles: sanitizedReferenceTitles.length > 0 ? sanitizedReferenceTitles : undefined,
      maxOutputTokens,
      temperature,
      responseMimeType,
    });

    const typeArray = Array.isArray(aiType) ? aiType : [aiType];
    const isAnimeOnly =
      aiType === "anime" || (typeArray.length === 1 && typeArray[0] === "anime");
    const filteredItems = filterByExcludedTitles(
      aiResponse.items,
      allExcludeTitles,
    );
    const hasExclusions = allExcludeTitles.length > 0;
    const itemsToEnrich = isAnimeOnly
      ? filteredItems.slice(0, hasExclusions ? 24 : 12)
      : filteredItems;

    const enrichmentPromises = itemsToEnrich.map(
      async (item): Promise<EnrichedRecommendation> => {
        const typeArray = Array.isArray(aiType) ? aiType : [aiType];
        const isAll = typeArray.includes("all");

        // Determine the most appropriate single type for enrichment.
        let effectiveType: "movie" | "tv" | "book" | "anime";
        if (isAll) {
          effectiveType = item.type;
        } else {
          const types = typeArray.filter((t) => t !== "all") as (
            | "movie"
            | "tv"
            | "book"
            | "anime"
          )[];
          effectiveType = types.includes(item.type) ? item.type : types[0];
        }

        try {
          if (effectiveType === "book") {
            const enriched = await cachedEnrichBook(item.title, item.creator);
            return {
              ...item,
              type: effectiveType,
              ratingSource: "Google Books",
              ...enriched,
              rating: enriched.rating ?? item.ratingScore ?? null,
              aiRating: item.ratingScore,
              aiPopularity: item.popularityScore,
            };
          } else if (effectiveType === "anime") {
            const enriched = await cachedEnrichAnime(item.title, item.year);
            return {
              ...item,
              type: effectiveType,
              ratingSource: "Anilist",
              ...enriched,
              rating: enriched.rating ?? item.ratingScore ?? null,
              aiRating: item.ratingScore,
              aiPopularity: item.popularityScore,
            };
          } else {
            // List path is high-volume — skip the IMDb upgrade (saves 1–2
            // HTTP round-trips per item). Detail page can still upgrade.
            const enriched = await cachedEnrichMovieOrTV(
              item.title,
              item.year,
              effectiveType,
              { skipImdbRating: true },
            );
            return {
              ...item,
              type: effectiveType,
              ratingSource: enriched.ratingSource === "imdb" ? "IMDb" : "TMDB",
              ...enriched,
              rating: enriched.rating ?? item.ratingScore ?? null,
              aiRating: item.ratingScore,
              aiPopularity: item.popularityScore,
            };
          }
        } catch {
          return {
            ...item,
            type: effectiveType,
            posterUrl: null,
            ratingSource: null,
            runtime: null,
            externalId: null,
            rating: item.ratingScore ?? null, // Fallback to AI rating if enrichment fails
            aiRating: item.ratingScore,
            aiPopularity: item.popularityScore,
          };
        }
      },
    );

    const allEnriched = await Promise.all(enrichmentPromises);
    let enrichedItems = filterByYearIfNeeded(allEnriched, trimmedQuery);
    enrichedItems = filterBySingleSeasonIfNeeded(enrichedItems, trimmedQuery);
    // Filter out items without externalId (no match in DB)
    enrichedItems = enrichedItems.filter((item) => item.externalId != null);

    // Deduplicate by externalId
    const seenKeys = new Set<string>();
    enrichedItems = enrichedItems.filter((item) => {
      const key = String(item.externalId);
      if (seenKeys.has(key)) return false;
      seenKeys.add(key);
      return true;
    });

    // Sort by highest rating first (items without rating go to the end)
    enrichedItems.sort((a, b) => (b.rating ?? -1) - (a.rating ?? -1));

    const { title: correctedTitle, description: correctedDesc } =
      ensureMultiTypeLabel(
        aiResponse.collectionTitle,
        aiResponse.collectionDescription,
        aiType,
      );
    const response: RecommendationResponse = {
      collectionTitle: correctedTitle,
      collectionDescription: correctedDesc,
      items: enrichedItems,
      itemCount: enrichedItems.length,
    };

    if (useCache) {
      await setCachedRecommendationAsync(trimmedQuery, aiType, response);
    }

    createSearchSession(trimmedQuery, aiType, mode).catch((err) =>
      console.error("createSearchSession:", err),
    );

    return NextResponse.json(response);
  } catch (error) {
    console.error("Recommendation API error:", error);
    return NextResponse.json(
      { error: "Failed to generate recommendations. Please try again." },
      { status: 500 },
    );
  }
}
