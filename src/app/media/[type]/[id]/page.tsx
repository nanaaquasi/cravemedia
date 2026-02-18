import { redirect } from "next/navigation";
import { getMediaDetails, getPosterUrl } from "@/lib/tmdb";
import MediaDetailClient from "./MediaDetailClient";

interface PageProps {
  params: Promise<{ type: string; id: string }>;
}

export default async function MediaDetailPage({ params }: PageProps) {
  const { type, id } = await params;

  if (type !== "movie" && type !== "tv") {
    redirect("/");
  }

  const idNum = parseInt(id, 10);
  if (isNaN(idNum)) {
    redirect("/");
  }

  try {
    const details = await getMediaDetails(type, idNum);
    const posterUrl = getPosterUrl(details.posterPath, "w500");
    const backdropUrl = details.backdropPath
      ? `https://image.tmdb.org/t/p/w1280${details.backdropPath}`
      : null;

    const mediaDetails = {
      title: details.title,
      overview: details.overview,
      posterUrl,
      backdropUrl,
      voteAverage: details.voteAverage,
      voteCount: details.voteCount,
      releaseDate: details.releaseDate,
      runtime: details.runtime,
      genres: details.genres,
      directors: details.directors,
      trailerKey: details.trailerKey,
      type: details.type,
    };

    return <MediaDetailClient details={mediaDetails} />;
  } catch {
    redirect("/");
  }
}
