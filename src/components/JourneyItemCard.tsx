"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { JourneyItem } from "@/lib/types";

interface JourneyItemCardProps {
  item: JourneyItem;
  journeyId: string;
  isCurrent: boolean;
  isLocked: boolean;
  isCompleted?: boolean;
  itemReview?: { item_rating: number | null; review_text: string | null };
  setShowActionsFor: (id: number | null) => void;
  showActionsFor: number | null;
  onMarkWatched: (journeyId: string, position: number) => void;
  onOpenItemReview?: (position: number) => void;
  onAddToList?: (item: JourneyItem) => void;
  onMoreLikeThis?: (item: JourneyItem) => void;
  isOwner?: boolean;
}

export default function JourneyItemCard({
  item,
  journeyId,
  isCurrent,
  isLocked,
  isCompleted = false,
  itemReview,
  setShowActionsFor,
  showActionsFor,
  onMarkWatched,
  onOpenItemReview,
  onAddToList,
  onMoreLikeThis,
  isOwner = true,
}: JourneyItemCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const position = item.position;

  return (
    <div
      className={`relative rounded-2xl overflow-hidden border transition-all duration-300 ${
        isCurrent
          ? "border-purple-500/60 bg-purple-500/10 ring-2 ring-purple-500/30"
          : isCompleted
            ? "border-green-500/30 bg-green-500/5"
            : isLocked
              ? "border-white/[0.04] bg-white/[0.02] opacity-60"
              : "liquid-glass"
      }`}
      onMouseEnter={() => setShowActionsFor(position)}
      onMouseLeave={() => setShowActionsFor(null)}
    >
      {isCurrent && (
        <div className="absolute top-3 left-3 z-30 px-2 py-1 rounded-full bg-purple-500/90 text-xs font-bold text-white">
          YOU ARE HERE
        </div>
      )}
      {isCompleted && !isCurrent && (
        <div className="absolute top-3 left-3 z-30 px-2 py-1 rounded-full bg-green-500/90 text-xs font-bold text-white">
          ✓ Watched
        </div>
      )}
      <div className="flex flex-col sm:flex-row gap-4 p-4">
        {/* Poster */}
        <div className="relative w-full sm:w-48 md:w-56 aspect-video sm:aspect-[2/3] flex-shrink-0 rounded-xl overflow-hidden bg-black/40">
          {item.posterUrl ? (
            <>
              {/* Blurred background for mobile fill */}
              <div className="absolute inset-0 sm:hidden">
                <Image
                  src={item.posterUrl}
                  alt=""
                  fill
                  unoptimized
                  className="object-cover blur-md opacity-50 scale-110"
                  sizes="100vw"
                />
              </div>
              {/* Main image */}
              <Image
                src={item.posterUrl}
                alt={item.title}
                fill
                unoptimized
                className="object-contain sm:object-cover relative z-10"
                sizes="(max-width: 640px) 100vw, 128px"
              />
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-4xl bg-gradient-to-br from-purple-900/50 to-pink-900/30">
              {item.type === "movie" ? "🎬" : item.type === "tv" ? "📺" : "📚"}
            </div>
          )}
          <div className="absolute top-1 right-1 z-20 flex gap-1">
            <div className="px-1.5 py-0.5 rounded bg-black/60 text-xs font-medium text-white/90 capitalize">
              {item.type === "tv" ? "TV" : item.type}
            </div>
            {item.rating && (
              <div className="px-1.5 py-0.5 rounded bg-black/60 text-xs font-medium text-amber-300">
                ★ {item.rating}
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-medium text-[var(--text-muted)]">
              Step {position}
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-[var(--text-muted)]">
              {item.difficultyLevel}
            </span>
          </div>
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-1">
            {item.title}
          </h3>
          <p className="text-sm text-[var(--text-secondary)] mb-2">
            {item.creator} · {item.year}
            {item.runtime && ` · ${item.runtime}`}
          </p>

          <div className="mb-2">
            <p className="text-xs font-medium text-[var(--text-muted)] mb-0.5">
              Why this step
            </p>
            <div className="text-sm text-[var(--text-secondary)]">
              <p className={isExpanded ? "" : "line-clamp-3"}>
                {item.whyThisPosition}
              </p>
              {item.whyThisPosition.length > 150 && (
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="text-xs text-purple-400 hover:text-purple-300 mt-1 cursor-pointer font-medium"
                >
                  {isExpanded ? "Show less" : "Show more"}
                </button>
              )}
            </div>
          </div>

          {item.whatYoullLearn && (
            <div className="flex flex-wrap gap-1 mb-3">
              {item.keyThemes?.slice(0, 4).map((theme) => (
                <span
                  key={theme}
                  className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-[var(--text-muted)]"
                >
                  {theme}
                </span>
              ))}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {isCompleted ? (
              <>
                <span className="text-xs px-3 py-1.5 rounded-full bg-green-500/20 text-green-400 border border-green-500/30">
                  ✓ Watched
                </span>
                {isOwner && onOpenItemReview && (
                  <button
                    onClick={() => onOpenItemReview(position)}
                    className="text-xs px-3 py-1.5 rounded-full bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 transition-colors cursor-pointer border border-amber-500/30"
                  >
                    {itemReview?.review_text || itemReview?.item_rating
                      ? "Edit review"
                      : "Add review"}
                  </button>
                )}
              </>
            ) : (
              !isLocked &&
              isOwner && (
                <button
                  onClick={() => onMarkWatched(journeyId, position)}
                  className="text-xs px-3 py-1.5 rounded-full bg-green-500/20 text-green-300 hover:bg-green-500/30 transition-colors cursor-pointer"
                >
                  Mark watched
                </button>
              )
            )}
            {(item.type === "movie" ||
              item.type === "tv" ||
              item.type === "anime") &&
              item.externalId && (
                <Link
                  href={`/media/${item.type}/${item.externalId}`}
                  className="text-xs px-3 py-1.5 rounded-full bg-white/10 text-[var(--text-secondary)] hover:bg-white/20 transition-colors cursor-pointer"
                >
                  Details
                </Link>
              )}
            {isOwner && onAddToList && showActionsFor === position && (
              <button
                onClick={() => onAddToList(item)}
                className="text-xs px-3 py-1.5 rounded-full bg-white/10 text-[var(--text-secondary)] hover:bg-white/20 transition-colors cursor-pointer"
              >
                Add to list
              </button>
            )}
            {isOwner && onMoreLikeThis && showActionsFor === position && (
              <button
                onClick={() => onMoreLikeThis(item)}
                className="text-xs px-3 py-1.5 rounded-full bg-white/10 text-[var(--text-secondary)] hover:bg-white/20 transition-colors cursor-pointer"
              >
                More like this
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
