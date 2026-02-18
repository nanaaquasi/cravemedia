interface GoogleBooksVolume {
  id: string;
  volumeInfo: {
    title: string;
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
  title: string,
  author: string,
): Promise<OpenLibraryResult | null> {
  try {
    const query = encodeURIComponent(`${title} ${author}`);
    const res = await fetch(
      `https://openlibrary.org/search.json?q=${query}&limit=1`,
    );

    if (!res.ok) return null;

    const data = await res.json();
    if (!data.docs || data.docs.length === 0) return null;

    return data.docs[0];
  } catch {
    return null;
  }
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
  // Open Library first (primary source for posters)
  const olResult = await searchOpenLibrary(title, author);

  console.log(olResult);

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
      externalId: olResult.key || null,
    };
  }

  // Fallback to Google Books for cover and metadata
  const googleResult = await searchGoogleBooks(title, author);

  if (googleResult) {
    const vol = googleResult.volumeInfo;
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
      externalId: olResult.key || null,
    };
  }

  return { posterUrl: null, rating: null, runtime: null, externalId: null };
}
