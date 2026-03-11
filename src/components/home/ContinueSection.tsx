"use client";

import { CurrentJourney } from "@/components/account/CurrentJourney";
import { InProgressMedia } from "@/components/account/InProgressMedia";
import type { Journey } from "@/components/account/queries";
import { CollectionItem } from "@/lib/supabase/types";

interface ContinueSectionProps {
  currentJourney: Journey | null;
  inProgressItems: CollectionItem[];
}

export function ContinueSection({
  currentJourney,
  inProgressItems,
}: ContinueSectionProps) {
  const hasContent = currentJourney || inProgressItems.length > 0;
  if (!hasContent) return null;

  return (
    <section className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {currentJourney && <CurrentJourney journey={currentJourney} />}
      <InProgressMedia items={inProgressItems} />
    </section>
  );
}
