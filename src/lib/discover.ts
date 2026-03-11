import { createClient } from "@/lib/supabase/server";

export async function getDiscoverCollections(limit = 12) {
  const supabase = await createClient();
  const { data: collections, error } = await supabase
    .from("collections")
    .select("*, collection_items(image_url), profiles:user_id(username, full_name)")
    .eq("is_public", true)
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Discover collections error:", error);
    return [];
  }

  const collectionList = collections ?? [];
  const collectionIds = collectionList
    .map((c) => c.id)
    .filter((id): id is string => typeof id === "string");

  let statsById = new Map<
    string,
    { favorites_count: number; views_count: number; saves_count: number }
  >();

  if (collectionIds.length > 0) {
    const { data: statsData } = await supabase
      .from("content_stats")
      .select("target_id, favorites_count, views_count, saves_count")
      .eq("target_type", "collection")
      .in("target_id", collectionIds);

    statsById = new Map(
      (statsData ?? []).map((row) => [
        row.target_id,
        {
          favorites_count: row.favorites_count ?? 0,
          views_count: row.views_count ?? 0,
          saves_count: row.saves_count ?? 0,
        },
      ]),
    );
  }

  return collectionList.map((c: Record<string, unknown>) => {
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
      favorites_count:
        statsById.get(String(c.id))?.favorites_count ?? 0,
      views_count: statsById.get(String(c.id))?.views_count ?? 0,
      saves_count: statsById.get(String(c.id))?.saves_count ?? 0,
    };
  });
}

export async function getDiscoverJourneys(limit = 12) {
  const supabase = await createClient();
  const { data: journeys, error } = await supabase
    .from("journeys")
    .select(
      "id, title, description, query, content_type, items, total_items, total_runtime_minutes, overall_rating, status, current_position, created_at, updated_at, completed_at, forked_count"
    )
    .eq("is_public", true)
    .order("forked_count", { ascending: false })
    .order("overall_rating", { ascending: false, nullsFirst: false })
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Discover journeys error:", error);
    return [];
  }

  return journeys ?? [];
}
