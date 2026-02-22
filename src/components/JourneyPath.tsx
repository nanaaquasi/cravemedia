"use client";

import { JourneyItem, JourneyResponse } from "@/lib/types";
import { useJourneyProgress } from "@/hooks/useJourneyProgress";
import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Globe, Lock, Share2, Play } from "lucide-react";
import RefineBar from "@/components/RefineBar";
import JourneyItemCard from "@/components/JourneyItemCard";
import {
  markJourneyItemWatched,
  beginJourney,
  updateJourneyItemReview,
  updateJourneyReview,
} from "@/app/actions/journey";
import Toast from "@/components/Toast";
import Modal from "@/components/Modal";
import { Star, Check, Loader2 } from "lucide-react";

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
  /** DB progress for saved journeys - when provided, Mark watched persists to DB */
  initialProgress?: {
    completed: number[];
    currentPosition: number;
    itemReviews?: Record<
      number,
      { item_rating: number | null; review_text: string | null }
    >;
  } | null;
  /** Journey status: wishlist | in_progress | completed | abandoned */
  journeyStatus?: string | null;
  /** Journey review data when completed */
  journeyReviewData?: {
    overallRating: number | null;
    sequenceRating: number | null;
    reviewText: string | null;
  } | null;
}

function formatRuntime(totalMinutes: number): string {
  if (totalMinutes < 60) return `${totalMinutes} min`;
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  return mins > 0 ? `~${hours}h ${mins}m` : `~${hours}h`;
}

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
  initialProgress,
  journeyStatus,
  journeyReviewData,
}: JourneyPathProps) {
  const router = useRouter();
  const { getProgressForJourney, markWatched: markWatchedLocal } =
    useJourneyProgress(journeyId);

  const isSavedJourney = UUID_REGEX.test(journeyId) && initialProgress !== undefined;

  const [localProgress, setLocalProgress] = useState<{
    completed: Set<number>;
    currentPosition: number;
  } | null>(() => {
    if (!isSavedJourney) return null;
    if (initialProgress) {
      return {
        completed: new Set(initialProgress.completed),
        currentPosition: initialProgress.currentPosition,
      };
    }
    return { completed: new Set(), currentPosition: 1 };
  });

  const progress = isSavedJourney && localProgress
    ? localProgress
    : {
        completed: new Set(getProgressForJourney(journeyId).completed),
        currentPosition: getProgressForJourney(journeyId).currentPosition,
      };

  const currentPosition = isSavedJourney && localProgress
    ? localProgress.currentPosition
    : getProgressForJourney(journeyId).currentPosition;
  const completed = isSavedJourney && localProgress
    ? localProgress.completed
    : new Set(getProgressForJourney(journeyId).completed);

  const [showActionsFor, setShowActionsFor] = useState<number | null>(null);
  const [markError, setMarkError] = useState<string | null>(null);

  const itemReviews = initialProgress?.itemReviews ?? {};

  const [reviewItemPosition, setReviewItemPosition] = useState<number | null>(
    null,
  );
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [isSavingItemReview, setIsSavingItemReview] = useState(false);

  const [showJourneyReviewModal, setShowJourneyReviewModal] = useState(false);
  const [journeyOverallRating, setJourneyOverallRating] = useState(
    journeyReviewData?.overallRating ?? 0,
  );
  const [journeySequenceRating, setJourneySequenceRating] = useState(
    journeyReviewData?.sequenceRating ?? 0,
  );
  const [journeyReviewText, setJourneyReviewText] = useState(
    journeyReviewData?.reviewText ?? "",
  );
  const [isSavingJourneyReview, setIsSavingJourneyReview] = useState(false);

  const handleOpenItemReview = useCallback(
    (position: number) => {
      const existing = itemReviews[position];
      setReviewItemPosition(position);
      setReviewRating(existing?.item_rating ?? 0);
      setReviewText(existing?.review_text ?? "");
    },
    [itemReviews],
  );

  const handleSaveItemReview = useCallback(async () => {
    if (reviewItemPosition == null) return;
    setIsSavingItemReview(true);
    const result = await updateJourneyItemReview(journeyId, reviewItemPosition, {
      rating: reviewRating || undefined,
      review: reviewText.trim() || undefined,
    });
    setIsSavingItemReview(false);
    if (!result.error) {
      setReviewItemPosition(null);
    }
  }, [journeyId, reviewItemPosition, reviewRating, reviewText]);

  const handleSaveJourneyReview = useCallback(async () => {
    setIsSavingJourneyReview(true);
    const result = await updateJourneyReview(journeyId, {
      overallRating: journeyOverallRating || undefined,
      sequenceRating: journeySequenceRating || undefined,
      reviewText: journeyReviewText.trim() || undefined,
    });
    setIsSavingJourneyReview(false);
    if (!result.error) {
      setShowJourneyReviewModal(false);
    }
  }, [
    journeyId,
    journeyOverallRating,
    journeySequenceRating,
    journeyReviewText,
  ]);

  const markWatched = useCallback(
    async (jid: string, position: number) => {
      if (isSavedJourney && isOwner) {
        setMarkError(null);
        setLocalProgress((prev) => {
          const next = prev ?? {
            completed: new Set(),
            currentPosition: 1,
          };
          const newCompleted = new Set(next.completed);
          newCompleted.add(position);
          const nextPosition = Math.max(next.currentPosition, position + 1);
          return {
            completed: newCompleted,
            currentPosition: nextPosition,
          };
        });
        const result = await markJourneyItemWatched(jid, position);
        if (result.error) {
          setMarkError(result.error);
          setLocalProgress((prev) => {
            if (!prev) return prev;
            const reverted = new Set(prev.completed);
            reverted.delete(position);
            return {
              completed: reverted,
              currentPosition: prev.currentPosition,
            };
          });
        }
      } else {
        markWatchedLocal(jid, position);
      }
    },
    [isSavedJourney, isOwner, markWatchedLocal],
  );

  const totalRuntime = journey.totalRuntimeMinutes
    ? formatRuntime(journey.totalRuntimeMinutes)
    : null;

  const completedCount = completed.size;
  const progressPercent =
    journey.itemCount > 0 ? (completedCount / journey.itemCount) * 100 : 0;
  const isWishlist = journeyStatus === "wishlist";
  const showBeginCTA = isOwner && isSavedJourney && isWishlist;

  const [isBeginning, setIsBeginning] = useState(false);
  const [beginError, setBeginError] = useState<string | null>(null);

  const handleBeginJourney = useCallback(async () => {
    if (!showBeginCTA) return;
    setIsBeginning(true);
    setBeginError(null);
    const result = await beginJourney(journeyId);
    if (result.error) {
      setBeginError(result.error);
      setIsBeginning(false);
    } else {
      router.push("/account");
    }
  }, [showBeginCTA, journeyId, router]);

  return (
    <div className="animate-fade-in-up flex flex-col lg:flex-row lg:gap-8 lg:min-h-0 lg:flex-1">
      {/* Left: Journey info - fixed on desktop, 5/12 of width */}
      <aside className="lg:flex-[5] lg:min-w-0 lg:sticky lg:top-1/2 lg:-translate-y-1/2 lg:self-start">
        <div className="mb-6 lg:mb-0">
          {/* Circular progress + Begin CTA for owner */}
          {isOwner && isSavedJourney && (
            <div className="flex items-center gap-6 mb-6">
              <div className="relative flex-shrink-0">
                <svg
                  className="w-20 h-20 -rotate-90"
                  viewBox="0 0 36 36"
                  aria-hidden
                >
                  <circle
                    cx="18"
                    cy="18"
                    r="15.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="text-white/10"
                  />
                  <circle
                    cx="18"
                    cy="18"
                    r="15.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeDasharray={`${(progressPercent / 100) * 97} 97`}
                    className="text-green-500 transition-all duration-700 ease-out"
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-white">
                  {Math.round(progressPercent)}%
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-green-400/90 font-medium">
                  {completedCount} of {journey.itemCount} completed
                </p>
              </div>
            </div>
          )}

          {isOwner &&
            isSavedJourney &&
            journeyStatus === "completed" && (
              <button
                onClick={() => setShowJourneyReviewModal(true)}
                className="mb-4 w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 border border-amber-500/30 transition-colors cursor-pointer"
              >
                <Star className="w-4 h-4" />
                {journeyReviewData?.reviewText || journeyReviewData?.overallRating
                  ? "Edit journey review"
                  : "Add journey review"}
              </button>
            )}

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
          {showBeginCTA && (
            <button
              onClick={handleBeginJourney}
              disabled={isBeginning}
              className="mb-4 self-start flex items-center justify-center gap-2 py-3 px-5 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 text-white font-medium hover:brightness-110 transition-all cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
            >
              <Play className="w-4 h-4 fill-current" />
              {isBeginning ? "Starting…" : "Begin journey"}
            </button>
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
                isCompleted={isCompleted}
                itemReview={itemReviews[position]}
                setShowActionsFor={setShowActionsFor}
                showActionsFor={showActionsFor}
                onMarkWatched={markWatched}
                onOpenItemReview={
                  isSavedJourney && isOwner ? handleOpenItemReview : undefined
                }
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
        <Toast
          message={markError ?? beginError}
          onClose={() => {
            setMarkError(null);
            setBeginError(null);
          }}
        />
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

      {/* Item review modal */}
      <Modal
        isOpen={reviewItemPosition != null}
        onClose={() => !isSavingItemReview && setReviewItemPosition(null)}
        maxSize="md"
      >
        {reviewItemPosition != null && (
          <div className="pt-2">
            <h3 className="text-lg font-semibold text-white mb-4">
              Rate & review
            </h3>
            <p className="text-zinc-400 text-sm mb-4 truncate">
              {journey.items.find((i) => i.position === reviewItemPosition)
                ?.title ?? "Step " + reviewItemPosition}
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
              placeholder="Add a short review (optional)"
              rows={3}
              maxLength={280}
              disabled={isSavingItemReview}
              className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-zinc-500 focus:border-purple-500 focus:outline-none resize-none disabled:opacity-50 mb-4"
            />
            <p className="text-zinc-500 text-xs mb-4">{reviewText.length}/280</p>
            <div className="flex gap-2">
              <button
                onClick={() => !isSavingItemReview && setReviewItemPosition(null)}
                disabled={isSavingItemReview}
                className="flex-1 py-2.5 rounded-xl font-medium text-zinc-300 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveItemReview}
                disabled={isSavingItemReview}
                className="flex-1 py-2.5 rounded-xl font-medium bg-purple-500 hover:bg-purple-600 text-white transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSavingItemReview ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                Save
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Journey review modal (when completed) */}
      <Modal
        isOpen={showJourneyReviewModal}
        onClose={() => !isSavingJourneyReview && setShowJourneyReviewModal(false)}
        maxSize="md"
      >
        <div className="pt-2">
          <h3 className="text-lg font-semibold text-white mb-4">
            Rate & review journey
          </h3>
          <p className="text-zinc-400 text-sm mb-4">{journey.journeyTitle}</p>
          <p className="text-xs text-zinc-500 mb-2">Overall rating</p>
          <div className="flex gap-1 mb-4">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setJourneyOverallRating(star)}
                className="p-1 rounded transition-colors cursor-pointer"
              >
                <Star
                  className={`w-8 h-8 ${
                    star <= journeyOverallRating
                      ? "text-amber-400 fill-amber-400"
                      : "text-zinc-500 hover:text-amber-400/50"
                  }`}
                />
              </button>
            ))}
          </div>
          <p className="text-xs text-zinc-500 mb-2">
            How well did the sequence work?
          </p>
          <div className="flex gap-1 mb-4">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setJourneySequenceRating(star)}
                className="p-1 rounded transition-colors cursor-pointer"
              >
                <Star
                  className={`w-6 h-6 ${
                    star <= journeySequenceRating
                      ? "text-amber-400 fill-amber-400"
                      : "text-zinc-500 hover:text-amber-400/50"
                  }`}
                />
              </button>
            ))}
          </div>
          <textarea
            value={journeyReviewText}
            onChange={(e) =>
              setJourneyReviewText(e.target.value.slice(0, 280))
            }
            placeholder="Add a short review of the journey (optional)"
            rows={3}
            maxLength={280}
            disabled={isSavingJourneyReview}
            className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-zinc-500 focus:border-purple-500 focus:outline-none resize-none disabled:opacity-50 mb-4"
          />
          <p className="text-zinc-500 text-xs mb-4">
            {journeyReviewText.length}/280
          </p>
          <div className="flex gap-2">
            <button
              onClick={() =>
                !isSavingJourneyReview && setShowJourneyReviewModal(false)
              }
              disabled={isSavingJourneyReview}
              className="flex-1 py-2.5 rounded-xl font-medium text-zinc-300 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveJourneyReview}
              disabled={isSavingJourneyReview}
              className="flex-1 py-2.5 rounded-xl font-medium bg-purple-500 hover:bg-purple-600 text-white transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSavingJourneyReview ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              Save
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
