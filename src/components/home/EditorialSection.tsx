"use client";

import { useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { CollectionCard } from "@/components/account/CollectionCard";
import { Collection } from "@/lib/supabase/types";
import { CRAVELIST_LABEL_PLURAL } from "@/config/labels";
import {
  FEATURED_AUTOSCROLL_INTERVAL_MS,
  MOOD_CARDS,
  SURPRISE_QUERIES,
} from "@/config/home-sections";

interface EditorialSectionProps {
  onSearch: (query: string) => void;
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

export function EditorialSection({
  onSearch,
  pickOfTheDay,
  featuredCollections,
}: EditorialSectionProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const isPausedRef = useRef(false);

  useEffect(() => {
    if (featuredCollections.length < 2) return;
    const container = scrollContainerRef.current;
    if (!container) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const scrollOneCard = () => {
      if (isPausedRef.current) return;
      const firstCard = cardRefs.current[0];
      const scrollAmount = firstCard ? firstCard.offsetWidth + 16 : 316;
      const maxScroll = container.scrollWidth - container.clientWidth;

      if (container.scrollLeft >= maxScroll - 10) {
        container.scrollTo({ left: 0, behavior: "smooth" });
      } else {
        container.scrollBy({ left: scrollAmount, behavior: "smooth" });
      }
    };

    const interval = setInterval(
      scrollOneCard,
      FEATURED_AUTOSCROLL_INTERVAL_MS,
    );

    const onMouseEnter = () => {
      isPausedRef.current = true;
    };
    const onMouseLeave = () => {
      isPausedRef.current = false;
    };
    container.addEventListener("mouseenter", onMouseEnter);
    container.addEventListener("mouseleave", onMouseLeave);

    return () => {
      clearInterval(interval);
      container.removeEventListener("mouseenter", onMouseEnter);
      container.removeEventListener("mouseleave", onMouseLeave);
    };
  }, [featuredCollections.length]);

  return (
    <div className="space-y-16">
      {featuredCollections.length > 0 && (
        <section className="w-screen relative left-1/2 -translate-x-1/2">
          <div className="text-center mb-6 px-4 sm:px-6 py-4">
            <h2 className="text-2xl sm:text-4xl font-bold text-white mb-2">
              Featured {CRAVELIST_LABEL_PLURAL}
            </h2>
            <p className="text-zinc-400 text-sm sm:text-lg">
              See what other cravers are curating
            </p>
          </div>
          <div
            ref={scrollContainerRef}
            className="overflow-x-auto scroll-smooth snap-x snap-mandatory scrollbar-hide"
          >
            <div className="flex gap-4 sm:pr-6 pb-2">
              {featuredCollections.map((collection, i) => (
                <div
                  key={collection.id}
                  ref={(el) => {
                    cardRefs.current[i] = el;
                  }}
                  className="flex-shrink-0 w-[350px] snap-start"
                >
                  <CollectionCard
                    collection={collection}
                    variant="featured"
                    gradientIndex={i}
                  />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="flex flex-col items-center">
        <h2 className="text-2xl sm:text-4xl text-center font-bold text-white mb-2">
          For Every Mood, Every Moment
        </h2>
        <p className="text-zinc-400 text-sm sm:text-base text-center mb-6">
          No doomscrolling. Recommendations that actually match your vibe.
        </p>
        <div className="w-full max-w-4xl flex flex-wrap justify-center gap-2 sm:gap-3 mb-6">
          {MOOD_CARDS.map((mood, i) => (
            <div key={mood.label} className="group/mood relative">
              <div
                className="absolute -inset-[6px] rounded-full opacity-0 group-hover/mood:opacity-100 transition-opacity duration-500 pointer-events-none"
                style={{
                  background: mood.gradient,
                  filter: "blur(24px)",
                }}
                aria-hidden
              />
              <button
                type="button"
                onClick={() => onSearch(mood.query)}
                className="relative z-10 rounded-full liquid-glass-strong overflow-visible border border-white/10 group-hover/mood:border-white/20 group-hover/mood:bg-white/5 text-white text-base sm:text-lg font-medium transition-all group-hover/mood:scale-[1.02] group-hover/mood:translate-y-[-2px] px-6 py-3.5 sm:px-8 sm:py-4 cursor-pointer"
              >
                {mood.label}
              </button>
            </div>
          ))}
        </div>
        <Link
          href="/ask"
          className="flex items-center gap-3 px-8 py-4 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 text-white text-lg font-medium transition-all shadow-lg shadow-purple-500/25"
        >
          <span className="text-xl">✦</span>
          Ask Craveo
        </Link>
      </section>

      {pickOfTheDay && (
        <section>
          <div className="py-4 mb-4">
            <h2 className="text-lg font-semibold text-white">
              Pick of the day
            </h2>
          </div>
          <Link
            href={`/media/${pickOfTheDay.type}/${pickOfTheDay.mediaId}`}
            className="block group"
          >
            <div className="relative flex gap-4 p-4 rounded-2xl liquid-glass-strong border border-white/10 section-elevated hover:border-white/20 transition-all hover:scale-[1.02]">
              <div className="section-glow rounded-2xl" aria-hidden />
              <div className="relative z-10 w-24 h-36 shrink-0 rounded-xl overflow-hidden bg-zinc-800">
                <Image
                  src={pickOfTheDay.posterUrl}
                  alt={pickOfTheDay.title}
                  fill
                  className="object-cover"
                  sizes="96px"
                />
              </div>
              <div className="relative z-10 flex-1 min-w-0 flex flex-col justify-center">
                <h3 className="text-lg font-bold text-white group-hover:text-purple-400 transition-colors line-clamp-2">
                  {pickOfTheDay.title}
                </h3>
                <span className="text-sm text-purple-400 mt-1">Explore</span>
              </div>
            </div>
          </Link>
        </section>
      )}
    </div>
  );
}
