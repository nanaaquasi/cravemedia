import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const LIMIT = 6;

export async function GET() {
  try {
    const supabase = await createClient();

    const { data: journeys, error } = await supabase
      .from("journeys")
      .select(
        "id, title, description, query, content_type, items, total_items, total_runtime_minutes, overall_rating, status, current_position, created_at, updated_at, completed_at, forked_count, profiles:user_id(username, full_name)"
      )
      .eq("is_public", true)
      .order("forked_count", { ascending: false })
      .order("overall_rating", { ascending: false, nullsFirst: false })
      .order("updated_at", { ascending: false })
      .limit(LIMIT);

    if (error) {
      console.error("Featured journeys error:", error);
      return NextResponse.json({ journeys: [] });
    }

    // Strip profiles from response - JourneyShowcase expects Tables<"journeys"> shape
    const transformed = (journeys ?? []).map((j: Record<string, unknown>) => {
      const { profiles, ...journey } = j;
      return journey;
    });

    return NextResponse.json({ journeys: transformed });
  } catch (err) {
    console.error("Featured journeys error:", err);
    return NextResponse.json({ journeys: [] });
  }
}
