import { createClient } from "@/lib/supabase/server";
import { type NextRequest, NextResponse } from "next/server";

export type FavoriteTargetType =
  | "movie"
  | "tv"
  | "anime"
  | "book"
  | "collection"
  | "journey"
  | "person";

export interface FavoriteItem {
  id: string;
  user_id: string;
  target_type: string;
  target_id: string;
  title: string | null;
  image_url: string | null;
  metadata: Record<string, unknown>;
  created_at: string | null;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const userId = searchParams.get("user_id");
  const targetType = searchParams.get("target_type");

  if (!userId) {
    return NextResponse.json(
      { error: "Missing user_id parameter" },
      { status: 400 },
    );
  }

  const supabase = await createClient();

  let query = supabase
    .from("favorites")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (targetType) {
    query = query.eq("target_type", targetType);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching favorites:", error);
    return NextResponse.json(
      { error: "Failed to fetch favorites" },
      { status: 500 },
    );
  }

  return NextResponse.json(data as FavoriteItem[]);
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    target_type: FavoriteTargetType;
    target_id: string;
    title?: string | null;
    image_url?: string | null;
    metadata?: Record<string, unknown>;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const { target_type, target_id, title, image_url, metadata } = body;

  if (!target_type || !target_id) {
    return NextResponse.json(
      { error: "target_type and target_id are required" },
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from("favorites")
    .insert({
      user_id: user.id,
      target_type,
      target_id,
      title: title ?? null,
      image_url: image_url ?? null,
      metadata: metadata ?? {},
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "Already favorited", favorited: true },
        { status: 409 },
      );
    }
    console.error("Error adding favorite:", error);
    return NextResponse.json(
      { error: "Failed to add favorite" },
      { status: 500 },
    );
  }

  return NextResponse.json(data as FavoriteItem);
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const targetType = searchParams.get("target_type");
  const targetId = searchParams.get("target_id");

  if (!targetType || !targetId) {
    return NextResponse.json(
      { error: "target_type and target_id query params are required" },
      { status: 400 },
    );
  }

  const { error } = await supabase
    .from("favorites")
    .delete()
    .eq("user_id", user.id)
    .eq("target_type", targetType)
    .eq("target_id", targetId);

  if (error) {
    console.error("Error removing favorite:", error);
    return NextResponse.json(
      { error: "Failed to remove favorite" },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true });
}
