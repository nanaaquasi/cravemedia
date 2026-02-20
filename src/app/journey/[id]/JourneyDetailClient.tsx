"use client";

import { JourneyResponse } from "@/lib/types";
import JourneyPath from "@/components/JourneyPath";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import ShareModal from "@/components/ShareModal";
import { toggleJourneyVisibility } from "@/app/actions/journey";
import Toast from "@/components/Toast";
import { User } from "@supabase/supabase-js";

interface JourneyDetailClientProps {
  journey: JourneyResponse;
  journeyId: string;
  isOwner: boolean;
  isPublic: boolean;
  user: User | null;
}

export default function JourneyDetailClient({
  journey,
  journeyId,
  isOwner,
  isPublic: initialIsPublic,
  user,
}: JourneyDetailClientProps) {
  const [isPublic, setIsPublic] = useState(initialIsPublic);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

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
        <div className="animate-fade-in-up mb-6 p-4 rounded-xl bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="text-white font-medium mb-1">
              Created by someone else
            </h3>
            <p className="text-sm text-white/70">
              Create your own personalized media journey just like this.
            </p>
          </div>
          <Link
            href="/"
            className="whitespace-nowrap px-4 py-2 rounded-xl bg-purple-500 hover:bg-purple-600 text-white text-sm font-medium transition-colors"
          >
            Create Your Own
          </Link>
        </div>
      )}

      <JourneyPath
        journey={journey}
        journeyId={journeyId}
        isOwner={isOwner}
        onToggleVisibility={handleToggleVisibility}
        onShare={user ? () => setIsShareModalOpen(true) : undefined}
        isPublic={isPublic}
      />

      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        url={shareUrl}
        title={journey.journeyTitle}
      />

      <Toast message={toastMessage} onClose={() => setToastMessage(null)} />
    </div>
  );
}
