import { createClient } from "@/lib/supabase/client";

export async function markItemAsWatched(
  journeyId: string,
  itemPosition: number,
  rating?: number,
  review?: string,
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // 1. Update journey progress
  const { data: progress, error: progressError } = await supabase
    .from("journey_progress")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
      item_rating: rating,
      review_text: review,
    })
    .eq("journey_id", journeyId)
    .eq("item_position", itemPosition)
    .eq("user_id", user.id)
    .select()
    .single();

  if (progressError) throw progressError;

  // 2. Update next item to 'current'
  await supabase
    .from("journey_progress")
    .update({ status: "current" })
    .eq("journey_id", journeyId)
    .eq("item_position", itemPosition + 1)
    .eq("user_id", user.id);

  // 3. Update journey current position
  // Get journey to check total items
  const { data: journey, error: journeyError } = await supabase
    .from("journeys")
    .select("*, journey_progress(*)")
    .eq("id", journeyId)
    .single();

  if (journeyError) throw journeyError;

  if (journey) {
    // Update current position
    await supabase
      .from("journeys")
      .update({ current_position: itemPosition + 1 })
      .eq("id", journeyId);

    // 4. Check if journey is complete
    // Check if this was the last item
    if (itemPosition + 1 >= (journey.total_items || 0)) {
      await supabase
        .from("journeys")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
        })
        .eq("id", journeyId);
    }
  }

  // Note: Triggers will handle creating activities and updating stats

  return { progress, journey };
}

export async function rateJourney(
  journeyId: string,
  overallRating: number,
  sequenceRating: number,
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("journeys")
    .update({
      overall_rating: overallRating,
      sequence_rating: sequenceRating,
    })
    .eq("id", journeyId)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) throw error;

  return data;
}
