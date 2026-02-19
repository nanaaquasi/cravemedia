import { Play, Calendar, Star } from "lucide-react";
import Link from "next/link";

interface JourneyShowcaseProps {
  journeys: Journey[];
  title?: string;
}

export function JourneyShowcase({
  journeys,
  title = "Journey History",
}: JourneyShowcaseProps) {
  if (journeys.length === 0) return null;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Play className="w-5 h-5 text-purple-400 fill-current" />
          {title}
        </h2>
        <Link
          href="/journeys"
          className="text-sm text-zinc-400 hover:text-white transition-colors"
        >
          View All
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {journeys.map((journey) => (
          <Link
            key={journey.id}
            href={`/journey/${journey.id}`}
            className="group relative bg-zinc-900/40 border border-white/5 rounded-2xl overflow-hidden hover:bg-zinc-900/60 transition-all hover:border-white/10"
          >
            <div className="aspect-video relative bg-zinc-800">
              {/* Placeholder for journey cover if we had one, or a gradient based on content type */}
              <div
                className={`absolute inset-0 bg-gradient-to-br ${
                  journey.content_type === "movies"
                    ? "from-purple-900/50 to-blue-900/50"
                    : journey.content_type === "tv"
                      ? "from-pink-900/50 to-orange-900/50"
                      : "from-emerald-900/50 to-teal-900/50"
                }`}
              />

              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="bg-white/10 backdrop-blur-md rounded-full p-3">
                  <Play className="w-6 h-6 text-white fill-current" />
                </div>
              </div>

              <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-sm px-2 py-1 rounded-lg text-xs font-bold text-white flex items-center gap-1">
                <Star className="w-3 h-3 text-yellow-500 fill-current" />
                {journey.overall_rating || "-"}
              </div>
            </div>

            <div className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
                  {journey.content_type}
                </span>
                <span className="text-zinc-600 text-xs">•</span>
                <div className="flex items-center gap-1 text-zinc-500 text-xs">
                  <Calendar className="w-3 h-3" />
                  {new Date(journey.completed_at!).toLocaleDateString()}
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
        ))}
      </div>
    </div>
  );
}
