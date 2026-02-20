"use client";

import Link from "next/link";
import type { EpisodeRating } from "@/lib/tmdb";

interface EpisodeQualityGridProps {
  data: EpisodeRating[][];
  mediaTitle: string;
  mediaId: string;
}

const RATING_TIERS = [
  { min: 9, label: "Masterpiece", className: "bg-emerald-800 text-white" },
  { min: 8, label: "Great", className: "bg-green-600 text-white" },
  { min: 7, label: "Good", className: "bg-amber-500 text-white" },
  { min: 6, label: "Meh", className: "bg-orange-600 text-white" },
  { min: 5, label: "Bad", className: "bg-red-600 text-white" },
  { min: 0, label: "Awful", className: "bg-red-900 text-white" },
] as const;

function getRatingColor(voteAverage: number): string {
  if (!voteAverage) return "bg-zinc-700/60 text-zinc-500";
  for (const tier of RATING_TIERS) {
    if (voteAverage >= tier.min) return tier.className;
  }
  return RATING_TIERS[RATING_TIERS.length - 1].className;
}

export default function EpisodeQualityGrid({
  data,
  mediaTitle,
  mediaId,
}: EpisodeQualityGridProps) {
  const maxEpisodes = Math.max(
    ...data.map((season) =>
      season.length > 0
        ? Math.max(...season.map((e) => e.episodeNumber))
        : 0,
    ),
    0,
  );
  const numSeasons = data.length;
  const visibleRows = maxEpisodes;
  const visibleCols = numSeasons;

  if (numSeasons === 0 || maxEpisodes === 0) return null;

  const getCellValue = (seasonIndex: number, episodeNum: number): number => {
    const season = data[seasonIndex];
    if (!season) return 0;
    const ep = season.find((e) => e.episodeNumber === episodeNum);
    return ep?.voteAverage ?? 0;
  };

  const getSeasonUrl = (seasonIndex: number, episodeNum: number): string => {
    const seasonNumber = seasonIndex + 1;
    const val = getCellValue(seasonIndex, episodeNum);
    const base = `/media/tv/${mediaId}/season/${seasonNumber}`;
    return val ? `${base}?episode=${episodeNum}` : base;
  };

  const getSeasonAvg = (seasonIndex: number): number => {
    const season = data[seasonIndex];
    if (!season?.length) return 0;
    const sum = season.reduce((a, e) => a + e.voteAverage, 0);
    return sum / season.length;
  };

  return (
    <div className="overflow-x-auto" aria-label={`Episode quality ratings for ${mediaTitle}`}>
      <div className="inline-block min-w-0">
        <div
          className="grid gap-1.5 bg-transparent rounded-lg"
          style={{
            gridTemplateColumns: `auto repeat(${visibleCols}, minmax(2.5rem, 1fr))`,
            gridTemplateRows: `auto repeat(${visibleRows}, minmax(2rem, 1fr)) auto`,
          }}
        >
          {/* Corner cell */}
          <div className="bg-zinc-800/80 p-1.5 text-xs font-medium text-zinc-400" />

          {/* Column headers: S1, S2, ... */}
          {Array.from({ length: visibleCols }, (_, i) => (
            <div
              key={i}
              className="bg-zinc-800/80 p-1.5 text-center text-xs font-semibold text-zinc-300 min-w-[2.5rem]"
            >
              S{i + 1}
            </div>
          ))}

          {/* Rows: E1, E2, ... with cells */}
          {Array.from({ length: visibleRows }, (_, rowIdx) => {
            const episodeNum = rowIdx + 1;
            return (
              <div key={episodeNum} className="contents">
                <div className="bg-zinc-800/80 p-1.5 text-xs font-medium text-zinc-400">
                  E{episodeNum}
                </div>
                {Array.from({ length: visibleCols }, (_, colIdx) => {
                  const val = getCellValue(colIdx, episodeNum);
                  const url = getSeasonUrl(colIdx, episodeNum);
                  return (
                    <Link
                      key={`${colIdx}-${episodeNum}`}
                      href={url}
                      className={`min-w-[2.5rem] min-h-[2rem] flex items-center justify-center text-xs font-medium rounded-md transition-opacity hover:opacity-90 ${getRatingColor(val)}`}
                      title={
                        val
                          ? `S${colIdx + 1}E${episodeNum}: ${val.toFixed(1)} — View season`
                          : "View season"
                      }
                    >
                      {val ? val.toFixed(1) : "—"}
                    </Link>
                  );
                })}
              </div>
            );
          })}

          {/* AVG row label */}
          <div className="bg-zinc-800/80 p-1.5 text-xs font-semibold text-zinc-300">
            AVG.
          </div>

          {/* AVG row cells */}
          {Array.from({ length: visibleCols }, (_, colIdx) => {
            const avg = getSeasonAvg(colIdx);
            const url = `/media/tv/${mediaId}/season/${colIdx + 1}`;
            return (
              <Link
                key={`avg-${colIdx}`}
                href={url}
                className={`min-w-[2.5rem] min-h-[2rem] flex items-center justify-center text-xs font-semibold rounded-md transition-opacity hover:opacity-90 ${getRatingColor(avg)}`}
                title="View season"
              >
                {avg ? avg.toFixed(1) : "—"}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Color legend */}
      <div className="mt-4 flex flex-wrap items-center gap-3 text-xs">
        {RATING_TIERS.map((tier) => (
          <div key={tier.label} className="flex items-center gap-1.5">
            <div
              className={`h-3 w-3 rounded-full ${tier.className}`}
              aria-hidden
            />
            <span className="text-zinc-400">{tier.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
