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

interface FavoritesTabProps {
  userId: string;
}

const TYPE_ORDER: CompactCardTargetType[] = [
  "movie",
  "tv",
  "anime",
  "book",
  "collection",
  "journey",
  "person",
];

const TYPE_LABELS: Record<string, string> = {
  movie: "Movies",
  tv: "TV Shows",
  anime: "Anime",
  book: "Books",
  collection: "Cravelists",
  journey: "Journeys",
  person: "People",
};

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

export function FavoritesTab({ userId }: FavoritesTabProps) {
  const [items, setItems] = useState<FavoriteItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/favorites?user_id=${encodeURIComponent(userId)}`)
      .then((r) => r.json())
      .then((data: FavoriteItem[]) => {
        if (!cancelled) setItems(Array.isArray(data) ? data : []);
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

  const grouped = TYPE_ORDER.reduce(
    (acc, type) => {
      acc[type] = items.filter((f) => f.target_type === type);
      return acc;
    },
    {} as Record<CompactCardTargetType, FavoriteItem[]>,
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-16 px-4 bg-zinc-900/20 rounded-3xl border border-white/5">
        <p className="text-zinc-400 mb-2">No favorites yet</p>
        <p className="text-sm text-zinc-500">
          Add movies, shows, books, cravelists, and more to your favorites from
          their detail pages.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {TYPE_ORDER.map((type) => {
        const list = grouped[type];
        if (list.length === 0) return null;

        const cardItems: CompactMediaCardItem[] = list.map((f) => ({
          targetType: type,
          targetId: f.target_id,
          title: f.title ?? "Untitled",
          imageUrl: f.image_url,
          subtitle: (f.metadata?.year as number)
            ? String(f.metadata.year)
            : undefined,
          href: getHref(f.target_type, f.target_id),
        }));

        return (
          <div key={type} className="space-y-4">
            <h2 className="text-lg font-bold text-white">
              {TYPE_LABELS[type] ?? type}
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {cardItems.map((item) => (
                <CompactMediaCard
                  key={`${item.targetType}-${item.targetId}`}
                  item={item}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
