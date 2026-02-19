import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import JourneyDetailClient from "./JourneyDetailClient";
import { JourneyResponse, JourneyItem } from "@/lib/types";

export default async function JourneyDetailPage({
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

  const { data: journey, error } = await supabase
    .from("journeys")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !journey) {
    notFound();
  }

  // Ensure user owns the journey (or check if public)
  if (journey.user_id !== user.id) {
    notFound();
  }

  // Map database journey to JourneyResponse
  const journeyResponse: JourneyResponse = {
    journeyTitle: journey.title,
    description: journey.description || "",
    totalRuntimeMinutes: journey.total_runtime_minutes || undefined,
    difficultyProgression: journey.difficulty_progression || "",
    items: (journey.items as unknown as JourneyItem[]) || [],
    itemCount: journey.total_items || 0,
  };

  return <JourneyDetailClient journey={journeyResponse} journeyId={id} />;
}
