"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import type { TMDBMediaItem } from "@/lib/discover-trending";

const TYPE_LABELS: Record<string, string> = {
  movie: "Movie",
  tv: "TV",
  anime: "Anime",
};

type FilterTab = "all" | "movie" | "tv" | "anime";

const FILTER_TABS: { value: FilterTab; label: string }[] = [
  { value: "all", label: "All" },
  { value: "movie", label: "Movies" },
  { value: "tv", label: "TV" },
  { value: "anime", label: "Anime" },
];

function filterByType(items: TMDBMediaItem[], tab: FilterTab): TMDBMediaItem[] {
  if (tab === "all") return items;
  return items.filter((i) => i.type === tab);
}

function MediaCard({ item }: { item: TMDBMediaItem }) {
  const [imgError, setImgError] = useState(false);
  const displayRating =
    item.rating != null && item.rating > 0
      ? (item.rating / 10).toFixed(1)
      : null;

  return (
    <Link
      href={`/media/${item.type}/${item.id}`}
      className="group shrink-0 w-36 block snap-start"
    >
      <div className="relative aspect-[2/3] rounded-xl overflow-hidden bg-zinc-800 border border-white/[0.06] mb-2 transition-transform duration-200 group-hover:scale-[1.02]">
        {item.posterUrl && !imgError ? (
          <Image
            src={item.posterUrl}
            alt={item.title}
            fill
            className="object-cover"
            sizes="144px"
            unoptimized
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-2xl text-zinc-600 bg-gradient-to-br from-zinc-800 to-zinc-900">
            {item.type === "movie" ? "🎬" : item.type === "anime" ? "🎌" : "📺"}
          </div>
        )}
        <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-black/70 text-[10px] font-medium text-zinc-300">
          {TYPE_LABELS[item.type] ?? item.type}
        </span>
        {displayRating && (
          <span className="absolute top-1.5 right-1.5 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-black/60 text-[10px] font-medium text-amber-300">
            ★ {displayRating}
          </span>
        )}
      </div>
      <p className="text-sm font-medium text-white truncate group-hover:text-purple-300 transition-colors">
        {item.title}
      </p>
    </Link>
  );
}

function FilterTabs({
  value,
  onChange,
}: {
  value: FilterTab;
  onChange: (v: FilterTab) => void;
}) {
  return (
    <div className="flex gap-1 p-1 rounded-lg bg-white/5 w-fit mb-4">
      {FILTER_TABS.map((tab) => (
        <button
          key={tab.value}
          type="button"
          onClick={() => onChange(tab.value)}
          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors cursor-pointer ${
            value === tab.value
              ? "bg-purple-500/30 text-purple-300"
              : "text-zinc-400 hover:text-white hover:bg-white/5"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

interface TrendingMediaProps {
  trending: TMDBMediaItem[];
  popular: TMDBMediaItem[];
  trendingAnime?: TMDBMediaItem[];
  popularAnime?: TMDBMediaItem[];
}

export function TrendingMedia({
  trending,
  popular,
  trendingAnime = [],
  popularAnime = [],
}: TrendingMediaProps) {
  const [trendingFilter, setTrendingFilter] = useState<FilterTab>("all");
  const [popularFilter, setPopularFilter] = useState<FilterTab>("all");

  const allTrending = [...trending, ...trendingAnime];
  const allPopular = [...popular, ...popularAnime];

  const filteredTrending = filterByType(allTrending, trendingFilter);
  const filteredPopular = filterByType(allPopular, popularFilter);

  return (
    <section className="mb-12 space-y-8">
      {allTrending.length > 0 && (
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">Trending</h2>
          <p className="text-zinc-400 text-sm mb-2">
            What&apos;s hot right now
          </p>
          <FilterTabs value={trendingFilter} onChange={setTrendingFilter} />
          <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide snap-x snap-mandatory">
            {filteredTrending.map((item) => (
              <MediaCard key={`${item.type}-${item.id}`} item={item} />
            ))}
          </div>
        </div>
      )}
      {allPopular.length > 0 && (
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">Popular</h2>
          <p className="text-zinc-400 text-sm mb-2">
            Movies and shows everyone&apos;s watching
          </p>
          <FilterTabs value={popularFilter} onChange={setPopularFilter} />
          <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide snap-x snap-mandatory">
            {filteredPopular.map((item) => (
              <MediaCard key={`${item.type}-${item.id}`} item={item} />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
