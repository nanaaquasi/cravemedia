import type { CollectionItem } from "@/lib/supabase/types";
import type { WatchStatus } from "@/app/actions/collection";

/** Same normalization as CollectionDetailClient `getItemStatus`. */
export function normalizeCollectionItemStatus(item: CollectionItem): WatchStatus {
  const raw = item.status as string | undefined;
  if (raw === "finished") return "watched";
  if (raw === "unfinished") return "not_seen";
  const valid: WatchStatus[] = [
    "watched",
    "dropped",
    "watching",
    "on_hold",
    "not_seen",
    "not_interested",
  ];
  return (valid.includes(raw as WatchStatus) ? raw : "not_seen") as WatchStatus;
}

/**
 * Default cravelist order: Watched → Watching → all other statuses (incl. Not seen).
 * Within each band, order by `position` then `created_at`.
 */
export function sortCollectionItemsByWatchStatus(
  items: CollectionItem[],
): CollectionItem[] {
  const band = (s: WatchStatus): number => {
    if (s === "watched") return 0;
    if (s === "watching") return 1;
    return 2;
  };

  return [...items].sort((a, b) => {
    const ra = band(normalizeCollectionItemStatus(a));
    const rb = band(normalizeCollectionItemStatus(b));
    if (ra !== rb) return ra - rb;

    const pa = a.position ?? Number.MAX_SAFE_INTEGER;
    const pb = b.position ?? Number.MAX_SAFE_INTEGER;
    if (pa !== pb) return pa - pb;

    return (
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
  });
}
