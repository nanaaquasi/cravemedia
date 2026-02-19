import { Film, Activity, UserPlus, Play } from "lucide-react";
import Link from "next/link";

export function NoJourneysEmptyState() {
  return (
    <div className="text-center py-16 px-4 bg-zinc-900/20 rounded-3xl border border-white/5">
      <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-full flex items-center justify-center border border-white/5">
        <Film className="w-10 h-10 text-purple-400" />
      </div>

      <h3 className="text-xl font-bold text-white mb-2">
        Start Your First Journey
      </h3>

      <p className="text-zinc-400 mb-8 max-w-md mx-auto">
        Discover personalized paths through movies, TV shows, and books. Each
        recommendation builds on the last.
      </p>

      <div className="flex gap-3 justify-center">
        <Link
          href="/search"
          className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-purple-700 hover:to-blue-700 transition-all flex items-center gap-2"
        >
          <Play className="w-4 h-4 fill-current" />
          Create a Journey
        </Link>
      </div>
    </div>
  );
}

export function NoActivityEmptyState() {
  return (
    <div className="text-center py-12 px-4 bg-zinc-900/20 rounded-2xl border border-white/5">
      <div className="w-16 h-16 mx-auto mb-4 bg-blue-500/10 rounded-full flex items-center justify-center">
        <Activity className="w-8 h-8 text-blue-500" />
      </div>

      <h3 className="text-lg font-semibold text-white mb-2">No activity yet</h3>

      <p className="text-zinc-500 text-sm mb-4">
        Start watching and your activity will appear here
      </p>
    </div>
  );
}

export function NoFriendsEmptyState() {
  return (
    <div className="text-center py-12 px-4 bg-zinc-900/20 rounded-2xl border border-white/5">
      <div className="w-16 h-16 mx-auto mb-4 bg-emerald-500/10 rounded-full flex items-center justify-center">
        <UserPlus className="w-8 h-8 text-emerald-500" />
      </div>

      <h3 className="text-lg font-semibold text-white mb-2">
        Connect with friends
      </h3>

      <p className="text-zinc-500 text-sm mb-4 max-w-sm mx-auto">
        Follow friends to see what they're watching and discover new journeys
        together
      </p>

      <button className="text-emerald-400 hover:text-emerald-300 text-sm font-medium transition-colors">
        Find Friends →
      </button>
    </div>
  );
}
