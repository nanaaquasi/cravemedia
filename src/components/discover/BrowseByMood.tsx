"use client";

import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { MOOD_CARDS, SURPRISE_QUERIES } from "@/config/home-sections";

export function BrowseByMood() {
  const router = useRouter();

  const handleSearch = (query: string) => {
    router.push(`/?q=${encodeURIComponent(query)}`);
  };

  return (
    <section className="mb-12">
      <h2 className="text-2xl font-bold text-white mb-2">Browse by Mood</h2>
      <p className="text-zinc-400 text-sm mb-6">
        No doomscrolling. Recommendations that actually match your vibe.
      </p>
      <div className="flex flex-wrap gap-2 sm:gap-3 mb-6">
        {MOOD_CARDS.map((mood) => (
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
              onClick={() => handleSearch(mood.query)}
              className="relative z-10 rounded-full liquid-glass-strong overflow-visible border border-white/10 group-hover/mood:border-white/20 group-hover/mood:bg-white/5 text-white text-base sm:text-lg font-medium transition-all group-hover/mood:scale-[1.02] group-hover/mood:translate-y-[-2px] px-6 py-3.5 sm:px-8 sm:py-4 cursor-pointer"
            >
              {mood.label}
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() =>
          handleSearch(
            SURPRISE_QUERIES[
              Math.floor(Math.random() * SURPRISE_QUERIES.length)
            ],
          )
        }
        className="flex items-center gap-3 px-8 py-4 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 text-white text-lg font-medium transition-all shadow-lg shadow-purple-500/25"
      >
        <Sparkles className="w-6 h-6" />
        Surprise me
      </button>
    </section>
  );
}
