import { NextResponse } from "next/server";
import { getTVEpisodeRatings } from "@/lib/tmdb";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const seriesId = Number.parseInt(id, 10);
  if (Number.isNaN(seriesId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  try {
    const data = await getTVEpisodeRatings(seriesId);
    return NextResponse.json({ episodeQuality: data });
  } catch (e) {
    console.error("episode-ratings:", e);
    return NextResponse.json(
      { error: "Failed to load episode ratings" },
      { status: 500 },
    );
  }
}
