"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

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
}

interface MediaDetailClientProps {
  details: MediaDetails;
}

export default function MediaDetailClient({ details }: MediaDetailClientProps) {
  const [showTrailerModal, setShowTrailerModal] = useState(false);

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

      {/* Content - desktop: [poster+details] [overview] | mobile: stacked */}
      <div className="grid grid-cols-1 lg:grid-cols-[auto_1fr] gap-6 lg:gap-8 max-w-6xl min-w-0 w-full items-start">
        {/* Left: Poster + details */}
        <div className="flex flex-row gap-4 sm:gap-8 min-w-0">
          {/* Poster */}
          <div className="shrink-0 w-36 sm:w-52">
            {details.posterUrl ? (
              <div className="relative aspect-[2/3] rounded-xl overflow-hidden border border-white/[0.08]">
                <Image
                  src={details.posterUrl}
                  alt={details.title}
                  fill
                  className="object-cover"
                  sizes="208px"
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

          {/* Rating, trailer, director, genres */}
          <div className="flex-1 min-w-0">
            {details.voteAverage > 0 && (
              <div className="flex items-center gap-2 mb-4">
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

            {trailerKey && (
              <button
                onClick={() => setShowTrailerModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/30 transition-colors mb-4 cursor-pointer"
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

            {details.studios && details.studios.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-1">
                  Studios
                </p>
                <p className="text-[var(--text-primary)]">
                  {details.studios.join(", ")}
                </p>
              </div>
            )}

            {details.directors.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-1">
                  Director{details.directors.length > 1 ? "s" : ""}
                </p>
                <p className="text-[var(--text-primary)]">
                  {details.directors.join(", ")}
                </p>
              </div>
            )}

            {details.genres.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-1">
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
        </div>

        {/* Right: Overview (desktop) or below (mobile) */}
        {details.overview && (
          <div className="min-w-0">
            <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-1">
              Overview
            </p>
            <p className="text-[var(--text-secondary)] leading-relaxed">
              {details.overview}
            </p>
          </div>
        )}
      </div>

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
    </main>
  );
}
