import { redirect } from "next/navigation";
import {
  getMediaDetails,
  getMovieWatchProviders,
  getPosterUrl,
  getTVEpisodeRatings,
  getTVSeasons,
  getTVWatchProviders,
  type EpisodeQualityData,
  type TVSeasonSummary,
  type WatchProvider,
} from "@/lib/tmdb";
import { getAnimeDetails } from "@/lib/anilist";
import { getBookDetails } from "@/lib/books";
import { createClient } from "@/lib/supabase/server";
import MediaDetailClient, { MediaDetails } from "./MediaDetailClient";
import type { WatchStatus } from "@/app/actions/collection";

interface PageProps {
  params: Promise<{ type: string; id: string }>;
}

export default async function MediaDetailPage({ params }: PageProps) {
  const { type, id } = await params;

  if (type !== "movie" && type !== "tv" && type !== "anime" && type !== "book") {
    redirect("/");
  }

  const isBook = type === "book";
  const idNum = isBook ? 0 : parseInt(id, 10);
  if (!isBook && isNaN(idNum)) {
    redirect("/");
  }

  try {
    let mediaDetails: MediaDetails;

    let animeRelations: Array<{
      id: number;
      title: string;
      posterUrl: string | null;
      voteAverage: number;
      relationType: string;
      year: number | null;
      episodes: number | null;
    }> = [];

    if (type === "anime") {
      const details = await getAnimeDetails(idNum);
      if (!details) throw new Error("Anime not found");

      const relations = details.relations.map((r) => ({
        id: r.id,
        title: r.title,
        posterUrl: r.posterUrl,
        voteAverage: r.voteAverage,
        relationType: r.relationType,
        year: r.year,
        episodes: r.episodes,
      }));
      const prequelCount = relations.filter((r) => r.relationType === "PREQUEL").length;
      const currentInList = relations.some((r) => r.id === details.id);
      animeRelations = currentInList
        ? relations
        : [
            ...relations.slice(0, prequelCount),
            {
              id: details.id,
              title: details.title,
              posterUrl: details.posterUrl,
              voteAverage: details.rating ? details.rating / 10 : 0,
              relationType: "CURRENT",
              year: details.year,
              episodes: details.episodes,
            },
            ...relations.slice(prequelCount),
          ];

      mediaDetails = {
        title: details.title,
        overview: details.description || null,
        posterUrl: details.posterUrl,
        backdropUrl: details.bannerImage,
        voteAverage: details.rating ? details.rating / 10 : 0,
        voteCount: details.popularity ? Math.round(details.popularity) : 0,
        releaseDate: details.releaseDate,
        runtime: details.duration ? `${details.duration} min` : null,
        genres: details.genres,
        directors: [],
        trailerKey: details.trailerKey,
        type: "anime",
        episodes: details.episodes,
        studios: details.studios,
        format: details.format,
        cast: details.cast.map((c) => ({
          id: c.id,
          name: c.name,
          character: c.character,
          profileUrl: c.profileUrl,
          personUrl: c.personUrl,
        })),
        recommendations: details.recommendations.map((r) => ({
          id: r.id,
          title: r.title,
          posterUrl: r.posterUrl,
          voteAverage: r.voteAverage,
          type: "anime" as const,
        })),
        releaseStatus: details.status,
        originalLanguage: null,
        originCountry: [],
        writers: [],
        source: details.source,
      };
    } else if (type === "book") {
      const details = await getBookDetails(id);
      if (!details) throw new Error("Book not found");

      mediaDetails = {
        title: details.title,
        overview: details.overview,
        posterUrl: details.posterUrl,
        backdropUrl: null,
        voteAverage: details.voteAverage,
        voteCount: details.voteCount,
        releaseDate: details.releaseDate,
        runtime: details.runtime,
        genres: details.genres,
        directors: [],
        authors: details.authors,
        trailerKey: null,
        type: "book",
        cast: [],
        recommendations: [],
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

    const tvSeasonsPromise: Promise<TVSeasonSummary[]> =
      type === "tv" ? getTVSeasons(idNum) : Promise.resolve([]);

    const watchProvidersPromise: Promise<WatchProvider[]> =
      type === "tv"
        ? getTVWatchProviders(idNum)
        : type === "movie"
          ? getMovieWatchProviders(idNum)
          : Promise.resolve([]);

    const [
      authResult,
      communityResult,
      collectionReviewsResult,
      standaloneReviewsResult,
      episodeQuality,
      tvSeasons,
      watchProviders,
      otherCravelistsResult,
    ] = await Promise.all([
        supabase.auth.getUser(),
        supabase
          .from("collection_items")
          .select("status, collection_id, collections(name)")
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
          .limit(25),
        (async () => {
          try {
            const { data } = await supabase
              .from("media_reviews")
              .select(
                "id, item_rating, review_text, contains_spoilers, created_at, user_id, profiles:user_id(username, full_name, avatar_url)",
              )
              .eq("media_id", id)
              .eq("media_type", type)
              .not("review_text", "is", null)
              .order("created_at", { ascending: false })
              .limit(25);
            return data ?? [];
          } catch {
            return [];
          }
        })(),
        episodeQualityPromise,
        tvSeasonsPromise,
        watchProvidersPromise,
        supabase
          .from("collection_items")
          .select(
            "collection_id, collections!inner(id, name, user_id, is_public, profiles:user_id(username, avatar_url))",
          )
          .eq("media_id", id)
          .eq("media_type", type)
          .eq("collections.is_public", true),
      ]);

    const user = authResult.data?.user;
    const allItems = communityResult.data ?? [];
    const rawCollectionReviews = collectionReviewsResult.data ?? [];
    const rawStandaloneReviews: unknown[] = Array.isArray(standaloneReviewsResult)
      ? standaloneReviewsResult
      : (standaloneReviewsResult as { data?: unknown[] })?.data ?? [];

    const communityStats: Record<string, number> = {};
    for (const item of allItems) {
      const s = item.status ?? "not_seen";
      communityStats[s] = (communityStats[s] || 0) + 1;
    }

    const toReview = (r: any, userId: string, profile: any) => ({
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
    });

    const seenUserIds = new Set<string>();
    const collectionReviews = rawCollectionReviews
      .map((r: any) => {
        const col = r.collections;
        const profile = col?.profiles;
        const userId = col?.user_id as string;
        if (!userId || seenUserIds.has(userId)) return null;
        seenUserIds.add(userId);
        return toReview(r, userId, profile);
      })
      .filter(Boolean) as { id: string; rating: number | null; text: string; containsSpoilers: boolean; createdAt: string; user: { id: string; username: string | null; fullName: string | null; avatarUrl: string | null } }[];

    const standaloneReviews = rawStandaloneReviews
      .map((r: any) => {
        const userId = r.user_id as string;
        const profile = r.profiles;
        if (!userId || seenUserIds.has(userId)) return null;
        seenUserIds.add(userId);
        return toReview(r, userId, profile);
      })
      .filter(Boolean) as { id: string; rating: number | null; text: string; containsSpoilers: boolean; createdAt: string; user: { id: string; username: string | null; fullName: string | null; avatarUrl: string | null } }[];

    const reviews = [...collectionReviews, ...standaloneReviews]
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
      .slice(0, 20) as {
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
    let collectionNames: string[] = [];
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

          const { data: userItemRows } = await supabase
            .from("collection_items")
            .select("collection_id, collections!inner(name, user_id)")
            .eq("media_id", id)
            .eq("media_type", type)
            .eq("collections.user_id", user.id);

          const byId = new Map<string, string>();
          for (const row of userItemRows ?? []) {
            const cid = row.collection_id;
            if (byId.has(cid)) continue;
            const col = row.collections as { name?: string } | null;
            if (col?.name) byId.set(cid, col.name);
          }
          collectionNames = Array.from(byId.values());
        }
      }
    }

    const hasInCollection = currentStatus !== null;

    // Build other curators' cravelists (public, not owned by current user)
    const currentUserId = user?.id;
    const rawOtherCravelists = otherCravelistsResult.data ?? [];
    const seenCollectionIds = new Set<string>();
    const otherCravelistIds: string[] = [];
    for (const row of rawOtherCravelists) {
      const col = row.collections as {
        id?: string;
        user_id?: string;
        name?: string;
        profiles?: { username?: string; avatar_url?: string } | null;
      } | null;
      if (!col?.id || seenCollectionIds.has(col.id)) continue;
      if (currentUserId && col.user_id === currentUserId) continue;
      seenCollectionIds.add(col.id);
      otherCravelistIds.push(col.id);
    }

    let otherCravelists: {
      id: string;
      name: string;
      itemCount: number;
      curator: { username: string | null; avatarUrl: string | null };
      images: string[];
    }[] = [];

    if (otherCravelistIds.length > 0) {
      const [collectionsData, itemsData] = await Promise.all([
        supabase
          .from("collections")
          .select("id, name, user_id, profiles:user_id(username, avatar_url)")
          .in("id", otherCravelistIds),
        supabase
          .from("collection_items")
          .select("collection_id, image_url")
          .in("collection_id", otherCravelistIds)
          .order("created_at", { ascending: true }),
      ]);

      const itemsByCollection = new Map<
        string,
        { images: string[]; count: number }
      >();
      for (const item of itemsData.data ?? []) {
        const cid = item.collection_id;
        const existing = itemsByCollection.get(cid) ?? {
          images: [] as string[],
          count: 0,
        };
        existing.count += 1;
        if (item.image_url && existing.images.length < 2) {
          existing.images.push(item.image_url);
        }
        itemsByCollection.set(cid, existing);
      }

      const profileByUserId = new Map<string, { username: string | null; avatarUrl: string | null }>();
      for (const c of collectionsData.data ?? []) {
        const profile = c.profiles as { username?: string; avatar_url?: string } | null;
        if (c.user_id) {
          profileByUserId.set(c.user_id, {
            username: profile?.username ?? null,
            avatarUrl: profile?.avatar_url ?? null,
          });
        }
      }

      otherCravelists = (collectionsData.data ?? [])
        .filter((c) => otherCravelistIds.includes(c.id))
        .map((c) => {
          const meta = itemsByCollection.get(c.id) ?? { images: [], count: 0 };
          const curator = profileByUserId.get(c.user_id) ?? {
            username: null,
            avatarUrl: null,
          };
          return {
            id: c.id,
            name: c.name,
            itemCount: meta.count,
            curator,
            images: meta.images,
          };
        });
    }

    return (
      <MediaDetailClient
        details={mediaDetails}
        mediaId={id}
        currentStatus={currentStatus}
        communityStats={communityStats}
        reviews={reviews}
        canReview={!!user}
        episodeQuality={episodeQuality}
        collectionNames={collectionNames}
        tvSeasons={tvSeasons}
        animeRelations={animeRelations}
        watchProviders={watchProviders}
        otherCravelists={otherCravelists}
      />
    );
  } catch (e) {
    console.error("Error fetching details:", e);
    redirect("/");
  }
}
