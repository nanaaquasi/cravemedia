import { NextRequest, NextResponse } from "next/server";
import { generateRecommendations, generateJourney } from "@/lib/ai";
import { checkRecommendRateLimit } from "@/lib/ratelimit";
import { enrichMovieOrTV } from "@/lib/tmdb";
import { enrichBook } from "@/lib/books";
import { enrichAnime } from "@/lib/anilist";
import {
  getCachedRecommendation,
  setCachedRecommendation,
  getCachedJourney,
  setCachedJourney,
} from "@/lib/recommendation-cache";
import {
  ContentType,
  EnrichedRecommendation,
  JourneyItem,
  JourneyItemRaw,
  JourneyResponse,
  RecommendationResponse,
} from "@/lib/types";
import { getTypeLabel, VALID_CONTENT_TYPES } from "@/config/media-types";
import { createSearchSession } from "@/app/actions/search";

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
      maxOutputTokens = 3000, // Default value
      temperature = 0.4, // Default value
      responseMimeType = "application/json", // Default value
    } = body as {
      query: string;
      type: ContentType | ContentType[];
      mode?: "list" | "journey";
      maxOutputTokens?: number;
      temperature?: number;
      responseMimeType?: string;
    };

    // Validate input
    if (!query || typeof query !== "string" || query.trim().length === 0) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    if (query.length > 500) {
      return NextResponse.json(
        { error: "Query must be 500 characters or less" },
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

    if (mode === "journey") {
      // Journey mode
      const cached = getCachedJourney(trimmedQuery, type);
      if (cached) {
        const { title: jt, description: jd } = ensureMultiTypeLabel(
          cached.journeyTitle,
          cached.description ?? "",
          type,
        );
        return NextResponse.json({
          ...cached,
          journeyTitle: jt,
          description: jd,
        });
      }

      const aiResponse = await generateJourney(trimmedQuery, type, {
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

      const journeyTypeArray = Array.isArray(type) ? type : [type];
      const isAnimeOnlyJourney =
        type === "anime" ||
        (journeyTypeArray.length === 1 && journeyTypeArray[0] === "anime");
      const journeyItems = isAnimeOnlyJourney
        ? aiResponse.items.slice(0, 12)
        : aiResponse.items;

      const enrichmentPromises = journeyItems.map(
        async (raw: JourneyItemRaw): Promise<JourneyItem> => {
          const typeArray = Array.isArray(type) ? type : [type];
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
              enriched = await enrichBook(raw.title, raw.creator);
            } else if (effectiveType === "anime") {
              enriched = await enrichAnime(raw.title, raw.year);
            } else {
              enriched = await enrichMovieOrTV(
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
              ratingSource = "TMDB";
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
      let withExternalId = allEnriched.filter(
        (item): item is JourneyItem => item.externalId != null,
      );
      withExternalId = filterByYearIfNeeded(withExternalId, trimmedQuery);
      // Deduplicate by externalId to avoid same book/movie appearing multiple times
      const seenIds = new Set<string>();
      const enrichedItems = withExternalId.filter((item) => {
        const id = String(item.externalId);
        if (seenIds.has(id)) return false;
        seenIds.add(id);
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
          type,
        );
      const response: JourneyResponse = {
        journeyTitle: journeyTitleCorrected,
        description: descCorrected,
        totalRuntimeMinutes: totalRuntimeMinutes || undefined,
        difficultyProgression,
        items: enrichedItems,
        itemCount: enrichedItems.length,
      };

      setCachedJourney(trimmedQuery, type, response);

      createSearchSession(trimmedQuery, type, mode).catch((err) =>
        console.error("createSearchSession:", err),
      );

      return NextResponse.json(response);
    }

    // List mode (default)
    const cached = getCachedRecommendation(trimmedQuery, type);
    if (cached) {
      const { title: ct, description: cd } = ensureMultiTypeLabel(
        cached.collectionTitle,
        cached.collectionDescription,
        type,
      );
      return NextResponse.json({
        ...cached,
        collectionTitle: ct,
        collectionDescription: cd,
      });
    }

    const aiResponse = await generateRecommendations(trimmedQuery, type, {
      maxOutputTokens,
      temperature,
      responseMimeType,
    });

    const typeArray = Array.isArray(type) ? type : [type];
    const isAnimeOnly =
      type === "anime" || (typeArray.length === 1 && typeArray[0] === "anime");
    const itemsToEnrich = isAnimeOnly
      ? aiResponse.items.slice(0, 12)
      : aiResponse.items;

    const enrichmentPromises = itemsToEnrich.map(
      async (item): Promise<EnrichedRecommendation> => {
        const typeArray = Array.isArray(type) ? type : [type];
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
            const enriched = await enrichBook(item.title, item.creator);
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
            const enriched = await enrichAnime(item.title, item.year);
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
            const enriched = await enrichMovieOrTV(
              item.title,
              item.year,
              effectiveType,
            );
            return {
              ...item,
              type: effectiveType,
              ratingSource: "TMDB",
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
    let withExternalId = allEnriched.filter(
      (item): item is EnrichedRecommendation => item.externalId != null,
    );
    withExternalId = filterByYearIfNeeded(withExternalId, trimmedQuery);
    // Deduplicate by externalId to avoid same book/movie appearing multiple times
    const seenIds = new Set<string>();
    const enrichedItems = withExternalId.filter((item) => {
      const id = String(item.externalId);
      if (seenIds.has(id)) return false;
      seenIds.add(id);
      return true;
    });

    const { title: correctedTitle, description: correctedDesc } =
      ensureMultiTypeLabel(
        aiResponse.collectionTitle,
        aiResponse.collectionDescription,
        type,
      );
    const response: RecommendationResponse = {
      collectionTitle: correctedTitle,
      collectionDescription: correctedDesc,
      items: enrichedItems,
      itemCount: enrichedItems.length,
    };

    setCachedRecommendation(trimmedQuery, type, response);

    createSearchSession(trimmedQuery, type, mode).catch((err) =>
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
