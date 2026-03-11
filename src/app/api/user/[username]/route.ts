import { createClient } from "@/lib/supabase/server";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> },
) {
  const { username } = await params;

  if (!username) {
    return NextResponse.json(
      { error: "Missing username" },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("username", username)
    .single();

  if (!profile) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const userId = profile.id;

  const [
    { data: stats },
    { count: followersCount },
    { count: followingCount },
    { data: isFollowingRow },
    { data: favorites },
    { data: recentActivity },
    { data: publicCollections },
    { data: publicJourneys },
    { data: recentlyFinished },
    { data: recentlyReviewed },
  ] = await Promise.all([
    supabase.from("user_stats").select("*").eq("user_id", userId).single(),
    supabase
      .from("follows")
      .select("*", { count: "exact", head: true })
      .eq("following_id", userId),
    supabase
      .from("follows")
      .select("*", { count: "exact", head: true })
      .eq("follower_id", userId),
    currentUser
      ? supabase
          .from("follows")
          .select("follower_id")
          .eq("follower_id", currentUser.id)
          .eq("following_id", userId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from("favorites")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(12),
    supabase
      .from("activities")
      .select("*, profiles(username, avatar_url)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("collections")
      .select("*, collection_items(image_url)")
      .eq("user_id", userId)
      .eq("is_public", true)
      .eq("is_explicitly_saved", true)
      .limit(10),
    supabase
      .from("journeys")
      .select("*")
      .eq("user_id", userId)
      .eq("is_public", true)
      .eq("is_explicitly_saved", true)
      .order("updated_at", { ascending: false })
      .limit(12),
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

  const formattedCollections =
    publicCollections?.map((c) => ({
      ...c,
      items: (c.collection_items as { image_url: string | null }[]) || [],
      item_count: c.collection_items?.length || 0,
    })) ?? [];

  return NextResponse.json({
    profile,
    stats: stats || null,
    followersCount: followersCount ?? 0,
    followingCount: followingCount ?? 0,
    isFollowing: !!isFollowingRow,
    favorites: favorites ?? [],
    recentActivity: recentActivity ?? [],
    collections: formattedCollections,
    journeys: publicJourneys ?? [],
    recentlyFinished: recentlyFinished ?? [],
    recentlyReviewed: recentlyReviewed ?? [],
  });
}
