"use client";

import { CollectionCard } from "@/components/account/CollectionCard";
import { Collection } from "@/lib/supabase/types";
import { CRAVELIST_LABEL_PLURAL } from "@/config/labels";

interface TrendingSectionProps {
  collections: (Collection & {
    items?: { image_url: string | null }[];
    item_count?: number;
    curator_first_name?: string | null;
    favorites_count?: number;
    views_count?: number;
    saves_count?: number;
  })[];
}

export function TrendingSection({ collections }: TrendingSectionProps) {
  if (collections.length === 0) return null;

  return (
    <section className="mb-12">
      <h2 className="text-2xl font-bold text-white mb-4">
        Trending {CRAVELIST_LABEL_PLURAL}
      </h2>
      <p className="text-zinc-400 text-sm mb-6">
        See what the community is curating
      </p>
      <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide snap-x snap-mandatory">
        {collections.map((col, i) => (
          <div key={col.id} className="flex-shrink-0 w-[280px] sm:w-[350px] snap-start">
            <CollectionCard
              collection={col}
              variant="featured"
              gradientIndex={i}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
