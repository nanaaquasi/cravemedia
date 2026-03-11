const ANILIST_API_URL = "https://graphql.anilist.co";

/** Anilist rate limit: ~30 req/min when degraded. Serialize requests to avoid 429. */
const ANILIST_MIN_INTERVAL_MS = 2100; // ~28 req/min
let lastRequestTime = 0;
let queue: Promise<void> = Promise.resolve();

async function withRateLimit<T>(fn: () => Promise<T>): Promise<T> {
  const prev = queue;
  let resolveNext!: () => void;
  queue = new Promise<void>((r) => {
    resolveNext = r;
  });
  await prev;
  const now = Date.now();
  const wait = Math.max(0, ANILIST_MIN_INTERVAL_MS - (now - lastRequestTime));
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastRequestTime = Date.now();
  try {
    return await fn();
  } finally {
    resolveNext();
  }
}

interface AnilistMedia {
  id: number;
  title: {
    romaji: string;
    english: string | null;
    native: string;
  };
  coverImage?: {
    large?: string | null;
    medium?: string | null;
  } | null;
  bannerImage?: string | null;
  startDate?: {
    year: number | null;
    month: number | null;
    day: number | null;
  };
  averageScore: number;
  popularity?: number | null;
  episodes: number | null;
  duration: number | null;
  format: string;
  description: string | null;
  genres: string[];
  status?: string | null;
  source?: string | null;
  siteUrl: string;
  trailer?: {
    id: string | null;
    site: string | null;
  } | null;
  studios?: { nodes: { name: string }[] };
  characters?: {
    edges: Array<{
      node: {
        id: number;
        name: { userPreferred?: string | null; full?: string | null };
      };
      voiceActors: Array<{
        id: number;
        name: { userPreferred?: string | null; full?: string | null };
        image?: { large?: string | null } | null;
        siteUrl?: string | null;
      }>;
    }>;
  };
  recommendations?: {
    edges: Array<{
      node: {
        mediaRecommendation: {
          id: number;
          title: { romaji?: string | null; english?: string | null };
          coverImage?: { large?: string | null } | null;
          averageScore?: number | null;
        } | null;
      };
    }>;
  };
  relations?: {
    edges: Array<{
      relationType: string;
      node: {
        id: number;
        type: string;
        title: { romaji?: string | null; english?: string | null };
        coverImage?: { large?: string | null; medium?: string | null } | null;
        averageScore?: number | null;
        startDate?: { year?: number | null } | null;
        episodes?: number | null;
        relations?: {
          edges: Array<{
            relationType: string;
            node: {
              id: number;
              type: string;
              title: { romaji?: string | null; english?: string | null };
              coverImage?: { large?: string | null; medium?: string | null } | null;
              averageScore?: number | null;
              startDate?: { year?: number | null } | null;
              episodes?: number | null;
            };
          }>;
        };
      };
    }>;
  };
}

interface AnilistResponse<T> {
  data: T;
  errors?: any[];
}

async function anilistFetch<T>(
  query: string,
  variables: Record<string, any> = {},
): Promise<T> {
  return withRateLimit(async () => {
    const doFetch = async (retriesLeft = 2): Promise<T> => {
      const res = await fetch(ANILIST_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ query, variables }),
      });

      if (res.status === 429 && retriesLeft > 0) {
        const retryAfter = res.headers.get("Retry-After");
        const waitMs = retryAfter
          ? Math.min(parseInt(retryAfter, 10) * 1000, 60000)
          : 60000;
        await new Promise((r) => setTimeout(r, waitMs));
        return doFetch(retriesLeft - 1);
      }

      if (!res.ok) {
        throw new Error(`Anilist API error: ${res.status}`);
      }

      const json = (await res.json()) as AnilistResponse<T>;
      if (json.errors) {
        console.error("Anilist GraphQL Errors:", json.errors);
        throw new Error("Anilist GraphQL Error");
      }

      return json.data;
    };

    return doFetch();
  });
}

const DISCOVER_ANIME_QUERY = `
  query {
    trending: Page(page: 1, perPage: 20) {
      media(type: ANIME, sort: [TRENDING_DESC]) {
        id
        title { romaji english native }
        coverImage { large medium }
        startDate { year month day }
        averageScore
      }
    }
    popular: Page(page: 1, perPage: 20) {
      media(type: ANIME, sort: [POPULARITY_DESC]) {
        id
        title { romaji english native }
        coverImage { large medium }
        startDate { year month day }
        averageScore
      }
    }
  }
`;

const SEARCH_QUERY = `
  query ($search: String) {
    Page(page: 1, perPage: 50) {
      media(search: $search, type: ANIME, sort: SEARCH_MATCH) {
        id
        title {
          romaji
          english
          native
        }
        coverImage {
          large
          medium
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
      bannerImage
      startDate {
        year
        month
        day
      }
      averageScore
      popularity
      episodes
      duration
      format
      description
      genres
      status
      source
      siteUrl
      trailer {
        id
        site
      }
      studios(isMain: true) {
        nodes {
          name
        }
      }
      characters(perPage: 12, sort: [ROLE, RELEVANCE]) {
        edges {
          node {
            id
            name {
              userPreferred
              full
            }
          }
          voiceActors(sort: [RELEVANCE]) {
            id
            name {
              userPreferred
              full
            }
            image {
              large
            }
            siteUrl
          }
        }
      }
      recommendations(perPage: 12, sort: RATING_DESC) {
        edges {
          node {
            mediaRecommendation {
              id
              title {
                romaji
                english
              }
              coverImage {
                large
              }
              averageScore
            }
          }
        }
      }
      relations {
        edges {
          relationType
          node {
            id
            type
            title {
              romaji
              english
            }
            coverImage {
              large
              medium
            }
            averageScore
            startDate {
              year
            }
            episodes
            relations {
              edges {
                relationType
                node {
                  id
                  type
                  title {
                    romaji
                    english
                  }
                  coverImage {
                    large
                    medium
                  }
                  averageScore
                  startDate {
                    year
                  }
                  episodes
                  relations {
                    edges {
                      relationType
                      node {
                        id
                        type
                        title {
                          romaji
                          english
                        }
                        coverImage {
                          large
                          medium
                        }
                        averageScore
                        startDate {
                          year
                        }
                        episodes
                        relations {
                          edges {
                            relationType
                            node {
                              id
                              type
                              title {
                                romaji
                                english
                              }
                              coverImage {
                                large
                                medium
                              }
                              averageScore
                              startDate {
                                year
                              }
                              episodes
                              relations {
                                edges {
                                  relationType
                                  node {
                                    id
                                    type
                                    title {
                                      romaji
                                      english
                                    }
                                    coverImage {
                                      large
                                      medium
                                    }
                                    averageScore
                                    startDate {
                                      year
                                    }
                                    episodes
                                  }
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
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

export interface AnimeCastMember {
  id: number;
  name: string;
  character: string;
  profileUrl: string | null;
  personUrl: string | null;
}

export interface AnimeRecommendedTitle {
  id: number;
  title: string;
  posterUrl: string | null;
  voteAverage: number;
  type: "anime";
}

export interface AnimeRelation {
  id: number;
  title: string;
  posterUrl: string | null;
  voteAverage: number;
  relationType: "PREQUEL" | "SEQUEL" | "SIDE_STORY" | "PARENT";
  year: number | null;
  episodes: number | null;
}

export interface AnimeDetails extends AnimeSearchResult {
  description: string | null;
  genres: string[];
  duration: number | null;
  studios: string[];
  externalUrl: string;
  bannerImage: string | null;
  trailerKey: string | null;
  status: string | null;
  releaseDate: string | null;
  popularity: number;
  source: string | null;
  cast: AnimeCastMember[];
  recommendations: AnimeRecommendedTitle[];
  relations: AnimeRelation[];
}

function getTitle(media: AnilistMedia): string {
  return media.title.english || media.title.romaji || media.title.native;
}

/** Extract franchise base title for search (e.g. "My Hero Academia" from "My Hero Academia 7th Season") */
function extractFranchiseTitle(title: string): string | null {
  const t = title.trim();
  if (!t) return null;
  const match = t.match(
    /^(.+?)(?:\s+(?:Season|Part)\s*\d+|(?:\s+\d+(?:st|nd|rd|th)\s+Season)|(?:\s*:\s*[^:]+))$/i,
  );
  return match ? match[1].trim() : t;
}

/** Check if a title belongs to the same franchise (filters out movies, spin-offs with different names) */
function isSameFranchise(
  resultTitle: string,
  currentTitle: string,
  franchiseBase: string,
): boolean {
  const base = franchiseBase.toLowerCase();
  const result = resultTitle.toLowerCase();
  if (!result.includes(base)) return false;
  if (result === currentTitle.toLowerCase()) return false;
  const moviePattern = /(?:movie|film|two heroes|world heroes|heroes rising|world heroes' mission)/i;
  if (moviePattern.test(resultTitle)) return false;
  return true;
}

export interface DiscoverAnimeItem {
  id: string;
  type: "anime";
  title: string;
  posterUrl: string | null;
  rating: number | null;
  releaseDate: string | null;
  overview: string | null;
}

export async function getDiscoverAnime(): Promise<{
  trending: DiscoverAnimeItem[];
  popular: DiscoverAnimeItem[];
}> {
  try {
    const data = await anilistFetch<{
      trending: { media: AnilistMedia[] };
      popular: { media: AnilistMedia[] };
    }>(DISCOVER_ANIME_QUERY, {});

    const toItem = (media: AnilistMedia): DiscoverAnimeItem => {
      const sd = media.startDate;
      const releaseDate =
        sd?.year && sd?.month && sd?.day
          ? `${sd.year}-${String(sd.month).padStart(2, "0")}-${String(sd.day).padStart(2, "0")}`
          : sd?.year
            ? `${sd.year}-01-01`
            : null;
      return {
        id: String(media.id),
        type: "anime",
        title: getTitle(media),
        posterUrl: media.coverImage?.large ?? media.coverImage?.medium ?? null,
        rating: media.averageScore ?? null,
        releaseDate,
        overview: null,
      };
    };

    return {
      trending: (data.trending?.media ?? []).map(toItem),
      popular: (data.popular?.media ?? []).map(toItem),
    };
  } catch (error) {
    console.error("Error fetching discover anime:", error);
    return { trending: [], popular: [] };
  }
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
      posterUrl: media.coverImage?.large ?? media.coverImage?.medium ?? null,
      year: media.startDate?.year ?? null,
      rating: media.averageScore,
      episodes: media.episodes,
      format: media.format,
    }));
  } catch (error) {
    console.error("Error searching anime:", error);
    return [];
  }
}

const STATUS_LABELS: Record<string, string> = {
  FINISHED: "Finished",
  RELEASING: "Ongoing",
  NOT_YET_RELEASED: "Not Yet Released",
  CANCELLED: "Cancelled",
  HIATUS: "Hiatus",
};

const SOURCE_LABELS: Record<string, string> = {
  ORIGINAL: "Original",
  MANGA: "Manga",
  LIGHT_NOVEL: "Light Novel",
  VISUAL_NOVEL: "Visual Novel",
  VIDEO_GAME: "Video Game",
  OTHER: "Other",
  NOVEL: "Novel",
  DOUJINSHI: "Doujinshi",
  ANIME: "Anime",
  WEB_MANGA: "Web Manga",
  FOUR_KOMA_MANGA: "4-Koma Manga",
};

export async function getAnimeDetails(
  id: number,
): Promise<AnimeDetails | null> {
  try {
    const data = await anilistFetch<{ Media: AnilistMedia }>(
      DETAILS_QUERY,
      { id },
    );
    const media = data.Media;

    const cast: AnimeCastMember[] = [];
    for (const edge of media.characters?.edges ?? []) {
      const va = edge.voiceActors?.[0];
      const charName =
        edge.node?.name?.userPreferred ??
        edge.node?.name?.full ??
        "Unknown";
      if (va) {
        cast.push({
          id: va.id,
          name: va.name?.userPreferred ?? va.name?.full ?? "Unknown",
          character: charName,
          profileUrl: va.image?.large ?? null,
          personUrl: va.siteUrl ?? null,
        });
      }
    }

    const recs: AnimeRecommendedTitle[] = [];
    for (const edge of media.recommendations?.edges ?? []) {
      const rec = edge.node?.mediaRecommendation;
      if (!rec) continue;
      recs.push({
        id: rec.id,
        title: rec.title?.english ?? rec.title?.romaji ?? "Unknown",
        posterUrl: rec.coverImage?.large ?? null,
        voteAverage: rec.averageScore ? rec.averageScore / 10 : 0,
        type: "anime",
      });
    }
    const relationTypes = new Set(["SEQUEL", "PREQUEL", "SIDE_STORY", "ADAPTATION"]);
    for (const edge of media.relations?.edges ?? []) {
      if (recs.length >= 12) break;
      if (!relationTypes.has(edge.relationType)) continue;
      const node = edge.node;
      if (node.type !== "ANIME") continue;
      if (recs.some((r) => r.id === node.id)) continue;
      recs.push({
        id: node.id,
        title: node.title?.english ?? node.title?.romaji ?? "Unknown",
        posterUrl: node.coverImage?.large ?? null,
        voteAverage: node.averageScore ? node.averageScore / 10 : 0,
        type: "anime",
      });
    }

    const seasonRelationTypes = ["PREQUEL", "PARENT", "SEQUEL", "SIDE_STORY"] as const;
    const seenIds = new Set<number>();
    const relations: AnimeRelation[] = [];

    type RelationNode = NonNullable<
      NonNullable<AnilistMedia["relations"]>["edges"][number]["node"]
    >;
    function addRelation(node: RelationNode, relationType: string) {
      if (!node || node.type !== "ANIME" || seenIds.has(node.id)) return;
      if (!seasonRelationTypes.includes(relationType as (typeof seasonRelationTypes)[number]))
        return;
      seenIds.add(node.id);
      relations.push({
        id: node.id,
        title: node.title?.english ?? node.title?.romaji ?? "Unknown",
        posterUrl: node.coverImage?.large ?? node.coverImage?.medium ?? null,
        voteAverage: node.averageScore ? node.averageScore / 10 : 0,
        relationType: relationType as AnimeRelation["relationType"],
        year: node.startDate?.year ?? null,
        episodes: node.episodes ?? null,
      });
    }

    function collectFromEdges(
      edges: Array<{ relationType: string; node: RelationNode }>,
    ) {
      for (const edge of edges) {
        addRelation(edge.node, edge.relationType);
        const nested = (edge.node as { relations?: { edges: typeof edges } }).relations?.edges;
        if (nested?.length) collectFromEdges(nested);
      }
    }

    for (const edge of media.relations?.edges ?? []) {
      const node = edge.node;
      addRelation(node, edge.relationType);
      collectFromEdges(node.relations?.edges ?? []);
    }

    // Fallback: search by franchise title to get full season chain (Anilist relations
    // are often incomplete - e.g. Season 1 only links to Season 2, not 3–7)
    const franchiseTitle = extractFranchiseTitle(getTitle(media));
    if (franchiseTitle) {
      const searchResults = await searchAnime(franchiseTitle);
      const currentYear = media.startDate?.year ?? 0;
      for (const result of searchResults) {
        if (result.id === media.id || seenIds.has(result.id)) continue;
        if (result.format !== "TV") continue;
        if (!isSameFranchise(result.title, getTitle(media), franchiseTitle))
          continue;
        seenIds.add(result.id);
        const relYear = result.year ?? 0;
        const relationType: AnimeRelation["relationType"] =
          relYear < currentYear ? "PREQUEL" : "SEQUEL";
        relations.push({
          id: result.id,
          title: result.title,
          posterUrl: result.posterUrl,
          voteAverage: result.rating ? result.rating / 10 : 0,
          relationType,
          year: result.year,
          episodes: result.episodes,
        });
      }
    }

    relations.sort((a, b) => {
      const order = { PREQUEL: 0, PARENT: 1, SEQUEL: 2, SIDE_STORY: 3 };
      const orderDiff = (order[a.relationType] ?? 4) - (order[b.relationType] ?? 4);
      if (orderDiff !== 0) return orderDiff;
      return (a.year ?? 0) - (b.year ?? 0);
    });

    const year = media.startDate?.year ?? null;
    const month = media.startDate?.month ?? null;
    const day = media.startDate?.day ?? null;
    let releaseDate: string | null = null;
    if (year && month && day) {
      releaseDate = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    } else if (year) {
      releaseDate = `${year}-01-01`;
    }

    const trailerKey =
      media.trailer?.site === "youtube" && media.trailer?.id
        ? media.trailer.id
        : null;

    return {
      id: media.id,
      title: getTitle(media),
      posterUrl: media.coverImage?.large ?? media.coverImage?.medium ?? null,
      year: year ?? null,
      rating: media.averageScore,
      episodes: media.episodes,
      format: media.format,
      description: media.description,
      genres: media.genres,
      duration: media.duration,
      studios: media.studios?.nodes?.map((s) => s.name) ?? [],
      externalUrl: media.siteUrl,
      bannerImage: media.bannerImage ?? null,
      trailerKey,
      status: media.status ? STATUS_LABELS[media.status] ?? media.status : null,
      releaseDate,
      popularity: media.popularity ?? 0,
      source: media.source ? SOURCE_LABELS[media.source] ?? media.source : null,
      cast,
      recommendations: recs,
      relations,
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
  const searchLower = searchTitle.toLowerCase();
  const normSearch = searchLower
    .replaceAll(/[^\w\s]/g, "")
    .trim();
  const normResult = resultTitle.replaceAll(/[^\w\s]/g, "").trim();

  // Prefer results that match season/part when search mentions it
  const searchHasSeason2 = /\b(season\s*2|2nd\s*season)\b/i.test(searchTitle);
  const searchHasPart2 = /\bpart\s*2\b/i.test(searchTitle);
  const resultHasSeason2 = /\b(2nd|second)\s*season\b/i.test(result.title);
  const resultHasPart2 = /\bpart\s*(2|ii)\b/i.test(result.title);
  const seasonBonus =
    (searchHasSeason2 && resultHasSeason2) || (searchHasPart2 && resultHasPart2)
      ? 0.15
      : 0;

  // Exact match
  if (normResult === normSearch) return Math.min(1, 0.95 + seasonBonus);
  // Contains
  if (normResult.includes(normSearch) || normSearch.includes(normResult))
    return Math.min(0.95, 0.85 + seasonBonus);

  // Year check
  if (result.year && Math.abs(result.year - searchYear) <= 1)
    return Math.min(0.85, 0.75 + seasonBonus);

  return 0.5;
}

/** Generate search variants to improve Anilist match rate */
function getAnimeSearchVariants(title: string): string[] {
  const t = title.trim();
  const variants: string[] = [t];

  // Anilist often uses "2nd Season", "3rd Season" - add those variants
  const seasonMatch = t.match(/^(.*?)\s+Season\s+(\d+)(?:\s*\([^)]*\))?$/i);
  if (seasonMatch) {
    const [, base, num] = seasonMatch;
    const n = parseInt(num, 10);
    const ord = n === 2 ? "2nd" : n === 3 ? "3rd" : n === 1 ? "1st" : `${n}th`;
    variants.push(`${base.trim()} ${ord} Season`);
    variants.push(`${base.trim()} Season ${num}`);
  }

  // "Part 2" -> "Part II", "Part 2"
  const partMatch = t.match(/^(.*?)\s+Part\s+(\d+)(?:\s*[:\-–—].*)?$/i);
  if (partMatch) {
    const [, base, num] = partMatch;
    variants.push(`${base.trim()} Part ${num}`);
  }

  // Strip parenthetical suffixes like "(Continuation)", "(The Final)"
  const withoutParens = t.replace(/\s*\([^)]*\)\s*$/g, "").trim();
  if (withoutParens !== t) variants.push(withoutParens);

  // Strip colons and subtitles that may not match
  const withoutSubtitle = t
    .replace(/\s*[:\-–—]\s*(Season|Part|Movie|The Final).*$/i, "")
    .replace(/\s*(Season|Part)\s*\d+.*$/i, "")
    .trim();
  if (withoutSubtitle !== t && !variants.includes(withoutSubtitle))
    variants.push(withoutSubtitle);

  // First 4 words often enough for series name
  const words = t.split(/\s+/);
  if (words.length > 4) {
    const four = words.slice(0, 4).join(" ");
    if (!variants.includes(four)) variants.push(four);
  }
  if (words.length > 2) {
    const two = words.slice(0, 2).join(" ");
    if (!variants.includes(two)) variants.push(two);
  }

  return [...new Set(variants)].filter((v) => v.length > 1).slice(0, 4);
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
    const searchVariants = getAnimeSearchVariants(title);
    const yearNum = typeof year === "number" ? year : Number(year) || 0;

    let results: AnimeSearchResult[] = [];
    for (const query of searchVariants) {
      results = await searchAnime(query);
      if (results.length) break;
    }

    if (!results.length) {
      return { posterUrl: null, rating: null, runtime: null, externalId: null };
    }

    // Find best match
    let best = results[0];
    let bestScore = matchScore(title, yearNum, best);

    for (let i = 1; i < results.length; i++) {
      const score = matchScore(title, yearNum, results[i]);
      if (score > bestScore) {
        bestScore = score;
        best = results[i];
      }
    }

    // Accept first result even with low score - better than no match

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
