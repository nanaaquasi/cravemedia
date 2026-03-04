"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import DOMPurify from "isomorphic-dompurify";
import {
  ArrowLeft,
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
import TruncatedTitle from "@/components/TruncatedTitle";
import { getCravelistLabel } from "@/config/labels";
import EpisodeQualityGrid from "@/components/EpisodeQualityGrid";
import type { EnrichedRecommendation } from "@/lib/types";
import {
  getPosterUrl,
  type EpisodeQualityData,
  type TVSeasonSummary,
  type WatchProvider,
} from "@/lib/tmdb";

const OVERVIEW_TRUNCATE_LENGTH = 280;

function sanitizeOverviewHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ["br", "i", "b", "em", "strong"],
    ALLOWED_ATTR: [],
  });
}

function stripHtmlToText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}

function getJustWatchUrl(title: string, type: "movie" | "tv"): string {
  const slug = title
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
  const path = type === "movie" ? "movie" : "tv-show";
  return `https://www.justwatch.com/us/${path}/${slug}`;
}

export interface CastMember {
  id: number;
  name: string;
  character: string;
  profileUrl: string | null;
  personUrl?: string | null;
}

export interface RecommendedTitle {
  id: number | string;
  title: string;
  posterUrl: string | null;
  voteAverage: number;
  type: "movie" | "tv" | "anime" | "book";
}

export interface AnimeRelationItem {
  id: number;
  title: string;
  posterUrl: string | null;
  voteAverage: number;
  relationType: string;
  year: number | null;
  episodes: number | null;
}

export interface MediaDetails {
  title: string;
  overview: string | null;
  posterUrl: string | null;
  backdropUrl: string | null;
  voteAverage: number;
  /** "imdb" for movies/TV when from OMDb, "tmdb" fallback */
  ratingSource?: "imdb" | "tmdb";
  voteCount: number;
  releaseDate: string | null;
  runtime: string | null;
  genres: string[];
  directors: string[];
  authors?: string[];
  trailerKey: string | null;
  type: "movie" | "tv" | "anime" | "book";
  episodes?: number | null;
  studios?: string[];
  format?: string;
  cast?: CastMember[];
  recommendations?: RecommendedTitle[];
  releaseStatus?: string | null;
  originalLanguage?: string | null;
  originCountry?: string[];
  writers?: string[];
  source?: string | null;
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
    <div className="min-w-0">
      <p className="text-xs font-semibold text-[var(--text-muted)] mb-0.5">
        {label}
      </p>
      <p className="text-sm text-white break-words">{value}</p>
    </div>
  );
}

function OverviewBlock({ overview }: { overview: string }) {
  const [expanded, setExpanded] = useState(false);
  const plainText = stripHtmlToText(overview);
  const isLong = plainText.length > OVERVIEW_TRUNCATE_LENGTH;
  const displayText = expanded
    ? null
    : isLong
      ? plainText.slice(0, OVERVIEW_TRUNCATE_LENGTH)
      : plainText;
  const safeHtml = sanitizeOverviewHtml(overview);

  return (
    <div>
      <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-1">
        Overview
      </p>
      {expanded ? (
        <div
          className="text-[var(--text-secondary)] leading-relaxed prose prose-invert prose-sm max-w-none [&_i]:italic [&_b]:font-semibold"
          dangerouslySetInnerHTML={{ __html: safeHtml }}
        />
      ) : (
        <p className="text-[var(--text-secondary)] leading-relaxed whitespace-pre-line">
          {displayText}
          {isLong ? "…" : ""}
        </p>
      )}
      {isLong && (
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="mt-1 text-sm font-medium text-purple-400 hover:text-purple-300 transition-colors cursor-pointer"
        >
          {expanded ? "Show less" : "Show more"}
        </button>
      )}
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
  collectionNames?: string[];
  tvSeasons?: TVSeasonSummary[];
  animeRelations?: AnimeRelationItem[];
  watchProviders?: WatchProvider[];
  otherCravelists?: {
    id: string;
    name: string;
    itemCount: number;
    curator: { username: string | null; avatarUrl: string | null };
    images: string[];
  }[];
}

export default function MediaDetailClient({
  details,
  mediaId,
  currentStatus: initialStatus,
  communityStats,
  reviews = [],
  canReview = false,
  episodeQuality = [],
  collectionNames = [],
  tvSeasons = [],
  animeRelations = [],
  watchProviders = [],
  otherCravelists = [],
}: MediaDetailClientProps) {
  const [showTrailerModal, setShowTrailerModal] = useState(false);
  const [status, setStatus] = useState<WatchStatus | null>(initialStatus);
  const [statusOpen, setStatusOpen] = useState(false);
  const statusRef = useRef<HTMLDivElement>(null);
  const statusRefMobile = useRef<HTMLDivElement>(null);
  const [showAddToCollection, setShowAddToCollection] = useState(false);

  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [reviewSpoilers, setReviewSpoilers] = useState(false);
  const [isSavingReview, setIsSavingReview] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
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
      const target = e.target as Node;
      const inside =
        statusRef.current?.contains(target) ||
        statusRefMobile.current?.contains(target);
      if (!inside) setStatusOpen(false);
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
    setReviewError(null);
    setIsSavingReview(true);
    const result = await reviewMediaAcrossCollections(mediaId, details.type, {
      rating: reviewRating || undefined,
      review: reviewText.trim() || undefined,
      containsSpoilers: reviewSpoilers,
    });
    setIsSavingReview(false);
    if (!result.error) {
      setShowReviewModal(false);
    } else {
      setReviewError(result.error);
    }
  };

  const isBook = details.type === "book";
  const collectionItem: EnrichedRecommendation = {
    title: details.title,
    creator: isBook
      ? (details.authors ?? []).join(", ") || ""
      : details.directors.join(", ") || "",
    year: details.releaseDate
      ? Number.parseInt(details.releaseDate.slice(0, 4), 10)
      : 0,
    type: details.type === "anime" ? "anime" : details.type,
    description: details.overview ?? "",
    genres: details.genres,
    posterUrl: details.posterUrl,
    rating: details.voteAverage,
    ratingSource:
      details.ratingSource === "imdb"
        ? "imdb"
        : details.type === "anime"
          ? "anilist"
          : details.type === "book"
            ? "Google Books"
            : "tmdb",
    runtime: details.runtime,
    externalId: mediaId,
  };

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
        : details.type === "book"
          ? "Book"
          : (details.format ?? "Anime");

  const router = useRouter();

  return (
    <main className="min-h-screen flex flex-col overflow-x-hidden w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
      {/* Hero */}
      <div className="relative -mx-4 sm:-mx-6 md:-mx-8 mb-6 overflow-hidden rounded-2xl aspect-video max-h-[280px] sm:max-h-[320px] min-w-0">
        {/* Back button - inline on banner */}
        <button
          onClick={() => router.back()}
          className="absolute top-4 left-4 z-20 inline-flex items-center gap-2 px-3 py-2 rounded-full bg-black/40 hover:bg-black/60 text-white/90 hover:text-white transition-colors cursor-pointer backdrop-blur-sm"
          aria-label="Go back"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-medium">Back</span>
        </button>
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
          {/* Poster + Rating row on mobile */}
          <div className="flex flex-row gap-4 items-start lg:flex-col lg:gap-5">
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
                      : details.type === "book"
                        ? "📚"
                        : "🎌"}
                </div>
              )}
            </div>
            {/* Rating + actions: right of poster on mobile, hidden on desktop */}
            <div className="flex flex-1 flex-col gap-3 min-w-0 lg:hidden">
              {details.voteAverage > 0 && (
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 text-sm font-medium">
                    ★ {details.voteAverage.toFixed(1)}
                  </span>
                  {(details.type === "movie" || details.type === "tv") &&
                    details.ratingSource && (
                      <span className="text-xs text-[var(--text-muted)] uppercase">
                        {details.ratingSource}
                      </span>
                    )}
                  {details.voteCount > 0 && (
                    <span className="text-xs text-[var(--text-muted)]">
                      {details.voteCount.toLocaleString()} votes
                    </span>
                  )}
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                {trailerKey && (
                  <button
                    onClick={() => setShowTrailerModal(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/30 transition-colors cursor-pointer text-sm"
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <polygon points="5 3 19 12 5 21 5 3" />
                    </svg>
                    Play trailer
                  </button>
                )}
                {statusConfig && (
                  <div ref={statusRefMobile} className="relative">
                    <button
                      onClick={() => setStatusOpen((p) => !p)}
                      className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border transition-colors cursor-pointer text-sm ${
                        status !== "not_seen"
                          ? "bg-green-500/20 hover:bg-green-500/30 text-green-300 border-green-500/30"
                          : "bg-white/[0.06] hover:bg-white/[0.1] text-[var(--text-secondary)] border-white/10"
                      }`}
                      aria-expanded={statusOpen}
                    >
                      <statusConfig.icon className="w-3.5 h-3.5" />
                      {isBook ? statusConfig.bookLabel : statusConfig.label}
                      <ChevronDown
                        className={`w-3 h-3 transition-transform ${statusOpen ? "rotate-180" : ""}`}
                      />
                    </button>
                    {statusOpen && (
                      <div
                        role="menu"
                        className="absolute left-0 top-full mt-1 py-1 min-w-[160px] rounded-lg bg-zinc-900/95 backdrop-blur border border-white/10 shadow-xl z-30"
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
                              <Icon className="w-3.5 h-3.5 shrink-0" />
                              {label}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
                {collectionNames.length === 0 && (
                  <button
                    onClick={() => setShowAddToCollection(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-[var(--text-secondary)] hover:text-white border border-white/10 transition-colors cursor-pointer text-sm"
                  >
                    <FolderPlus className="w-3.5 h-3.5" />
                    Add to {getCravelistLabel(1)}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Overview + Genres: mobile only (swapped with Infos on mobile) */}
          <div className="flex flex-col gap-4 lg:hidden">
            {details.overview && <OverviewBlock overview={details.overview} />}
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
          </div>

          {/* Infos panel */}
          <div className="space-y-3">
            <h3 className="text-lg font-bold text-white">Infos</h3>

            <div className="grid grid-cols-2 gap-x-4 gap-y-3 lg:block lg:space-y-3">
              {details.runtime && (
                <InfoRow label={isBook ? "Pages" : "Runtime"} value={details.runtime} />
              )}
              {isBook && details.authors && details.authors.length > 0 && (
                <InfoRow
                  label={`Author${details.authors.length > 1 ? "s" : ""}`}
                  value={details.authors.join(", ")}
                />
              )}
              {!isBook && details.directors.length > 0 && (
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
            {details.source && (
              <InfoRow label="Source" value={details.source} />
            )}

            <div className="border-t border-white/[0.06] pt-3 grid grid-cols-2 gap-x-4 gap-y-3 lg:block lg:space-y-3 col-span-2">
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
              <div className="border-t border-white/[0.06] pt-3 grid grid-cols-2 gap-x-4 gap-y-3 lg:block lg:space-y-3 col-span-2">
                {(communityStats.watching ?? 0) > 0 && (
                  <InfoRow
                    label={isBook ? "People Reading" : "People Watching"}
                    value={String(communityStats.watching)}
                  />
                )}
                {(communityStats.watched ?? 0) > 0 && (
                  <InfoRow
                    label={isBook ? "People Read" : "People Finished"}
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

          {/* Other Cravelists (desktop only - under info) */}
          {otherCravelists.length > 0 && (
            <div className="hidden lg:block">
              <h3 className="text-lg font-bold text-white mb-3">
                Found In
              </h3>
              <div className="space-y-3">
                {otherCravelists.map((c) => (
                  <Link
                    key={c.id}
                    href={`/collections/${c.id}`}
                    className="flex gap-3 p-3 rounded-lg bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.06] hover:border-white/10 transition-colors"
                  >
                    <div className="flex h-14 w-14 shrink-0 gap-0.5 rounded-md overflow-hidden bg-zinc-800">
                      {c.images.length > 0 ? (
                        c.images.slice(0, 2).map((img) => (
                          <div
                            key={`${c.id}-${img}`}
                            className="relative flex-1 min-w-0 h-full"
                          >
                            <Image
                              src={img}
                              alt=""
                              fill
                              className="object-cover"
                              sizes="56px"
                              unoptimized
                            />
                          </div>
                        ))
                      ) : (
                        <div className="w-full h-full bg-zinc-800 flex items-center justify-center text-lg">
                          📋
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-white truncate">{c.name}</p>
                      <p className="text-xs text-[var(--text-muted)]">
                        {c.itemCount} titles
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        {c.curator.avatarUrl ? (
                          <Image
                            src={c.curator.avatarUrl}
                            alt=""
                            width={20}
                            height={20}
                            className="rounded-full object-cover"
                            unoptimized
                          />
                        ) : (
                          <div className="w-5 h-5 rounded-full bg-purple-500/30 flex items-center justify-center text-[10px] font-medium text-purple-300">
                            {(c.curator.username ?? "?")[0]?.toUpperCase()}
                          </div>
                        )}
                        <span className="text-xs text-[var(--text-muted)] truncate">
                          {c.curator.username ?? "Anonymous"}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right column: Actions, Overview, Genres, Cast */}
        <div className="flex flex-col gap-6 min-w-0">
          {/* Rating: hidden on mobile (shown next to poster), visible on desktop */}
          {details.voteAverage > 0 && (
            <div className="hidden lg:flex items-center gap-2">
              <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 text-sm font-medium">
                ★ {details.voteAverage.toFixed(1)}
              </span>
              {(details.type === "movie" || details.type === "tv") &&
                details.ratingSource && (
                  <span className="text-xs text-[var(--text-muted)] uppercase">
                    {details.ratingSource}
                  </span>
                )}
              {details.voteCount > 0 && (
                <span className="text-sm text-[var(--text-muted)]">
                  {details.voteCount.toLocaleString()} votes
                </span>
              )}
            </div>
          )}

          {/* Action buttons: hidden on mobile (shown next to poster) */}
          <div className="hidden lg:flex flex-wrap items-center gap-3">
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

            {collectionNames.length === 0 && (
              <button
                onClick={() => setShowAddToCollection(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-[var(--text-secondary)] hover:text-white border border-white/10 transition-colors cursor-pointer"
              >
                <FolderPlus className="w-4 h-4" />
                Add to {getCravelistLabel(1)}
              </button>
            )}
          </div>

          {/* Overview (hidden on mobile - shown in left column) */}
          {details.overview && (
            <div className="hidden lg:block">
              <OverviewBlock overview={details.overview} />
            </div>
          )}

          {/* Genres (hidden on mobile - shown in left column) */}
          {details.genres.length > 0 && (
            <div className="hidden lg:block">
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

          {/* Where to watch (movies) */}
          {details.type === "movie" && watchProviders.length > 0 && (
            <div>
              <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-2">
                Where to watch
              </p>
              <div className="flex flex-wrap gap-3 items-center">
                {watchProviders.map((p) => {
                  const justWatchUrl = getJustWatchUrl(details.title, "movie");
                  return (
                    <a
                      key={p.id}
                      href={justWatchUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex flex-col items-center gap-1 hover:opacity-80 transition-opacity"
                      title={`Watch on ${p.name}`}
                    >
                      <div className="w-10 h-10 rounded-lg overflow-hidden bg-white/5 border border-white/10 flex items-center justify-center">
                        {p.logoPath ? (
                          <Image
                            src={`https://image.tmdb.org/t/p/original${p.logoPath}`}
                            alt={p.name}
                            width={40}
                            height={40}
                            className="object-contain"
                            unoptimized
                          />
                        ) : (
                          <span className="text-xs text-zinc-500">
                            {p.name.slice(0, 2)}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-[var(--text-muted)]">
                        {p.type === "flatrate" ? "Subs" : p.type === "buy" ? "Buy" : "Rent"}
                      </span>
                    </a>
                  );
                })}
              </div>
              <div className="mt-2 flex items-center gap-1.5">
                <span className="text-[10px] text-[var(--text-muted)]">
                  Powered by
                </span>
                <a
                  href={getJustWatchUrl(details.title, "movie")}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:opacity-80 transition-opacity"
                >
                  <img
                    src="https://widget.justwatch.com/assets/JW_logo_color_10px.svg"
                    alt="JustWatch"
                    className="h-3 w-auto"
                  />
                </a>
              </div>
            </div>
          )}

          {/* Seasons (TV only) */}
          {details.type === "tv" &&
            (tvSeasons.length > 0 || watchProviders.length > 0) && (
              <div>
                {watchProviders.length > 0 && (
                  <div className="mb-4">
                    <div className="flex flex-wrap gap-3 items-center">
                      {watchProviders.map((p) => (
                          <a
                            key={p.id}
                            href={getJustWatchUrl(details.title, "tv")}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex flex-col items-center gap-1 hover:opacity-80 transition-opacity"
                            title={`Watch on ${p.name}`}
                          >
                            <div className="w-10 h-10 rounded-lg overflow-hidden bg-white/5 border border-white/10 flex items-center justify-center">
                              {p.logoPath ? (
                                <Image
                                  src={`https://image.tmdb.org/t/p/original${p.logoPath}`}
                                  alt={p.name}
                                  width={40}
                                  height={40}
                                  className="object-contain"
                                  unoptimized
                                />
                              ) : (
                                <span className="text-xs text-zinc-500">
                                  {p.name.slice(0, 2)}
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-[var(--text-muted)]">
                              {p.type === "flatrate" ? "Subs" : p.type === "buy" ? "Buy" : "Rent"}
                            </span>
                          </a>
                      ))}
                    </div>
                    <div className="mt-2 flex items-center gap-1.5">
                      <span className="text-[10px] text-[var(--text-muted)]">
                        Powered by
                      </span>
                      <a
                        href={getJustWatchUrl(details.title, "tv")}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:opacity-80 transition-opacity"
                      >
                        <img
                          src="https://widget.justwatch.com/assets/JW_logo_color_10px.svg"
                          alt="JustWatch"
                          className="h-3 w-auto"
                        />
                      </a>
                    </div>
                  </div>
                )}
                {tvSeasons.length > 0 && (
                  <>
                    <h2 className="text-lg font-bold text-white mb-3">Seasons</h2>
                  <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                    {tvSeasons.map((season) => {
                      const posterUrl = getPosterUrl(
                        season.posterPath,
                        "w500",
                      );
                      const seasonYear = season.airDate
                        ? new Date(season.airDate).getFullYear()
                        : null;
                      return (
                        <Link
                          key={season.seasonNumber}
                          href={`/media/tv/${mediaId}/season/${season.seasonNumber}`}
                          className="group shrink-0 w-36 sm:w-40 md:w-44 block liquid-glass rounded-2xl overflow-hidden transition-all duration-300 hover:scale-[1.02] cursor-pointer"
                        >
                          <div className="relative aspect-[3/4] w-full overflow-hidden">
                            {posterUrl ? (
                              <Image
                                src={posterUrl}
                                alt={season.name}
                                fill
                                className="object-cover transition-transform duration-300 group-hover:scale-105"
                                sizes="176px"
                                unoptimized
                              />
                            ) : (
                              <div className="absolute inset-0 flex items-center justify-center text-3xl bg-gradient-to-br from-purple-900/50 via-pink-900/30 to-rose-900/40">
                                📺
                              </div>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                            <span className="absolute bottom-2 left-2 text-[10px] px-2 py-1 rounded-full bg-black/50 backdrop-blur-sm text-white/90 font-medium">
                              S{season.seasonNumber}
                            </span>
                            {season.voteAverage != null &&
                              season.voteAverage > 0 && (
                                <span className="absolute top-2 right-2 flex items-center gap-0.5 px-2 py-1 rounded-full bg-black/50 backdrop-blur-sm text-xs font-medium text-amber-300">
                                  ★ {season.voteAverage.toFixed(1)}
                                </span>
                              )}
                          </div>
                          <div className="p-2.5">
                            <h3 className="text-[13px] font-semibold text-[var(--text-primary)] truncate">
                              Season {season.seasonNumber}
                            </h3>
                            <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-[var(--text-muted)]">
                              <span>
                                {season.episodeCount} episode
                                {season.episodeCount === 1 ? "" : "s"}
                              </span>
                              {seasonYear && (
                                <>
                                  <span>·</span>
                                  <span>{seasonYear}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                  </>
                )}
              </div>
            )}

          {/* Cast */}
          {details.cast && details.cast.length > 0 && (
            <div>
              <h2 className="text-lg font-bold text-white mb-3">
                {details.type === "anime" ? "Characters & Voice Actors" : "Cast"}
              </h2>
              <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                {details.cast.map((member) => {
                  const className = "shrink-0 w-24 sm:w-28 text-center group block";
                  const content = (
                    <>
                    <div className="relative aspect-square rounded-xl overflow-hidden bg-zinc-800 mb-2 ring-0 group-hover:ring-2 group-hover:ring-purple-500/50 transition-all">
                      {member.profileUrl ? (
                        <Image
                          src={member.profileUrl}
                          alt={member.name}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-200"
                          sizes="112px"
                          unoptimized
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-3xl text-zinc-600">
                          👤
                        </div>
                      )}
                    </div>
                    <p className="text-xs font-medium text-white leading-tight line-clamp-1 group-hover:text-purple-300 transition-colors">
                      {member.name}
                    </p>
                    <p className="text-[11px] text-[var(--text-muted)] leading-tight line-clamp-1">
                      {member.character}
                    </p>
                    </>
                  );
                  return member.personUrl ? (
                    <a
                      key={member.id}
                      href={member.personUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={className}
                    >
                      {content}
                    </a>
                  ) : (
                    <Link key={member.id} href={`/person/${member.id}`} className={className}>
                      {content}
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* Watch Order (anime only) */}
          {details.type === "anime" && animeRelations.length > 0 && (
            <div>
              <h2 className="text-lg font-bold text-white mb-3">
                Watch Order
              </h2>
              <p className="text-sm text-[var(--text-muted)] mb-3">
                Start from the beginning or explore related entries.
              </p>
              <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                {animeRelations.map((rel) => {
                  const relationLabel =
                    rel.relationType === "CURRENT"
                      ? "Current"
                      : rel.relationType === "PREQUEL"
                        ? "Prequel"
                        : rel.relationType === "SEQUEL"
                          ? "Sequel"
                          : rel.relationType === "PARENT"
                            ? "Main series"
                            : "Side story";
                  const isCurrent = rel.relationType === "CURRENT";
                  return (
                    <Link
                      key={rel.id}
                      href={`/media/anime/${rel.id}`}
                      className={`group shrink-0 w-36 sm:w-40 md:w-44 block liquid-glass rounded-2xl overflow-hidden transition-all duration-300 hover:scale-[1.02] cursor-pointer ${isCurrent ? "ring-2 ring-purple-500/60" : ""}`}
                    >
                      <div className="relative aspect-[3/4] w-full overflow-hidden">
                        {rel.posterUrl ? (
                          <Image
                            src={rel.posterUrl}
                            alt={rel.title}
                            fill
                            className="object-cover transition-transform duration-300 group-hover:scale-105"
                            sizes="176px"
                            unoptimized
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center text-3xl bg-gradient-to-br from-purple-900/50 via-pink-900/30 to-rose-900/40">
                            🎌
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        <span className="absolute bottom-2 left-2 text-[10px] px-2 py-1 rounded-full bg-black/50 backdrop-blur-sm text-white/90 font-medium">
                          {relationLabel}
                        </span>
                        {rel.voteAverage > 0 && (
                          <span className="absolute top-2 right-2 flex items-center gap-0.5 px-2 py-1 rounded-full bg-black/50 backdrop-blur-sm text-xs font-medium text-amber-300">
                            ★ {rel.voteAverage.toFixed(1)}
                          </span>
                        )}
                      </div>
                      <div className="p-2.5">
                        <h3 className="text-[13px] font-semibold text-[var(--text-primary)]">
                          <TruncatedTitle title={rel.title} />
                        </h3>
                        <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-[var(--text-muted)]">
                          {rel.episodes != null && (
                            <span>
                              {rel.episodes} episode
                              {rel.episodes === 1 ? "" : "s"}
                            </span>
                          )}
                          {rel.year != null && (
                            <>
                              {rel.episodes != null && <span>·</span>}
                              <span>{rel.year}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </Link>
                  );
                })}
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
                          {rec.type === "anime"
                            ? "🎌"
                            : rec.type === "book"
                              ? "📚"
                              : "🎬"}
                        </div>
                      )}
                      {rec.voteAverage > 0 && (
                        <span className="absolute top-2 right-2 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-black/70 backdrop-blur-sm text-xs font-medium text-amber-300">
                          ★ {rec.voteAverage.toFixed(1)}
                        </span>
                      )}
                    </div>
                    <div className="relative group/title">
                      <p className="text-xs font-medium text-white leading-tight line-clamp-2 group-hover:text-purple-300 transition-colors">
                        {rec.title}
                      </p>
                      <span
                        className="absolute bottom-full left-0 z-50 mb-1 max-w-[240px] px-3 py-2 rounded-lg bg-zinc-800 text-white text-xs font-medium shadow-xl border border-white/10 whitespace-normal break-words opacity-0 pointer-events-none group-hover/title:opacity-100 transition-opacity"
                        role="tooltip"
                      >
                        {rec.title}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Other Cravelists (mobile only - after recommended titles) */}
          {otherCravelists.length > 0 && (
            <div className="lg:hidden">
              <h2 className="text-lg font-bold text-white mb-3">
                Found In
              </h2>
              <div className="space-y-3">
                {otherCravelists.map((c) => (
                  <Link
                    key={c.id}
                    href={`/collections/${c.id}`}
                    className="flex gap-3 p-3 rounded-lg bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.06] hover:border-white/10 transition-colors"
                  >
                    <div className="flex h-14 w-14 shrink-0 gap-0.5 rounded-md overflow-hidden bg-zinc-800">
                      {c.images.length > 0 ? (
                        c.images.slice(0, 2).map((img) => (
                          <div
                            key={`${c.id}-${img}`}
                            className="relative flex-1 min-w-0 h-full"
                          >
                            <Image
                              src={img}
                              alt=""
                              fill
                              className="object-cover"
                              sizes="56px"
                              unoptimized
                            />
                          </div>
                        ))
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-lg">
                          📋
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-white truncate">{c.name}</p>
                      <p className="text-xs text-[var(--text-muted)]">
                        {c.itemCount} titles
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        {c.curator.avatarUrl ? (
                          <Image
                            src={c.curator.avatarUrl}
                            alt=""
                            width={20}
                            height={20}
                            className="rounded-full object-cover"
                            unoptimized
                          />
                        ) : (
                          <div className="w-5 h-5 rounded-full bg-purple-500/30 flex items-center justify-center text-[10px] font-medium text-purple-300">
                            {(c.curator.username ?? "?")[0]?.toUpperCase()}
                          </div>
                        )}
                        <span className="text-xs text-[var(--text-muted)] truncate">
                          {c.curator.username ?? "Anonymous"}
                        </span>
                      </div>
                    </div>
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
                    setReviewError(null);
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
                            {Number(review.rating).toFixed(1)}
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
            {reviewError && (
              <p className="text-sm text-amber-400 mb-4">
                {reviewError}
              </p>
            )}
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
