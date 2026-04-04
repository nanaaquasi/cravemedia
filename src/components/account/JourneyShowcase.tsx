"use client";

import { Play, Calendar, Star, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useRef } from "react";
import { useCanScroll } from "@/hooks/useCanScroll";

import { Tables } from "@/lib/supabase/database.types";

function getStatusLabel(status: string | null): string {
  switch (status) {
    case "in_progress":
      return "In progress";
    case "completed":
      return "Completed";
    case "wishlist":
      return "Saved";
    case "abandoned":
      return "Abandoned";
    default:
      return "Saved";
  }
}

function getStatusStyles(status: string | null): string {
  switch (status) {
    case "in_progress":
      return "bg-purple-500/20 text-purple-400 border-purple-500/30";
    case "completed":
      return "bg-green-500/20 text-green-400 border-green-500/30";
    case "abandoned":
      return "bg-zinc-500/20 text-zinc-400 border-zinc-500/30";
    default:
      return "bg-amber-500/20 text-amber-400 border-amber-500/30";
  }
}

interface JourneyShowcaseProps {
  journeys: Tables<"journeys">[];
  title?: string;
  description?: string;
  onViewAll?: () => void;
}

export function JourneyShowcase({
  journeys,
  title = "Journey History",
  description,
  onViewAll,
}: JourneyShowcaseProps) {
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

  if (journeys.length === 0) return null;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-4 gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Play className="w-5 h-5 text-purple-400 fill-current" />
              {title}
            </h2>
            {onViewAll && (
              <button
                onClick={onViewAll}
                className="text-sm text-zinc-400 hover:text-white transition-colors cursor-pointer whitespace-nowrap"
              >
                View All
              </button>
            )}
          </div>
          {description && (
            <p className="text-sm text-zinc-400">{description}</p>
          )}
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
        {journeys.map((journey) => {
          const items = (journey.items as any[]) || [];
          const currentPos = journey.current_position || 1;
          const currentStep =
            items.find((item: any) => item.position === currentPos) || items[0];
          const thumbnailUrl = currentStep?.posterUrl;

          return (
            <Link
              key={journey.id}
              href={`/journey/${journey.id}`}
              className="group relative bg-zinc-900/40 border border-white/5 rounded-2xl overflow-hidden hover:bg-zinc-900/60 transition-all hover:border-white/10 shrink-0 w-72 md:w-96 snap-start"
            >
              <div className="aspect-video relative bg-zinc-800">
                {thumbnailUrl ? (
                  <img
                    src={thumbnailUrl}
                    alt={journey.title}
                    className="absolute inset-0 w-full h-full object-cover opacity-50 group-hover:opacity-70 transition-opacity"
                  />
                ) : (
                  <div
                    className={`absolute inset-0 bg-gradient-to-br ${
                      journey.content_type === "movies"
                        ? "from-purple-900/50 to-blue-900/50"
                        : journey.content_type === "tv"
                          ? "from-pink-900/50 to-orange-900/50"
                          : "from-emerald-900/50 to-teal-900/50"
                    }`}
                  />
                )}

                <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-sm px-2 py-1 rounded-lg text-xs font-bold text-white flex items-center gap-1">
                  <Star className="w-3 h-3 text-yellow-500 fill-current" />
                  {journey.overall_rating != null
                  ? Number(journey.overall_rating).toFixed(1)
                  : "-"}
                </div>
              </div>

              <div className="p-4">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-md border ${getStatusStyles(
                      journey.status,
                    )}`}
                  >
                    {getStatusLabel(journey.status)}
                  </span>
                  <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
                    {journey.content_type}
                  </span>
                  <span className="text-zinc-600 text-xs">•</span>
                  <div
                    suppressHydrationWarning
                    className="flex items-center gap-1 text-zinc-500 text-xs"
                  >
                    <Calendar className="w-3 h-3" />
                    {journey.completed_at
                      ? new Date(journey.completed_at).toLocaleDateString()
                      : new Date(journey.created_at!).toLocaleDateString()}
                  </div>
                </div>

                <h3 className="text-lg font-bold text-white mb-1 line-clamp-1 group-hover:text-purple-400 transition-colors">
                  {journey.title}
                </h3>

                <p className="text-zinc-400 text-sm line-clamp-2 mb-3">
                  {journey.description}
                </p>

                <div className="flex items-center gap-2 text-xs text-zinc-500">
                  <span>{journey.total_items} items</span>
                  <span>•</span>
                  <span>
                    {Math.round((journey.total_runtime_minutes || 0) / 60)}h
                    watched
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
