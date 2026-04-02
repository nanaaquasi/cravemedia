"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Check, Play, FolderPlus, ChevronLeft, ChevronRight } from "lucide-react";
import { useCanScroll } from "@/hooks/useCanScroll";
import type { TMDBMediaItem } from "@/lib/discover-trending";
import { discoverMediaKey } from "@/lib/discover-watched";
import { useSession } from "@/context/SessionContext";
import AddToCollectionModal from "@/components/AddToCollectionModal";
import type { EnrichedRecommendation } from "@/lib/types";
import { CRAVELIST_LABEL } from "@/config/labels";

function tmdbDiscoverItemToEnriched(item: TMDBMediaItem): EnrichedRecommendation {
  const year = item.releaseDate
    ? Number.parseInt(item.releaseDate.slice(0, 4), 10)
    : 0;
  return {
    title: item.title,
    creator: "",
    year: Number.isFinite(year) ? year : 0,
    type: item.type,
    description: item.overview ?? "",
    genres: [],
    posterUrl: item.posterUrl,
    rating:
      item.rating != null && item.rating > 0 ? item.rating / 10 : null,
    ratingSource: item.type === "anime" ? "anilist" : "tmdb",
    runtime: null,
    externalId: item.id,
  };
}

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

type WatchHighlight = "watched" | "watching" | null;

function MediaCard({
  item,
  watchHighlight,
  showQuickAdd,
  onQuickAdd,
}: {
  item: TMDBMediaItem;
  watchHighlight: WatchHighlight;
  showQuickAdd: boolean;
  onQuickAdd: () => void;
}) {
  const [imgError, setImgError] = useState(false);
  const displayRating =
    item.rating != null && item.rating > 0
      ? (item.rating / 10).toFixed(1)
      : null;

  const isWatched = watchHighlight === "watched";
  const isWatching = watchHighlight === "watching";
  const hasHighlight = isWatched || isWatching;

  const inner = (
    <>
      <div className="relative aspect-[2/3] w-full overflow-hidden bg-zinc-800">
        <Link
          href={`/media/${item.type}/${item.id}`}
          className="absolute inset-0 z-0"
          aria-hidden
          tabIndex={-1}
        >
          {item.posterUrl && !imgError ? (
            <Image
              src={item.posterUrl}
              alt=""
              fill
              className={`object-cover ${hasHighlight ? "brightness-[0.88] saturate-[0.92]" : ""}`}
              sizes="144px"
              unoptimized
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-2xl text-zinc-600 bg-gradient-to-br from-zinc-800 to-zinc-900">
              {item.type === "movie" ? "🎬" : item.type === "anime" ? "🎌" : "📺"}
            </div>
          )}
        </Link>
        {isWatched && (
          <>
            <div
              className="absolute inset-0 bg-gradient-to-t from-emerald-950/55 via-emerald-950/15 to-transparent pointer-events-none z-[1]"
              aria-hidden
            />
            <div className="absolute top-1.5 left-1.5 flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-emerald-600 text-white text-[10px] font-semibold shadow-md z-[1] pointer-events-none">
              <Check className="w-3 h-3 shrink-0" strokeWidth={3} aria-hidden />
              Watched
            </div>
          </>
        )}
        {isWatching && (
          <>
            <div
              className="absolute inset-0 bg-gradient-to-t from-amber-950/55 via-amber-950/15 to-transparent pointer-events-none z-[1]"
              aria-hidden
            />
            <div className="absolute top-1.5 left-1.5 flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-amber-500 text-[10px] font-semibold text-amber-950 shadow-md z-[1] pointer-events-none">
              <Play className="w-3 h-3 shrink-0 fill-current" aria-hidden />
              Watching
            </div>
          </>
        )}
        <span
          className={`absolute bottom-1 left-1 px-1.5 py-0.5 rounded text-[10px] font-medium text-zinc-300 z-[1] pointer-events-none ${
            hasHighlight ? "bg-black/75" : "bg-black/70"
          }`}
        >
          {TYPE_LABELS[item.type] ?? item.type}
        </span>
        {displayRating && (
          <span className="absolute top-1.5 right-1.5 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-black/60 text-[10px] font-medium text-amber-300 z-[1] pointer-events-none">
            ★ {displayRating}
          </span>
        )}
        {showQuickAdd && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onQuickAdd();
            }}
            className="absolute bottom-1 right-1 z-20 flex h-7 w-7 items-center justify-center rounded-md bg-black/65 text-white shadow-md backdrop-blur-sm transition-colors hover:bg-black/80 border border-white/20 cursor-pointer"
            title={`Add to ${CRAVELIST_LABEL}`}
            aria-label={`Add ${item.title} to ${CRAVELIST_LABEL}`}
          >
            <FolderPlus className="h-3.5 w-3.5 shrink-0" aria-hidden />
          </button>
        )}
      </div>
      <Link
        href={`/media/${item.type}/${item.id}`}
        className={`block px-2 pt-2.5 pb-3 text-sm font-medium leading-snug truncate transition-colors ${
          isWatched
            ? "text-emerald-200/95"
            : isWatching
              ? "text-amber-200/95"
              : "text-white group-hover:text-purple-300"
        }`}
      >
        {item.title}
      </Link>
    </>
  );

  return (
    <div className="group shrink-0 w-36 snap-start mb-2 transition-transform duration-200 hover:scale-[1.02]">
      {isWatched ? (
        <div className="rounded-lg border-2 border-emerald-400/95 overflow-hidden bg-zinc-900/40 box-border shadow-[0_10px_36px_-6px_rgba(0,0,0,0.58)] ring-1 ring-white/15">
          {inner}
        </div>
      ) : isWatching ? (
        <div className="rounded-lg border-2 border-amber-400/95 overflow-hidden bg-zinc-900/40 box-border shadow-[0_10px_36px_-6px_rgba(0,0,0,0.58)] ring-1 ring-white/15">
          {inner}
        </div>
      ) : (
        <div className="rounded-lg border-2 border-white/28 overflow-hidden bg-zinc-900/35 shadow-[0_10px_36px_-6px_rgba(0,0,0,0.58)] ring-1 ring-white/10">
          {inner}
        </div>
      )}
    </div>
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
    <div className="flex gap-1 p-1 rounded-lg bg-white/5 w-fit">
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

function CarouselSection({
  title,
  subtitle,
  items,
  filterValue,
  onFilterChange,
  watchHighlightFor,
  onQuickAdd,
}: {
  title: string;
  subtitle: string;
  items: TMDBMediaItem[];
  filterValue: FilterTab;
  onFilterChange: (v: FilterTab) => void;
  watchHighlightFor: (item: TMDBMediaItem) => WatchHighlight;
  onQuickAdd: (item: TMDBMediaItem) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const canScroll = useCanScroll(scrollRef);

  const scrollLeft = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: -600, behavior: "smooth" });
    }
  };

  const scrollRight = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: 600, behavior: "smooth" });
    }
  };

  if (items.length === 0) return null;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-4 mt-2">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">{title}</h2>
          <p className="text-zinc-400 text-sm mb-4">{subtitle}</p>
          <FilterTabs value={filterValue} onChange={onFilterChange} />
        </div>
        {canScroll && (
          <div className="hidden md:flex gap-2 self-end pb-1">
            <button
              onClick={scrollLeft}
              className="p-2 sm:p-2.5 rounded-full border border-white/10 bg-black/40 hover:bg-white/10 text-white transition-colors cursor-pointer backdrop-blur-md shadow-md"
              aria-label={`Scroll ${title} left`}
            >
              <ChevronLeft size={20} />
            </button>
            <button
              onClick={scrollRight}
              className="p-2 sm:p-2.5 rounded-full border border-white/10 bg-black/40 hover:bg-white/10 text-white transition-colors cursor-pointer backdrop-blur-md shadow-md"
              aria-label={`Scroll ${title} right`}
            >
              <ChevronRight size={20} />
            </button>
          </div>
        )}
      </div>
      <div 
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory scroll-smooth"
      >
        {items.map((item) => (
          <MediaCard
            key={`${item.type}-${item.id}`}
            item={item}
            watchHighlight={watchHighlightFor(item)}
            showQuickAdd
            onQuickAdd={() => onQuickAdd(item)}
          />
        ))}
      </div>
    </div>
  );
}

interface TrendingMediaProps {
  trending: TMDBMediaItem[];
  popular: TMDBMediaItem[];
  trendingAnime?: TMDBMediaItem[];
  popularAnime?: TMDBMediaItem[];
  initialWatchedKeys?: string[];
  initialWatchingKeys?: string[];
}

export function TrendingMedia({
  trending,
  popular,
  trendingAnime = [],
  popularAnime = [],
  initialWatchedKeys = [],
  initialWatchingKeys = [],
}: TrendingMediaProps) {
  const { user } = useSession();
  const router = useRouter();
  const [addModalItem, setAddModalItem] = useState<EnrichedRecommendation | null>(
    null,
  );
  const [trendingFilter, setTrendingFilter] = useState<FilterTab>("all");
  const [popularFilter, setPopularFilter] = useState<FilterTab>("all");
  const [watchedSet, setWatchedSet] = useState(
    () => new Set(initialWatchedKeys),
  );
  const [watchingSet, setWatchingSet] = useState(
    () => new Set(initialWatchingKeys),
  );

  const allTrending = [...trending, ...trendingAnime];
  const allPopular = [...popular, ...popularAnime];

  const filteredTrending = filterByType(allTrending, trendingFilter);
  const filteredPopular = filterByType(allPopular, popularFilter);

  const discoverPayload = useMemo(() => {
    const items = [
      ...trending,
      ...popular,
      ...trendingAnime,
      ...popularAnime,
    ];
    return items.map((i) => ({ type: i.type, id: i.id }));
  }, [trending, popular, trendingAnime, popularAnime]);

  useEffect(() => {
    setWatchedSet(new Set(initialWatchedKeys));
    setWatchingSet(new Set(initialWatchingKeys));
  }, [initialWatchedKeys, initialWatchingKeys]);

  const refreshWatched = useCallback(async () => {
    if (!user || discoverPayload.length === 0) return;
    try {
      const res = await fetch("/api/discover/watched-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: discoverPayload }),
      });
      if (!res.ok) return;
      const data = (await res.json()) as {
        watchedKeys?: string[];
        watchingKeys?: string[];
      };
      if (Array.isArray(data.watchedKeys)) {
        setWatchedSet(new Set(data.watchedKeys));
      }
      if (Array.isArray(data.watchingKeys)) {
        setWatchingSet(new Set(data.watchingKeys));
      }
    } catch {
      // ignore
    }
  }, [user, discoverPayload]);

  useEffect(() => {
    if (!user) return;
    void refreshWatched();
  }, [user, refreshWatched]);

  useEffect(() => {
    if (!user) return;
    const onVis = () => {
      if (document.visibilityState === "visible") void refreshWatched();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [user, refreshWatched]);

  const watchHighlightFor = (item: TMDBMediaItem): WatchHighlight => {
    const key = discoverMediaKey(item.type, item.id);
    if (watchedSet.has(key)) return "watched";
    if (watchingSet.has(key)) return "watching";
    return null;
  };

  const handleQuickAdd = (item: TMDBMediaItem) => {
    if (!user) {
      router.push(`/login?next=${encodeURIComponent("/discover")}`);
      return;
    }
    setAddModalItem(tmdbDiscoverItemToEnriched(item));
  };

  return (
    <section className="mb-12 space-y-8">
      {allTrending.length > 0 && (
        <CarouselSection
          title="Trending"
          subtitle="What's hot right now"
          items={filteredTrending}
          filterValue={trendingFilter}
          onFilterChange={setTrendingFilter}
          watchHighlightFor={watchHighlightFor}
          onQuickAdd={handleQuickAdd}
        />
      )}
      {allPopular.length > 0 && (
        <CarouselSection
          title="Popular"
          subtitle="Movies and shows everyone's watching"
          items={filteredPopular}
          filterValue={popularFilter}
          onFilterChange={setPopularFilter}
          watchHighlightFor={watchHighlightFor}
          onQuickAdd={handleQuickAdd}
        />
      )}

      <AddToCollectionModal
        isOpen={addModalItem !== null}
        onClose={() => setAddModalItem(null)}
        item={addModalItem}
        onItemAdded={() => {
          router.refresh();
          void refreshWatched();
        }}
      />
    </section>
  );
}
