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
 * Keys the user has marked `watched` or `watching` for the given media ids: any Cravelist row **or**
 * a standalone `user_media_status` row. Intersected with `items`. If the same title is both watched
 * and watching across sources, **watched** wins.
 */
export async function getDiscoverWatchStatusesForItems(
  supabase: SupabaseClient,
  userId: string,
  items: { type: string; id: string }[],
): Promise<{ watchedKeys: string[]; watchingKeys: string[] }> {
  if (items.length === 0) return { watchedKeys: [], watchingKeys: [] };
  const want = new Set(items.map((i) => discoverMediaKey(i.type, i.id)));

  const [collectionRes, standaloneRes] = await Promise.all([
    supabase
      .from("collection_items")
      .select("media_id, media_type, status, collections!inner(user_id)")
      .eq("collections.user_id", userId)
      .in("status", ["watched", "watching"]),
    supabase
      .from("user_media_status")
      .select("media_id, media_type, status")
      .eq("user_id", userId)
      .in("status", ["watched", "watching"]),
  ]);

  const watched = new Set<string>();
  const watching = new Set<string>();

  const rows = [
    ...(collectionRes.data ?? []),
    ...(standaloneRes.data ?? []),
  ];
  if (collectionRes.error || standaloneRes.error) {
    return { watchedKeys: [], watchingKeys: [] };
  }

  for (const row of rows) {
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
