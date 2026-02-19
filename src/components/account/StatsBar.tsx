import { UserStats } from "@/components/account/queries";
import { Flame, Trophy, PlayCircle, Clock } from "lucide-react";

interface StatsBarProps {
  stats: UserStats;
}

export function StatsBar({ stats }: StatsBarProps) {
  const items = [
    {
      label: "Current Streak",
      value: `${stats.current_streak_days} days`,
      icon: Flame,
      color: "text-orange-500",
      bg: "bg-orange-500/10",
    },
    {
      label: "Journeys Completed",
      value: stats.total_journeys_completed,
      icon: Trophy,
      color: "text-yellow-500",
      bg: "bg-yellow-500/10",
    },
    {
      label: "Items Watched",
      value: stats.total_items_watched,
      icon: PlayCircle,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
    },
    {
      label: "Hours Watched",
      value: Math.round(stats.total_hours_watched || 0),
      icon: Clock,
      color: "text-purple-500",
      bg: "bg-purple-500/10",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      {items.map((item) => (
        <div
          key={item.label}
          className="bg-zinc-900/40 border border-white/5 rounded-2xl p-4 flex items-center gap-4"
        >
          <div className={`p-3 rounded-xl ${item.bg} ${item.color}`}>
            <item.icon className="w-5 h-5" />
          </div>
          <div>
            <p className="text-zinc-500 text-xs font-medium uppercase tracking-wider">
              {item.label}
            </p>
            <p className="text-xl font-bold text-white font-mono">
              {item.value}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
