import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import CollectionDetailClient from "./CollectionDetailClient";

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

  if (!user) {
    redirect("/login");
  }

  // Fetch collection
  const { data: collection, error: collectionError } = await supabase
    .from("collections")
    .select("*")
    .eq("id", id)
    .single();

  if (collectionError || !collection) {
    notFound();
  }

  // Ensure user owns the collection (for now, collections are private by default in this context)
  if (collection.user_id !== user.id) {
    notFound();
  }

  // Fetch items in the collection
  const { data: items, error: itemsError } = await supabase
    .from("collection_items")
    .select("*")
    .eq("collection_id", id)
    .order("created_at", { ascending: false });

  if (itemsError) {
    console.error("Error fetching collection items:", itemsError);
  }

  return <CollectionDetailClient collection={collection} items={items || []} />;
}
