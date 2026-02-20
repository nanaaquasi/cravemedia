import { redirect } from "next/navigation";
import {
  getMediaDetails,
  getPosterUrl,
  getTVEpisodeRatings,
  type EpisodeQualityData,
} from "@/lib/tmdb";
import { getAnimeDetails } from "@/lib/anilist";
import { createClient } from "@/lib/supabase/server";
import MediaDetailClient, { MediaDetails } from "./MediaDetailClient";
import type { WatchStatus } from "@/app/actions/collection";

interface PageProps {
  params: Promise<{ type: string; id: string }>;
}

export default async function MediaDetailPage({ params }: PageProps) {
  const { type, id } = await params;

  if (type !== "movie" && type !== "tv" && type !== "anime") {
    redirect("/");
  }

  const idNum = parseInt(id, 10);
  if (isNaN(idNum)) {
    redirect("/");
  }

  try {
    let mediaDetails: MediaDetails;

    if (type === "anime") {
      const details = await getAnimeDetails(idNum);
      if (!details) throw new Error("Anime not found");

      mediaDetails = {
        title: details.title,
        overview: details.description || null,
        posterUrl: details.posterUrl,
        backdropUrl: null,
        voteAverage: details.rating ? details.rating / 10 : 0,
        voteCount: 0,
        releaseDate: details.year ? `${details.year}-01-01` : null,
        runtime: details.duration ? `${details.duration} min` : null,
        genres: details.genres,
        directors: [],
        trailerKey: null,
        type: "anime",
        episodes: details.episodes,
        studios: details.studios,
        format: details.format,
        cast: [],
        recommendations: [],
        releaseStatus: null,
        originalLanguage: null,
        originCountry: [],
        writers: [],
      };
    } else {
      const details = await getMediaDetails(type as "movie" | "tv", idNum);
      const posterUrl = getPosterUrl(details.posterPath, "w500");
      const backdropUrl = details.backdropPath
        ? `https://image.tmdb.org/t/p/w1280${details.backdropPath}`
        : null;

      mediaDetails = {
        title: details.title,
        overview: details.overview,
        posterUrl,
        backdropUrl,
        voteAverage: details.voteAverage,
        voteCount: details.voteCount,
        releaseDate: details.releaseDate,
        runtime: details.runtime,
        genres: details.genres,
        directors: details.directors,
        trailerKey: details.trailerKey,
        type: details.type as "movie" | "tv",
        cast: details.cast,
        recommendations: details.recommendations,
        releaseStatus: details.releaseStatus,
        originalLanguage: details.originalLanguage,
        originCountry: details.originCountry,
        writers: details.writers,
      };
    }

    const supabase = await createClient();

    const episodeQualityPromise: Promise<EpisodeQualityData> =
      type === "tv"
        ? getTVEpisodeRatings(idNum)
        : Promise.resolve([]);

    const [authResult, communityResult, reviewsResult, episodeQuality] =
      await Promise.all([
        supabase.auth.getUser(),
        supabase
          .from("collection_items")
          .select("status, collection_id")
          .eq("media_id", id)
          .eq("media_type", type),
        supabase
          .from("collection_items")
          .select(
            "id, item_rating, review_text, contains_spoilers, created_at, collections!inner(user_id, profiles:user_id(username, full_name, avatar_url))",
          )
          .eq("media_id", id)
          .eq("media_type", type)
          .not("review_text", "is", null)
          .order("created_at", { ascending: false })
          .limit(20),
        episodeQualityPromise,
      ]);

    const user = authResult.data?.user;
    const allItems = communityResult.data ?? [];
    const rawReviews = reviewsResult.data ?? [];

    const communityStats: Record<string, number> = {};
    for (const item of allItems) {
      const s = item.status ?? "not_seen";
      communityStats[s] = (communityStats[s] || 0) + 1;
    }

    const seenUserIds = new Set<string>();
    const reviews = rawReviews
      .map((r: any) => {
        const col = r.collections;
        const profile = col?.profiles;
        const userId = col?.user_id as string;
        if (!userId || seenUserIds.has(userId)) return null;
        seenUserIds.add(userId);
        return {
          id: r.id as string,
          rating: r.item_rating as number | null,
          text: r.review_text as string,
          containsSpoilers: (r.contains_spoilers as boolean) ?? false,
          createdAt: r.created_at as string,
          user: {
            id: userId,
            username: (profile?.username as string) ?? null,
            fullName: (profile?.full_name as string) ?? null,
            avatarUrl: (profile?.avatar_url as string) ?? null,
          },
        };
      })
      .filter(Boolean) as {
      id: string;
      rating: number | null;
      text: string;
      containsSpoilers: boolean;
      createdAt: string;
      user: {
        id: string;
        username: string | null;
        fullName: string | null;
        avatarUrl: string | null;
      };
    }[];

    let currentStatus: WatchStatus | null = null;
    if (user) {
      const { data: userCollections } = await supabase
        .from("collections")
        .select("id")
        .eq("user_id", user.id);

      if (userCollections?.length) {
        const userCollectionIds = new Set(userCollections.map((c) => c.id));
        const userItems = allItems.filter((i) =>
          userCollectionIds.has(i.collection_id),
        );

        if (userItems.length) {
          const priority: WatchStatus[] = [
            "watched",
            "watching",
            "on_hold",
            "dropped",
            "not_interested",
            "not_seen",
          ];
          currentStatus =
            priority.find((s) => userItems.some((i) => i.status === s)) ??
            "not_seen";
        }
      }
    }

    const hasInCollection = currentStatus !== null;

    return (
      <MediaDetailClient
        details={mediaDetails}
        mediaId={id}
        currentStatus={currentStatus}
        communityStats={communityStats}
        reviews={reviews}
        canReview={hasInCollection}
        episodeQuality={episodeQuality}
      />
    );
  } catch (e) {
    console.error("Error fetching details:", e);
    redirect("/");
  }
}
