"use client";

import { CollectionCard } from "@/components/account/CollectionCard";
import { Collection } from "@/lib/supabase/types";
import { CRAVELIST_LABEL_PLURAL } from "@/config/labels";
import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCanScroll } from "@/hooks/useCanScroll";

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
  const scrollRef = useRef<HTMLDivElement>(null);
  const canScroll = useCanScroll(scrollRef);

  const scrollLeft = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: -600, behavior: "smooth" });
    }
  };

  const scrollRight = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: 600, behavior: "smooth" });
    }
  };

  if (collections.length === 0) return null;

  return (
    <section className="mb-12">
      <div className="flex items-end justify-between mb-4">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">
            Trending {CRAVELIST_LABEL_PLURAL}
          </h2>
          <p className="text-zinc-400 text-sm">
            See what the community is curating
          </p>
        </div>
        {canScroll && (
          <div className="hidden md:flex gap-2 self-end pb-1">
            <button
              onClick={scrollLeft}
              className="p-2 sm:p-2.5 rounded-full border border-white/10 bg-black/40 hover:bg-white/10 text-white transition-colors cursor-pointer backdrop-blur-md shadow-md"
              aria-label="Scroll left"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              onClick={scrollRight}
              className="p-2 sm:p-2.5 rounded-full border border-white/10 bg-black/40 hover:bg-white/10 text-white transition-colors cursor-pointer backdrop-blur-md shadow-md"
              aria-label="Scroll right"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        )}
      </div>
      <div 
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory scroll-smooth"
      >
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
