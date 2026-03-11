import { createClient } from "@/lib/supabase/server";
import { type NextRequest, NextResponse } from "next/server";
import {
  Activity,
  Journey,
  UserStats,
  ProfileDashboardData,
} from "@/components/account/queries";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const userId = searchParams.get("userId");

  if (!userId) {
    return NextResponse.json(
      { error: "Missing userId parameter" },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (user.id !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {

    // 1. Get user profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    // 2. Get user stats
    const { data: stats } = await supabase
      .from("user_stats")
      .select("*")
      .eq("user_id", userId)
      .single();

    // 3. Get current journey (in progress)
    const { data: currentJourney } = await supabase
      .from("journeys")
      .select("*, journey_progress(*)")
      .eq("user_id", userId)
      .eq("status", "in_progress")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // 4. Get completed journeys
    const { data: completedJourneys } = await supabase
      .from("journeys")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "completed")
      .order("completed_at", { ascending: false })
      .limit(12);

    // 4b. Get wishlist journeys (saved but not started)
    const { data: wishlistJourneys } = await supabase
      .from("journeys")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "wishlist")
      .order("created_at", { ascending: false })
      .limit(12);

    // 5. Get achievements
    const { data: achievements } = await supabase
      .from("user_achievements")
      .select("*")
      .eq("user_id", userId)
      .order("unlocked_at", { ascending: false });

    // 6. Get recent activity
    const { data: recentActivity } = await supabase
      .from("activities")
      .select("*, profiles(username, avatar_url)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(10);

    // 7. Get followers/following count
    const { count: followersCount } = await supabase
      .from("follows")
      .select("*", { count: "exact", head: true })
      .eq("following_id", userId);

    const { count: followingCount } = await supabase
      .from("follows")
      .select("*", { count: "exact", head: true })
      .eq("follower_id", userId);

    // 8. Get friends activity (people you follow)
    // First get followed user IDs
    const { data: followingRefs } = await supabase
      .from("follows")
      .select("following_id")
      .eq("follower_id", userId);

    let friendsActivity: Activity[] = [];

    if (followingRefs && followingRefs.length > 0) {
      const followingIds = followingRefs.map((f) => f.following_id);
      const { data: friendsActivityData } = await supabase
        .from("activities")
        .select("*, profiles(username, avatar_url)")
        .in("user_id", followingIds)
        .order("created_at", { ascending: false })
        .limit(10);

      if (friendsActivityData) {
        friendsActivity = friendsActivityData as unknown as Activity[];
      }
    }

    const responseData: ProfileDashboardData = {
      profile: profile || null,
      stats: stats || getDefaultStats(userId),
      currentJourney: currentJourney as unknown as Journey,
      completedJourneys: (completedJourneys as unknown as Journey[]) || [],
      wishlistJourneys: (wishlistJourneys as unknown as Journey[]) || [],
      achievements: achievements || [],
      recentActivity: (recentActivity as unknown as Activity[]) || [],
      followersCount: followersCount || 0,
      followingCount: followingCount || 0,
      friendsActivity: friendsActivity,
    };

    return NextResponse.json(responseData);
  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard data" },
      { status: 500 },
    );
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
    total_favorites: 0,
    average_journey_rating: 0,
    average_item_rating: 0,
    top_genres: [],
    last_activity_date: null,
    updated_at: new Date().toISOString(),
  };
}
