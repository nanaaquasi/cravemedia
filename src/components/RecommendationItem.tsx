"use client";

import Image from "next/image";
import Link from "next/link";
import { EnrichedRecommendation } from "@/lib/types";
import { useState } from "react";

interface RecommendationItemProps {
  item: EnrichedRecommendation;
  index: number;
  onAddToList?: (item: EnrichedRecommendation) => void;
  onMoreLikeThis?: (item: EnrichedRecommendation) => void;
}

export default function RecommendationItem({
  item,
  index,
  onAddToList,
  onMoreLikeThis,
}: RecommendationItemProps) {
  const [imgError, setImgError] = useState(false);
  const [showActions, setShowActions] = useState(false);

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

  const cardProps = {
    className: `group stagger-item liquid-glass rounded-2xl transition-all duration-300 block ${detailHref ? "cursor-pointer" : "cursor-default"}`,
    style: { animationDelay: `${index * 50}ms` } as React.CSSProperties,
    onMouseEnter: () => setShowActions(true),
    onMouseLeave: () => setShowActions(false),
  };

  const content = (
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
        <h3 className="text-[15px] font-semibold text-[var(--text-primary)] truncate">
          {item.title}
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
