"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type SaveJourneyState = {
  success?: boolean;
  error?: string;
};

export async function saveJourney(
  prevState: SaveJourneyState,
  formData: FormData,
): Promise<SaveJourneyState> {
  // This is if we use a form action. But we might call this programmically.
  // Let's make a function that accepts an object instead for easier client usage.
  return { error: "Use saveJourneyData instead" };
}

import { JourneyResponse, RefineAnswer } from "@/lib/types";
import type { JourneyItem } from "@/lib/types";
import { parseRuntimeMinutes } from "@/lib/runtime";

// ...

export async function saveJourneyData(data: {
  title: string;
  query: string;
  goal_amount?: number;
  goal_unit?: string;
  results: JourneyResponse;
  refinement_steps?: RefineAnswer[];
  is_public?: boolean;
  is_explicitly_saved?: boolean;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be logged in to save a journey." };
  }

  const journeyData = data.results;
  const inferredType = journeyData.items?.[0]?.type || "all";
  const items = (journeyData.items || []) as JourneyItem[];

  const { data: newJourney, error } = await supabase
    .from("journeys")
    .insert({
      user_id: user.id,
      title: data.title,
      query: data.query,
      description: journeyData.description,
      content_type: inferredType,
      total_items: items.length,
      total_runtime_minutes: journeyData.totalRuntimeMinutes,
      difficulty_progression: journeyData.difficultyProgression,
      items: journeyData.items || [],
      intent_answers: data.refinement_steps || [],
      status: "wishlist",
      is_public: data.is_public ?? false,
      is_explicitly_saved: data.is_explicitly_saved ?? true,
    })
    .select("id")
    .single();

  if (error || !newJourney) {
    console.error("Error saving journey:", error);
    return { error: error?.message ?? "Failed to save journey" };
  }

  // Create journey_progress rows so user can mark items watched
  if (items.length > 0) {
    const progressRows = items.map((item, idx) => {
      const position = item.position ?? idx + 1;
      const runtimeMinutes = parseRuntimeMinutes(item.runtime);
      return {
        journey_id: newJourney.id,
        user_id: user.id,
        item_position: position,
        item_title: item.title ?? "Untitled",
        item_year: item.year ?? null,
        item_runtime_minutes: runtimeMinutes,
        status: idx === 0 ? "current" : "locked",
      };
    });

    const { error: progressError } = await supabase
      .from("journey_progress")
      .insert(progressRows);

    if (progressError) {
      console.error("Error creating journey progress:", progressError);
      // Don't fail the save - progress can be created lazily
    }
  }

  revalidatePath("/account");
  return { success: true, journeyId: newJourney.id };
}

export async function beginJourney(
  journeyId: string,
): Promise<{ error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be logged in." };
  }

  const { error } = await supabase
    .from("journeys")
    .update({
      status: "in_progress",
      started_at: new Date().toISOString(),
    })
    .eq("id", journeyId)
    .eq("user_id", user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/journey/${journeyId}`);
  revalidatePath("/account");
  return {};
}

export async function deleteJourney(journeyId: string): Promise<{ error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be logged in to delete." };
  }

  const { error } = await supabase
    .from("journeys")
    .delete()
    .eq("id", journeyId)
    .eq("user_id", user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/account");
  return {};
}

export async function toggleJourneyVisibility(
  journeyId: string,
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
    .from("journeys")
    .update({ is_public: isPublic })
    .eq("id", journeyId)
    .eq("user_id", user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/journey/${journeyId}`);
  revalidatePath("/account");
  return { success: true };
}

export async function cloneJourney(journeyId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be logged in to clone a journey." };
  }

  // Fetch the journey to clone
  const { data: journeyToClone, error: fetchError } = await supabase
    .from("journeys")
    .select("*")
    .eq("id", journeyId)
    .single();

  if (fetchError || !journeyToClone) {
    return { error: fetchError?.message || "Journey not found" };
  }

  // Ensure it's public or belongs to user
  if (!journeyToClone.is_public && journeyToClone.user_id !== user.id) {
    return { error: "You do not have permission to clone this journey." };
  }

  // If user already forked this journey, return existing fork (no duplicate)
  const { data: existingFork } = await supabase
    .from("journeys")
    .select("id")
    .eq("user_id", user.id)
    .eq("forked_from", journeyId)
    .limit(1)
    .maybeSingle();

  if (existingFork) {
    revalidatePath("/account");
    return { success: true, newJourneyId: existingFork.id };
  }

  // Insert the clone
  const { data: newJourney, error: insertError } = await supabase
    .from("journeys")
    .insert({
      user_id: user.id,
      title: `${journeyToClone.title} (Copy)`,
      query: journeyToClone.query,
      description: journeyToClone.description,
      content_type: journeyToClone.content_type,
      total_items: journeyToClone.total_items,
      total_runtime_minutes: journeyToClone.total_runtime_minutes,
      difficulty_progression: journeyToClone.difficulty_progression,
      items: journeyToClone.items,
      intent_answers: journeyToClone.intent_answers,
      status: "wishlist",
      is_public: false, // cloned journeys are private by default
      is_created_by_user: true, // It's created by the user cloning it
      is_explicitly_saved: true, // clones are explicitly saved by definition
      forked_from: journeyToClone.id,
    })
    .select("id")
    .single();

  if (insertError || !newJourney) {
    return { error: insertError?.message || "Failed to clone journey." };
  }

  // Create journey_progress rows for the clone
  const items = (journeyToClone.items as JourneyItem[]) || [];
  if (items.length > 0) {
    const progressRows = items.map((item, idx) => {
      const position = item.position ?? idx + 1;
      const runtimeMinutes = parseRuntimeMinutes(item.runtime);
      return {
        journey_id: newJourney.id,
        user_id: user.id,
        item_position: position,
        item_title: item.title ?? "Untitled",
        item_year: item.year ?? null,
        item_runtime_minutes: runtimeMinutes,
        status: idx === 0 ? "current" : "locked",
      };
    });
    await supabase.from("journey_progress").insert(progressRows);
  }

  revalidatePath("/account");
  return { success: true, newJourneyId: newJourney.id };
}

export async function markJourneyItemWatched(
  journeyId: string,
  itemPosition: number,
  rating?: number,
  review?: string,
): Promise<{ error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be logged in." };
  }

  // 1. Update journey progress
  const { data: progress, error: progressError } = await supabase
    .from("journey_progress")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
      item_rating: rating ?? null,
      review_text: review ?? null,
    })
    .eq("journey_id", journeyId)
    .eq("item_position", itemPosition)
    .eq("user_id", user.id)
    .select()
    .single();

  if (progressError) {
    return { error: progressError.message };
  }

  // 2. Update next item to 'current'
  await supabase
    .from("journey_progress")
    .update({ status: "current" })
    .eq("journey_id", journeyId)
    .eq("item_position", itemPosition + 1)
    .eq("user_id", user.id);

  // 3. Update journey current position and status
  const { data: journey } = await supabase
    .from("journeys")
    .select("total_items")
    .eq("id", journeyId)
    .single();

  if (journey) {
    await supabase
      .from("journeys")
      .update({ current_position: itemPosition + 1 })
      .eq("id", journeyId);

    if (itemPosition + 1 >= (journey.total_items || 0)) {
      await supabase
        .from("journeys")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
        })
        .eq("id", journeyId);
    } else {
      await supabase
        .from("journeys")
        .update({ status: "in_progress", started_at: new Date().toISOString() })
        .eq("id", journeyId);
    }
  }

  revalidatePath(`/journey/${journeyId}`);
  revalidatePath("/account");
  return {};
}

export async function updateJourneyItemReview(
  journeyId: string,
  itemPosition: number,
  data: { rating?: number; review?: string },
): Promise<{ error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be logged in." };
  }

  const updateData: { item_rating?: number | null; review_text?: string | null } =
    {};
  if (data.rating !== undefined) updateData.item_rating = data.rating || null;
  if (data.review !== undefined)
    updateData.review_text = data.review?.trim() || null;

  const { error } = await supabase
    .from("journey_progress")
    .update(updateData)
    .eq("journey_id", journeyId)
    .eq("item_position", itemPosition)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath(`/journey/${journeyId}`);
  return {};
}

export async function updateJourneyReview(
  journeyId: string,
  data: {
    overallRating?: number;
    sequenceRating?: number;
    reviewText?: string;
  },
): Promise<{ error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be logged in." };
  }

  const updateData: Record<string, unknown> = {};
  if (data.overallRating !== undefined)
    updateData.overall_rating = data.overallRating || null;
  if (data.sequenceRating !== undefined)
    updateData.sequence_rating = data.sequenceRating || null;
  if (data.reviewText !== undefined)
    updateData.review_text = data.reviewText?.trim() || null;

  const { error } = await supabase
    .from("journeys")
    .update(updateData)
    .eq("id", journeyId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath(`/journey/${journeyId}`);
  revalidatePath("/account");
  return {};
}
