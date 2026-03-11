"use client";

import { useEffect, useState } from "react";
import CompactMediaCard, {
  type CompactMediaCardItem,
  type CompactCardTargetType,
} from "@/components/CompactMediaCard";

interface FavoriteItem {
  id: string;
  target_type: string;
  target_id: string;
  title: string | null;
  image_url: string | null;
  metadata: Record<string, unknown>;
}

interface FavoriteHighlightsProps {
  userId: string;
}

function getHref(targetType: string, targetId: string): string {
  switch (targetType) {
    case "movie":
    case "tv":
    case "anime":
    case "book":
      return `/media/${targetType}/${targetId}`;
    case "collection":
      return `/collections/${targetId}`;
    case "journey":
      return `/journey/${targetId}`;
    case "person":
      return `/person/${targetId}`;
    default:
      return "#";
  }
}

export function FavoriteHighlights({ userId }: FavoriteHighlightsProps) {
  const [items, setItems] = useState<FavoriteItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/favorites?user_id=${encodeURIComponent(userId)}`)
      .then((r) => r.json())
      .then((data: FavoriteItem[]) => {
        if (!cancelled) setItems(Array.isArray(data) ? data.slice(0, 12) : []);
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  if (loading || items.length === 0) return null;

  const cardItems: CompactMediaCardItem[] = items.map((f) => ({
    targetType: f.target_type as CompactCardTargetType,
    targetId: f.target_id,
    title: f.title ?? "Untitled",
    imageUrl: f.image_url,
    subtitle: (f.metadata?.year as number)
      ? String(f.metadata.year)
      : undefined,
    href: getHref(f.target_type, f.target_id),
  }));

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-white flex items-center gap-2">
        <span className="text-rose-400">♥</span>
        Favorites
      </h2>
      <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
        {cardItems.map((item) => (
          <CompactMediaCard key={`${item.targetType}-${item.targetId}`} item={item} />
        ))}
      </div>
    </div>
  );
}
