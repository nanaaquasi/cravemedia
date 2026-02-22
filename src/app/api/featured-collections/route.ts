import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const LIMIT = 6;

export async function GET() {
  try {
    const supabase = await createClient();

    const { data: collections, error } = await supabase
      .from("collections")
      .select("*, collection_items(image_url), profiles:user_id(username, full_name)")
      .eq("is_public", true)
      .order("updated_at", { ascending: false })
      .limit(LIMIT);

    if (error) {
      console.error("Featured collections error:", error);
      return NextResponse.json({ collections: [] });
    }

    const transformed = (collections ?? []).map((c: any) => {
      const profile = c.profiles as { username?: string | null; full_name?: string | null } | null;
      const fullName = profile?.full_name?.trim();
      const username = profile?.username?.trim();
      const firstName = fullName
        ? fullName.split(/\s+/)[0]
        : username ?? null;

      return {
        ...c,
        curator_first_name: firstName,
        items: (c.collection_items ?? []).map((i: { image_url: string | null }) => ({
          image_url: i.image_url,
        })),
        item_count: c.collection_items?.length ?? 0,
      };
    });

    return NextResponse.json({ collections: transformed });
  } catch (err) {
    console.error("Featured collections error:", err);
    return NextResponse.json({ collections: [] });
  }
}
