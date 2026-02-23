import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const LIMIT = 5;

export async function GET() {
  try {
    const supabase = await createClient();

    const { data: profiles, error } = await supabase
      .from("profiles")
      .select("id, username, full_name, avatar_url")
      .order("updated_at", { ascending: false })
      .limit(LIMIT);

    if (error) {
      console.error("Hero avatars error:", error);
      return NextResponse.json({ avatars: [] });
    }

    const avatars = (profiles ?? []).map((p) => ({
      id: p.id,
      username: p.username ?? null,
      fullName: p.full_name ?? null,
      avatarUrl: p.avatar_url ?? null,
    }));

    return NextResponse.json({ avatars });
  } catch (err) {
    console.error("Hero avatars error:", err);
    return NextResponse.json({ avatars: [] });
  }
}
