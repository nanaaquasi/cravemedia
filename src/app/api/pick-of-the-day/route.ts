import { NextResponse } from "next/server";

const TMDB_BASE = "https://api.themoviedb.org/3";
const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p";

const FALLBACK_PICKS = [
  { id: 550, type: "movie", title: "Fight Club" },
  { id: 238, type: "movie", title: "The Godfather" },
  { id: 155, type: "movie", title: "The Dark Knight" },
  { id: 680, type: "movie", title: "Pulp Fiction" },
  { id: 424, type: "movie", title: "Schindler's List" },
];

function getPosterUrl(path: string | null): string | null {
  if (!path) return null;
  return `${TMDB_IMAGE_BASE}/w500${path}`;
}

export async function GET() {
  try {
    const apiKey = process.env.TMDB_API_KEY;
    if (!apiKey) {
      return fallbackPick();
    }

    const url = new URL(`${TMDB_BASE}/trending/all/day`);
    url.searchParams.set("api_key", apiKey);

    const res = await fetch(url.toString());
    if (!res.ok) {
      return fallbackPick();
    }

    const data = (await res.json()) as {
      results?: Array<{
        id: number;
        title?: string;
        name?: string;
        poster_path: string | null;
        media_type?: string;
      }>;
    };

    const results = data.results ?? [];
    const pick =
      results.find(
        (r) => r.poster_path && (r.media_type === "movie" || r.media_type === "tv"),
      ) ?? results[0];

    if (!pick) {
      return fallbackPick();
    }

    const type = pick.media_type === "tv" ? "tv" : "movie";
    const title = pick.title ?? pick.name ?? "Unknown";

    return NextResponse.json({
      mediaId: String(pick.id),
      type,
      title,
      posterUrl: getPosterUrl(pick.poster_path) ?? "",
    });
  } catch (err) {
    console.error("Pick of the day error:", err);
    return fallbackPick();
  }
}

function fallbackPick() {
  const pick =
    FALLBACK_PICKS[Math.floor(Math.random() * FALLBACK_PICKS.length)];
  // Use TMDB's known poster paths for fallback items
  const posterPaths: Record<number, string> = {
    550: "/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJk.jpg",
    238: "/3bhkrj58Vtu7enYsRolD1fZdja1.jpg",
    155: "/qJ2tW6WMUDux911r6m7haRef0WH.jpg",
    680: "/d5iIlFn5s0ImszYzBPb8KIfgsI4.jpg",
    424: "/sF1U4EUQS8YHUYjNl3pMGNIQyr0.jpg",
  };
  const posterPath = posterPaths[pick.id] ?? "";
  return NextResponse.json({
    mediaId: String(pick.id),
    type: pick.type,
    title: pick.title,
    posterUrl: posterPath
      ? `https://image.tmdb.org/t/p/w500${posterPath}`
      : "https://placehold.co/200x300/1a1a1a/666?text=Pick",
  });
}
