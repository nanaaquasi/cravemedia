import { Activity } from "@/components/account/queries";
import { formatDistanceToNow } from "date-fns";
import { Play, CheckCircle, Star, MessageSquare, Award } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

interface ActivityFeedProps {
  activities: Activity[];
  friendsActivity?: Activity[];
  /** When set, show only this many items (e.g. 5 for preview) and add View All */
  limit?: number;
  /** Called when View All is clicked - e.g. to switch to Activity tab */
  onViewAll?: () => void;
}

export function ActivityFeed({
  activities,
  limit,
  onViewAll,
}: ActivityFeedProps) {
  if (activities.length === 0) return null;

  const displayed = limit ? activities.slice(0, limit) : activities;
  const hasMore = limit != null && activities.length > limit;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <ActivityIcon className="w-5 h-5 text-blue-400" />
          Recent Activity
        </h2>
        {hasMore && onViewAll && (
          <button
            onClick={onViewAll}
            className="text-sm text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            View All
          </button>
        )}
      </div>

      <div className="space-y-4">
        {displayed.map((activity) => (
          <ActivityItem key={activity.id} activity={activity} />
        ))}
      </div>
    </div>
  );
}

function ActivityIcon({ className }: { className?: string }) {
  // SVG for activity icon (using Lucide directly in usage)
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  );
}

function ActivityItem({ activity }: { activity: Activity }) {
  const meta = activity.metadata as any;

  let icon = <Play className="w-4 h-4 text-blue-400" />;
  let bgColor = "bg-blue-500/10";
  let content = null;

  switch (activity.activity_type) {
    case "journey_started":
      icon = <Play className="w-4 h-4 text-green-400" />;
      bgColor = "bg-green-500/10";
      content = (
        <p className="text-zinc-300 text-sm">
          Started journey{" "}
          <span className="text-white font-medium">"{meta?.title}"</span>
        </p>
      );
      break;
    case "journey_completed":
      icon = <Award className="w-4 h-4 text-yellow-400" />;
      bgColor = "bg-yellow-500/10";
      content = (
        <div className="space-y-1">
          <p className="text-zinc-300 text-sm">
            Completed journey{" "}
            <span className="text-white font-medium">"{meta?.title}"</span>
          </p>
          {activity.rating && (
            <div className="flex items-center gap-1 text-yellow-500 text-xs">
              <Star className="w-3 h-3 fill-current" />
              <span>{Number(activity.rating).toFixed(1)}</span>
            </div>
          )}
        </div>
      );
      break;
    case "item_completed":
      icon = <CheckCircle className="w-4 h-4 text-purple-400" />;
      bgColor = "bg-purple-500/10";
      content = (
        <div className="space-y-2">
          <p className="text-zinc-300 text-sm">
            Watched{" "}
            <span className="text-white font-medium">
              "{activity.item_title}"
            </span>
          </p>
          {activity.review_text && (
            <div className="bg-zinc-800/50 p-2 rounded-lg text-zinc-400 text-xs italic border border-white/5">
              "{activity.review_text}"
            </div>
          )}
        </div>
      );
      break;
    default:
      content = <p className="text-zinc-300 text-sm">Unknown activity</p>;
  }

  return (
    <div className="flex gap-4 p-4 rounded-xl bg-zinc-900/20 border border-white/5 hover:bg-zinc-900/40 transition-colors">
      <div
        className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${bgColor}`}
      >
        {icon}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-medium text-zinc-500">
            {activity.activity_type.replace("_", " ").toUpperCase()}
          </span>
          <span className="text-xs text-zinc-600">
            {formatDistanceToNow(new Date(activity.created_at!), {
              addSuffix: true,
            })}
          </span>
        </div>

        {content}
      </div>
    </div>
  );
}
