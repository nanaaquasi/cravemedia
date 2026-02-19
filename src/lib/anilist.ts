const ANILIST_API_URL = "https://graphql.anilist.co";

interface AnilistMedia {
  id: number;
  title: {
    romaji: string;
    english: string | null;
    native: string;
  };
  coverImage: {
    large: string;
    medium: string;
  };
  startDate: {
    year: number;
  };
  averageScore: number;
  episodes: number | null;
  duration: number | null;
  format: string;
  description: string | null;
  genres: string[];
  siteUrl: string;
}

interface AnilistResponse<T> {
  data: T;
  errors?: any[];
}

async function anilistFetch<T>(
  query: string,
  variables: Record<string, any> = {},
): Promise<T> {
  const res = await fetch(ANILIST_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!res.ok) {
    throw new Error(`Anilist API error: ${res.status}`);
  }

  const json = (await res.json()) as AnilistResponse<T>;
  if (json.errors) {
    console.error("Anilist GraphQL Errors:", json.errors);
    throw new Error("Anilist GraphQL Error");
  }

  return json.data;
}

const SEARCH_QUERY = `
  query ($search: String) {
    Page(page: 1, perPage: 10) {
      media(search: $search, type: ANIME, sort: SEARCH_MATCH) {
        id
        title {
          romaji
          english
          native
        }
        coverImage {
          large
        }
        startDate {
          year
        }
        averageScore
        episodes
        format
      }
    }
  }
`;

const DETAILS_QUERY = `
  query ($id: Int) {
    Media(id: $id, type: ANIME) {
      id
      title {
        romaji
        english
        native
      }
      coverImage {
        large
      }
      startDate {
        year
      }
      averageScore
      episodes
      duration
      format
      description
      genres
      siteUrl
      studios(isMain: true) {
        nodes {
          name
        }
      }
    }
  }
`;

export interface AnimeSearchResult {
  id: number;
  title: string;
  posterUrl: string | null;
  year: number | null;
  rating: number | null;
  episodes: number | null;
  format: string;
}

export interface AnimeDetails extends AnimeSearchResult {
  description: string | null;
  genres: string[];
  duration: number | null;
  studios: string[];
  externalUrl: string;
}

function getTitle(media: AnilistMedia): string {
  return media.title.english || media.title.romaji || media.title.native;
}

export async function searchAnime(query: string): Promise<AnimeSearchResult[]> {
  try {
    const data = await anilistFetch<{ Page: { media: AnilistMedia[] } }>(
      SEARCH_QUERY,
      {
        search: query,
      },
    );

    return data.Page.media.map((media) => ({
      id: media.id,
      title: getTitle(media),
      posterUrl: media.coverImage.large,
      year: media.startDate.year,
      rating: media.averageScore,
      episodes: media.episodes,
      format: media.format,
    }));
  } catch (error) {
    console.error("Error searching anime:", error);
    return [];
  }
}

export async function getAnimeDetails(
  id: number,
): Promise<AnimeDetails | null> {
  try {
    const data = await anilistFetch<{
      Media: AnilistMedia & { studios: { nodes: { name: string }[] } };
    }>(DETAILS_QUERY, {
      id,
    });
    const media = data.Media;

    return {
      id: media.id,
      title: getTitle(media),
      posterUrl: media.coverImage.large,
      year: media.startDate.year,
      rating: media.averageScore,
      episodes: media.episodes,
      format: media.format,
      description: media.description,
      genres: media.genres,
      duration: media.duration,
      studios: media.studios.nodes.map((s) => s.name),
      externalUrl: media.siteUrl,
    };
  } catch (error) {
    console.error("Error fetching anime details:", error);
    return null;
  }
}

/** Function to verify if a search result matches the AI recommendation */
function matchScore(
  searchTitle: string,
  searchYear: number,
  result: AnimeSearchResult,
): number {
  const resultTitle = result.title.toLowerCase();
  const normSearch = searchTitle
    .toLowerCase()
    .replaceAll(/[^\w\s]/g, "")
    .trim();
  const normResult = resultTitle.replaceAll(/[^\w\s]/g, "").trim();

  // Exact match
  if (normResult === normSearch) return 1;
  // Contains
  if (normResult.includes(normSearch) || normSearch.includes(normResult))
    return 0.9;

  // Year check
  if (result.year && Math.abs(result.year - searchYear) <= 1) return 0.8;

  return 0.5;
}

export async function enrichAnime(
  title: string,
  year: number,
): Promise<{
  posterUrl: string | null;
  rating: number | null;
  runtime: string | null;
  externalId: string | null;
}> {
  try {
    const results = await searchAnime(title);
    if (!results.length) {
      return { posterUrl: null, rating: null, runtime: null, externalId: null };
    }

    // Find best match
    let best = results[0];
    let bestScore = matchScore(title, year, best);

    for (let i = 1; i < results.length; i++) {
      const score = matchScore(title, year, results[i]);
      if (score > bestScore) {
        bestScore = score;
        best = results[i];
      }
    }

    if (bestScore < 0.6) {
      // Allow loose matching if year is close, but generally stricter for anime due to many similar titles
      // If logic needs relaxed, adjust here.
    }

    const runtime = best.episodes
      ? `${best.episodes} eps`
      : best.format === "MOVIE"
        ? "Movie"
        : null;

    return {
      posterUrl: best.posterUrl,
      // Convert 1-100 to 1-10 scale to match TMDB
      rating: best.rating ? best.rating / 10 : null,
      runtime,
      externalId: best.id.toString(),
    };
  } catch (error) {
    console.error("Error enriching anime:", error);
    return { posterUrl: null, rating: null, runtime: null, externalId: null };
  }
}
