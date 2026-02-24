"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { CRAVELIST_LABEL } from "@/config/labels";

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
    return { error: `You must be logged in to clone a ${CRAVELIST_LABEL.toLowerCase()}.` };
  }

  // Fetch the collection to clone
  const { data: collectionToClone, error: fetchError } = await supabase
    .from("collections")
    .select("*, collection_items(*)")
    .eq("id", collectionId)
    .single();

  if (fetchError || !collectionToClone) {
    return { error: fetchError?.message || `${CRAVELIST_LABEL} not found` };
  }

  // Ensure it's public or belongs to user
  if (!collectionToClone.is_public && collectionToClone.user_id !== user.id) {
    return { error: `You do not have permission to clone this ${CRAVELIST_LABEL.toLowerCase()}.` };
  }

  // If user already cloned this collection, return existing clone (no duplicate)
  const { data: existingClone } = await supabase
    .from("collections")
    .select("id")
    .eq("user_id", user.id)
    .eq("cloned_from", collectionId)
    .limit(1)
    .maybeSingle();

  if (existingClone) {
    revalidatePath("/account");
    return { success: true, newCollectionId: existingClone.id };
  }

  const { data: newCollection, error: insertError } = await supabase
    .from("collections")
    .insert({
      user_id: user.id,
      name: collectionToClone.name,
      description: collectionToClone.description ?? null,
      is_public: false,
      cloned_from: collectionId,
    })
    .select("id")
    .single();

  if (insertError || !newCollection) {
    return { error: insertError?.message || `Failed to clone ${CRAVELIST_LABEL.toLowerCase()}.` };
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
    return { error: `${CRAVELIST_LABEL} not found` };
  }

  if (collection.user_id !== user.id) {
    return { error: `You do not have permission to reorder this ${CRAVELIST_LABEL.toLowerCase()}.` };
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

export async function deleteCollection(collectionId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be logged in to delete." };
  }

  const { data: collection, error: fetchError } = await supabase
    .from("collections")
    .select("user_id")
    .eq("id", collectionId)
    .single();

  if (fetchError || !collection) {
    return { error: `${CRAVELIST_LABEL} not found` };
  }

  if (collection.user_id !== user.id) {
    return { error: `You do not have permission to delete this ${CRAVELIST_LABEL.toLowerCase()}.` };
  }

  await supabase.from("collection_items").delete().eq("collection_id", collectionId);
  const { error } = await supabase
    .from("collections")
    .delete()
    .eq("id", collectionId)
    .eq("user_id", user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/account");
  return { success: true };
}

export async function deleteCollectionItem(
  itemId: string,
  collectionId: string,
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be logged in." };
  }

  const { data: collection, error: fetchError } = await supabase
    .from("collections")
    .select("user_id")
    .eq("id", collectionId)
    .single();

  if (fetchError || !collection) {
    return { error: `${CRAVELIST_LABEL} not found` };
  }

  if (collection.user_id !== user.id) {
    return {
      error: `You do not have permission to edit this ${CRAVELIST_LABEL.toLowerCase()}.`,
    };
  }

  const { error } = await supabase
    .from("collection_items")
    .delete()
    .eq("id", itemId)
    .eq("collection_id", collectionId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/collections/${collectionId}`);
  revalidatePath("/account");
  return { success: true };
}

/** Parse runtime string to minutes (e.g. "130 min" -> 130, "2h 30m" -> 150) */
function parseRuntimeMinutes(runtime: string | null | undefined): number | null {
  if (!runtime || typeof runtime !== "string") return null;
  const s = runtime.trim().toLowerCase();
  const minMatch = /(\d+)\s*min/.exec(s);
  if (minMatch) return Number.parseInt(minMatch[1], 10);
  const hourMatch = /(\d+)\s*h/.exec(s);
  const minPart = /(\d+)\s*m/.exec(s);
  if (hourMatch) {
    const hours = Number.parseInt(hourMatch[1], 10);
    const mins = minPart ? Number.parseInt(minPart[1], 10) : 0;
    return hours * 60 + mins;
  }
  if (minPart) return Number.parseInt(minPart[1], 10);
  const pagesMatch = /(\d+)\s*pages?/i.exec(s);
  if (pagesMatch) return Number.parseInt(pagesMatch[1], 10) * 2; // ~2 min/page estimate
  return null;
}

const WATCH_STATUSES = [
  "not_seen",
  "watching",
  "on_hold",
  "watched",
  "dropped",
  "not_interested",
] as const;

export type WatchStatus = (typeof WATCH_STATUSES)[number];

export async function updateCollectionItemStatus(
  itemId: string,
  collectionId: string,
  newStatus: WatchStatus,
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be logged in." };
  }

  const { data: collection, error: fetchError } = await supabase
    .from("collections")
    .select("user_id")
    .eq("id", collectionId)
    .single();

  if (fetchError || !collection) {
    return { error: "Collection not found" };
  }

  if (collection.user_id !== user.id) {
    return { error: `You do not have permission to update this ${CRAVELIST_LABEL.toLowerCase()}.` };
  }

  const { data: item, error: itemError } = await supabase
    .from("collection_items")
    .select("*")
    .eq("id", itemId)
    .eq("collection_id", collectionId)
    .maybeSingle();

  if (itemError) {
    return { error: itemError.message };
  }

  if (!item) {
    return {
      error:
        "Item not found. If you recently set up this project, run: supabase db push",
    };
  }

  const isWatched = newStatus === "watched";

  const updateData: Record<string, unknown> = {
    status: newStatus,
    finished_at: isWatched ? new Date().toISOString() : null,
  };
  if (!isWatched) {
    updateData.item_rating = null;
    updateData.review_text = null;
  }

  const itemWithOptional = item as { runtime_minutes?: number | null };
  if (isWatched && !itemWithOptional.runtime_minutes) {
    const meta = item.metadata as { runtime?: string } | null;
    const parsed = parseRuntimeMinutes(meta?.runtime);
    if (parsed != null) {
      updateData.runtime_minutes = parsed;
    }
  } else if (!isWatched) {
    updateData.runtime_minutes = null;
  }

  const { error } = await supabase
    .from("collection_items")
    .update(updateData)
    .eq("id", itemId)
    .eq("collection_id", collectionId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/collections/${collectionId}`);
  revalidatePath("/account");
  return { success: true };
}

export async function updateMediaStatusAcrossCollections(
  mediaId: string,
  mediaType: string,
  newStatus: WatchStatus,
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be logged in." };
  }

  const { data: userCollections } = await supabase
    .from("collections")
    .select("id")
    .eq("user_id", user.id);

  if (!userCollections?.length) {
    return { error: `No ${CRAVELIST_LABEL}s found.` };
  }

  const collectionIds = userCollections.map((c) => c.id);
  const isWatched = newStatus === "watched";

  const updateData: Record<string, unknown> = {
    status: newStatus,
    finished_at: isWatched ? new Date().toISOString() : null,
  };
  if (!isWatched) {
    updateData.item_rating = null;
    updateData.review_text = null;
    updateData.runtime_minutes = null;
  }

  const { error } = await supabase
    .from("collection_items")
    .update(updateData)
    .eq("media_id", mediaId)
    .eq("media_type", mediaType)
    .in("collection_id", collectionIds);

  if (error) {
    return { error: error.message };
  }

  for (const cid of collectionIds) {
    revalidatePath(`/collections/${cid}`);
  }
  revalidatePath("/account");
  revalidatePath(`/media/${mediaType}/${mediaId}`);
  return { success: true };
}

export async function reviewCollectionItem(
  itemId: string,
  collectionId: string,
  data: { rating?: number; review?: string; containsSpoilers?: boolean },
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be logged in." };
  }

  const { data: collection, error: fetchError } = await supabase
    .from("collections")
    .select("user_id")
    .eq("id", collectionId)
    .single();

  if (fetchError || !collection) {
    return { error: "Collection not found" };
  }

  if (collection.user_id !== user.id) {
    return { error: `You do not have permission to update this ${CRAVELIST_LABEL.toLowerCase()}.` };
  }

  const updateData: Record<string, unknown> = {};
  if (data.rating != null) {
    const r = Math.max(1, Math.min(10, data.rating));
    updateData.item_rating = r;
  }
  if (data.review !== undefined) {
    updateData.review_text = data.review?.trim() || null;
  }
  if (data.containsSpoilers !== undefined) {
    updateData.contains_spoilers = data.containsSpoilers;
  }

  if (Object.keys(updateData).length === 0) {
    return { success: true };
  }

  const { error } = await supabase
    .from("collection_items")
    .update(updateData)
    .eq("id", itemId)
    .eq("collection_id", collectionId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/collections/${collectionId}`);
  revalidatePath("/account");
  return { success: true };
}

export async function reviewMediaAcrossCollections(
  mediaId: string,
  mediaType: string,
  data: { rating?: number; review?: string; containsSpoilers?: boolean },
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be logged in." };
  }

  const rating =
    data.rating != null ? Math.max(1, Math.min(10, data.rating)) : null;
  const reviewText = data.review?.trim() || null;
  const containsSpoilers = data.containsSpoilers ?? false;

  // Check if user has this media in any of their collections
  const { data: userCollections } = await supabase
    .from("collections")
    .select("id")
    .eq("user_id", user.id);

  const collectionIds = userCollections?.map((c) => c.id) ?? [];
  let itemsInCollection: { id: string; collection_id: string }[] = [];

  if (collectionIds.length > 0) {
    const { data: items } = await supabase
      .from("collection_items")
      .select("id, collection_id")
      .eq("media_id", mediaId)
      .eq("media_type", mediaType)
      .in("collection_id", collectionIds);
    itemsInCollection = items ?? [];
  }

  if (itemsInCollection.length > 0) {
    // Update collection_items (existing behavior)
    const updateData: Record<string, unknown> = {};
    if (rating != null) updateData.item_rating = rating;
    if (data.review !== undefined) updateData.review_text = reviewText;
    if (data.containsSpoilers !== undefined)
      updateData.contains_spoilers = containsSpoilers;

    if (Object.keys(updateData).length === 0) {
      return { success: true };
    }

    const { error } = await supabase
      .from("collection_items")
      .update(updateData)
      .eq("media_id", mediaId)
      .eq("media_type", mediaType)
      .in("collection_id", collectionIds);

    if (error) {
      return { error: error.message };
    }

    for (const cid of collectionIds) {
      revalidatePath(`/collections/${cid}`);
    }
  } else {
    // Standalone review: upsert into media_reviews
    const { error } = await supabase.from("media_reviews").upsert(
      {
        user_id: user.id,
        media_id: mediaId,
        media_type: mediaType,
        item_rating: rating,
        review_text: reviewText,
        contains_spoilers: containsSpoilers,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "user_id,media_id,media_type",
      },
    );

    if (error) {
      return { error: error.message };
    }
  }

  revalidatePath("/account");
  revalidatePath(`/media/${mediaType}/${mediaId}`);
  return { success: true };
}
