import type { JourneyItem, JourneyItemRaw, PromoteItem } from "./types";

function normalizeTitle(t: string): string {
  return t.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Merge AI journey output with original list items (posters, ids, runtime, ratings).
 */
export function mergePromotedJourneyItems(
  rawItems: JourneyItemRaw[],
  promoteItems: PromoteItem[],
): JourneyItem[] {
  const pool = promoteItems.map((p, i) => ({ p, i }));
  const used = new Set<number>();

  return rawItems.map((raw, idx) => {
    const nt = normalizeTitle(raw.title);
    let matchIdx = pool.findIndex(
      ({ p, i }) =>
        !used.has(i) &&
        normalizeTitle(p.title) === nt &&
        p.year === raw.year,
    );
    if (matchIdx === -1) {
      matchIdx = pool.findIndex(
        ({ p, i }) => !used.has(i) && normalizeTitle(p.title) === nt,
      );
    }

    let base: PromoteItem | undefined;
    if (matchIdx !== -1) {
      const { p, i } = pool[matchIdx]!;
      used.add(i);
      base = p;
    }

    const position = raw.position ?? idx + 1;
    return {
      title: raw.title,
      creator: raw.creator,
      year: raw.year,
      type: raw.type,
      description: raw.description ?? base?.description ?? "",
      genres: raw.genres?.length ? raw.genres : base?.genres ?? [],
      whyThisPosition: raw.whyThisPosition,
      whatYoullLearn: raw.whatYoullLearn,
      keyThemes: raw.keyThemes ?? [],
      difficultyLevel: raw.difficultyLevel,
      transitionToNext: raw.transitionToNext,
      position,
      posterUrl: base?.posterUrl ?? null,
      rating: base?.rating ?? null,
      ratingSource: base?.ratingSource ?? null,
      runtime: base?.runtime ?? null,
      externalId: base?.externalId ?? null,
    };
  });
}

export function inferContentTypeFromPromoteItems(
  items: PromoteItem[],
): import("./types").ContentType | import("./types").ContentType[] {
  const types = new Set(items.map((i) => i.type));
  if (types.size === 1) {
    return items[0]!.type;
  }
  return "all";
}
