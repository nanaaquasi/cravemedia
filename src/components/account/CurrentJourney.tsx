import { Journey } from "@/components/account/queries";
import { Play, ArrowRight } from "lucide-react";
import Link from "next/link";
import type { JourneyItem } from "@/lib/types";

interface CurrentJourneyProps {
  journey: Journey;
}

export function CurrentJourney({ journey }: CurrentJourneyProps) {
  // Use actual completed count from journey_progress to match detail page
  const completedCount =
    journey.journey_progress?.filter((p) => p.status === "completed").length ??
    Math.max(0, (journey.current_position ?? 1) - 1);
  const totalItems = journey.total_items || 1;
  const progress = totalItems > 0 ? (completedCount / totalItems) * 100 : 0;

  const items = (journey.items as unknown as JourneyItem[]) || [];
  const currentPosition = journey.current_position ?? 1;
  const currentItem = items.find((i) => i.position === currentPosition);
  const currentLabel =
    currentItem?.type === "book"
      ? "Currently reading"
      : "Currently watching";

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Play className="w-5 h-5 text-green-400 fill-current" />
          Current Journey
        </h2>
      </div>

      <div className="bg-gradient-to-br from-zinc-900 to-zinc-900/50 border border-white/10 rounded-3xl p-6 md:p-8 relative overflow-hidden group">
        {/* Background Pattern */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-green-500/10 rounded-full blur-3xl group-hover:bg-green-500/20 transition-all duration-700" />

        <div className="relative z-10">
          <div className="flex flex-col md:flex-row gap-6 md:items-center justify-between mb-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="px-3 py-1 rounded-full bg-green-500/20 text-green-400 text-xs font-bold uppercase tracking-wider border border-green-500/20">
                  {journey.content_type}
                </span>
                <p
                  suppressHydrationWarning
                  className="text-zinc-500 text-sm flex items-center gap-1"
                >
                  Started {new Date(journey.started_at!).toLocaleDateString()}
                </p>
              </div>
              <h3 className="text-2xl md:text-3xl font-bold text-white mb-2">
                {journey.title}
              </h3>
              {currentItem && (
                <p className="text-sm text-green-400/90 font-medium mb-1">
                  {currentLabel}: {currentItem.title}
                </p>
              )}
              <p className="text-zinc-400 max-w-xl line-clamp-2">
                {journey.description}
              </p>
            </div>

            <Link
              href={`/journey/${journey.id}`}
              className="flex items-center gap-2 bg-white text-black px-6 py-3 rounded-xl font-bold hover:bg-zinc-200 transition-colors whitespace-nowrap"
            >
              Continue Journey
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-zinc-400 font-medium">Progress</span>
              <span className="text-white font-bold">
                {Math.round(progress)}% ({completedCount} / {journey.total_items})
              </span>
            </div>
            <div className="h-3 bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-green-400 to-emerald-500 rounded-full transition-all duration-1000 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
