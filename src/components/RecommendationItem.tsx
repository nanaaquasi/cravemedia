"use client";

import Image from "next/image";
import Link from "next/link";
import { Check, Play } from "lucide-react";
import TruncatedTitle from "@/components/TruncatedTitle";
import { EnrichedRecommendation } from "@/lib/types";
import { useState } from "react";
import type { ReactNode } from "react";

interface RecommendationItemProps {
  item: EnrichedRecommendation;
  index: number;
  onAddToList?: (item: EnrichedRecommendation) => void;
  onMoreLikeThis?: (item: EnrichedRecommendation) => void;
  viewMode?: "grid" | "list";
  /** Cravelist / context: same treatment as Discover trending cards (emerald / amber) */
  watchHighlight?: "watched" | "watching";
  /** Grid poster: extra controls on the bottom-right (e.g. status + review). */
  posterGridToolbarRight?: ReactNode;
}

export default function RecommendationItem({
  item,
  index,
  onAddToList,
  onMoreLikeThis,
  viewMode = "grid",
  watchHighlight,
  posterGridToolbarRight,
}: RecommendationItemProps) {
  const [imgError, setImgError] = useState(false);
  const hasGridOwnerToolbar = Boolean(posterGridToolbarRight);

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

  const renderGridPosterMedia = (posterToneHighlight: boolean) =>
    item.posterUrl && !imgError ? (
      <Image
        src={item.posterUrl}
        alt={item.title}
        fill
        unoptimized
        className={`object-cover transition-transform duration-300 group-hover:scale-105 ${
          posterToneHighlight ? "brightness-[0.88] saturate-[0.92]" : ""
        }`}
        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 200px"
        onError={() => setImgError(true)}
      />
    ) : (
      <div className="w-full h-full flex items-center justify-center text-5xl bg-gradient-to-br from-purple-900/50 via-pink-900/30 to-rose-900/40">
        {typeIcon}
      </div>
    );

  const detailHref =
    (item.type === "movie" ||
      item.type === "tv" ||
      item.type === "anime" ||
      item.type === "book") &&
    item.externalId
      ? `/media/${item.type}/${item.externalId}`
      : null;

  const isClickable = !!detailHref;
  const isList = viewMode === "list";
  const hasWatchHighlight =
    watchHighlight === "watched" || watchHighlight === "watching";
  const highlightBorderClass =
    watchHighlight === "watched"
      ? "!border-emerald-400/95 hover:!border-emerald-400/95"
      : "!border-amber-400/95 hover:!border-amber-400/95";
  /** Watched/watching grid: border wraps poster + meta (inner shell); list: border on outer card */
  const cardShellClass =
    isList && hasWatchHighlight
      ? `liquid-glass recommendation-card-accent rounded-xl border-2 ${highlightBorderClass} box-border`
      : !isList && hasWatchHighlight
        ? ""
        : "liquid-glass recommendation-card-frame";
  const cardProps = {
    className: `group stagger-item rounded-xl ${
      hasGridOwnerToolbar ? "!overflow-visible" : "overflow-hidden"
    } transition-all duration-300 block ${cardShellClass} ${
      isClickable ? "cursor-pointer" : "cursor-default"
    }`,
    style: { animationDelay: `${index * 50}ms` } as React.CSSProperties,
  };

  const content = isList ? (
    <div
      className={`flex flex-row gap-4 p-3 relative h-full ${isClickable ? "cursor-pointer" : "cursor-default"}`}
    >
      {/* Poster */}
      <div
        className={`relative w-24 sm:w-28 flex-shrink-0 aspect-[2/3] rounded-lg overflow-hidden bg-zinc-800 box-border`}
      >
        {item.posterUrl && !imgError ? (
          <Image
            src={item.posterUrl}
            alt={item.title}
            fill
            unoptimized
            className={`object-cover transition-transform duration-300 group-hover:scale-105 ${
              hasWatchHighlight ? "brightness-[0.88] saturate-[0.92]" : ""
            }`}
            sizes="120px"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-3xl bg-gradient-to-br from-purple-900/50 via-pink-900/30 to-rose-900/40">
            {typeIcon}
          </div>
        )}
        {watchHighlight === "watched" && (
          <>
            <div
              className="absolute inset-0 bg-gradient-to-t from-emerald-950/55 via-emerald-950/15 to-transparent pointer-events-none"
              aria-hidden
            />
            <div className="absolute top-1 left-1 flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-emerald-600 text-white text-[9px] font-semibold shadow-md z-10">
              <Check
                className="w-2.5 h-2.5 shrink-0"
                strokeWidth={3}
                aria-hidden
              />
              Watched
            </div>
          </>
        )}
        {watchHighlight === "watching" && (
          <>
            <div
              className="absolute inset-0 bg-gradient-to-t from-amber-950/55 via-amber-950/15 to-transparent pointer-events-none"
              aria-hidden
            />
            <div className="absolute top-1 left-1 flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-amber-500 text-[9px] font-semibold text-amber-950 shadow-md z-10">
              <Play className="w-2.5 h-2.5 shrink-0 fill-current" aria-hidden />
              Watching
            </div>
          </>
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
              ★ {Number(item.rating).toFixed(1)}
            </div>
          )}
        </div>
        <h3
          className={`text-[15px] sm:text-base font-semibold ${
            watchHighlight === "watched"
              ? "text-emerald-200/95"
              : watchHighlight === "watching"
                ? "text-amber-200/95"
                : "text-[var(--text-primary)]"
          }`}
        >
          <TruncatedTitle title={item.title} />
        </h3>
        <p className="text-sm text-[var(--text-secondary)] line-clamp-2 mt-1 mb-2">
          {item.description || "No description available."}
        </p>
        <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] mt-auto flex-wrap">
          {item.year != null && (
            <span className="flex-shrink-0">{item.year}</span>
          )}
          {item.year != null && item.runtime && item.runtime !== "" && (
            <span className="flex-shrink-0">·</span>
          )}
          {item.runtime && item.runtime !== "" && (
            <span className="flex-shrink-0">{item.runtime}</span>
          )}
        </div>
      </div>

      {/* Action buttons (right aligned) */}
      <div
        className="absolute right-3 top-1/2 -translate-y-1/2 flex flex-col items-center gap-2 opacity-100"
        onClick={(e) => e.stopPropagation()}
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
  ) : hasWatchHighlight ? (
    <div
      className={`liquid-glass recommendation-card-accent rounded-xl border-2 ${
        hasGridOwnerToolbar ? "!overflow-visible" : "overflow-hidden"
      } flex flex-col box-border ${highlightBorderClass}`}
    >
      {/* Poster / Cover — overflow only on image layer when status menu opens upward */}
      <div
        className={`relative aspect-[2/3] w-full ${
          hasGridOwnerToolbar ? "" : "overflow-hidden"
        }`}
      >
        {hasGridOwnerToolbar ? (
          <div className="absolute inset-0 overflow-hidden rounded-t-xl z-0">
            {renderGridPosterMedia(true)}
          </div>
        ) : (
          renderGridPosterMedia(true)
        )}

        {watchHighlight === "watched" && (
          <>
            <div
              className="absolute inset-0 bg-gradient-to-t from-emerald-950/55 via-emerald-950/15 to-transparent pointer-events-none z-[1]"
              aria-hidden
            />
            <div className="absolute top-1.5 left-1.5 flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-emerald-600 text-white text-[10px] font-semibold shadow-md z-10">
              <Check className="w-3 h-3 shrink-0" strokeWidth={3} aria-hidden />
              Watched
            </div>
          </>
        )}
        {watchHighlight === "watching" && (
          <>
            <div
              className="absolute inset-0 bg-gradient-to-t from-amber-950/55 via-amber-950/15 to-transparent pointer-events-none z-[1]"
              aria-hidden
            />
            <div className="absolute top-1.5 left-1.5 flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-amber-500 text-[10px] font-semibold text-amber-950 shadow-md z-10">
              <Play className="w-3 h-3 shrink-0 fill-current" aria-hidden />
              Watching
            </div>
          </>
        )}

        {/* Gradient overlay for text readability */}
        <div className="absolute inset-0 z-[1] pointer-events-none bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {/* Rating badge: top-right */}
        {item.rating && (
          <div className="absolute top-2 right-2 z-10">
            <div className="flex items-center gap-0.5 px-2 py-1 rounded-full bg-black/50 backdrop-blur-sm text-xs font-medium text-amber-300">
              ★ {Number(item.rating).toFixed(1)}
            </div>
          </div>
        )}

        {/* Bottom: media type + optional slot (cravelist status) or search actions */}
        <div className="absolute bottom-2 left-2 right-2 z-10 flex items-end justify-between gap-2">
          <span className="text-[10px] px-2 py-1 rounded-full bg-black/60 backdrop-blur-sm text-white/95 font-medium shrink-0 max-w-[45%] truncate">
            {typeBadge}
          </span>
          <div className="flex items-center gap-1.5 shrink-0 min-w-0 justify-end">
            {posterGridToolbarRight}
            {!hasGridOwnerToolbar && onAddToList && (
              <button
                type="button"
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
            {!hasGridOwnerToolbar && onMoreLikeThis && (
              <button
                type="button"
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
      </div>

      {/* Info section */}
      <div className="px-3 pt-3.5 pb-5 min-h-[4.25rem] flex flex-col justify-center">
        <h3
          className={`text-[15px] font-semibold leading-snug ${
            watchHighlight === "watched"
              ? "text-emerald-200/95"
              : watchHighlight === "watching"
                ? "text-amber-200/95"
                : "text-[var(--text-primary)]"
          }`}
        >
          <TruncatedTitle title={item.title} />
        </h3>
        <div className="flex items-center gap-2 mt-1.5 text-sm text-[var(--text-muted)] flex-wrap">
          {item.year != null && (
            <span className="flex-shrink-0">{item.year}</span>
          )}
          {item.year != null && item.runtime && item.runtime !== "" && (
            <span className="flex-shrink-0">·</span>
          )}
          {item.runtime && item.runtime !== "" && (
            <span className="flex-shrink-0">{item.runtime}</span>
          )}
        </div>
      </div>
    </div>
  ) : (
    <>
      {/* Poster / Cover — overflow only on image layer when cravelist status menu opens upward */}
      <div
        className={`relative aspect-[2/3] w-full ${
          hasGridOwnerToolbar ? "" : "overflow-hidden"
        }`}
      >
        {hasGridOwnerToolbar ? (
          <div className="absolute inset-0 overflow-hidden rounded-t-xl z-0">
            {renderGridPosterMedia(false)}
          </div>
        ) : (
          renderGridPosterMedia(false)
        )}

        {/* Gradient overlay for text readability */}
        <div className="absolute inset-0 z-[1] pointer-events-none bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {/* Rating badge: top-right */}
        {item.rating && (
          <div className="absolute top-2 right-2 z-10">
            <div className="flex items-center gap-0.5 px-2 py-1 rounded-full bg-black/50 backdrop-blur-sm text-xs font-medium text-amber-300">
              ★ {Number(item.rating).toFixed(1)}
            </div>
          </div>
        )}

        {/* Bottom: media type + optional cravelist slot or search actions */}
        <div className="absolute bottom-2 left-2 right-2 z-10 flex items-end justify-between gap-2">
          <span className="text-[10px] px-2 py-1 rounded-full bg-black/60 backdrop-blur-sm text-white/95 font-medium shrink-0 max-w-[45%] truncate">
            {typeBadge}
          </span>
          <div className="flex items-center gap-1.5 shrink-0 min-w-0 justify-end">
            {posterGridToolbarRight}
            {!hasGridOwnerToolbar && onAddToList && (
              <button
                type="button"
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
            {!hasGridOwnerToolbar && onMoreLikeThis && (
              <button
                type="button"
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
      </div>

      {/* Info section */}
      <div className="px-3 pt-4 pb-5">
        <h3 className="text-[15px] font-semibold leading-snug text-[var(--text-primary)]">
          <TruncatedTitle title={item.title} />
        </h3>
        <div className="flex items-center gap-2 mt-1.5 text-sm text-[var(--text-muted)] flex-wrap">
          {item.year != null && (
            <span className="flex-shrink-0">{item.year}</span>
          )}
          {item.year != null && item.runtime && item.runtime !== "" && (
            <span className="flex-shrink-0">·</span>
          )}
          {item.runtime && item.runtime !== "" && (
            <span className="flex-shrink-0">{item.runtime}</span>
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
