import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getDiscoverWatchStatusesForItems } from "@/lib/discover-watched";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ watchedKeys: [], watchingKeys: [] });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const items = (body as { items?: { type: string; id: string }[] }).items;
  if (!Array.isArray(items)) {
    return NextResponse.json({ error: "items array required" }, { status: 400 });
  }

  const normalized = items
    .filter(
      (i): i is { type: string; id: string } =>
        typeof i?.type === "string" &&
        typeof i?.id === "string" &&
        i.type.length > 0 &&
        i.id.length > 0,
    )
    .slice(0, 200);

  const { watchedKeys, watchingKeys } =
    await getDiscoverWatchStatusesForItems(supabase, user.id, normalized);

  return NextResponse.json({ watchedKeys, watchingKeys });
}
