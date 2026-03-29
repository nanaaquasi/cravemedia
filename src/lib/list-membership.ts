import type { EnrichedRecommendation, SavedList } from "@/lib/types";

/** Whether this media is already a row in the given cravelist (by external id + type). */
export function itemIsInSavedList(
  list: SavedList,
  item: EnrichedRecommendation,
): boolean {
  const id = item.externalId != null ? String(item.externalId) : "";
  if (!id) return false;
  const t = item.type;
  return list.items.some((i) => {
    const iid = i.externalId != null ? String(i.externalId) : "";
    return iid === id && i.type === t;
  });
}
