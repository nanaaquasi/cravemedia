import { redirect } from "next/navigation";
import { getMediaDetails, getPosterUrl } from "@/lib/tmdb";
import { getAnimeDetails } from "@/lib/anilist";
import MediaDetailClient, { MediaDetails } from "./MediaDetailClient";

interface PageProps {
  params: Promise<{ type: string; id: string }>;
}

export default async function MediaDetailPage({ params }: PageProps) {
  const { type, id } = await params;

  if (type !== "movie" && type !== "tv" && type !== "anime") {
    redirect("/");
  }

  const idNum = parseInt(id, 10);
  if (isNaN(idNum)) {
    redirect("/");
  }

  try {
    let mediaDetails: MediaDetails;

    if (type === "anime") {
      const details = await getAnimeDetails(idNum);
      if (!details) throw new Error("Anime not found");

      mediaDetails = {
        title: details.title,
        overview: details.description || null,
        posterUrl: details.posterUrl,
        backdropUrl: null, // Anilist usually gives banner image but we can use poster or just gradient
        voteAverage: details.rating ? details.rating / 10 : 0, // 0-100 to 0-10
        voteCount: 0, // Anilist doesn't give vote count easily in this query
        releaseDate: details.year ? `${details.year}-01-01` : null,
        runtime: details.duration ? `${details.duration} min` : null,
        genres: details.genres,
        directors: [], // Anime usually focuses on studios
        trailerKey: null, // Could fetch trailer from Anilist if needed
        type: "anime",
        episodes: details.episodes,
        studios: details.studios,
        format: details.format,
      };
    } else {
      const details = await getMediaDetails(type as "movie" | "tv", idNum);
      const posterUrl = getPosterUrl(details.posterPath, "w500");
      const backdropUrl = details.backdropPath
        ? `https://image.tmdb.org/t/p/w1280${details.backdropPath}`
        : null;

      mediaDetails = {
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
        type: details.type as "movie" | "tv",
      };
    }

    return <MediaDetailClient details={mediaDetails} />;
  } catch (e) {
    console.error("Error fetching details:", e);
    redirect("/");
  }
}
