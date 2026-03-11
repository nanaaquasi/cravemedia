import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import { toSessionUser } from "@/app/api/auth/session/route";
import CollectionDetailClient from "./CollectionDetailClient";
import { ViewTracker } from "@/components/ViewTracker";
import { CRAVELIST_LABEL } from "@/config/labels";
import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();

  const { data: collection } = await supabase
    .from("collections")
    .select("name, description")
    .eq("id", id)
    .single();

  if (!collection) return {};

  const { data: items } = await supabase
    .from("collection_items")
    .select("image_url")
    .eq("collection_id", id)
    .limit(3);

  const posters = items?.map((i) => i.image_url).filter(Boolean) || [];

  const ogParams = new URLSearchParams();
  ogParams.set("title", collection.name);
    ogParams.set("type", CRAVELIST_LABEL);
  if (posters.length > 0) {
    ogParams.set("posters", posters.join(","));
  }

  const ogImage = {
    url: `/api/og?${ogParams.toString()}`,
    width: 1200,
    height: 630,
    alt: collection.name,
  };

  return {
    title: `${collection.name} - Craveo ${CRAVELIST_LABEL}`,
    description:
      collection.description ||
        `A custom media ${CRAVELIST_LABEL.toLowerCase()} on Craveo`,
    openGraph: {
      title: collection.name,
      description:
        collection.description ||
        `A custom media ${CRAVELIST_LABEL.toLowerCase()} on Craveo`,
      images: [ogImage],
    },
    twitter: {
      card: "summary_large_image",
      title: collection.name,
      description:
        collection.description ||
        `A custom media ${CRAVELIST_LABEL.toLowerCase()} on Craveo`,
      images: [ogImage],
    },
  };
}

export default async function CollectionDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ save?: string; saved?: string }>;
}) {
  const { id } = await params;
  const { save, saved } = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Do not redirect immediately, guest might be viewing a public collection

  // Fetch collection
  const { data: collection, error: collectionError } = await supabase
    .from("collections")
    .select("*")
    .eq("id", id)
    .single();

  if (collectionError || !collection) {
    notFound();
  }

  const isOwner = user ? collection.user_id === user.id : false;
  const isPublic = collection.is_public === true;

  // Ensure user owns the collection or it is public
  if (!isOwner && !isPublic) {
    if (!user) {
      redirect("/login");
    }
    notFound();
  }

  // If user is logged-in non-owner, check if they already cloned this collection
  let existingCloneId: string | null = null;
  if (user && !isOwner) {
    const { data: clone } = await supabase
      .from("collections")
      .select("id")
      .eq("user_id", user.id)
      .eq("cloned_from", id)
      .limit(1)
      .maybeSingle();
    existingCloneId = clone?.id ?? null;
  }

  // Fetch items, owner profile, content stats, and clone count in parallel
  const [itemsResult, ownerProfileResult, contentStatsResult, cloneCountResult] = await Promise.all([
    supabase
      .from("collection_items")
      .select("*")
      .eq("collection_id", id)
      .order("position", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: true }),
    !isOwner
      ? supabase
          .from("profiles")
          .select("username, full_name, avatar_url")
          .eq("id", collection.user_id)
          .single()
      : Promise.resolve({ data: null }),
    supabase
      .from("content_stats")
      .select("favorites_count, views_count")
      .eq("target_type", "collection")
      .eq("target_id", id)
      .maybeSingle(),
    supabase
      .from("collections")
      .select("*", { count: "exact", head: true })
      .eq("cloned_from", id),
  ]);

  if (itemsResult.error) {
    console.error("Error fetching collection items:", itemsResult.error);
  }

  const contentStats = contentStatsResult.data ?? {
    favorites_count: 0,
    views_count: 0,
  };
  const savesCount = cloneCountResult.count ?? 0;

  return (
    <>
      <ViewTracker targetType="collection" targetId={id} />
      <CollectionDetailClient
      collection={collection}
      items={itemsResult.data || []}
      isOwner={isOwner}
      isPublic={isPublic}
      user={toSessionUser(user)}
      saveOnLoad={save === "1"}
      savedToast={saved === "1"}
      existingCloneId={existingCloneId}
      ownerProfile={
        ownerProfileResult.data
          ? {
              username: ownerProfileResult.data.username,
              fullName: ownerProfileResult.data.full_name,
              avatarUrl: ownerProfileResult.data.avatar_url,
            }
          : undefined
      }
      contentStats={contentStats}
      savesCount={savesCount}
    />
    </>
  );
}
