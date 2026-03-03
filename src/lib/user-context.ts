import { createClient } from "@/lib/supabase/server";
import { UserRecommendContext } from "./types";

/** Parse top_genres from user_stats JSONB */
function parseTopGenres(raw: unknown): Array<{ genre: string; count: number }> {
  if (!raw || !Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (item && typeof item === "object" && "genre" in item && "count" in item) {
        const genre = String((item as { genre: unknown }).genre);
        const count = Number((item as { count: unknown }).count);
        return !Number.isNaN(count) ? { genre, count } : null;
      }
      return null;
    })
    .filter((x): x is { genre: string; count: number } => x !== null);
}

/** Map media_type to ContentType-like string */
function mapMediaType(mediaType: string): string {
  const m = mediaType?.toLowerCase() ?? "";
  if (m === "movie" || m === "tv" || m === "book" || m === "anime") return m;
  if (m === "all") return "movie"; // default for mixed journeys
  return "movie";
}

/**
 * Fetch user context for personalized recommendations.
 * Returns null when user is not logged in or when fetch fails.
 */
export async function getUserRecommendContext(
  userId: string,
): Promise<UserRecommendContext | null> {
  const supabase = await createClient();

  try {
    // 1. Profile: favorite_genres, streaming_services
    const { data: profile } = await supabase
      .from("profiles")
      .select("favorite_genres, streaming_services")
      .eq("id", userId)
      .single();

    // 2. User stats: top_genres
    const { data: stats } = await supabase
      .from("user_stats")
      .select("top_genres")
      .eq("user_id", userId)
      .single();

    // 3. Collection items (last 30, watched/finished) - via collections
    const { data: userCollections } = await supabase
      .from("collections")
      .select("id")
      .eq("user_id", userId);

    const collectionIds = (userCollections ?? []).map((c) => c.id);
    let collectionItems: Array<{
      title: string | null;
      media_type: string;
      status: string | null;
      item_rating: number | null;
    }> = [];

    if (collectionIds.length > 0) {
      const { data: items } = await supabase
        .from("collection_items")
        .select("title, media_type, status, item_rating")
        .in("collection_id", collectionIds)
        .in("status", ["watched", "finished"])
        .order("finished_at", { ascending: false, nullsFirst: false })
        .limit(30);

      collectionItems = items ?? [];
    }

    // 4. Journey progress (recent completed) - join journeys for content_type
    const { data: journeyProgress } = await supabase
      .from("journey_progress")
      .select("item_title, item_rating, status, journeys(content_type)")
      .eq("user_id", userId)
      .eq("status", "completed")
      .order("completed_at", { ascending: false, nullsFirst: false })
      .limit(30);

    // 5. Media reviews (last 10, for high ratings - media_reviews has no title, use media_id as fallback)
    const { data: reviews } = await supabase
      .from("media_reviews")
      .select("media_id, media_type, item_rating")
      .eq("user_id", userId)
      .gte("item_rating", 4)
      .order("updated_at", { ascending: false })
      .limit(10);

    const recentlyWatched: UserRecommendContext["recentlyWatched"] = [];
    const seenTitles = new Set<string>();

    for (const item of collectionItems) {
      const title = item.title?.trim();
      if (title && !seenTitles.has(title.toLowerCase())) {
        seenTitles.add(title.toLowerCase());
        recentlyWatched.push({
          title,
          type: mapMediaType(item.media_type),
          rating: item.item_rating ?? undefined,
        });
      }
    }

    for (const jp of journeyProgress ?? []) {
      const title = jp.item_title?.trim();
      if (title && !seenTitles.has(title.toLowerCase())) {
        seenTitles.add(title.toLowerCase());
        const journey = jp.journeys as { content_type?: string } | null;
        const contentType = journey?.content_type?.toLowerCase() ?? "movie";
        recentlyWatched.push({
          title,
          type: mapMediaType(contentType),
          rating: jp.item_rating ?? undefined,
        });
      }
    }

    const recentlyRated: UserRecommendContext["recentlyRated"] = [];

    for (const item of recentlyWatched) {
      if (item.rating != null && item.rating >= 4) {
        recentlyRated.push({ title: item.title, rating: item.rating });
      }
    }

    for (const r of reviews ?? []) {
      recentlyRated.push({
        title: `${r.media_type}:${r.media_id}`,
        rating: r.item_rating,
      });
    }

    const topGenres = parseTopGenres(stats?.top_genres);

    return {
      favoriteGenres: profile?.favorite_genres ?? null,
      streamingServices: profile?.streaming_services ?? null,
      topGenres: topGenres.length > 0 ? topGenres : null,
      recentlyWatched: recentlyWatched.slice(0, 15),
      recentlyRated: recentlyRated.slice(0, 10),
    };
  } catch (err) {
    console.error("getUserRecommendContext error:", err);
    return null;
  }
}

/**
 * Lightweight context for refine API (genres only, no heavy queries).
 */
export async function getLightweightUserContext(
  userId: string,
): Promise<Pick<UserRecommendContext, "favoriteGenres" | "topGenres"> | null> {
  const supabase = await createClient();

  try {
    const [{ data: profile }, { data: stats }] = await Promise.all([
      supabase
        .from("profiles")
        .select("favorite_genres")
        .eq("id", userId)
        .single(),
      supabase
        .from("user_stats")
        .select("top_genres")
        .eq("user_id", userId)
        .single(),
    ]);

    const topGenres = parseTopGenres(stats?.top_genres);

    return {
      favoriteGenres: profile?.favorite_genres ?? null,
      topGenres: topGenres.length > 0 ? topGenres : null,
    };
  } catch (err) {
    console.error("getLightweightUserContext error:", err);
    return null;
  }
}
