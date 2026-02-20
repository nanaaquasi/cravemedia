const TMDB_BASE = "https://api.themoviedb.org/3";
const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p";

interface TMDBSearchResult {
  id: number;
  title?: string;
  name?: string;
  poster_path: string | null;
  vote_average: number;
  release_date?: string;
  first_air_date?: string;
  runtime?: number;
  media_type?: string;
  overview?: string;
}

interface TMDBDetails {
  id: number;
  runtime?: number;
  number_of_seasons?: number;
  episode_run_time?: number[];
  vote_average: number;
  poster_path: string | null;
}

async function tmdbFetch<T>(
  endpoint: string,
  params: Record<string, string> = {},
): Promise<T> {
  const url = new URL(`${TMDB_BASE}${endpoint}`);
  url.searchParams.set("api_key", process.env.TMDB_API_KEY!);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`TMDB API error: ${res.status}`);
  }
  return res.json();
}

export function getPosterUrl(
  path: string | null,
  size: "w200" | "w500" | "original" = "w500",
): string | null {
  console.log(path);
  if (!path) return null;
  return `${TMDB_IMAGE_BASE}/${size}${path}`;
}

interface TMDBSearchResponse {
  results: TMDBSearchResult[];
}

export async function searchMovie(
  title: string,
  year?: number,
): Promise<TMDBSearchResult[]> {
  const params: Record<string, string> = { query: title };
  if (year) params.year = year.toString();

  const data = await tmdbFetch<TMDBSearchResponse>("/search/movie", params);

  console.log(data.results);
  return data.results || [];
}

export async function searchTV(
  title: string,
  year?: number,
): Promise<TMDBSearchResult[]> {
  const params: Record<string, string> = { query: title };
  if (year) params.first_air_date_year = year.toString();

  const data = await tmdbFetch<TMDBSearchResponse>("/search/tv", params);
  console.log(data.results);
  return data.results || [];
}

export async function getMovieDetails(id: number): Promise<TMDBDetails> {
  return tmdbFetch<TMDBDetails>(`/movie/${id}`);
}

export async function getTVDetails(id: number): Promise<TMDBDetails> {
  return tmdbFetch<TMDBDetails>(`/tv/${id}`);
}

// Detail page types
export interface TMDBVideo {
  key: string;
  type: string;
  site: string;
  name: string;
}

export interface TMDBCrewMember {
  name: string;
  job: string;
}

export interface TMDBGenre {
  id: number;
  name: string;
}

export interface MediaDetailsResponse {
  title: string;
  overview: string | null;
  posterPath: string | null;
  backdropPath: string | null;
  voteAverage: number;
  voteCount: number;
  releaseDate: string | null;
  runtime: string | null;
  genres: string[];
  directors: string[];
  trailerKey: string | null;
  type: "movie" | "tv";
}

interface TMDBDetailsWithAppend {
  title?: string;
  name?: string;
  overview: string | null;
  poster_path: string | null;
  backdrop_path: string | null;
  vote_average: number;
  vote_count: number;
  release_date?: string;
  first_air_date?: string;
  runtime?: number;
  number_of_seasons?: number;
  episode_run_time?: number[];
  genres?: TMDBGenre[];
  videos?: { results: TMDBVideo[] };
  credits?: { crew: TMDBCrewMember[] };
}

export async function getMediaDetails(
  type: "movie" | "tv",
  id: number,
): Promise<MediaDetailsResponse> {
  const endpoint = type === "movie" ? `/movie/${id}` : `/tv/${id}`;
  const data = await tmdbFetch<TMDBDetailsWithAppend>(endpoint, {
    append_to_response: "videos,credits",
  });

  const title = data.title ?? data.name ?? "";
  const releaseDate = data.release_date ?? data.first_air_date ?? null;
  const trailer =
    data.videos?.results?.find(
      (v) =>
        v.site === "YouTube" && (v.type === "Trailer" || v.type === "Teaser"),
    ) ?? data.videos?.results?.find((v) => v.site === "YouTube");
  const directors =
    data.credits?.crew
      ?.filter((c) => c.job === "Director")
      .map((c) => c.name) ?? [];
  const genres = data.genres?.map((g) => g.name) ?? [];

  let runtime: string | null = null;
  if (type === "movie" && data.runtime) {
    runtime = `${data.runtime} min`;
  } else if (type === "tv") {
    if (data.number_of_seasons) {
      runtime = `${data.number_of_seasons} season${data.number_of_seasons > 1 ? "s" : ""}`;
    } else if (data.episode_run_time?.[0]) {
      runtime = `${data.episode_run_time[0]} min/ep`;
    }
  }

  return {
    title,
    overview: data.overview || null,
    posterPath: data.poster_path,
    backdropPath: data.backdrop_path,
    voteAverage: data.vote_average ?? 0,
    voteCount: data.vote_count ?? 0,
    releaseDate,
    runtime,
    genres,
    directors,
    trailerKey: trailer?.key ?? null,
    type,
  };
}

/** Normalize title for fuzzy matching */
function normalizeTitle(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Score how well a TMDB result matches our search (0-1) */
function matchScore(
  searchTitle: string,
  searchYear: number,
  result: TMDBSearchResult,
  type: "movie" | "tv",
): number {
  const resultTitle = (result.title ?? result.name ?? "").toLowerCase();
  const normSearch = normalizeTitle(searchTitle);
  const normResult = normalizeTitle(resultTitle);

  // Exact match
  if (normResult === normSearch) return 1;
  // Result contains search (e.g. "Babylon 5" in "Babylon 5: The Lost Tales")
  if (normResult.startsWith(normSearch) || normSearch.startsWith(normResult))
    return 0.9;

  // Year check for relevance
  const resultYear =
    type === "movie"
      ? result.release_date?.slice(0, 4)
      : result.first_air_date?.slice(0, 4);
  const yearMatch =
    resultYear && Math.abs(parseInt(resultYear, 10) - searchYear) <= 2;

  return yearMatch ? 0.7 : 0.5;
}

/** Pick best result from array by title/year match */
function pickBestResult(
  results: TMDBSearchResult[],
  title: string,
  year: number,
  type: "movie" | "tv",
): TMDBSearchResult | null {
  if (results.length === 0) return null;
  if (results.length === 1) return results[0];

  let best = results[0];
  let bestScore = matchScore(title, year, best, type);

  for (let i = 1; i < results.length; i++) {
    const score = matchScore(title, year, results[i], type);
    if (score > bestScore) {
      bestScore = score;
      best = results[i];
    }
  }
  return best;
}

/** Try alternate title variants for better TMDB matching */
function getTitleVariants(title: string): string[] {
  const variants = [title.trim()];
  const lower = title.toLowerCase().trim();
  if (lower.startsWith("the ")) variants.push(lower.slice(4));
  else if (lower.startsWith("a ")) variants.push(lower.slice(2));
  else if (lower.startsWith("an ")) variants.push(lower.slice(3));
  return [...new Set(variants)];
}

async function findBestMatch(
  title: string,
  year: number,
  type: "movie" | "tv",
): Promise<{ result: TMDBSearchResult; details: TMDBDetails } | null> {
  const searchFn = type === "movie" ? searchMovie : searchTV;
  const detailsFn = type === "movie" ? getMovieDetails : getTVDetails;

  const tryWithResults = async (
    results: TMDBSearchResult[],
  ): Promise<{ result: TMDBSearchResult; details: TMDBDetails } | null> => {
    const result = pickBestResult(results, title, year, type);
    if (!result) return null;
    const details = await detailsFn(result.id);
    return { result, details };
  };

  // Strategy 1: Exact title + year
  let results = await searchFn(title, year);
  if (results.length > 0) {
    const match = await tryWithResults(results);
    if (match) return match;
  }

  // Strategy 2: Title without year (AI year can be off)
  results = await searchFn(title);
  if (results.length > 0) {
    const match = await tryWithResults(results);
    if (match) return match;
  }

  // Strategy 3: Year ±1 for TV (e.g. Babylon 5 pilot 1993, series 1994)
  if (type === "tv" && year) {
    for (const y of [year - 1, year + 1]) {
      if (y < 1000 || y > 9999) continue;
      results = await searchFn(title, y);
      if (results.length > 0) {
        const match = await tryWithResults(results);
        if (match) return match;
      }
    }
  }

  // Strategy 4: Alternate title variants
  for (const variant of getTitleVariants(title)) {
    if (variant === title) continue;
    results = await searchFn(variant, year);
    if (results.length === 0) results = await searchFn(variant);
    if (results.length > 0) {
      const match = await tryWithResults(results);
      if (match) return match;
    }
  }

  // Strategy 5: Multi-search fallback (searches movies + TV + people)
  const multiData = await tmdbFetch<{ results: TMDBSearchResult[] }>(
    "/search/multi",
    { query: title },
  );
  const multiResults = (multiData.results || []).filter(
    (r) => r.media_type === type || (!r.media_type && type === "movie"),
  );
  if (multiResults.length > 0) {
    const match = await tryWithResults(multiResults);
    if (match) return match;
  }

  return null;
}

export async function enrichMovieOrTV(
  title: string,
  year: number,
  type: "movie" | "tv",
): Promise<{
  posterUrl: string | null;
  rating: number | null;
  runtime: string | null;
  externalId: string | null;
}> {
  try {
    const match = await findBestMatch(title, year, type);
    if (!match) {
      return {
        posterUrl: null,
        rating: null,
        runtime: null,
        externalId: null,
      };
    }

    const { result, details } = match;
    const posterPath = result.poster_path ?? details.poster_path;
    const runtime =
      type === "movie"
        ? details.runtime
          ? `${details.runtime} min`
          : null
        : details.number_of_seasons
          ? `${details.number_of_seasons} season${details.number_of_seasons > 1 ? "s" : ""}`
          : null;

    return {
      posterUrl: getPosterUrl(posterPath),
      rating:
        Math.round((result.vote_average || details.vote_average) * 10) / 10,
      runtime,
      externalId: result.id.toString(),
    };
  } catch {
    return { posterUrl: null, rating: null, runtime: null, externalId: null };
  }
}
