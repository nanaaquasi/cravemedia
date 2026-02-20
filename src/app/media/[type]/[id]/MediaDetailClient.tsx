"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  Eye,
  CheckCircle,
  EyeOff,
  Pause,
  Play,
  XCircle,
  ChevronDown,
  Star,
  Loader2,
  FolderPlus,
} from "lucide-react";
import Link from "next/link";
import {
  updateMediaStatusAcrossCollections,
  reviewMediaAcrossCollections,
  type WatchStatus,
} from "@/app/actions/collection";
import AddToCollectionModal from "@/components/AddToCollectionModal";
import EpisodeQualityGrid from "@/components/EpisodeQualityGrid";
import type { EnrichedRecommendation } from "@/lib/types";
import type { EpisodeQualityData } from "@/lib/tmdb";

export interface CastMember {
  id: number;
  name: string;
  character: string;
  profileUrl: string | null;
}

export interface RecommendedTitle {
  id: number;
  title: string;
  posterUrl: string | null;
  voteAverage: number;
  type: "movie" | "tv";
}

export interface MediaDetails {
  title: string;
  overview: string | null;
  posterUrl: string | null;
  backdropUrl: string | null;
  voteAverage: number;
  voteCount: number;
  releaseDate: string | null;
  runtime: string | null;
  genres: string[];
  directors: string[];
  trailerKey: string | null;
  type: "movie" | "tv" | "anime";
  episodes?: number | null;
  studios?: string[];
  format?: string;
  cast?: CastMember[];
  recommendations?: RecommendedTitle[];
  releaseStatus?: string | null;
  originalLanguage?: string | null;
  originCountry?: string[];
  writers?: string[];
}

function getTimeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const seconds = Math.floor((now - then) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold text-[var(--text-muted)] mb-0.5">
        {label}
      </p>
      <p className="text-sm text-white">{value}</p>
    </div>
  );
}

const STATUS_OPTIONS: {
  value: WatchStatus;
  icon: typeof CheckCircle;
  label: string;
  bookLabel: string;
}[] = [
  { value: "watched", icon: CheckCircle, label: "Watched", bookLabel: "Read" },
  { value: "dropped", icon: EyeOff, label: "Dropped", bookLabel: "Dropped" },
  { value: "watching", icon: Play, label: "Watching", bookLabel: "Reading" },
  { value: "on_hold", icon: Pause, label: "On Hold", bookLabel: "On Hold" },
  { value: "not_seen", icon: Eye, label: "Not Seen", bookLabel: "Not Seen" },
  {
    value: "not_interested",
    icon: XCircle,
    label: "Not Interested",
    bookLabel: "Not Interested",
  },
];

export interface MediaReview {
  id: string;
  rating: number | null;
  text: string;
  containsSpoilers: boolean;
  createdAt: string;
  user: {
    id: string;
    username: string | null;
    fullName: string | null;
    avatarUrl: string | null;
  };
}

interface MediaDetailClientProps {
  details: MediaDetails;
  mediaId: string;
  currentStatus: WatchStatus | null;
  communityStats?: Record<string, number>;
  reviews?: MediaReview[];
  canReview?: boolean;
  episodeQuality?: EpisodeQualityData;
}

export default function MediaDetailClient({
  details,
  mediaId,
  currentStatus: initialStatus,
  communityStats,
  reviews = [],
  canReview = false,
  episodeQuality = [],
}: MediaDetailClientProps) {
  const [showTrailerModal, setShowTrailerModal] = useState(false);
  const [status, setStatus] = useState<WatchStatus | null>(initialStatus);
  const [statusOpen, setStatusOpen] = useState(false);
  const statusRef = useRef<HTMLDivElement>(null);
  const [showAddToCollection, setShowAddToCollection] = useState(false);

  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [reviewSpoilers, setReviewSpoilers] = useState(false);
  const [isSavingReview, setIsSavingReview] = useState(false);
  const [revealedSpoilers, setRevealedSpoilers] = useState<Set<string>>(
    new Set(),
  );

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowTrailerModal(false);
    };
    if (showTrailerModal) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [showTrailerModal]);

  useEffect(() => {
    if (!statusOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (statusRef.current && !statusRef.current.contains(e.target as Node)) {
        setStatusOpen(false);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setStatusOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [statusOpen]);

  const handleStatusChange = async (newStatus: WatchStatus) => {
    const prev = status;
    setStatus(newStatus);
    setStatusOpen(false);
    const result = await updateMediaStatusAcrossCollections(
      mediaId,
      details.type,
      newStatus,
    );
    if (result.error) {
      setStatus(prev);
    }
  };

  const handleSaveReview = async () => {
    setIsSavingReview(true);
    const result = await reviewMediaAcrossCollections(mediaId, details.type, {
      rating: reviewRating || undefined,
      review: reviewText.trim() || undefined,
      containsSpoilers: reviewSpoilers,
    });
    setIsSavingReview(false);
    if (!result.error) {
      setShowReviewModal(false);
    }
  };

  const collectionItem: EnrichedRecommendation = {
    title: details.title,
    creator: details.directors.join(", ") || "",
    year: details.releaseDate
      ? Number.parseInt(details.releaseDate.slice(0, 4), 10)
      : 0,
    type: details.type === "anime" ? "anime" : details.type,
    description: details.overview ?? "",
    genres: details.genres,
    posterUrl: details.posterUrl,
    rating: details.voteAverage,
    ratingSource: "tmdb",
    runtime: details.runtime,
    externalId: mediaId,
  };

  const isBook = false;
  const statusConfig = status
    ? STATUS_OPTIONS.find((s) => s.value === status) ?? STATUS_OPTIONS[4]
    : null;

  const year = details.releaseDate?.slice(0, 4) ?? null;
  const trailerKey = details.trailerKey;
  const embedUrl = trailerKey
    ? `https://www.youtube.com/embed/${trailerKey}?autoplay=1`
    : null;

  const typeLabel =
    details.type === "movie"
      ? "Movie"
      : details.type === "tv"
        ? "TV Show"
        : (details.format ?? "Anime");

  return (
    <main className="min-h-screen flex flex-col overflow-x-hidden w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
      {/* Hero */}
      <div className="relative -mx-4 sm:-mx-6 md:-mx-8 mb-6 overflow-hidden rounded-2xl aspect-video max-h-[280px] sm:max-h-[320px] min-w-0">
        {details.backdropUrl ? (
          <Image
            src={details.backdropUrl}
            alt=""
            fill
            className="object-cover"
            sizes="100vw"
            unoptimized
            priority
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-purple-900/60 via-pink-900/40 to-rose-900/50" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-primary)] via-transparent to-transparent" />
        <div className="absolute bottom-4 left-4 right-4 sm:left-6 sm:right-6">
          <span className="inline-block px-2.5 py-0.5 rounded-full bg-black/50 backdrop-blur-sm text-xs font-medium text-white/90 mb-2">
            {typeLabel}
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white drop-shadow-lg">
            {details.title}
          </h1>
          <div className="flex items-center gap-2 mt-1 text-sm text-white/80">
            {year && <span>{year}</span>}
            {(details.runtime || details.episodes) && (
              <>
                <span className="text-white/50">·</span>
                <span>
                  {details.episodes
                    ? `${details.episodes} eps`
                    : details.runtime}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Content: two-column on desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-6 lg:gap-8 max-w-6xl min-w-0 w-full items-start">
        {/* Left column: Poster + Infos */}
        <div className="flex flex-col gap-5">
          {/* Poster */}
          <div className="shrink-0 w-36 sm:w-52 lg:w-full">
            {details.posterUrl ? (
              <div className="relative aspect-[2/3] rounded-xl overflow-hidden border border-white/[0.08]">
                <Image
                  src={details.posterUrl}
                  alt={details.title}
                  fill
                  className="object-cover"
                  sizes="220px"
                  unoptimized
                />
              </div>
            ) : (
              <div className="aspect-[2/3] rounded-xl bg-[var(--bg-card)] border border-white/[0.06] flex items-center justify-center text-4xl">
                {details.type === "movie"
                  ? "🎬"
                  : details.type === "tv"
                    ? "📺"
                    : "🎌"}
              </div>
            )}
          </div>

          {/* Infos panel */}
          <div className="space-y-3">
            <h3 className="text-lg font-bold text-white">Infos</h3>

            {details.runtime && (
              <InfoRow label="Runtime" value={details.runtime} />
            )}
            {details.directors.length > 0 && (
              <InfoRow
                label={`Director${details.directors.length > 1 ? "s" : ""}`}
                value={details.directors.join(", ")}
              />
            )}
            {details.writers && details.writers.length > 0 && (
              <InfoRow
                label={`Writer${details.writers.length > 1 ? "s" : ""}`}
                value={details.writers.join(", ")}
              />
            )}
            {details.studios && details.studios.length > 0 && (
              <InfoRow
                label={`Studio${details.studios.length > 1 ? "s" : ""}`}
                value={details.studios.join(", ")}
              />
            )}

            <div className="border-t border-white/[0.06] pt-3 space-y-3">
              {details.releaseStatus && (
                <InfoRow label="Release Status" value={details.releaseStatus} />
              )}
              {details.releaseDate && (
                <InfoRow
                  label="Release Date"
                  value={formatDate(details.releaseDate)}
                />
              )}
              {details.originalLanguage && (
                <InfoRow
                  label="Original Language"
                  value={details.originalLanguage}
                />
              )}
              {details.originCountry && details.originCountry.length > 0 && (
                <InfoRow
                  label={`Origin Country`}
                  value={details.originCountry.join(", ")}
                />
              )}
            </div>

            {communityStats && Object.keys(communityStats).length > 0 && (
              <div className="border-t border-white/[0.06] pt-3 space-y-3">
                {(communityStats.watching ?? 0) > 0 && (
                  <InfoRow
                    label="People Watching"
                    value={String(communityStats.watching)}
                  />
                )}
                {(communityStats.watched ?? 0) > 0 && (
                  <InfoRow
                    label="People Finished"
                    value={String(communityStats.watched)}
                  />
                )}
                {(communityStats.on_hold ?? 0) > 0 && (
                  <InfoRow
                    label="People On Hold"
                    value={String(communityStats.on_hold)}
                  />
                )}
                {(communityStats.dropped ?? 0) > 0 && (
                  <InfoRow
                    label="People Dropped"
                    value={String(communityStats.dropped)}
                  />
                )}
                {(communityStats.not_seen ?? 0) +
                  (communityStats.not_interested ?? 0) >
                  0 && (
                  <InfoRow
                    label="People Interested"
                    value={String(
                      (communityStats.not_seen ?? 0) +
                        (communityStats.not_interested ?? 0),
                    )}
                  />
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right column: Actions, Overview, Genres, Cast */}
        <div className="flex flex-col gap-6 min-w-0">
          {/* Rating */}
          {details.voteAverage > 0 && (
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 text-sm font-medium">
                ★ {details.voteAverage.toFixed(1)}
              </span>
              {details.voteCount > 0 && (
                <span className="text-sm text-[var(--text-muted)]">
                  {details.voteCount.toLocaleString()} votes
                </span>
              )}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-3">
            {trailerKey && (
              <button
                onClick={() => setShowTrailerModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/30 transition-colors cursor-pointer"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
                Play trailer
              </button>
            )}

            {statusConfig && (
              <div ref={statusRef} className="relative">
                <button
                  onClick={() => setStatusOpen((p) => !p)}
                  className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-colors cursor-pointer ${
                    status !== "not_seen"
                      ? "bg-green-500/20 hover:bg-green-500/30 text-green-300 border-green-500/30"
                      : "bg-white/[0.06] hover:bg-white/[0.1] text-[var(--text-secondary)] border-white/10"
                  }`}
                  aria-expanded={statusOpen}
                >
                  <statusConfig.icon className="w-4 h-4" />
                  {isBook ? statusConfig.bookLabel : statusConfig.label}
                  <ChevronDown
                    className={`w-3.5 h-3.5 transition-transform ${statusOpen ? "rotate-180" : ""}`}
                  />
                </button>
                {statusOpen && (
                  <div
                    role="menu"
                    className="absolute left-0 top-full mt-1 py-1 min-w-[180px] rounded-lg bg-zinc-900/95 backdrop-blur border border-white/10 shadow-xl z-30"
                  >
                    {STATUS_OPTIONS.map((opt) => {
                      const Icon = opt.icon;
                      const label = isBook ? opt.bookLabel : opt.label;
                      const isSelected = opt.value === status;
                      return (
                        <button
                          key={opt.value}
                          role="menuitem"
                          onClick={() => handleStatusChange(opt.value)}
                          className={`w-full flex items-center gap-2 px-3 py-2 text-left text-sm transition-colors cursor-pointer ${
                            isSelected
                              ? "bg-white/10 text-white"
                              : "text-zinc-300 hover:bg-white/5 hover:text-white"
                          }`}
                        >
                          <Icon className="w-4 h-4 shrink-0" />
                          {label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            <button
              onClick={() => setShowAddToCollection(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-[var(--text-secondary)] hover:text-white border border-white/10 transition-colors cursor-pointer"
            >
              <FolderPlus className="w-4 h-4" />
              Add to Collection
            </button>
          </div>

          {/* Overview */}
          {details.overview && (
            <div>
              <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-1">
                Overview
              </p>
              <p className="text-[var(--text-secondary)] leading-relaxed">
                {details.overview}
              </p>
            </div>
          )}

          {/* Genres */}
          {details.genres.length > 0 && (
            <div>
              <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-2">
                Genres
              </p>
              <div className="flex flex-wrap gap-2">
                {details.genres.map((g) => (
                  <span
                    key={g}
                    className="px-2.5 py-1 rounded-lg bg-white/[0.06] text-sm text-[var(--text-secondary)]"
                  >
                    {g}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Episode Quality (TV only) */}
          {details.type === "tv" && episodeQuality.length > 0 && (
            <div>
              <h2 className="text-lg font-bold text-white mb-3">
                Episode Quality
              </h2>
              <EpisodeQualityGrid
                data={episodeQuality}
                mediaTitle={details.title}
                mediaId={mediaId}
              />
            </div>
          )}

          {/* Cast */}
          {details.cast && details.cast.length > 0 && (
            <div>
              <h2 className="text-lg font-bold text-white mb-3">Cast</h2>
              <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                {details.cast.map((member) => (
                  <div
                    key={member.id}
                    className="shrink-0 w-24 sm:w-28 text-center"
                  >
                    <div className="relative aspect-square rounded-xl overflow-hidden bg-zinc-800 mb-2">
                      {member.profileUrl ? (
                        <Image
                          src={member.profileUrl}
                          alt={member.name}
                          fill
                          className="object-cover"
                          sizes="112px"
                          unoptimized
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-3xl text-zinc-600">
                          👤
                        </div>
                      )}
                    </div>
                    <p className="text-xs font-medium text-white leading-tight line-clamp-1">
                      {member.name}
                    </p>
                    <p className="text-[11px] text-[var(--text-muted)] leading-tight line-clamp-1">
                      {member.character}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recommended Titles */}
          {details.recommendations && details.recommendations.length > 0 && (
            <div>
              <h2 className="text-lg font-bold text-white mb-3">
                Recommended Titles
              </h2>
              <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                {details.recommendations.map((rec) => (
                  <Link
                    key={rec.id}
                    href={`/media/${rec.type}/${rec.id}`}
                    className="shrink-0 w-28 sm:w-32 group"
                  >
                    <div className="relative aspect-[2/3] rounded-xl overflow-hidden bg-zinc-800 mb-2 border border-white/[0.06] group-hover:border-white/20 transition-colors">
                      {rec.posterUrl ? (
                        <Image
                          src={rec.posterUrl}
                          alt={rec.title}
                          fill
                          className="object-cover"
                          sizes="128px"
                          unoptimized
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-3xl text-zinc-600">
                          🎬
                        </div>
                      )}
                      {rec.voteAverage > 0 && (
                        <span className="absolute top-2 right-2 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-black/70 backdrop-blur-sm text-xs font-medium text-amber-300">
                          ★ {rec.voteAverage.toFixed(1)}
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-medium text-white leading-tight line-clamp-2 group-hover:text-purple-300 transition-colors">
                      {rec.title}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          )}
          {/* Reviews */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold text-white">Reviews</h2>
              {canReview && (
                <button
                  onClick={() => {
                    setReviewRating(0);
                    setReviewText("");
                    setReviewSpoilers(false);
                    setShowReviewModal(true);
                  }}
                  className="px-4 py-1.5 rounded-lg bg-pink-600 hover:bg-pink-700 text-white text-sm font-medium transition-colors cursor-pointer"
                >
                  Write a Review
                </button>
              )}
            </div>
            {reviews.length > 0 ? (
              <div className="space-y-4">
                {reviews.map((review) => {
                  const displayName =
                    review.user.fullName ||
                    review.user.username ||
                    "Anonymous";
                  const initials = displayName
                    .split(" ")
                    .map((w) => w[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase();
                  const isSpoilerHidden =
                    review.containsSpoilers &&
                    !revealedSpoilers.has(review.id);
                  const timeAgo = getTimeAgo(review.createdAt);

                  return (
                    <div
                      key={review.id}
                      className="rounded-xl bg-white/[0.04] border border-white/[0.06] p-4"
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex items-center gap-3">
                          {review.user.avatarUrl ? (
                            <Image
                              src={review.user.avatarUrl}
                              alt={displayName}
                              width={36}
                              height={36}
                              className="rounded-full object-cover"
                              unoptimized
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-green-500 to-teal-600 flex items-center justify-center text-xs font-bold text-white">
                              {initials}
                            </div>
                          )}
                          <div>
                            <p className="text-sm font-semibold text-white">
                              {displayName}
                            </p>
                            <p className="text-xs text-zinc-500">{timeAgo}</p>
                          </div>
                        </div>
                        {review.rating && (
                          <span className="flex items-center gap-0.5 text-amber-400 text-sm font-semibold shrink-0">
                            {review.rating}
                            <Star className="w-3.5 h-3.5 fill-amber-400" />
                          </span>
                        )}
                      </div>
                      {isSpoilerHidden ? (
                        <button
                          onClick={() =>
                            setRevealedSpoilers((prev) =>
                              new Set(prev).add(review.id),
                            )
                          }
                          className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors cursor-pointer py-1"
                        >
                          <EyeOff className="w-4 h-4" />
                          This review contains spoilers — tap to reveal
                        </button>
                      ) : (
                        <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">
                          {review.text}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-zinc-500">
                No reviews yet. Be the first to write one!
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Review modal */}
      {showReviewModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
          onClick={() => !isSavingReview && setShowReviewModal(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-zinc-900 border border-white/10 p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-white mb-1">
              Rate & Review
            </h3>
            <p className="text-zinc-400 text-sm mb-4 truncate">
              {details.title}
            </p>
            <div className="flex gap-1 mb-4">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setReviewRating(star)}
                  className="p-1 rounded transition-colors cursor-pointer"
                >
                  <Star
                    className={`w-8 h-8 ${
                      star <= reviewRating
                        ? "text-amber-400 fill-amber-400"
                        : "text-zinc-500 hover:text-amber-400/50"
                    }`}
                  />
                </button>
              ))}
            </div>
            <textarea
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value.slice(0, 280))}
              placeholder="Write your review (optional)"
              rows={3}
              maxLength={280}
              disabled={isSavingReview}
              className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-zinc-500 focus:border-purple-500 focus:outline-none resize-none disabled:opacity-50 mb-1"
            />
            <p className="text-zinc-500 text-xs mb-3">
              {reviewText.length}/280
            </p>
            <label className="flex items-center gap-2 mb-5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={reviewSpoilers}
                onChange={(e) => setReviewSpoilers(e.target.checked)}
                disabled={isSavingReview}
                className="w-4 h-4 rounded border-white/20 bg-black/50 text-purple-500 focus:ring-purple-500 focus:ring-offset-0 cursor-pointer"
              />
              <span className="text-sm text-zinc-300">
                This review contains spoilers
              </span>
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => !isSavingReview && setShowReviewModal(false)}
                disabled={isSavingReview}
                className="flex-1 py-2.5 rounded-xl font-medium text-zinc-300 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveReview}
                disabled={isSavingReview}
                className="flex-1 py-2.5 rounded-xl font-medium bg-purple-500 hover:bg-purple-600 text-white transition-colors disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
              >
                {isSavingReview ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4" />
                )}
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Trailer modal */}
      {showTrailerModal && embedUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
          onClick={() => setShowTrailerModal(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Trailer"
        >
          <div
            className="relative w-full max-w-4xl aspect-video rounded-xl overflow-hidden bg-black shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowTrailerModal(false)}
              className="absolute top-3 right-3 z-10 w-10 h-10 rounded-full bg-black/60 hover:bg-black/80 flex items-center justify-center text-white transition-colors cursor-pointer"
              aria-label="Close"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
            <iframe
              src={embedUrl}
              title={`${details.title} trailer`}
              className="absolute inset-0 w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>
      )}

      <AddToCollectionModal
        isOpen={showAddToCollection}
        onClose={() => setShowAddToCollection(false)}
        item={collectionItem}
      />
    </main>
  );
}
