import { createClient } from "@/lib/supabase/server";
import { type NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let body: { target_type: string; target_id: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const { target_type, target_id } = body;

  if (!target_type || !target_id) {
    return NextResponse.json(
      { error: "target_type and target_id are required" },
      { status: 400 },
    );
  }

  const { error } = await supabase.from("content_views").insert({
    user_id: user?.id ?? null,
    target_type,
    target_id,
  });

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ success: true, alreadyViewed: true });
    }
    console.error("Error recording view:", error);
    return NextResponse.json(
      { error: "Failed to record view" },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true });
}
