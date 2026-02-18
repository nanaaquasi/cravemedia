import { NextResponse } from "next/server";
import { getMediaDetails, getPosterUrl } from "@/lib/tmdb";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ type: string; id: string }> },
) {
  const { type, id } = await params;

  if (type !== "movie" && type !== "tv") {
    return NextResponse.json(
      { error: "Invalid type. Use movie or tv." },
      { status: 400 },
    );
  }

  const idNum = parseInt(id, 10);
  if (isNaN(idNum)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  try {
    const details = await getMediaDetails(type, idNum);
    const posterUrl = getPosterUrl(details.posterPath, "w500");
    const backdropUrl = details.backdropPath
      ? `https://image.tmdb.org/t/p/w1280${details.backdropPath}`
      : null;

    return NextResponse.json({
      ...details,
      posterUrl,
      backdropUrl,
    });
  } catch (err) {
    console.error("Media details error:", err);
    return NextResponse.json(
      { error: "Failed to fetch media details" },
      { status: 500 },
    );
  }
}
