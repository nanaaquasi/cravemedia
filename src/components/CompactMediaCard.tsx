"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { FavoriteButton } from "@/components/FavoriteButton";

export type CompactCardTargetType =
  | "movie"
  | "tv"
  | "anime"
  | "book"
  | "collection"
  | "journey"
  | "person";

export interface CompactMediaCardItem {
  targetType: CompactCardTargetType;
  targetId: string;
  title: string;
  imageUrl?: string | null;
  subtitle?: string | null;
  href: string;
  /** Optional rating 1-5 for display */
  rating?: number | null;
}

const TYPE_LABELS: Record<CompactCardTargetType, string> = {
  movie: "Movie",
  tv: "TV",
  anime: "Anime",
  book: "Book",
  collection: "Cravelist",
  journey: "Journey",
  person: "Person",
};

const TYPE_ICONS: Record<CompactCardTargetType, string> = {
  movie: "🎬",
  tv: "📺",
  anime: "🎌",
  book: "📚",
  collection: "📋",
  journey: "🛤",
  person: "👤",
};

interface CompactMediaCardProps {
  item: CompactMediaCardItem;
}

export default function CompactMediaCard({ item }: CompactMediaCardProps) {
  const [imgError, setImgError] = useState(false);

  const aspectRatio =
    item.targetType === "person" ? "aspect-square" : "aspect-[2/3]";

  return (
    <div className="group shrink-0 w-[100px] sm:w-[110px] block relative">
      <Link href={item.href} className="block">
        <div
          className={`relative w-full ${aspectRatio} rounded-lg overflow-hidden bg-zinc-800 border border-white/[0.06] mb-1.5 transition-transform duration-200 group-hover:scale-[1.02]`}
        >
          {item.imageUrl && !imgError ? (
            <Image
              src={item.imageUrl}
              alt={item.title}
              fill
              unoptimized
              className="object-cover"
              sizes="110px"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-2xl bg-gradient-to-br from-purple-900/50 via-pink-900/30 to-rose-900/40">
              {TYPE_ICONS[item.targetType]}
            </div>
          )}
          {item.rating != null && item.rating > 0 && (
            <div className="absolute bottom-1 left-1 flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-black/60 text-amber-300 text-[10px] font-medium">
              ★ {Number(item.rating).toFixed(1)}
            </div>
          )}
          <div
            className="absolute top-1 right-1 z-10"
            onClick={(e) => e.stopPropagation()}
          >
            <FavoriteButton
                targetType={item.targetType}
                targetId={item.targetId}
                title={item.title}
                imageUrl={item.imageUrl}
                metadata={{ media_type: item.targetType }}
                size="sm"
              />
          </div>
        </div>
      <p className="text-xs font-medium text-[var(--text-primary)] line-clamp-2 leading-tight">
        {item.title}
      </p>
      {(item.subtitle || item.targetType) && (
        <p className="text-[10px] text-[var(--text-muted)] mt-0.5 line-clamp-1">
          {item.subtitle ?? TYPE_LABELS[item.targetType]}
        </p>
      )}
      </Link>
    </div>
  );
}
