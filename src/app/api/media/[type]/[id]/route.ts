import { NextResponse } from "next/server";
import { getMediaDetails, getPosterUrl } from "@/lib/tmdb";
import { enhanceWithSimklData } from "@/lib/simkl";

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
    
    const [simklData, posterUrl] = await Promise.all([
      enhanceWithSimklData(idNum, type),
      getPosterUrl(details.posterPath, "w500"),
    ]);

    const backdropUrl = details.backdropPath
      ? `https://image.tmdb.org/t/p/w1280${details.backdropPath}`
      : null;

    // Use SIMKL rating if TMDB rating is missing or zero
    const enhancedRating = details.voteAverage === 0 && simklData?.ratings?.simkl?.rating 
        ? simklData.ratings.simkl.rating 
        : details.voteAverage;

    return NextResponse.json({
      ...details,
      voteAverage: enhancedRating,
      posterUrl,
      backdropUrl,
      simklMetadata: simklData,
    });
  } catch (err) {
    console.error("Media details error:", err);
    return NextResponse.json(
      { error: "Failed to fetch media details" },
      { status: 500 },
    );
  }
}
