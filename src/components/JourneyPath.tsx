"use client";

import { JourneyItem, JourneyResponse } from "@/lib/types";
import { useJourneyProgress } from "@/hooks/useJourneyProgress";
import { useState } from "react";
import { Globe, Lock, Share2 } from "lucide-react";
import RefineBar from "@/components/RefineBar";
import JourneyItemCard from "@/components/JourneyItemCard";

interface JourneyPathProps {
  journey: JourneyResponse;
  journeyId: string;
  onSaveJourney?: () => void;
  onShareJourney?: () => Promise<void>;
  onAddToList?: (item: JourneyItem) => void;
  onMoreLikeThis?: (item: JourneyItem) => void;
  onRefine?: (feedback: string) => void;
  isLoading?: boolean;
  isOwner?: boolean;
  /** Visibility toggle + share for journey detail page */
  onToggleVisibility?: () => void;
  onShare?: () => void;
  isPublic?: boolean;
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
  onShareJourney,
  onAddToList,
  onMoreLikeThis,
  onRefine,
  isLoading = false,
  isOwner = true,
  onToggleVisibility,
  onShare,
  isPublic,
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
          {(onToggleVisibility || onShare) && (
            <div className="flex flex-wrap items-center gap-2 mb-4">
              {isOwner && onToggleVisibility && (
                <button
                  onClick={onToggleVisibility}
                  className={`flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer border ${
                    isPublic
                      ? "bg-green-500/10 text-green-400 border-green-500/20 hover:bg-green-500/20"
                      : "bg-white/5 text-white/60 border-white/10 hover:bg-white/10"
                  }`}
                >
                  {isPublic ? (
                    <>
                      <Globe className="w-3.5 h-3.5" />
                      <span>Public</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-3.5 h-3.5" />
                      <span>Private</span>
                    </>
                  )}
                </button>
              )}
              {onShare && (
                <button
                  onClick={onShare}
                  className="flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-white/5 text-white border border-white/10 hover:bg-white/10 transition-colors cursor-pointer"
                  title="Share journey"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Share</span>
                </button>
              )}
            </div>
          )}
          <div className="flex gap-2 mb-6 lg:mb-0">
            {isOwner && onSaveJourney && (
              <button
                onClick={onSaveJourney}
                className="hidden lg:inline-flex py-2.5 px-5 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 text-white font-medium text-sm hover:brightness-110 transition-all cursor-pointer shadow-lg shadow-purple-500/25"
              >
                Save
              </button>
            )}
            {onShareJourney && (
              <button
                onClick={onShareJourney}
                className="hidden lg:inline-flex items-center gap-2 py-2.5 px-5 rounded-xl bg-white/5 border border-white/10 text-white font-medium text-sm hover:bg-white/10 transition-all cursor-pointer"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="18" cy="5" r="3"></circle>
                  <circle cx="6" cy="12" r="3"></circle>
                  <circle cx="18" cy="19" r="3"></circle>
                  <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
                  <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
                </svg>
                Share
              </button>
            )}
          </div>

          {isOwner && onRefine && (
            <div className="mt-4">
              <RefineBar onRefine={onRefine} isLoading={isLoading} />
            </div>
          )}
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
              <JourneyItemCard
                item={item}
                journeyId={journeyId}
                isCurrent={isCurrent}
                isLocked={isLocked!}
                setShowActionsFor={setShowActionsFor}
                showActionsFor={showActionsFor}
                onMarkWatched={markWatched}
                onAddToList={onAddToList}
                onMoreLikeThis={onMoreLikeThis}
                isOwner={isOwner}
              />

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
        {isOwner && onSaveJourney && (
          <button
            onClick={onSaveJourney}
            className="lg:hidden w-full mt-4 py-2.5 px-4 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 text-white font-medium text-sm hover:brightness-110 transition-all cursor-pointer shadow-lg shadow-purple-500/25"
          >
            Save journey
          </button>
        )}
        {onShareJourney && (
          <button
            onClick={onShareJourney}
            className="lg:hidden w-full mt-3 py-2.5 px-4 rounded-xl bg-white/5 border border-white/10 text-white font-medium text-sm hover:bg-white/10 transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="18" cy="5" r="3"></circle>
              <circle cx="6" cy="12" r="3"></circle>
              <circle cx="18" cy="19" r="3"></circle>
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
              <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
            </svg>
            Share journey
          </button>
        )}
      </div>
    </div>
  );
}
