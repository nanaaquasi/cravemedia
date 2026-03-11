import { NextResponse } from "next/server";
import { getTrendingMedia } from "@/lib/discover-trending";

export { type TMDBMediaItem } from "@/lib/discover-trending";

export async function GET() {
  try {
    const data = await getTrendingMedia();
    return NextResponse.json(data);
  } catch (err) {
    console.error("Discover trending API error:", err);
    return NextResponse.json(
      { trending: [], popular: [], trendingAnime: [], popularAnime: [] },
      { status: 500 }
    );
  }
}
