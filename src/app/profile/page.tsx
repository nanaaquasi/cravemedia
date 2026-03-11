import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AccountView } from "@/components/account/AccountView";
import {
  ProfileDashboardData,
  getDefaultStats,
  Activity,
  Journey,
} from "@/components/account/queries";
import { Collection, CollectionItem } from "@/lib/supabase/types";

export default async function ProfilePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const userId = user.id;

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
    { data: inProgressItems },
    { data: recentlyFinished },
    { data: recentlyReviewed },
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
      .eq("is_explicitly_saved", true)
      .order("completed_at", { ascending: false })
      .limit(12),
    supabase
      .from("journeys")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "wishlist")
      .eq("is_explicitly_saved", true)
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
      .limit(50),
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
      .eq("is_explicitly_saved", true)
      .limit(10),
    supabase
      .from("collection_items")
      .select("*, collections!inner(user_id, name)")
      .eq("collections.user_id", userId)
      .eq("status", "watching")
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("collection_items")
      .select("id, media_id, media_type, title, image_url, finished_at, item_rating, collections!inner(user_id)")
      .eq("collections.user_id", userId)
      .eq("status", "watched")
      .not("finished_at", "is", null)
      .order("finished_at", { ascending: false })
      .limit(6),
    supabase
      .from("collection_items")
      .select("id, media_id, media_type, title, image_url, item_rating, created_at, collections!inner(user_id)")
      .eq("collections.user_id", userId)
      .not("review_text", "is", null)
      .order("created_at", { ascending: false })
      .limit(6),
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

  const formattedCollections: Collection[] =
    collections?.map((c) => ({
      ...c,
      items: (c.collection_items as { image_url: string | null }[]) || [],
      item_count: c.collection_items?.length || 0,
    })) || [];

  const isEmpty =
    !currentJourney &&
    (completedJourneys?.length ?? 0) === 0 &&
    (wishlistJourneys?.length ?? 0) === 0 &&
    (collections?.length ?? 0) === 0;

  let featuredJourneys: Journey[] = [];
  let featuredCollectionsForGetStarted: (Collection & {
    items?: { image_url: string | null }[];
    item_count?: number;
    curator_first_name?: string | null;
  })[] = [];

  if (isEmpty) {
    const [journeysRes, collectionsRes] = await Promise.all([
      supabase
        .from("journeys")
        .select(
          "id, title, description, query, content_type, items, total_items, total_runtime_minutes, overall_rating, status, current_position, created_at, updated_at, completed_at, forked_count"
        )
        .eq("is_public", true)
        .order("forked_count", { ascending: false })
        .order("overall_rating", { ascending: false, nullsFirst: false })
        .order("updated_at", { ascending: false })
        .limit(6),
      supabase
        .from("collections")
        .select(
          "*, collection_items(image_url), profiles:user_id(username, full_name)"
        )
        .eq("is_public", true)
        .order("updated_at", { ascending: false })
        .limit(6),
    ]);

    featuredJourneys = (journeysRes.data as unknown as Journey[]) ?? [];
    const rawCollections = collectionsRes.data ?? [];
    featuredCollectionsForGetStarted = rawCollections.map((c: Record<string, unknown>) => {
      const profileData = c.profiles as {
        username?: string | null;
        full_name?: string | null;
      } | null;
      const fullName = profileData?.full_name?.trim();
      const username = profileData?.username?.trim();
      const firstName = fullName
        ? fullName.split(/\s+/)[0]
        : username ?? null;
      const items = (c.collection_items as { image_url: string | null }[]) ?? [];
      return {
        ...c,
        curator_first_name: firstName,
        curator_username: username ?? null,
        items: items.map((i) => ({ image_url: i.image_url })),
        item_count: items.length,
      };
    }) as unknown as (Collection & {
      items?: { image_url: string | null }[];
      item_count?: number;
      curator_first_name?: string | null;
    })[];
  }

  const isNewUser =
    user.created_at &&
    Date.now() - new Date(user.created_at).getTime() < 48 * 60 * 60 * 1000;

  return (
    <AccountView
      profile={profile}
      email={user.email}
      initialCollections={formattedCollections}
      initialDashboardData={dashboardData}
      inProgressItems={(inProgressItems as unknown as CollectionItem[]) || []}
      featuredJourneys={featuredJourneys}
      featuredCollections={featuredCollectionsForGetStarted}
      isNewUser={!!isNewUser}
      recentlyFinished={(recentlyFinished as { id: string; media_id: string; media_type: string; title: string | null; image_url: string | null; finished_at: string | null; item_rating: number | null }[]) || []}
      recentlyReviewed={(recentlyReviewed as { id: string; media_id: string; media_type: string; title: string | null; image_url: string | null; item_rating: number | null; created_at: string | null }[]) || []}
    />
  );
}
