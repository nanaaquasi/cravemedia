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
    total_runtime_minutes: journeyData.total_runtime_minutes,
    difficulty_progression: journeyData.difficulty_progression,
    items: journeyData.items || [], // Store the items JSON
    intent_answers: data.refinement_steps || [], // Store Q&A history
    status: "wishlist", // Default status
  });

  if (error) {
    console.error("Error saving journey:", error);
    return { error: error.message };
  }

  revalidatePath("/account");
  return { success: true };
}
