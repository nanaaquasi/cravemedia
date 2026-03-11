import { createClient } from "@/lib/supabase/server";

const TMDB_BASE = "https://api.themoviedb.org/3";
const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p";

const FALLBACK_PICKS = [
  { id: 550, type: "movie", title: "Fight Club" },
  { id: 238, type: "movie", title: "The Godfather" },
  { id: 155, type: "movie", title: "The Dark Knight" },
  { id: 680, type: "movie", title: "Pulp Fiction" },
  { id: 424, type: "movie", title: "Schindler's List" },
];

const posterPaths: Record<number, string> = {
  550: "/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJk.jpg",
  238: "/3bhkrj58Vtu7enYsRolD1fZdja1.jpg",
  155: "/qJ2tW6WMUDux911r6m7haRef0WH.jpg",
  680: "/d5iIlFn5s0ImszYzBPb8KIfgsI4.jpg",
  424: "/sF1U4EUQS8YHUYjNl3pMGNIQyr0.jpg",
};

export async function getFeaturedCollections() {
  const supabase = await createClient();
  const { data: collections, error } = await supabase
    .from("collections")
    .select("*, collection_items(image_url), profiles:user_id(username, full_name)")
    .eq("is_public", true)
    .order("updated_at", { ascending: false })
    .limit(6);

  if (error) {
    console.error("Featured collections error:", error);
    return [];
  }

  return (collections ?? []).map((c: Record<string, unknown>) => {
    const profile = c.profiles as {
      username?: string | null;
      full_name?: string | null;
    } | null;
    const fullName = profile?.full_name?.trim();
    const username = profile?.username?.trim();
    const firstName = fullName
      ? fullName.split(/\s+/)[0]
      : username ?? null;
    const items = (c.collection_items as { image_url: string | null }[]) ?? [];
    return {
      ...c,
      curator_first_name: firstName,
      items: items.map((i) => ({ image_url: i.image_url })),
      item_count: items.length,
    };
  });
}

export async function getPickOfTheDay(): Promise<{
  mediaId: string;
  type: string;
  title: string;
  posterUrl: string;
} | null> {
  try {
    const apiKey = process.env.TMDB_API_KEY;
    if (!apiKey) {
      return getFallbackPick();
    }

    const url = `${TMDB_BASE}/trending/all/day?api_key=${apiKey}`;
    const res = await fetch(url);
    if (!res.ok) {
      return getFallbackPick();
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
        (r) =>
          r.poster_path &&
          (r.media_type === "movie" || r.media_type === "tv"),
      ) ?? results[0];

    if (!pick) {
      return getFallbackPick();
    }

    const type = pick.media_type === "tv" ? "tv" : "movie";
    const title = pick.title ?? pick.name ?? "Unknown";
    const posterUrl = pick.poster_path
      ? `${TMDB_IMAGE_BASE}/w500${pick.poster_path}`
      : "";

    return {
      mediaId: String(pick.id),
      type,
      title,
      posterUrl,
    };
  } catch (err) {
    console.error("Pick of the day error:", err);
    return getFallbackPick();
  }
}

function getFallbackPick() {
  const pick =
    FALLBACK_PICKS[Math.floor(Math.random() * FALLBACK_PICKS.length)];
  const posterPath = posterPaths[pick.id] ?? "";
  return {
    mediaId: String(pick.id),
    type: pick.type,
    title: pick.title,
    posterUrl: posterPath
      ? `https://image.tmdb.org/t/p/w500${posterPath}`
      : "https://placehold.co/200x300/1a1a1a/666?text=Pick",
  };
}
