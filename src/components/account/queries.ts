import { createClient } from "@/lib/supabase/client";
import { Database } from "@/lib/supabase/database.types";

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type UserStats = Database["public"]["Tables"]["user_stats"]["Row"];
export type Journey = Database["public"]["Tables"]["journeys"]["Row"] & {
  journey_progress?: Database["public"]["Tables"]["journey_progress"]["Row"][];
};
export type Activity = Database["public"]["Tables"]["activities"]["Row"] & {
  profiles?: {
    username: string | null;
    avatar_url: string | null;
  } | null;
};
export type UserAchievement =
  Database["public"]["Tables"]["user_achievements"]["Row"];

export interface ProfileDashboardData {
  profile: Profile | null;
  stats: UserStats;
  currentJourney: Journey | null;
  completedJourneys: Journey[];
  wishlistJourneys: Journey[];
  achievements: UserAchievement[];
  recentActivity: Activity[];
  followersCount: number;
  followingCount: number;
  friendsActivity: Activity[];
}

export async function getProfileDashboardData(
  userId: string,
): Promise<ProfileDashboardData> {
  // Use absolute URL for server-side fetching if needed, but this runs on client (mostly) or server components.
  // If running on server component, we need absolute URL. If client, relative is fine.
  // However, `AccountView` calls this. `AccountView` is "use client".
  // So fetch('/api/...') is fine.

  try {
    const response = await fetch(`/api/account/dashboard?userId=${userId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      // cache: 'no-store' // ensure fresh data or remove to use default caching
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch dashboard data: ${response.statusText}`);
    }

    const data = await response.json();
    return data as ProfileDashboardData;
  } catch (error) {
    console.error("Error in getProfileDashboardData:", error);
    // Return empty structure on error to prevent unnecessary crashes
    return {
      profile: null,
      stats: getDefaultStats(userId),
      currentJourney: null,
      completedJourneys: [],
      wishlistJourneys: [],
      achievements: [],
      recentActivity: [],
      followersCount: 0,
      followingCount: 0,
      friendsActivity: [],
    } as ProfileDashboardData;
  }
}

function getDefaultStats(userId: string): UserStats {
  return {
    user_id: userId,
    total_journeys_completed: 0,
    total_journeys_in_progress: 0,
    total_items_watched: 0,
    total_hours_watched: 0,
    current_streak_days: 0,
    longest_streak_days: 0,
    journey_completion_rate: 0,
    total_badges_unlocked: 0,
    average_journey_rating: 0,
    average_item_rating: 0,
    top_genres: [],
    last_activity_date: null,
    updated_at: new Date().toISOString(),
  };
}

// Real-time subscription for activity updates
export function subscribeToUserActivity(
  userId: string,
  callback: (activity: Activity) => void,
) {
  const supabase = createClient();
  return supabase
    .channel(`user-activity-${userId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "activities",
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        callback(payload.new as Activity);
      },
    )
    .subscribe();
}
