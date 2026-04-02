import type { EpisodeQualityData, TVSeasonSummary } from "@/lib/tmdb";

/** Merge IMDb-derived season averages from episode quality data into TMDB season summaries. */
export function mergeImdbSeasonAverages(
  seasons: TVSeasonSummary[],
  episodeQuality: EpisodeQualityData,
): TVSeasonSummary[] {
  if (episodeQuality.length === 0) return seasons;
  return seasons.map((season) => {
    const episodeRatings = episodeQuality.find(
      (s) => s[0]?.seasonNumber === season.seasonNumber,
    );
    if (
      episodeRatings &&
      episodeRatings.length > 0 &&
      episodeRatings.some((e) => e.voteAverage > 0)
    ) {
      const sum = episodeRatings.reduce((a, e) => a + e.voteAverage, 0);
      const avg = sum / episodeRatings.length;
      return {
        ...season,
        voteAverage: Math.round(avg * 10) / 10,
      };
    }
    return season;
  });
}
