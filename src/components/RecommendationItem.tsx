"use client";

import Image from "next/image";
import Link from "next/link";
import TruncatedTitle from "@/components/TruncatedTitle";
import { useRouter } from "next/navigation";
import { EnrichedRecommendation } from "@/lib/types";
import { useState } from "react";

interface RecommendationItemProps {
  item: EnrichedRecommendation;
  index: number;
  onAddToList?: (item: EnrichedRecommendation) => void;
  onMoreLikeThis?: (item: EnrichedRecommendation) => void;
  viewMode?: "grid" | "list";
}

export default function RecommendationItem({
  item,
  index,
  onAddToList,
  onMoreLikeThis,
  viewMode = "grid",
}: RecommendationItemProps) {
  const router = useRouter();
  const [imgError, setImgError] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [isLookingUp, setIsLookingUp] = useState(false);

  const typeIcon =
    item.type === "movie"
      ? "🎬"
      : item.type === "tv"
        ? "📺"
        : item.type === "book"
          ? "📚"
          : "🎌";
  const typeBadge =
    item.type === "movie"
      ? "Movie"
      : item.type === "tv"
        ? "TV"
        : item.type === "book"
          ? "Book"
          : "Anime";

  const detailHref =
    (item.type === "movie" || item.type === "tv" || item.type === "anime") &&
    item.externalId
      ? `/media/${item.type}/${item.externalId}`
      : null;

  const canLookup =
    (item.type === "movie" || item.type === "tv" || item.type === "anime") &&
    !item.externalId;

  async function handleLookupClick() {
    if (!canLookup || isLookingUp) return;
    setIsLookingUp(true);
    try {
      const res = await fetch(
        `/api/search/media?q=${encodeURIComponent(item.title)}&type=${item.type}`,
      );
      const data = await res.json();
      const match = data.items?.find(
        (i: EnrichedRecommendation) =>
          i.externalId && i.type === item.type,
      );
      if (match?.externalId) {
        router.push(`/media/${item.type}/${match.externalId}`);
      } else {
        router.push(
          `/search?q=${encodeURIComponent(item.title)}&type=${item.type}`,
        );
      }
    } catch {
      router.push(
        `/search?q=${encodeURIComponent(item.title)}&type=${item.type}`,
      );
    } finally {
      setIsLookingUp(false);
    }
  }

  const isClickable = !!detailHref || canLookup;
  const cardProps = {
    className: `group stagger-item liquid-glass rounded-2xl transition-all duration-300 block ${isClickable ? "cursor-pointer" : "cursor-default"} ${isLookingUp ? "opacity-70 pointer-events-none" : ""}`,
    style: { animationDelay: `${index * 50}ms` } as React.CSSProperties,
    onMouseEnter: () => setShowActions(true),
    onMouseLeave: () => setShowActions(false),
    ...(canLookup && {
      onClick: handleLookupClick,
      onKeyDown: (e: React.KeyboardEvent) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleLookupClick();
        }
      },
      role: "button" as const,
      tabIndex: 0,
      "aria-label": `View details for ${item.title}`,
    }),
  };

  const isList = viewMode === "list";

  const content = isList ? (
    <div
      className={`flex flex-row gap-4 p-3 relative h-full ${isClickable ? "cursor-pointer" : "cursor-default"}`}
    >
      {/* Poster */}
      <div className="relative w-24 sm:w-28 flex-shrink-0 aspect-[2/3] rounded-lg overflow-hidden bg-zinc-800">
        {item.posterUrl && !imgError ? (
          <Image
            src={item.posterUrl}
            alt={item.title}
            fill
            unoptimized
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="120px"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-3xl bg-gradient-to-br from-purple-900/50 via-pink-900/30 to-rose-900/40">
            {typeIcon}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex flex-col justify-center flex-1 min-w-0 pr-10">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-white/90 font-medium whitespace-nowrap">
            {typeBadge}
          </span>
          {item.rating && (
            <div className="flex items-center gap-0.5 text-xs font-medium text-amber-300 whitespace-nowrap">
              ★ {item.rating}
            </div>
          )}
        </div>
        <h3 className="text-[15px] sm:text-base font-semibold text-[var(--text-primary)]">
          <TruncatedTitle title={item.title} />
        </h3>
        <p className="text-sm text-[var(--text-secondary)] line-clamp-2 mt-1 mb-2">
          {item.description || "No description available."}
        </p>
        <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] mt-auto">
          <span className="truncate">{item.creator}</span>
          <span className="flex-shrink-0">·</span>
          <span className="flex-shrink-0">{item.year}</span>
          {item.runtime && (
            <>
              <span className="flex-shrink-0">·</span>
              <span className="flex-shrink-0 truncate">{item.runtime}</span>
            </>
          )}
        </div>
      </div>

      {/* Action buttons (right aligned) */}
      <div
        className={`absolute right-3 top-1/2 -translate-y-1/2 flex flex-col items-center gap-2 transition-opacity duration-200 ${
          showActions ? "opacity-100" : "opacity-0 md:opacity-0 opacity-100"
        }`}
      >
        {onAddToList && (
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onAddToList(item);
            }}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            title="Add to list"
            aria-label={`Add ${item.title} to list`}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
        )}
        {onMoreLikeThis && (
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onMoreLikeThis(item);
            }}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            title="More like this"
            aria-label={`More like ${item.title}`}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="4" y1="6" x2="20" y2="6" />
              <line x1="4" y1="12" x2="20" y2="12" />
              <line x1="4" y1="18" x2="20" y2="18" />
            </svg>
          </button>
        )}
      </div>
    </div>
  ) : (
    <>
      {/* Poster / Cover - prominent card style */}
      <div className="relative aspect-[2/3] w-full overflow-hidden">
        {item.posterUrl && !imgError ? (
          <Image
            src={item.posterUrl}
            alt={item.title}
            fill
            unoptimized
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 200px"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-5xl bg-gradient-to-br from-purple-900/50 via-pink-900/30 to-rose-900/40">
            {typeIcon}
          </div>
        )}

        {/* Gradient overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {/* Action buttons overlay */}
        <div
          className={`absolute bottom-3 left-3 right-3 flex items-center justify-between transition-opacity duration-200 ${
            showActions ? "opacity-100" : "opacity-0"
          }`}
        >
          <span className="text-[10px] px-2 py-1 rounded-full bg-black/50 backdrop-blur-sm text-white/90 font-medium">
            {typeBadge}
          </span>
          <div className="flex items-center gap-1">
            {onAddToList && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onAddToList(item);
                }}
                className="p-2 rounded-full bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white transition-colors cursor-pointer"
                title="Add to list"
                aria-label={`Add ${item.title} to list`}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </button>
            )}
            {onMoreLikeThis && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onMoreLikeThis(item);
                }}
                className="p-2 rounded-full bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white transition-colors cursor-pointer"
                title="More like this"
                aria-label={`More like ${item.title}`}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="4" y1="6" x2="20" y2="6" />
                  <line x1="4" y1="12" x2="20" y2="12" />
                  <line x1="4" y1="18" x2="20" y2="18" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Rating badge */}
        {item.rating && (
          <div className="absolute top-2 right-2 flex items-center gap-0.5 px-2 py-1 rounded-full bg-black/50 backdrop-blur-sm text-xs font-medium text-amber-300">
            ★ {item.rating}
          </div>
        )}
      </div>

      {/* Info section */}
      <div className="p-3">
        <h3 className="text-[15px] font-semibold text-[var(--text-primary)]">
          <TruncatedTitle title={item.title} />
        </h3>
        <div className="flex items-center gap-2 mt-0.5 text-sm text-[var(--text-secondary)]">
          <span className="truncate">{item.creator}</span>
          <span className="text-[var(--text-muted)] flex-shrink-0">·</span>
          <span className="text-[var(--text-muted)] flex-shrink-0">
            {item.year}
          </span>
          {item.runtime && (
            <>
              <span className="text-[var(--text-muted)] flex-shrink-0">·</span>
              <span className="text-[var(--text-muted)] flex-shrink-0 truncate">
                {item.runtime}
              </span>
            </>
          )}
        </div>
      </div>
    </>
  );

  if (detailHref) {
    return (
      <Link href={detailHref} {...cardProps}>
        {content}
      </Link>
    );
  }

  return <div {...cardProps}>{content}</div>;
}
