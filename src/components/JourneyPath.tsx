"use client";

import Image from "next/image";
import Link from "next/link";
import { JourneyItem, JourneyResponse } from "@/lib/types";
import { useJourneyProgress } from "@/hooks/useJourneyProgress";
import { useState } from "react";

interface JourneyPathProps {
  journey: JourneyResponse;
  journeyId: string;
  onSaveJourney: () => void;
  onAddToList?: (item: JourneyItem) => void;
  onMoreLikeThis?: (item: JourneyItem) => void;
}

function formatRuntime(totalMinutes: number): string {
  if (totalMinutes < 60) return `${totalMinutes} min`;
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  return mins > 0 ? `~${hours}h ${mins}m` : `~${hours}h`;
}

export default function JourneyPath({
  journey,
  journeyId,
  onSaveJourney,
  onAddToList,
  onMoreLikeThis,
}: JourneyPathProps) {
  const { getProgressForJourney, markWatched } = useJourneyProgress(journeyId);
  const progress = getProgressForJourney(journeyId);
  const currentPosition = progress.currentPosition;
  const completed = new Set(progress.completed);
  const [showActionsFor, setShowActionsFor] = useState<number | null>(null);

  const totalRuntime = journey.totalRuntimeMinutes
    ? formatRuntime(journey.totalRuntimeMinutes)
    : null;

  const completedCount = completed.size;

  return (
    <div className="animate-fade-in-up flex flex-col lg:flex-row lg:gap-8 lg:min-h-0 lg:flex-1">
      {/* Left: Journey info - fixed on desktop, 5/12 of width */}
      <aside className="lg:flex-[5] lg:min-w-0 lg:sticky lg:top-1/2 lg:-translate-y-1/2 lg:self-start">
        <div className="mb-6 lg:mb-0">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-3">
            {journey.journeyTitle}
          </h2>
          <p className="text-sm text-purple-300/80 mb-4">
            {journey.description}
          </p>
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <span className="text-sm text-[var(--text-muted)]">
              {journey.itemCount} items
            </span>
            {totalRuntime && (
              <span className="text-sm text-[var(--text-muted)]">
                {totalRuntime}
              </span>
            )}
            {journey.difficultyProgression && (
              <span className="text-sm text-[var(--text-muted)]">
                {journey.difficultyProgression}
              </span>
            )}
            <span className="text-sm text-purple-400">
              {completedCount}/{journey.itemCount} completed
            </span>
          </div>
          <button
            onClick={onSaveJourney}
            className="hidden lg:inline-flex py-2.5 px-5 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 text-white font-medium text-sm hover:brightness-110 transition-all cursor-pointer shadow-lg shadow-purple-500/25"
          >
            Save journey
          </button>
        </div>
      </aside>

      {/* Right: Timeline - scrolls on desktop, 7/12 of width */}
      <div className="flex-1 lg:flex-[7] flex flex-col items-center lg:overflow-y-auto lg:min-h-0 min-w-0 max-w-xl lg:max-w-none mx-auto lg:mx-0">
        <div className="text-xs font-medium text-[var(--text-muted)] mb-2">
          START
        </div>
        <div className="w-0.5 h-4 bg-white/20 rounded-full" />

        {journey.items.map((item, idx) => {
          const position = item.position;
          const isCurrent = position === currentPosition;
          const isCompleted = completed.has(position);
          const isLocked = position > currentPosition && !isCompleted;

          return (
            <div key={`${item.title}-${position}`} className="w-full">
              {/* Node Card */}
              <div
                className={`relative rounded-2xl overflow-hidden border transition-all duration-300 ${
                  isCurrent
                    ? "border-purple-500/60 bg-purple-500/10 ring-2 ring-purple-500/30"
                    : isLocked
                      ? "border-white/[0.04] bg-white/[0.02] opacity-60"
                      : "border-white/[0.06] bg-[var(--bg-card)] hover:border-white/10"
                }`}
                onMouseEnter={() => setShowActionsFor(position)}
                onMouseLeave={() => setShowActionsFor(null)}
              >
                {isCurrent && (
                  <div className="absolute top-3 left-3 z-10 px-2 py-1 rounded-full bg-purple-500/90 text-xs font-bold text-white">
                    YOU ARE HERE
                  </div>
                )}
                <div className="flex flex-col sm:flex-row gap-4 p-4">
                  {/* Poster */}
                  <div className="relative w-full sm:w-32 aspect-[2/3] flex-shrink-0 rounded-xl overflow-hidden bg-gradient-to-br from-purple-900/50 to-pink-900/30">
                    {item.posterUrl ? (
                      <Image
                        src={item.posterUrl}
                        alt={item.title}
                        fill
                        unoptimized
                        className="object-cover"
                        sizes="128px"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-4xl">
                        {item.type === "movie"
                          ? "🎬"
                          : item.type === "tv"
                            ? "📺"
                            : "📚"}
                      </div>
                    )}
                    {item.rating && (
                      <div className="absolute top-1 right-1 px-1.5 py-0.5 rounded bg-black/60 text-xs font-medium text-amber-300">
                        ★ {item.rating}
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-[var(--text-muted)]">
                        Step {position} of {journey.itemCount}
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
                      <p className="text-sm text-[var(--text-secondary)]">
                        {item.whyThisPosition}
                      </p>
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
                      {!isLocked && (
                        <button
                          onClick={() => markWatched(journeyId, position)}
                          className="text-xs px-3 py-1.5 rounded-full bg-green-500/20 text-green-300 hover:bg-green-500/30 transition-colors cursor-pointer"
                        >
                          Mark watched
                        </button>
                      )}
                      {(item.type === "movie" || item.type === "tv") &&
                        item.externalId && (
                          <Link
                            href={`/media/${item.type}/${item.externalId}`}
                            className="text-xs px-3 py-1.5 rounded-full bg-white/10 text-[var(--text-secondary)] hover:bg-white/20 transition-colors"
                          >
                            Details
                          </Link>
                        )}
                      {onAddToList && showActionsFor === position && (
                        <button
                          onClick={() => onAddToList(item)}
                          className="text-xs px-3 py-1.5 rounded-full bg-white/10 text-[var(--text-secondary)] hover:bg-white/20 transition-colors cursor-pointer"
                        >
                          Add to list
                        </button>
                      )}
                      {onMoreLikeThis && showActionsFor === position && (
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

              {/* Transition to next */}
              {item.transitionToNext && idx < journey.items.length - 1 && (
                <>
                  <div className="flex justify-center my-3">
                    <div className="w-0.5 h-6 bg-white/20 rounded-full" />
                  </div>
                  <div className="mb-3 px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.06]">
                    <p className="text-xs font-medium text-[var(--text-muted)] mb-1">
                      Why next
                    </p>
                    <p className="text-sm text-[var(--text-secondary)] italic">
                      {item.transitionToNext}
                    </p>
                  </div>
                  <div className="flex justify-center mb-3">
                    <div className="w-0.5 h-4 bg-white/20 rounded-full" />
                  </div>
                </>
              )}
            </div>
          );
        })}

        <div className="w-0.5 h-4 bg-white/20 rounded-full mt-3" />
        <div className="text-xs font-medium text-[var(--text-muted)] mt-2">
          FINISH
        </div>
        <button
          onClick={onSaveJourney}
          className="lg:hidden w-full mt-4 py-2.5 px-4 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 text-white font-medium text-sm hover:brightness-110 transition-all cursor-pointer shadow-lg shadow-purple-500/25"
        >
          Save journey
        </button>
      </div>
    </div>
  );
}
