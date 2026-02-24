interface GoogleBooksVolume {
  id: string;
  volumeInfo: {
    title: string;
    description?: string;
    authors?: string[];
    publishedDate?: string;
    pageCount?: number;
    averageRating?: number;
    ratingsCount?: number;
    categories?: string[];
    imageLinks?: {
      smallThumbnail?: string;
      thumbnail?: string;
      small?: string;
      medium?: string;
      large?: string;
      extraLarge?: string;
    };
  };
}

interface OpenLibraryResult {
  key: string;
  title: string;
  author_name?: string[];
  first_publish_year?: number;
  cover_i?: number;
  number_of_pages_median?: number;
  ratings_average?: number;
}

async function searchGoogleBooks(
  title: string,
  author: string,
): Promise<GoogleBooksVolume | null> {
  try {
    const query = encodeURIComponent(`${title} ${author}`);
    const apiKey = process.env.GOOGLE_BOOKS_API_KEY;
    const url = apiKey
      ? `https://www.googleapis.com/books/v1/volumes?q=${query}&key=${apiKey}&maxResults=1`
      : `https://www.googleapis.com/books/v1/volumes?q=${query}&maxResults=1`;

    const res = await fetch(url);
    if (!res.ok) return null;

    const data = await res.json();
    if (!data.items || data.items.length === 0) return null;

    const volumeId = data.items[0].id;
    return fetchVolumeDetails(volumeId, apiKey);
  } catch {
    return null;
  }
}

/** Fetch full volume details - list endpoint returns truncated imageLinks, get returns all sizes */
async function fetchVolumeDetails(
  volumeId: string,
  apiKey?: string,
): Promise<GoogleBooksVolume | null> {
  try {
    const url = apiKey
      ? `https://www.googleapis.com/books/v1/volumes/${volumeId}?key=${apiKey}`
      : `https://www.googleapis.com/books/v1/volumes/${volumeId}`;

    const res = await fetch(url);
    if (!res.ok) return null;

    return res.json();
  } catch {
    return null;
  }
}

/** Get best available cover URL - prefer larger sizes, fix http and zoom for higher res */
function getBestCoverUrl(vol: GoogleBooksVolume): string | null {
  const links = vol.volumeInfo?.imageLinks;
  if (!links) return null;

  const url =
    links.extraLarge ||
    links.large ||
    links.medium ||
    links.small ||
    links.thumbnail ||
    links.smallThumbnail ||
    null;

  if (!url) return null;

  let final = url.replace("http://", "https://");
  // Upgrade resolution: zoom=1 -> zoom=2 for thumbnail URLs when larger sizes unavailable
  if (final.includes("zoom=1") && !links.medium && !links.large) {
    final = final.replace("zoom=1", "zoom=2");
  }
  return final;
}

async function searchOpenLibrary(
  query: string,
  limit = 5,
): Promise<OpenLibraryResult[]> {
  try {
    const encoded = encodeURIComponent(query.trim());
    const res = await fetch(
      `https://openlibrary.org/search.json?q=${encoded}&limit=${limit}`,
    );

    if (!res.ok) return [];

    const data = await res.json();
    return Array.isArray(data.docs) ? data.docs : [];
  } catch {
    return [];
  }
}

/** Check if result authors match the requested author (fuzzy) */
function authorMatches(
  requestedAuthor: string,
  resultAuthors: string[] | undefined,
): boolean {
  const req = requestedAuthor.trim().toLowerCase();
  if (!req) return true;
  if (!resultAuthors?.length) return false;
  const reqParts = req.split(/\s+/).filter((p) => p.length > 1);
  return resultAuthors.some((ra) => {
    const a = ra.toLowerCase();
    return reqParts.some((p) => a.includes(p));
  });
}

/** Try multiple search queries to improve match rate; prefer results where author matches */
async function findOpenLibraryBook(
  title: string,
  author: string,
): Promise<OpenLibraryResult | null> {
  const queries = [
    `${title} ${author}`,
    author ? `${author} ${title}` : null,
    title,
    title.replace(/\s*[:\-–—]\s*.*$/, "").trim(), // strip subtitle
  ].filter((q): q is string => !!q && q.length > 1);

  for (const q of queries) {
    const docs = await searchOpenLibrary(q, 8);
    for (const doc of docs) {
      if (!author || authorMatches(author, doc.author_name)) {
        return doc;
      }
    }
  }
  return null;
}

export async function enrichBook(
  title: string,
  author: string,
): Promise<{
  posterUrl: string | null;
  rating: number | null;
  runtime: string | null;
  externalId: string | null;
}> {
  const olResult = await findOpenLibraryBook(title, author);

  if (olResult?.cover_i) {
    const coverUrl = `https://covers.openlibrary.org/b/id/${olResult.cover_i}-L.jpg`;
    return {
      posterUrl: coverUrl,
      rating: olResult.ratings_average
        ? Math.round(olResult.ratings_average * 10) / 10
        : null,
      runtime: olResult.number_of_pages_median
        ? `${olResult.number_of_pages_median} pages`
        : null,
      externalId: olResult.key ? normalizeOpenLibraryId(olResult.key) : null,
    };
  }

  // Fallback to Google Books - try multiple query variants
  let googleResult = await searchGoogleBooks(title, author);
  if (!googleResult && !olResult) {
    googleResult = await searchGoogleBooks(title, "");
  }
  if (!googleResult && !olResult) {
    googleResult = await searchGoogleBooks(
      title.replace(/\s*[:\-–—]\s*.*$/, "").trim(),
      author,
    );
  }

  if (googleResult) {
    const vol = googleResult.volumeInfo;
    if (author && !authorMatches(author, vol.authors)) {
      return { posterUrl: null, rating: null, runtime: null, externalId: null };
    }
    const coverUrl = getBestCoverUrl(googleResult);

    return {
      posterUrl: coverUrl,
      rating: vol.averageRating || null,
      runtime: vol.pageCount ? `${vol.pageCount} pages` : null,
      externalId: googleResult.id,
    };
  }

  // Open Library had no cover - return its metadata if we got a match
  if (olResult) {
    return {
      posterUrl: null,
      rating: olResult.ratings_average
        ? Math.round(olResult.ratings_average * 10) / 10
        : null,
      runtime: olResult.number_of_pages_median
        ? `${olResult.number_of_pages_median} pages`
        : null,
      externalId: olResult.key ? normalizeOpenLibraryId(olResult.key) : null,
    };
  }

  return { posterUrl: null, rating: null, runtime: null, externalId: null };
}

/** Extract work ID from Open Library key (e.g. /works/OL123W -> OL123W) */
function normalizeOpenLibraryId(key: string): string {
  const match = key.match(/\/(OL\d+W)$/);
  return match ? match[1] : key.replace(/^\/works\//, "");
}

interface OpenLibraryWork {
  key: string;
  title: string;
  description?: string | { type: string; value: string };
  authors?: { author: { key: string } }[];
  subjects?: string[];
  covers?: number[];
  first_publish_date?: string;
}

interface OpenLibraryAuthor {
  name?: string;
  personal_name?: string;
}

export interface BookDetails {
  title: string;
  overview: string | null;
  posterUrl: string | null;
  voteAverage: number;
  voteCount: number;
  releaseDate: string | null;
  runtime: string | null;
  genres: string[];
  authors: string[];
  externalId: string;
}

/** Fetch book details by ID from Open Library or Google Books */
export async function getBookDetails(
  id: string,
): Promise<BookDetails | null> {
  const cleanId = id.replace(/^\/works\//, "").trim();
  const isOpenLibrary = /^OL\d+W$/i.test(cleanId);

  if (isOpenLibrary) {
    try {
      const res = await fetch(
        `https://openlibrary.org/works/${cleanId}.json`,
        { headers: { "User-Agent": "Craveo/1.0 (media-recommender)" } },
      );
      if (!res.ok) return null;

      const work = (await res.json()) as OpenLibraryWork;
      const description =
        typeof work.description === "string"
          ? work.description
          : work.description?.value ?? null;

      const coverId = work.covers?.[0];
      const posterUrl =
        coverId && coverId > 0
          ? `https://covers.openlibrary.org/b/id/${coverId}-L.jpg`
          : null;

      let authors: string[] = [];
      if (work.authors?.length) {
        const authorPromises = work.authors.slice(0, 3).map(async (a) => {
          try {
            const authorKey = a.author.key.replace("/authors/", "");
            const ar = await fetch(
              `https://openlibrary.org/authors/${authorKey}.json`,
              { headers: { "User-Agent": "Craveo/1.0 (media-recommender)" } },
            );
            if (!ar.ok) return null;
            const data = (await ar.json()) as OpenLibraryAuthor;
            return data.name ?? data.personal_name ?? null;
          } catch {
            return null;
          }
        });
        authors = (await Promise.all(authorPromises)).filter(
          (n): n is string => !!n,
        );
      }

      const genres = (work.subjects ?? []).slice(0, 8);
      const releaseDate = work.first_publish_date ?? null;

      const ratingsRes = await fetch(
        `https://openlibrary.org/works/${cleanId}/ratings.json`,
        { headers: { "User-Agent": "Craveo/1.0 (media-recommender)" } },
      );
      let voteAverage = 0;
      let voteCount = 0;
      if (ratingsRes.ok) {
        const ratings = (await ratingsRes.json()) as {
          summary?: { average?: number; count?: number };
        };
        voteAverage = ratings.summary?.average ?? 0;
        voteCount = ratings.summary?.count ?? 0;
      }

      let runtime: string | null = null;
      let editionReleaseDate = releaseDate;
      const editionsRes = await fetch(
        `https://openlibrary.org/works/${cleanId}/editions.json?limit=20`,
        { headers: { "User-Agent": "Craveo/1.0 (media-recommender)" } },
      );
      if (editionsRes.ok) {
        const editionsData = (await editionsRes.json()) as {
          entries?: {
            number_of_pages?: number;
            publish_date?: string;
          }[];
        };
        const entries = editionsData.entries ?? [];
        const pages = entries.find(
          (e) => e.number_of_pages && e.number_of_pages > 0,
        )?.number_of_pages;
        if (pages) runtime = `${pages} pages`;
        if (!editionReleaseDate) {
          const firstDate = entries.find(
            (e) => e.publish_date && /^\d{4}/.test(e.publish_date),
          )?.publish_date;
          if (firstDate) {
            const yearMatch = firstDate.match(/\d{4}/);
            if (yearMatch) editionReleaseDate = yearMatch[0];
          }
        }
      }

      return {
        title: work.title,
        overview: description,
        posterUrl,
        voteAverage: Math.round(voteAverage * 10) / 10,
        voteCount,
        releaseDate: releaseDate ?? editionReleaseDate,
        runtime,
        genres,
        authors,
        externalId: cleanId,
      };
    } catch {
      return null;
    }
  }

  const googleResult = await fetchVolumeDetails(cleanId);
  if (!googleResult) return null;

  const vol = googleResult.volumeInfo;
  const coverUrl = getBestCoverUrl(googleResult);

  return {
    title: vol.title ?? "Unknown",
    overview: vol.description ?? null,
    posterUrl: coverUrl,
    voteAverage: vol.averageRating ?? 0,
    voteCount: vol.ratingsCount ?? 0,
    releaseDate: vol.publishedDate ?? null,
    runtime: vol.pageCount ? `${vol.pageCount} pages` : null,
    genres: vol.categories ?? [],
    authors: vol.authors ?? [],
    externalId: googleResult.id,
  };
}

export async function searchBooksForList(query: string) {
  try {
    const res = await fetch(
      `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=10`,
    );
    if (!res.ok) return [];

    const data = await res.json();
    if (!data.docs) return [];

    return data.docs.map((doc: any) => {
      const key = doc.key ?? "";
      const workId = normalizeOpenLibraryId(key);
      return {
        title: doc.title,
        creator: doc.author_name ? doc.author_name[0] : "Unknown Author",
        description: doc.first_sentence
          ? doc.first_sentence[0]
          : "A book found on OpenLibrary.",
        type: "book",
        year: doc.first_publish_year?.toString() || "",
        whyThis: "",
        rating: doc.ratings_average
          ? Math.round(doc.ratings_average * 10) / 10
          : null,
        posterUrl: doc.cover_i
          ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`
          : null,
        runtime: doc.number_of_pages_median
          ? `${doc.number_of_pages_median} pages`
          : null,
        externalId: workId || key,
      };
    });
  } catch {
    return [];
  }
}
