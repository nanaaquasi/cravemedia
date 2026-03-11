"use client";

import { useRouter } from "next/navigation";
import { ContinueSection } from "./ContinueSection";
import { SocialFeed } from "./SocialFeed";
import { EditorialSection } from "./EditorialSection";
import type { Journey } from "@/components/account/queries";
import { Collection, CollectionItem } from "@/lib/supabase/types";

interface HomeFeedProps {
  currentJourney: Journey | null;
  inProgressItems: CollectionItem[];
  friendsActivity: { id: string; [key: string]: unknown }[];
  pickOfTheDay: {
    mediaId: string;
    type: string;
    title: string;
    posterUrl: string;
  } | null;
  featuredCollections: (Collection & {
    items?: { image_url: string | null }[];
    item_count?: number;
  })[];
}

export function HomeFeed({
  currentJourney,
  inProgressItems,
  friendsActivity,
  pickOfTheDay,
  featuredCollections,
}: HomeFeedProps) {
  const router = useRouter();

  const handleSearch = (query: string) => {
    router.push(`/ask?q=${encodeURIComponent(query)}`);
  };

  return (
    <main className="flex-1 flex flex-col space-y-12 pb-16">
      <ContinueSection
        currentJourney={currentJourney}
        inProgressItems={inProgressItems}
      />
      <SocialFeed activities={friendsActivity as import("@/components/account/queries").Activity[]} />
      <EditorialSection
        onSearch={handleSearch}
        pickOfTheDay={pickOfTheDay}
        featuredCollections={featuredCollections}
      />
    </main>
  );
}
