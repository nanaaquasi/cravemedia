"use client";

import { JourneyResponse } from "@/lib/types";
import JourneyPath from "@/components/JourneyPath";
import { ArrowLeft, Bookmark, Loader2 } from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import ShareModal from "@/components/ShareModal";
import { toggleJourneyVisibility, cloneJourney } from "@/app/actions/journey";
import Toast from "@/components/Toast";
import type { SessionUser } from "@/app/api/auth/session/route";

interface JourneyDetailClientProps {
  journey: JourneyResponse;
  journeyId: string;
  isOwner: boolean;
  isPublic: boolean;
  user: SessionUser | null;
  /** When true, auto-clone on mount (guest returned from login via Sign in to Save) */
  saveOnLoad?: boolean;
  /** When true, show "Saved to your journeys" toast (redirected after clone) */
  savedToast?: boolean;
  /** User's fork of this journey (already saved) - show "View" instead of "Save" */
  existingCloneId?: string | null;
  initialProgress?: {
    completed: number[];
    currentPosition: number;
    itemReviews?: Record<
      number,
      { item_rating: number | null; review_text: string | null }
    >;
  } | null;
  journeyStatus?: string | null;
  journeyReviewData?: {
    overallRating: number | null;
    sequenceRating: number | null;
    reviewText: string | null;
  } | null;
}

export default function JourneyDetailClient({
  journey,
  journeyId,
  isOwner,
  isPublic: initialIsPublic,
  user,
  saveOnLoad = false,
  savedToast = false,
  existingCloneId = null,
  initialProgress,
  journeyStatus,
  journeyReviewData,
}: JourneyDetailClientProps) {
  const [isPublic, setIsPublic] = useState(initialIsPublic);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isCloning, setIsCloning] = useState(false);
  const router = useRouter();

  // Show toast when redirected after successful save (guest saved journey flow)
  useEffect(() => {
    if (savedToast) {
      setToastMessage("Saved to your journeys");
      router.replace(`/journey/${journeyId}`, { scroll: false });
    }
  }, [savedToast, journeyId, router]);

  // Auto-clone when guest returns from login with save=1 (Sign in to Save flow)
  useEffect(() => {
    if (!user || isOwner || !saveOnLoad) return;
    let cancelled = false;
    (async () => {
      setIsCloning(true);
      const result = await cloneJourney(journeyId);
      if (cancelled) return;
      setIsCloning(false);
      if (result.error) {
        setToastMessage(result.error);
      } else if (result.newJourneyId) {
        router.replace(`/journey/${result.newJourneyId}?saved=1`);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, isOwner, saveOnLoad, journeyId, router]);

  const handleToggleVisibility = async () => {
    const newIsPublic = !isPublic;
    // Optimistic update
    setIsPublic(newIsPublic);
    const result = await toggleJourneyVisibility(journeyId, newIsPublic);
    if (!result.success) {
      // Revert on error
      setIsPublic(!newIsPublic);
      setToastMessage("Failed to update visibility");
    } else {
      setToastMessage(`Journey is now ${newIsPublic ? "public" : "private"}`);
    }
  };

  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/journey/${journeyId}`
      : "";

  return (
    <div className="flex flex-col min-h-screen">
      <div className="mb-8">
        <Link
          href={isOwner ? "/account" : "/"}
          className="inline-flex items-center gap-2 text-zinc-400 hover:text-white transition-colors group"
        >
          <div className="p-2 rounded-full bg-black/20 group-hover:bg-black/40 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </div>
          <span className="text-sm font-medium">
            {isOwner ? "Back to Profile" : "Back to Home"}
          </span>
        </Link>
      </div>

      {!isOwner && (
        <div className="animate-fade-in-up mb-6 p-4 rounded-xl bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div>
            <h3 className="text-white font-medium mb-1">
              Created by someone else
            </h3>
            <p className="text-sm text-white/70">
              Save this journey to your library to keep it.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 w-full sm:w-auto justify-center sm:justify-start text-center sm:text-left">
            {user ? (
              existingCloneId ? (
                <Link
                  href={`/journey/${existingCloneId}`}
                  className="whitespace-nowrap px-4 py-2 rounded-xl bg-purple-500 hover:bg-purple-600 text-white text-sm font-medium transition-colors flex items-center gap-2"
                >
                  <Bookmark className="w-4 h-4" />
                  View in My Journeys
                </Link>
              ) : (
                <button
                  onClick={async () => {
                    setIsCloning(true);
                    const result = await cloneJourney(journeyId);
                    setIsCloning(false);
                    if (result.error) {
                      setToastMessage(result.error);
                    } else if (result.newJourneyId) {
                      router.replace(`/journey/${result.newJourneyId}?saved=1`);
                    }
                  }}
                  disabled={isCloning}
                  className="whitespace-nowrap px-4 py-2 rounded-xl bg-purple-500 hover:bg-purple-600 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors flex items-center gap-2"
                >
                  {isCloning ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Bookmark className="w-4 h-4" />
                  )}
                  {isCloning ? "Saving..." : "Save to My Journeys"}
                </button>
              )
            ) : (
              <Link
                href={`/login?next=${encodeURIComponent(`/journey/${journeyId}?save=1`)}`}
                className="whitespace-nowrap px-4 py-2 rounded-xl bg-purple-500 hover:bg-purple-600 text-white text-sm font-medium transition-colors flex items-center gap-2"
              >
                <Bookmark className="w-4 h-4" />
                Sign in to Save
              </Link>
            )}
            <Link
              href="/"
              className="whitespace-nowrap px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white text-sm font-medium transition-colors"
            >
              Create Your Own
            </Link>
          </div>
        </div>
      )}

      <JourneyPath
        journey={journey}
        journeyId={journeyId}
        isOwner={isOwner}
        onToggleVisibility={handleToggleVisibility}
        onShare={user ? () => setIsShareModalOpen(true) : undefined}
        isPublic={isPublic}
        initialProgress={initialProgress}
        journeyStatus={journeyStatus}
        journeyReviewData={journeyReviewData}
      />

      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        url={shareUrl}
        title={journey.journeyTitle}
        isPublic={isPublic}
        contentType="journey"
        onMakePublic={
          isOwner
            ? async () => {
                setIsPublic(true);
                const result = await toggleJourneyVisibility(
                  journeyId,
                  true,
                );
                if (!result.success) {
                  setIsPublic(false);
                  setToastMessage("Failed to update visibility");
                } else {
                  setToastMessage("Journey is now public");
                }
              }
            : undefined
        }
      />

      <Toast message={toastMessage} onClose={() => setToastMessage(null)} />
    </div>
  );
}
