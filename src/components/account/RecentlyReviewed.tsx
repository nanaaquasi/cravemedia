"use client";

import CompactMediaCard, {
  type CompactMediaCardItem,
  type CompactCardTargetType,
} from "@/components/CompactMediaCard";

interface RecentlyReviewedItem {
  id: string;
  media_id: string;
  media_type: string;
  title: string | null;
  image_url: string | null;
  item_rating: number | null;
  created_at: string | null;
}

interface RecentlyReviewedProps {
  items: RecentlyReviewedItem[];
}

function getHref(mediaType: string, mediaId: string): string {
  if (["movie", "tv", "anime", "book"].includes(mediaType)) {
    return `/media/${mediaType}/${mediaId}`;
  }
  return "#";
}

export function RecentlyReviewed({ items }: RecentlyReviewedProps) {
  if (items.length === 0) return null;

  const cardItems: CompactMediaCardItem[] = items.slice(0, 6).map((i) => ({
    targetType: (i.media_type === "anime"
      ? "anime"
      : i.media_type === "book"
        ? "book"
        : i.media_type === "tv"
          ? "tv"
          : "movie") as CompactCardTargetType,
    targetId: i.media_id,
    title: i.title ?? "Untitled",
    imageUrl: i.image_url,
    subtitle: "Reviewed",
    href: getHref(i.media_type, i.media_id),
    rating: i.item_rating ?? undefined,
  }));

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-white flex items-center gap-2">
        <span className="text-amber-400">★</span>
        Recently Reviewed
      </h2>
      <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
        {cardItems.map((item, idx) => (
          <CompactMediaCard
            key={`${item.targetType}-${item.targetId}-${idx}`}
            item={item}
          />
        ))}
      </div>
    </div>
  );
}
