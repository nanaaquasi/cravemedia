"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function toggleCollectionVisibility(
  collectionId: string,
  isPublic: boolean,
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be logged in." };
  }

  const { error } = await supabase
    .from("collections")
    .update({ is_public: isPublic })
    .eq("id", collectionId)
    .eq("user_id", user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/collections/${collectionId}`);
  revalidatePath("/account");
  return { success: true };
}

export async function updateCollection(
  collectionId: string,
  data: { name: string; description: string | null },
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be logged in to edit." };
  }

  const name = data.name.trim();
  if (!name) {
    return { error: "Name is required." };
  }

  const { error } = await supabase
    .from("collections")
    .update({
      name,
      description: data.description?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", collectionId)
    .eq("user_id", user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/collections/${collectionId}`);
  revalidatePath("/account");
  return { success: true };
}

export async function cloneCollection(collectionId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be logged in to clone a collection." };
  }

  // Fetch the collection to clone
  const { data: collectionToClone, error: fetchError } = await supabase
    .from("collections")
    .select("*, collection_items(*)")
    .eq("id", collectionId)
    .single();

  if (fetchError || !collectionToClone) {
    return { error: fetchError?.message || "Collection not found" };
  }

  // Ensure it's public or belongs to user
  if (!collectionToClone.is_public && collectionToClone.user_id !== user.id) {
    return { error: "You do not have permission to clone this collection." };
  }

  const { data: newCollection, error: insertError } = await supabase
    .from("collections")
    .insert({
      user_id: user.id,
      name: collectionToClone.name,
      description: collectionToClone.description ?? null,
      is_public: false,
    })
    .select("id")
    .single();

  if (insertError || !newCollection) {
    return { error: insertError?.message || "Failed to clone collection." };
  }

  // Insert the items
  if (
    collectionToClone.collection_items &&
    collectionToClone.collection_items.length > 0
  ) {
    const itemsToInsert = collectionToClone.collection_items.map(
      (item: any) => ({
        collection_id: newCollection.id,
        media_id: item.media_id,
        media_type: item.media_type,
        image_url: item.image_url,
        title: item.title,
        metadata: item.metadata,
        position: item.position,
      }),
    );

    const { error: itemsError } = await supabase
      .from("collection_items")
      .insert(itemsToInsert);

    if (itemsError) {
      console.error("Error cloning collection items:", itemsError);
      // We still return success but maybe some items failed
    }
  }

  revalidatePath("/account");
  return { success: true, newCollectionId: newCollection.id };
}

export async function reorderCollectionItems(
  collectionId: string,
  orderedItemIds: string[],
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be logged in to reorder." };
  }

  // Verify ownership
  const { data: collection, error: fetchError } = await supabase
    .from("collections")
    .select("user_id")
    .eq("id", collectionId)
    .single();

  if (fetchError || !collection) {
    return { error: "Collection not found" };
  }

  if (collection.user_id !== user.id) {
    return { error: "You do not have permission to reorder this collection." };
  }

  // Batch update positions
  // Supabase JS doesn't have a single bulk update with different values easily without RPC,
  // so we'll do promise.all for small lists, or an RPC. Given typical list sizes (< 100), Promise.all is fine.
  const updates = orderedItemIds.map((id, index) => {
    return supabase
      .from("collection_items")
      .update({ position: index })
      .eq("id", id)
      .eq("collection_id", collectionId);
  });

  await Promise.all(updates);

  revalidatePath(`/collections/${collectionId}`);
  return { success: true };
}
