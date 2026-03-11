"use client";

import { useState } from "react";
import { UserPlus, UserMinus, Loader2 } from "lucide-react";

interface FollowButtonProps {
  userId: string;
  initialIsFollowing: boolean;
  initialFollowersCount?: number;
  onFollowChange?: (isFollowing: boolean, newCount: number) => void;
}

export function FollowButton({
  userId,
  initialIsFollowing,
  initialFollowersCount = 0,
  onFollowChange,
}: FollowButtonProps) {
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [followersCount, setFollowersCount] = useState(initialFollowersCount);
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async () => {
    if (isLoading) return;

    const prevFollowing = isFollowing;
    const prevCount = followersCount;
    setIsFollowing(!prevFollowing);
    setFollowersCount(prevCount + (prevFollowing ? -1 : 1));
    setIsLoading(true);

    try {
      if (prevFollowing) {
        const res = await fetch(
          `/api/follow?following_id=${encodeURIComponent(userId)}`,
          { method: "DELETE" },
        );
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error ?? "Failed to unfollow");
        }
        onFollowChange?.(false, prevCount - 1);
      } else {
        const res = await fetch("/api/follow", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ following_id: userId }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error ?? "Failed to follow");
        }
        onFollowChange?.(true, prevCount + 1);
      }
    } catch {
      setIsFollowing(prevFollowing);
      setFollowersCount(prevCount);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={isLoading}
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm transition-colors cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed ${
        isFollowing
          ? "bg-white/10 hover:bg-white/15 text-white border border-white/20"
          : "bg-purple-500 hover:bg-purple-600 text-white border border-purple-500/50"
      }`}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : isFollowing ? (
        <UserMinus className="w-4 h-4" />
      ) : (
        <UserPlus className="w-4 h-4" />
      )}
      {isLoading ? "..." : isFollowing ? "Following" : "Follow"}
    </button>
  );
}
