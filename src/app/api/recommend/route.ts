import { NextRequest, NextResponse } from "next/server";
import { generateRecommendations, generateJourney } from "@/lib/ai";
import { enrichMovieOrTV } from "@/lib/tmdb";
import { enrichBook } from "@/lib/books";
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
import { VALID_CONTENT_TYPES } from "@/config/media-types";

/** Parse runtime string to minutes for total (e.g. "130 min" -> 130) */
function parseRuntimeMinutes(runtime: string | null): number {
  if (!runtime) return 0;
  const match = runtime.match(/(\d+)\s*min/);
  if (match) return parseInt(match[1], 10);
  // "X pages" -> ~2 min/page estimate
  const pageMatch = runtime.match(/(\d+)\s*pages?/i);
  if (pageMatch) return parseInt(pageMatch[1], 10) * 2;
  return 0;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, type, mode = "list" } = body as {
      query: string;
      type: ContentType;
      mode?: "list" | "journey";
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

    if (!VALID_CONTENT_TYPES.includes(type)) {
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
        return NextResponse.json(cached);
      }

      const aiResponse = await generateJourney(trimmedQuery, type);
      const journeyTitle =
        aiResponse.journey_title ?? aiResponse.journeyTitle ?? "Your Journey";
      const difficultyProgression =
        aiResponse.difficulty_progression ??
        aiResponse.difficultyProgression ??
        "";

      const enrichmentPromises = aiResponse.items.map(
        async (raw: JourneyItemRaw): Promise<JourneyItem> => {
          try {
            let enriched: {
              posterUrl: string | null;
              rating: number | null;
              runtime: string | null;
              externalId: string | null;
            };
            if (raw.type === "book") {
              enriched = await enrichBook(raw.title, raw.creator);
            } else {
              enriched = await enrichMovieOrTV(
                raw.title,
                raw.year,
                raw.type,
              );
            }
            return {
              ...raw,
              description: raw.description ?? raw.whyThisPosition,
              genres: raw.genres ?? raw.keyThemes,
              posterUrl: enriched.posterUrl,
              rating: enriched.rating,
              ratingSource: raw.type === "book" ? "Google Books" : "TMDB",
              runtime: enriched.runtime,
              externalId: enriched.externalId,
              difficultyLevel: raw.difficultyLevel,
            };
          } catch {
            return {
              ...raw,
              description: raw.description ?? raw.whyThisPosition,
              genres: raw.genres ?? raw.keyThemes,
              posterUrl: null,
              rating: null,
              ratingSource: null,
              runtime: null,
              externalId: null,
              difficultyLevel: raw.difficultyLevel,
            };
          }
        },
      );

      const enrichedItems = await Promise.all(enrichmentPromises);
      const totalRuntimeMinutes =
        aiResponse.total_runtime_minutes ?? aiResponse.totalRuntimeMinutes ??
        enrichedItems.reduce(
          (sum, item) => sum + parseRuntimeMinutes(item.runtime),
          0,
        );

      const response: JourneyResponse = {
        journeyTitle,
        description: aiResponse.description,
        totalRuntimeMinutes: totalRuntimeMinutes || undefined,
        difficultyProgression,
        items: enrichedItems,
        itemCount: enrichedItems.length,
      };

      setCachedJourney(trimmedQuery, type, response);
      return NextResponse.json(response);
    }

    // List mode (default)
    const cached = getCachedRecommendation(trimmedQuery, type);
    if (cached) {
      return NextResponse.json(cached);
    }

    const aiResponse = await generateRecommendations(trimmedQuery, type);

    const enrichmentPromises = aiResponse.items.map(
      async (item): Promise<EnrichedRecommendation> => {
        try {
          if (item.type === "book") {
            const enriched = await enrichBook(item.title, item.creator);
            return { ...item, ratingSource: "Google Books", ...enriched };
          } else {
            const enriched = await enrichMovieOrTV(
              item.title,
              item.year,
              item.type,
            );
            return { ...item, ratingSource: "TMDB", ...enriched };
          }
        } catch {
          return {
            ...item,
            posterUrl: null,
            rating: null,
            ratingSource: null,
            runtime: null,
            externalId: null,
          };
        }
      },
    );

    const enrichedItems = await Promise.all(enrichmentPromises);

    const response: RecommendationResponse = {
      collectionTitle: aiResponse.collectionTitle,
      collectionDescription: aiResponse.collectionDescription,
      items: enrichedItems,
      itemCount: enrichedItems.length,
    };

    setCachedRecommendation(trimmedQuery, type, response);

    return NextResponse.json(response);
  } catch (error) {
    console.error("Recommendation API error:", error);
    return NextResponse.json(
      { error: "Failed to generate recommendations. Please try again." },
      { status: 500 },
    );
  }
}
