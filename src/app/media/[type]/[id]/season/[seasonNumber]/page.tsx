import { redirect } from "next/navigation";
import {
  getMediaDetails,
  getPosterUrl,
  getTVSeasonDetails,
} from "@/lib/tmdb";
import { createClient } from "@/lib/supabase/server";
import { getEpisodeProgress } from "@/app/actions/episode-progress";
import SeasonDetailClient from "./SeasonDetailClient";

interface PageProps {
  params: Promise<{ type: string; id: string; seasonNumber: string }>;
  searchParams: Promise<{ episode?: string }>;
}

export default async function SeasonPage({
  params,
  searchParams,
}: PageProps) {
  const { type, id, seasonNumber } = await params;
  const { episode: highlightEpisode } = await searchParams;

  if (type !== "tv") {
    redirect(`/media/${type}/${id}`);
  }

  const idNum = Number.parseInt(id, 10);
  const seasonNum = Number.parseInt(seasonNumber, 10);
  if (Number.isNaN(idNum) || Number.isNaN(seasonNum) || seasonNum < 1) {
    redirect(`/media/tv/${id}`);
  }

  try {
    const supabase = await createClient();
    const [
      { data: { user } },
      showDetails,
      seasonDetails,
      episodeProgress,
    ] = await Promise.all([
      supabase.auth.getUser(),
      getMediaDetails("tv", idNum),
      getTVSeasonDetails(idNum, seasonNum),
      getEpisodeProgress(id, seasonNum),
    ]);

    const posterUrl = getPosterUrl(showDetails.posterPath, "w500");
    const backdropUrl = showDetails.backdropPath
      ? `https://image.tmdb.org/t/p/w1280${showDetails.backdropPath}`
      : null;

    const highlightEpisodeNum = highlightEpisode
      ? Number.parseInt(highlightEpisode, 10)
      : null;

    return (
      <SeasonDetailClient
        showTitle={showDetails.title}
        showYear={showDetails.releaseDate?.slice(0, 4) ?? null}
        posterUrl={posterUrl}
        backdropUrl={backdropUrl}
        mediaId={id}
        seasonDetails={seasonDetails}
        episodeProgress={episodeProgress}
        episodeRuntimeMinutes={showDetails.episodeRuntimeMinutes ?? null}
        canTrackProgress={!!user}
        highlightEpisodeNumber={
          highlightEpisodeNum && !Number.isNaN(highlightEpisodeNum)
            ? highlightEpisodeNum
            : null
        }
      />
    );
  } catch (e) {
    console.error("Error fetching season:", e);
    redirect(`/media/tv/${id}`);
  }
}
