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

  /*
   * FIX: Writing to the new 'journeys' table instead of the legacy 'saved_journeys'.
   * We need to extract the relevant fields from the results object.
   */
  const journeyData = data.results;

  // Determine content type from the items if not explicitly available, default to 'all' or mixed
  // actually journeyResults usually doesn't have a top-level type, but items do.
  // We can infer it or pass it. For now, let's assume 'all' or infer from first item.
  const inferredType = journeyData.items?.[0]?.type || "all";

  const { error } = await supabase.from("journeys").insert({
    user_id: user.id,
    title: data.title,
    query: data.query,
    description: journeyData.description,
    content_type: inferredType, // This is required in new schema
    total_items: journeyData.items?.length || 0,
    total_runtime_minutes: journeyData.totalRuntimeMinutes,
    difficulty_progression: journeyData.difficultyProgression,
    items: journeyData.items || [], // Store the items JSON
    intent_answers: data.refinement_steps || [], // Store Q&A history
    status: "wishlist", // Default status
    is_public: data.is_public ?? false,
    is_explicitly_saved: data.is_explicitly_saved ?? true,
  });

  if (error) {
    console.error("Error saving journey:", error);
    return { error: error.message };
  }

  revalidatePath("/account");
  return { success: true };
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

  revalidatePath("/account");
  return { success: true, newJourneyId: newJourney.id };
}
