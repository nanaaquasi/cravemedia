import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import CollectionDetailClient from "./CollectionDetailClient";
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
  ogParams.set("type", "Collection");
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
    title: `${collection.name} - Cravemedia Collection`,
    description:
      collection.description || "A custom media collection on Cravemedia",
    openGraph: {
      title: collection.name,
      description:
        collection.description || "A custom media collection on Cravemedia",
      images: [ogImage],
    },
    twitter: {
      card: "summary_large_image",
      title: collection.name,
      description:
        collection.description || "A custom media collection on Cravemedia",
      images: [ogImage],
    },
  };
}

export default async function CollectionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
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

  // Fetch items and owner profile in parallel
  const [itemsResult, ownerProfileResult] = await Promise.all([
    supabase
      .from("collection_items")
      .select("*")
      .eq("collection_id", id)
      .order("position", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false }),
    !isOwner
      ? supabase
          .from("profiles")
          .select("username, full_name, avatar_url")
          .eq("id", collection.user_id)
          .single()
      : Promise.resolve({ data: null }),
  ]);

  if (itemsResult.error) {
    console.error("Error fetching collection items:", itemsResult.error);
  }

  return (
    <CollectionDetailClient
      collection={collection}
      items={itemsResult.data || []}
      isOwner={isOwner}
      isPublic={isPublic}
      user={user}
      ownerProfile={
        ownerProfileResult.data
          ? {
              username: ownerProfileResult.data.username,
              fullName: ownerProfileResult.data.full_name,
              avatarUrl: ownerProfileResult.data.avatar_url,
            }
          : undefined
      }
    />
  );
}
