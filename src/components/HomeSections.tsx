"use client";

import { useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Users, UserPlus, Sparkles } from "lucide-react";
import { CollectionCard } from "@/components/account/CollectionCard";
import { Collection } from "@/lib/supabase/types";
import { CRAVELIST_LABEL_PLURAL } from "@/config/labels";
import {
  FEATURED_AUTOSCROLL_INTERVAL_MS,
  MOOD_CARDS,
  SURPRISE_QUERIES,
  WHY_DIFFERENT_ROWS,
} from "@/config/home-sections";

interface HomeSectionsProps {
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

export function HomeSections({
  onSearch,
  pickOfTheDay,
  featuredCollections,
}: HomeSectionsProps) {
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
    <div className="w-full mt-0 sm:mt-16 space-y-20 sm:space-y-42 animate-in fade-in slide-in-from-bottom-4 duration-500 motion-reduce:animate-none">
      {/* Featured Cravelists - full width, left-aligned, horizontal scroll, 3 cards in view */}
      {featuredCollections.length > 0 && (
        <section
          className="animate-in fade-in slide-in-from-bottom-4 duration-500 w-screen relative left-1/2 -translate-x-1/2"
          style={{ animationDelay: "100ms" }}
        >
          <div className="text-center mb-6 px-4 sm:px-6 py-8">
            <h2 className="text-2xl sm:text-5xl font-bold text-white mb-2">
              Featured {CRAVELIST_LABEL_PLURAL}
            </h2>
            <p className="text-zinc-400 text-sm sm:text-xl">
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

      {/* Why Cravemedia is Different */}
      <section
        className="animate-in fade-in slide-in-from-bottom-4 duration-500 px-0 sm:px-6"
        style={{ animationDelay: "120ms" }}
      >
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl sm:text-4xl font-bold text-white text-center mb-3">
            Why Cravemedia is Different
          </h2>
          <p className="text-zinc-400 text-sm sm:text-base text-center mb-10">
            How we compare to Trakt, Letterboxd, Goodreads—and what we do
            differently
          </p>

          <div className="liquid-glass rounded-2xl border border-white/15 bg-white/5 overflow-hidden">
            {/* Desktop: 3-column table */}
            <div className="hidden sm:grid sm:grid-cols-3 text-sm sm:text-base">
              <div className="p-4 sm:p-5 border-b border-white/10 border-r border-white/10 font-medium text-zinc-400" />
              <div className="p-4 sm:p-5 border-b border-white/10 border-r border-white/10 font-medium text-zinc-500">
                Trakt, Letterboxd, Goodreads
              </div>
              <div className="p-4 sm:p-5 border-b border-white/10 font-medium text-white">
                Cravemedia
              </div>

              {WHY_DIFFERENT_ROWS.map((row) => (
                <div key={row.category} className="contents">
                  <div className="p-4 sm:p-5 border-b border-white/10 border-r border-white/10 font-medium text-zinc-400 sm:text-zinc-300">
                    {row.category}
                  </div>
                  <div className="p-4 sm:p-5 border-b border-white/10 sm:border-r border-white/10 text-zinc-500">
                    {row.other}
                  </div>
                  <div className="p-4 sm:p-5 border-b border-white/10 text-zinc-300">
                    {row.crave}
                  </div>
                </div>
              ))}
            </div>

            {/* Mobile: stacked cards */}
            <div className="sm:hidden divide-y divide-white/10">
              {WHY_DIFFERENT_ROWS.map((row) => (
                <div key={row.category} className="p-4">
                  <h3 className="font-medium text-zinc-300 mb-2">
                    {row.category}
                  </h3>
                  <div className="space-y-2 text-sm">
                    <p className="text-zinc-500">
                      <span className="font-medium text-zinc-400">
                        Trakt, Letterboxd, Goodreads:
                      </span>{" "}
                      {row.other}
                    </p>
                    <p className="text-zinc-300">
                      <span className="font-medium text-white">
                        Cravemedia:
                      </span>{" "}
                      {row.crave}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Centered content: Journey, Mood, Pick of the Day */}
      <div className="px-0 sm:px-6 space-y-20 sm:space-y-42">
        {/* Journey Promo Section */}
        <section
          className="animate-in fade-in slide-in-from-bottom-4 duration-500"
          style={{ animationDelay: "150ms" }}
        >
          <div
            className="relative overflow-hidden rounded-2xl liquid-glass border border-purple-500/25 section-elevated p-6 sm:p-8 group hover:border-purple-500/35 transition-colors cursor-pointer"
            onClick={() => (window.location.href = "/login")}
          >
            <div className="section-glow rounded-2xl" aria-hidden />
            <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="p-3 rounded-xl bg-purple-500/20 border border-purple-500/30 shrink-0">
                <Users className="w-8 h-8 text-purple-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">
                  Join the community
                </h2>
                <p className="text-zinc-400 text-sm sm:text-base leading-relaxed">
                  Connect with fellow cravers. Share lists, discover what others
                  love, and find your next favorite.
                </p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  window.location.href = "/login";
                }}
                className="shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-500 hover:bg-purple-600 text-white font-medium text-sm transition-colors"
              >
                <UserPlus className="w-4 h-4" />
                Sign Up
              </button>
            </div>
          </div>
        </section>

        {/* Explore by Mood + Surprise Me */}
        <section
          className="animate-in fade-in slide-in-from-bottom-4 duration-500 flex flex-col items-center"
          style={{ animationDelay: "200ms" }}
        >
          <h2 className="text-2xl sm:text-5xl text-center font-bold text-white mb-2">
            For Every Mood, Every Moment
          </h2>
          <p className="text-zinc-300 text-sm sm:text-lg text-center mb-8">
            No doomscrolling. Recommendations that actually match your vibe.
          </p>
          <div className="w-full max-w-4xl flex flex-wrap justify-center gap-2 sm:gap-3 my-8">
            {MOOD_CARDS.map((mood, i) => (
              <div
                key={mood.label}
                className="group/mood relative"
                style={{ animationDelay: `${150 + i * 40}ms` }}
              >
                {/* Animated mood gradient background on hover */}
                <div
                  className="absolute -inset-[6px] rounded-full opacity-0 group-hover/mood:opacity-100 transition-opacity duration-500 pointer-events-none mood-pill-glow"
                  style={{
                    background: mood.gradient,
                    filter: "blur(24px)",
                  }}
                  aria-hidden
                />
                <button
                  onClick={() => onSearch(mood.query)}
                  className="relative z-10 rounded-full liquid-glass-strong overflow-visible border border-white/10 group-hover/mood:border-white/20 group-hover/mood:bg-white/5 text-white text-base sm:text-lg font-medium transition-all group-hover/mood:scale-[1.02] group-hover/mood:translate-y-[-2px] px-6 py-3.5 sm:px-8 sm:py-4 stagger-item cursor-pointer"
                  style={{ animationDelay: `${150 + i * 40}ms` }}
                >
                  {mood.label}
                </button>
              </div>
            ))}
          </div>
          <button
            onClick={() =>
              onSearch(
                SURPRISE_QUERIES[
                  Math.floor(Math.random() * SURPRISE_QUERIES.length)
                ],
              )
            }
            className="flex items-center gap-3 px-8 py-4 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 text-white text-lg font-medium transition-all shadow-lg shadow-purple-500/25 cursor-pointer"
          >
            <Sparkles className="w-6 h-6" />
            Surprise me
          </button>
        </section>

        {/* Pick of the Day */}
        {pickOfTheDay && (
          <section
            className="hidden animate-in fade-in slide-in-from-bottom-4 duration-500"
            style={{ animationDelay: "250ms" }}
          >
            <div className="py-6 mb-4">
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
    </div>
  );
}
