export interface SimklMetadata {
  simkl_id: number;
  title: string;
  year: number;
  type: string;
  ratings?: {
    simkl?: {
      rating: number;
      votes: number;
    };
    imdb?: {
      rating: number;
      votes: number;
    };
    mal?: {
      rating: number;
      votes: number;
    };
  };
  trailers?: Array<{
    name: string;
    youtube: string;
  }>;
}

const getSimklClientId = () => process.env.SIMKL_CLIENT_ID;

export async function enhanceWithSimklData(
  tmdbId: number,
  type: "movie" | "tv"
): Promise<SimklMetadata | null> {
  const clientId = getSimklClientId();
  
  if (!clientId) {
    // Graceful fallback if no SIMKL credentials are intentionally configured
    return null;
  }

  try {
    // 1. Search SIMKL by TMDB ID
    const searchRes = await fetch(
      `https://api.simkl.com/search/id?tmdb=${tmdbId}&client_id=${clientId}`
    );
    
    if (!searchRes.ok) return null;
    
    const searchData = await searchRes.json();
    if (!searchData || searchData.length === 0) return null;

    // SIMKL returns an array of matches. Grab the first one matching our type (movie or show)
    const simklMatch = searchData.find(
      (item: any) =>
        (type === "movie" && item.type === "movie") ||
        (type === "tv" && (item.type === "tv" || item.type === "anime"))
    );

    if (!simklMatch || !simklMatch.ids || !simklMatch.ids.simkl) {
      return null;
    }

    const simklId = simklMatch.ids.simkl;

    // 2. Fetch full details from SIMKL using their ID to get extended ratings/trailers
    const simklTypeEndpoint = type === "movie" ? "movies" : "tv";
    const detailsRes = await fetch(
      `https://api.simkl.com/${simklTypeEndpoint}/${simklId}?client_id=${clientId}&extended=full`
    );

    if (!detailsRes.ok) return null;

    const detailsData = await detailsRes.json();

    return {
      simkl_id: simklId,
      title: detailsData.title,
      year: detailsData.year,
      type: detailsData.type,
      ratings: detailsData.ratings,
      trailers: detailsData.trailers,
    };
  } catch (error) {
    console.warn("Failed to fetch SIMKL enhanced metadata:", error);
    return null;
  }
}
