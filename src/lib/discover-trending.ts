import { unstable_cache } from "next/cache";
import { getPosterUrl } from "@/lib/tmdb";
import { getDiscoverAnime, isAnilistGlobalOutageError } from "@/lib/anilist";

const TMDB_BASE = "https://api.themoviedb.org/3";
const TMDB_ANIME_GENRE_ID = 16;

/** Revalidate trending data every hour */
const REVALIDATE_SECONDS = 3600;

const TRENDING_LIMIT = 40;
const POPULAR_MOVIES_LIMIT = 20;
const POPULAR_TV_LIMIT = 20;

interface TMDBResult {
  id: number;
  title?: string;
  name?: string;
  poster_path: string | null;
  vote_average: number;
  release_date?: string;
  first_air_date?: string;
  overview?: string;
  media_type?: string;
  genre_ids?: number[];
  origin_country?: string[];
}

interface TMDBResponse {
  results?: TMDBResult[];
}

export interface TMDBMediaItem {
  id: string;
  type: "movie" | "tv" | "anime";
  title: string;
  posterUrl: string | null;
  rating: number | null;
  releaseDate: string | null;
  overview: string | null;
}

function dedupeTrendingResults(results: TMDBResult[]): TMDBResult[] {
  const seen = new Set<string>();
  const out: TMDBResult[] = [];
  for (const r of results) {
    const key = `${r.media_type ?? "?"}-${r.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(r);
  }
  return out;
}

function isLikelyAnime(r: TMDBResult): boolean {
  const hasAnimation = r.genre_ids?.includes(TMDB_ANIME_GENRE_ID) ?? false;
  const isJapanese = r.origin_country?.includes("JP") ?? false;
  return hasAnimation && isJapanese;
}

function toMediaItem(r: TMDBResult, mediaType: "movie" | "tv"): TMDBMediaItem {
  const type: "movie" | "tv" | "anime" =
    mediaType === "tv" && isLikelyAnime(r) ? "anime" : mediaType;
  const title = r.title ?? r.name ?? "Unknown";
  const releaseDate = r.release_date ?? r.first_air_date ?? null;
  const rating =
    r.vote_average != null && r.vote_average > 0
      ? Math.round(r.vote_average * 10)
      : null;

  return {
    id: String(r.id),
    type,
    title,
    posterUrl: getPosterUrl(r.poster_path),
    rating,
    releaseDate,
    overview: r.overview ?? null,
  };
}

async function fetchTrendingData(): Promise<{
  trending: TMDBMediaItem[];
  popular: TMDBMediaItem[];
  trendingAnime: TMDBMediaItem[];
  popularAnime: TMDBMediaItem[];
}> {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) {
    const animeData = await getDiscoverAnime().catch(() => ({
      trending: [],
      popular: [],
    }));
    const toAnimeItem = (a: { id: string; title: string; posterUrl: string | null; rating: number | null; releaseDate: string | null; overview: string | null }) => ({
      id: a.id,
      type: "anime" as const,
      title: a.title,
      posterUrl: a.posterUrl,
      rating: a.rating,
      releaseDate: a.releaseDate,
      overview: a.overview,
    });
    return {
      trending: [],
      popular: [],
      trendingAnime: animeData.trending.map(toAnimeItem),
      popularAnime: animeData.popular.map(toAnimeItem),
    };
  }

  const url = (endpoint: string, page = 1) => {
    const u = new URL(`${TMDB_BASE}${endpoint}`);
    u.searchParams.set("api_key", apiKey);
    u.searchParams.set("page", String(page));
    return u.toString();
  };

  const [
    trendingRes1,
    trendingRes2,
    movieRes,
    tvRes,
  ] = await Promise.all([
    fetch(url("/trending/all/day", 1), {
      next: { revalidate: REVALIDATE_SECONDS },
    }),
    fetch(url("/trending/all/day", 2), {
      next: { revalidate: REVALIDATE_SECONDS },
    }),
    fetch(url("/movie/popular", 1), {
      next: { revalidate: REVALIDATE_SECONDS },
    }),
    fetch(url("/tv/popular", 1), {
      next: { revalidate: REVALIDATE_SECONDS },
    }),
  ]);

  if (
    !trendingRes1.ok ||
    !trendingRes2.ok ||
    !movieRes.ok ||
    !tvRes.ok
  ) {
    throw new Error("TMDB API error");
  }

  const [trendingData1, trendingData2, movieData, tvData] =
    (await Promise.all([
      trendingRes1.json(),
      trendingRes2.json(),
      movieRes.json(),
      tvRes.json(),
    ])) as [TMDBResponse, TMDBResponse, TMDBResponse, TMDBResponse];

  const trendingMerged = dedupeTrendingResults([
    ...(trendingData1.results ?? []),
    ...(trendingData2.results ?? []),
  ]);
  const trendingRaw = trendingMerged.filter(
    (r) =>
      r.poster_path &&
      (r.media_type === "movie" || r.media_type === "tv") &&
      !(r.media_type === "tv" && isLikelyAnime(r))
  );
  const trending: TMDBMediaItem[] = trendingRaw
    .slice(0, TRENDING_LIMIT)
    .map((r) =>
      toMediaItem(r, r.media_type === "tv" ? "tv" : "movie")
    );

  const movieRaw = (movieData.results ?? []).filter((r) => r.poster_path);
  const tvRaw = (tvData.results ?? []).filter(
    (r) => r.poster_path && !isLikelyAnime(r)
  );
  const popularRaw = [
    ...movieRaw
      .slice(0, POPULAR_MOVIES_LIMIT)
      .map((r) => ({ ...r, media_type: "movie" })),
    ...tvRaw
      .slice(0, POPULAR_TV_LIMIT)
      .map((r) => ({ ...r, media_type: "tv" })),
  ];
  const popular: TMDBMediaItem[] = popularRaw.map((r) =>
    toMediaItem(r, r.media_type === "tv" ? "tv" : "movie")
  );

  let trendingAnime: TMDBMediaItem[] = [];
  let popularAnime: TMDBMediaItem[] = [];
  try {
    const animeData = await getDiscoverAnime();
    trendingAnime = animeData.trending.map((a) => ({
      id: a.id,
      type: "anime" as const,
      title: a.title,
      posterUrl: a.posterUrl,
      rating: a.rating,
      releaseDate: a.releaseDate,
      overview: a.overview,
    }));
    popularAnime = animeData.popular.map((a) => ({
      id: a.id,
      type: "anime" as const,
      title: a.title,
      posterUrl: a.posterUrl,
      rating: a.rating,
      releaseDate: a.releaseDate,
      overview: a.overview,
    }));
  } catch (err) {
    if (isAnilistGlobalOutageError(err)) {
      console.warn("Discover anime: AniList API temporarily unavailable.");
    } else {
      console.error("Discover anime fetch error:", err);
    }
  }

  return { trending, popular, trendingAnime, popularAnime };
}

export async function getTrendingMedia(): Promise<{
  trending: TMDBMediaItem[];
  popular: TMDBMediaItem[];
  trendingAnime: TMDBMediaItem[];
  popularAnime: TMDBMediaItem[];
}> {
  return unstable_cache(
    fetchTrendingData,
    ["discover-trending-media"],
    { revalidate: REVALIDATE_SECONDS }
  )();
}
