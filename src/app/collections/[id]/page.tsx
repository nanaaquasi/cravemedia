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

  return {
    title: `${collection.name} - Cravemedia Collection`,
    description:
      collection.description || "A custom media collection on Cravemedia",
    openGraph: {
      title: collection.name,
      description:
        collection.description || "A custom media collection on Cravemedia",
      images: [`/api/og?${ogParams.toString()}`],
    },
    twitter: {
      card: "summary_large_image",
      title: collection.name,
      description:
        collection.description || "A custom media collection on Cravemedia",
      images: [`/api/og?${ogParams.toString()}`],
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

  // Fetch items in the collection
  const { data: items, error: itemsError } = await supabase
    .from("collection_items")
    .select("*")
    .eq("collection_id", id)
    .order("position", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (itemsError) {
    console.error("Error fetching collection items:", itemsError);
  }

  return (
    <CollectionDetailClient
      collection={collection}
      items={items || []}
      isOwner={isOwner}
      isPublic={isPublic}
    />
  );
}
