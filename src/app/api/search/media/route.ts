import { NextResponse } from "next/server";
import { searchMovie, searchTV, getPosterUrl } from "@/lib/tmdb";
import { searchAnime } from "@/lib/anilist";
import { searchBooksForList } from "@/lib/books";
import { EnrichedRecommendation } from "@/lib/types";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q");
  const type = searchParams.get("type"); // movie, tv, anime, book, all

  if (!q) {
    return NextResponse.json({ items: [] });
  }

  let results: EnrichedRecommendation[] = [];

  try {
    const typesToSearch =
      type === "all" || !type
        ? ["movie", "tv", "book", "anime"]
        : type.split(",");

    const searchPromises = typesToSearch.map(async (t) => {
      switch (t) {
        case "movie":
          const movies = await searchMovie(q);
          return movies.slice(0, 10).map(
            (m) =>
              ({
                title: m.title,
                creator: "Director/Studio", // TMDB search doesn't return director, requires exact item fetch
                description: m.overview,
                type: "movie",
                year: m.release_date?.substring(0, 4) || "",
                whyThis: "",
                rating: m.vote_average
                  ? Math.round(m.vote_average * 10) / 10
                  : null,
                posterUrl: getPosterUrl(m.poster_path),
                externalId: m.id.toString(),
              }) as unknown as EnrichedRecommendation,
          );
        case "tv":
          const shows = await searchTV(q);
          return shows.slice(0, 10).map(
            (s) =>
              ({
                title: s.name,
                creator: "Network/Creator",
                description: s.overview,
                type: "tv",
                year: s.first_air_date?.substring(0, 4) || "",
                whyThis: "",
                rating: s.vote_average
                  ? Math.round(s.vote_average * 10) / 10
                  : null,
                posterUrl: getPosterUrl(s.poster_path),
                externalId: s.id.toString(),
              }) as unknown as EnrichedRecommendation,
          );
        case "anime":
          const animes = await searchAnime(q);
          return animes.slice(0, 10).map(
            (a) =>
              ({
                title: a.title,
                creator: "Anime Studio",
                description: "", // AnimeSearchResult has no description
                type: "anime",
                year: a.year?.toString() || "",
                whyThis: "",
                rating: a.rating
                  ? Math.round((a.rating / 100) * 10) / 10
                  : null,
                posterUrl: a.posterUrl,
                externalId: a.id.toString(),
              }) as unknown as EnrichedRecommendation,
          );
        case "book":
          return await searchBooksForList(q);
        default:
          return [];
      }
    });

    const nestedResults = await Promise.all(searchPromises);
    results = nestedResults.flat();

    // Optional: Sort by rating to surface better results first
    results.sort((a, b) => (b.rating || 0) - (a.rating || 0));
  } catch (error) {
    console.error("Manual search error:", error);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }

  return NextResponse.json({ items: results });
}
