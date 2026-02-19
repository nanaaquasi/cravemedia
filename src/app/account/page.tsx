import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AccountView } from "@/components/account/AccountView";
import {
  ProfileDashboardData,
  getDefaultStats,
  Activity,
  Journey,
} from "@/components/account/queries";
import { Collection } from "@/lib/supabase/types";

export default async function AccountPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const userId = user.id;

  // Fetch everything in parallel
  const [
    { data: profile },
    { data: stats },
    { data: currentJourney },
    { data: completedJourneys },
    { data: wishlistJourneys },
    { data: achievements },
    { data: recentActivity },
    { count: followersCount },
    { count: followingCount },
    { data: followingRefs },
    { data: collections },
  ] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userId).single(),
    supabase.from("user_stats").select("*").eq("user_id", userId).single(),
    supabase
      .from("journeys")
      .select("*, journey_progress(*)")
      .eq("user_id", userId)
      .eq("status", "in_progress")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("journeys")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "completed")
      .order("completed_at", { ascending: false })
      .limit(12),
    supabase
      .from("journeys")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "wishlist")
      .order("created_at", { ascending: false })
      .limit(12),
    supabase
      .from("user_achievements")
      .select("*")
      .eq("user_id", userId)
      .order("unlocked_at", { ascending: false }),
    supabase
      .from("activities")
      .select("*, profiles(username, avatar_url)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("follows")
      .select("*", { count: "exact", head: true })
      .eq("following_id", userId),
    supabase
      .from("follows")
      .select("*", { count: "exact", head: true })
      .eq("follower_id", userId),
    supabase.from("follows").select("following_id").eq("follower_id", userId),
    supabase
      .from("collections")
      .select("*, collection_items(image_url)")
      .eq("user_id", userId)
      .limit(10),
  ]);

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

  const dashboardData: ProfileDashboardData = {
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

  // Transform collections to match expected type (items array)
  const formattedCollections: Collection[] =
    collections?.map((c) => ({
      ...c,
      items: (c.collection_items as { image_url: string | null }[]) || [],
      item_count: c.collection_items?.length || 0,
    })) || [];

  return (
    <AccountView
      profile={profile}
      email={user.email}
      initialCollections={formattedCollections}
      initialDashboardData={dashboardData}
    />
  );
}
