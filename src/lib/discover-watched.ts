import type { SupabaseClient } from "@supabase/supabase-js";

/** Stable key for discover carousel items (matches TMDBMediaItem.type + id) */
export function discoverMediaKey(type: string, id: string): string {
  return `${type}:${id}`;
}

/**
 * Watched keys only (e.g. legacy callers). Prefer `getDiscoverWatchStatusesForItems` when you need both.
 */
export async function getWatchedKeysForDiscoverItems(
  supabase: SupabaseClient,
  userId: string,
  items: { type: string; id: string }[],
): Promise<string[]> {
  const { watchedKeys } = await getDiscoverWatchStatusesForItems(
    supabase,
    userId,
    items,
  );
  return watchedKeys;
}

/**
 * Keys the user has marked `watched` or `watching` in any cravelist, intersected with discover items.
 * If the same title is both watched and watching across lists, **watched** wins.
 */
export async function getDiscoverWatchStatusesForItems(
  supabase: SupabaseClient,
  userId: string,
  items: { type: string; id: string }[],
): Promise<{ watchedKeys: string[]; watchingKeys: string[] }> {
  if (items.length === 0) return { watchedKeys: [], watchingKeys: [] };
  const want = new Set(items.map((i) => discoverMediaKey(i.type, i.id)));

  const { data, error } = await supabase
    .from("collection_items")
    .select("media_id, media_type, status, collections!inner(user_id)")
    .eq("collections.user_id", userId)
    .in("status", ["watched", "watching"]);

  if (error || !data) return { watchedKeys: [], watchingKeys: [] };

  const watched = new Set<string>();
  const watching = new Set<string>();
  for (const row of data) {
    const key = discoverMediaKey(row.media_type, row.media_id);
    if (!want.has(key)) continue;
    if (row.status === "watched") watched.add(key);
    else if (row.status === "watching") watching.add(key);
  }
  for (const k of watched) watching.delete(k);

  return {
    watchedKeys: [...watched],
    watchingKeys: [...watching],
  };
}
