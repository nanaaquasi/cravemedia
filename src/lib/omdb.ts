/**
 * OMDb API - fetches IMDb ratings for movies, TV shows, and episodes.
 * Free API key at https://www.omdbapi.com/
 */

const OMDb_BASE = "https://www.omdbapi.com";

export interface OMDbResponse {
  imdbRating?: string;
  imdbID?: string;
  Response?: string;
}

/**
 * Fetch IMDb rating by IMDb ID (e.g. tt0111161).
 * Returns null if no API key, not found, or error.
 */
export async function getImdbRating(
  imdbId: string,
): Promise<number | null> {
  const key = process.env.OMDB_API_KEY;
  if (!key || !imdbId?.startsWith("tt")) return null;

  try {
    const url = new URL(OMDb_BASE);
    url.searchParams.set("i", imdbId.trim());
    url.searchParams.set("apikey", key);

    const res = await fetch(url.toString());
    if (!res.ok) return null;

    const data = (await res.json()) as OMDbResponse;
    if (data.Response === "False" || !data.imdbRating) return null;

    const parsed = Number.parseFloat(data.imdbRating);
    return Number.isNaN(parsed) ? null : Math.round(parsed * 10) / 10;
  } catch {
    return null;
  }
}

/**
 * Fetch IMDb rating for a specific TV episode.
 * Uses series IMDb ID + season + episode (e.g. i=tt0944947&Season=1&Episode=1).
 * Returns null if no API key, not found, or error.
 */
export async function getImdbEpisodeRating(
  seriesImdbId: string,
  season: number,
  episode: number,
): Promise<number | null> {
  const key = process.env.OMDB_API_KEY;
  if (!key || !seriesImdbId?.startsWith("tt")) return null;

  try {
    const url = new URL(OMDb_BASE);
    url.searchParams.set("i", seriesImdbId.trim());
    url.searchParams.set("Season", String(season));
    url.searchParams.set("Episode", String(episode));
    url.searchParams.set("apikey", key);

    const res = await fetch(url.toString());
    if (!res.ok) return null;

    const data = (await res.json()) as OMDbResponse;
    if (data.Response === "False" || !data.imdbRating) return null;

    const parsed = Number.parseFloat(data.imdbRating);
    return Number.isNaN(parsed) ? null : Math.round(parsed * 10) / 10;
  } catch {
    return null;
  }
}
