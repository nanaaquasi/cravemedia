"use client";

import { JourneyResponse } from "@/lib/types";
import JourneyPath from "@/components/JourneyPath";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

interface JourneyDetailClientProps {
  journey: JourneyResponse;
  journeyId: string;
}

export default function JourneyDetailClient({
  journey,
  journeyId,
}: JourneyDetailClientProps) {
  return (
    <div className="flex flex-col min-h-screen">
      <div className="mb-8">
        <Link
          href="/account"
          className="inline-flex items-center gap-2 text-zinc-400 hover:text-white transition-colors group"
        >
          <div className="p-2 rounded-full bg-white/5 group-hover:bg-white/10 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </div>
          <span className="text-sm font-medium">Back to Profile</span>
        </Link>
      </div>

      <JourneyPath
        journey={journey}
        journeyId={journeyId}
        // No onSaveJourney since it's already saved
        // We could add an onDeleteJourney or onShareJourney here later
      />
    </div>
  );
}
