import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AccountView } from "@/components/account/AccountView";

export default async function AccountPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch Profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  // Fetch stats
  // (Using count: 'exact', head: true doesn't return data, so we need separate queries if we want the count value)
  const { count: followingCount } = await supabase
    .from("follows")
    .select("*", { count: "exact", head: true })
    .eq("follower_id", user.id);

  const { count: followersCount } = await supabase
    .from("follows")
    .select("*", { count: "exact", head: true })
    .eq("following_id", user.id);

  // Fetch collections
  const { data: collections } = await supabase
    .from("collections")
    .select("*, collection_items(image_url)")
    .eq("user_id", user.id)
    .limit(10);

  // Transform collections to match expected type (items array)
  const formattedCollections =
    collections?.map((c) => ({
      ...c,
      items: c.collection_items || [],
      item_count: c.collection_items?.length || 0,
    })) || [];

  return (
    <AccountView
      profile={profile}
      email={user.email}
      collections={formattedCollections}
      stats={{
        followers: followersCount || 0,
        following: followingCount || 0,
      }}
    />
  );
}
