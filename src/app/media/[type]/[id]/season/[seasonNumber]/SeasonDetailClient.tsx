"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Star, HelpCircle, CheckCircle, Circle } from "lucide-react";
import type { TVSeasonDetails } from "@/lib/tmdb";
import {
  setEpisodeStatus,
  markSeasonWatched,
  markSeasonUnwatched,
  type EpisodeStatus,
} from "@/app/actions/episode-progress";

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

interface SeasonDetailClientProps {
  showTitle: string;
  showYear: string | null;
  posterUrl: string | null;
  backdropUrl: string | null;
  mediaId: string;
  seasonDetails: TVSeasonDetails;
  episodeProgress: Record<number, EpisodeStatus>;
  episodeRuntimeMinutes?: number | null;
  canTrackProgress?: boolean;
  highlightEpisodeNumber: number | null;
}

export default function SeasonDetailClient({
  showTitle,
  showYear,
  posterUrl,
  backdropUrl,
  mediaId,
  seasonDetails,
  episodeProgress: initialProgress,
  episodeRuntimeMinutes,
  canTrackProgress = false,
  highlightEpisodeNumber,
}: SeasonDetailClientProps) {
  const highlightedRef = useRef<HTMLDivElement>(null);
  const [episodeProgress, setEpisodeProgress] = useState(initialProgress);
  const [updatingEpisode, setUpdatingEpisode] = useState<number | null>(null);
  const [updatingSeason, setUpdatingSeason] = useState(false);

  const router = useRouter();
  const watchedCount = Object.values(episodeProgress).filter(
    (s) => s === "watched",
  ).length;
  const isSeasonFullyWatched =
    watchedCount === seasonDetails.episodes.length &&
    seasonDetails.episodes.length > 0;

  useEffect(() => {
    setEpisodeProgress(initialProgress);
  }, [initialProgress]);

  useEffect(() => {
    if (highlightEpisodeNumber && highlightedRef.current) {
      highlightedRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [highlightEpisodeNumber]);

  const handleEpisodeToggle = async (epNum: number) => {
    setUpdatingEpisode(epNum);
    const current = episodeProgress[epNum];
    const next: EpisodeStatus = current === "watched" ? "not_seen" : "watched";
    const { error } = await setEpisodeStatus(
      mediaId,
      seasonDetails.seasonNumber,
      epNum,
      next,
      episodeRuntimeMinutes ?? undefined,
    );
    if (!error) {
      setEpisodeProgress((p) => ({ ...p, [epNum]: next }));
    }
    setUpdatingEpisode(null);
  };

  const handleSeasonToggle = async () => {
    setUpdatingSeason(true);
    if (isSeasonFullyWatched) {
      const { error } = await markSeasonUnwatched(
        mediaId,
        seasonDetails.seasonNumber,
      );
      if (!error) setEpisodeProgress({});
    } else {
      const { error } = await markSeasonWatched(
        mediaId,
        seasonDetails.seasonNumber,
        seasonDetails.episodes.length,
        episodeRuntimeMinutes ?? undefined,
      );
      if (!error) {
        const next: Record<number, EpisodeStatus> = {};
        seasonDetails.episodes.forEach((ep) => {
          next[ep.episodeNumber] = "watched";
        });
        setEpisodeProgress(next);
      }
    }
    setUpdatingSeason(false);
  };

  const { seasonNumber, overview, voteAverage, voteCount, episodes } =
    seasonDetails;

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
        {backdropUrl ? (
          <Image
            src={backdropUrl}
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
          <Link
            href={`/media/tv/${mediaId}`}
            className="inline-block text-sm text-white/80 hover:text-white mb-2 transition-colors"
          >
            ← Back to show
          </Link>
          <span className="inline-block px-2.5 py-0.5 rounded-full bg-black/50 backdrop-blur-sm text-xs font-medium text-white/90 mb-2">
            TV Show
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white drop-shadow-lg">
            {showTitle}
          </h1>
          <div className="flex items-center gap-2 mt-1 text-sm text-white/80">
            {showYear && <span>({showYear})</span>}
            <span className="text-white/80">Season {seasonNumber}</span>
          </div>
        </div>
      </div>

      {/* Content: same two-column layout as main details */}
      <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-6 lg:gap-8 max-w-6xl min-w-0 w-full items-start">
        {/* Left column: Poster + Rating on mobile */}
        <div className="flex flex-col gap-5">
          <div className="flex flex-row gap-4 items-start lg:flex-col lg:gap-5">
            <div className="shrink-0 w-36 sm:w-52 lg:w-full">
              {posterUrl ? (
                <Link href={`/media/tv/${mediaId}`}>
                  <div className="relative aspect-[2/3] rounded-xl overflow-hidden border border-white/[0.08] hover:border-white/20 transition-colors">
                    <Image
                      src={posterUrl}
                      alt={showTitle}
                      fill
                      className="object-cover"
                      sizes="220px"
                      unoptimized
                    />
                  </div>
                </Link>
              ) : (
                <div className="aspect-[2/3] rounded-xl bg-[var(--bg-card)] border border-white/[0.06] flex items-center justify-center text-4xl">
                  📺
                </div>
              )}
            </div>
            {/* Rating: right of poster on mobile */}
            <div className="flex items-center gap-2 lg:hidden">
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/20 text-amber-300 text-sm font-medium">
                <Star className="w-4 h-4 fill-amber-400" />
                {voteAverage > 0 ? voteAverage.toFixed(1) : "0.0"}
              </span>
              {voteCount > 0 && (
                <span className="text-xs text-[var(--text-muted)]">
                  {voteCount.toLocaleString()} Votes
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right column: Rating (desktop), Synopsis, Episodes */}
        <div className="flex flex-col gap-6 min-w-0">
          {/* Season rating badge: hidden on mobile (shown next to poster) */}
          <div className="hidden lg:flex items-center gap-2">
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/20 text-amber-300 text-sm font-medium">
              <Star className="w-4 h-4 fill-amber-400" />
              {voteAverage > 0 ? voteAverage.toFixed(1) : "0.0"}
            </span>
            {voteCount > 0 && (
              <span className="text-sm text-[var(--text-muted)]">
                {voteCount.toLocaleString()} Votes
              </span>
            )}
          </div>

          {/* Season synopsis */}
          {overview && (
            <div>
              <p className="text-[var(--text-secondary)] leading-relaxed">
                {overview}
              </p>
            </div>
          )}

          {/* Episodes */}
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white">Episodes</h2>
                <span
                  className="text-zinc-500 hover:text-zinc-400 cursor-help"
                  title="Episode ratings from IMDb when available"
                >
                  <HelpCircle className="w-4 h-4" />
                </span>
              </div>
              {canTrackProgress && (
              <button
                onClick={handleSeasonToggle}
                disabled={updatingSeason}
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer disabled:opacity-50 border ${
                  isSeasonFullyWatched
                    ? "bg-green-500/20 text-green-400 border-green-500/30 hover:bg-green-500/[0.3]"
                    : "bg-white/[0.06] text-[var(--text-secondary)] border-white/10 hover:bg-white/[0.1] hover:text-white"
                }`}
              >
                {updatingSeason ? (
                  "Updating…"
                ) : isSeasonFullyWatched ? (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Season watched
                  </>
                ) : (
                  <>
                    <Circle className="w-4 h-4" />
                    Mark season watched
                  </>
                )}
              </button>
              )}
            </div>

            <div className="space-y-4">
              {episodes.map((ep) => {
                const isHighlighted =
                  highlightEpisodeNumber !== null &&
                  ep.episodeNumber === highlightEpisodeNumber;
                const isWatched = episodeProgress[ep.episodeNumber] === "watched";
                const isUpdating = updatingEpisode === ep.episodeNumber;

                return (
                  <div
                    key={ep.episodeNumber}
                    ref={isHighlighted ? highlightedRef : null}
                    className={`flex gap-4 p-4 rounded-xl border transition-colors ${
                      isHighlighted
                        ? "bg-rose-950/40 border-rose-500/40"
                        : "bg-white/[0.04] border-white/[0.06] hover:border-white/[0.1]"
                    }`}
                  >
                    {/* Thumbnail */}
                    <div className="shrink-0 w-32 sm:w-40 aspect-video rounded-lg overflow-hidden bg-zinc-800 relative">
                      {ep.stillUrl ? (
                        <Image
                          src={ep.stillUrl}
                          alt={ep.name}
                          width={160}
                          height={90}
                          className="w-full h-full object-cover"
                          unoptimized
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-2xl text-zinc-600">
                          📺
                        </div>
                      )}
                      {isWatched && (
                        <div className="absolute top-2 right-2 w-8 h-8 rounded-full bg-green-500/90 flex items-center justify-center">
                          <CheckCircle className="w-5 h-5 text-white" />
                        </div>
                      )}
                    </div>

                    {/* Episode info */}
                    <div className="flex-1 min-w-0 flex flex-col">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-semibold text-white">
                            {seasonNumber}
                            {String(ep.episodeNumber).padStart(2, "0")}{" "}
                            {ep.name}
                          </h3>
                          {ep.voteAverage > 0 && (
                            <span className="inline-flex items-center gap-1 text-amber-400 text-sm mt-0.5">
                              <Star className="w-3.5 h-3.5 fill-amber-400" />
                              {ep.voteAverage.toFixed(1)}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {canTrackProgress && (
                          <button
                            onClick={() => handleEpisodeToggle(ep.episodeNumber)}
                            disabled={isUpdating}
                            className={`p-2 rounded-lg transition-colors cursor-pointer disabled:opacity-50 ${
                              isWatched
                                ? "bg-green-500/20 text-green-400 hover:bg-green-500/[0.3]"
                                : "bg-white/[0.06] text-zinc-400 hover:bg-white/[0.1] hover:text-white"
                            }`}
                            title={isWatched ? "Mark as unwatched" : "Mark as watched"}
                          >
                            {isUpdating ? (
                              <span className="text-xs">…</span>
                            ) : isWatched ? (
                              <CheckCircle className="w-4 h-4" />
                            ) : (
                              <Circle className="w-4 h-4" />
                            )}
                          </button>
                          )}
                          <span className="text-xs text-zinc-500">
                            {String(ep.episodeNumber).padStart(2, "0")}
                          </span>
                        </div>
                      </div>

                      {ep.overview && (
                        <p className="text-sm text-zinc-400 mt-2 line-clamp-2">
                          {ep.overview}
                        </p>
                      )}

                      {ep.airDate && (
                        <p className="text-xs text-zinc-500 mt-auto pt-2">
                          {formatDate(ep.airDate)}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
