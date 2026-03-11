"use client";

import Image from "next/image";
import Link from "next/link";

interface Release {
  id: string;
  type: string;
  title: string;
  posterUrl?: string | null;
  releaseDate?: string;
  seasonNumber?: number;
  episodeNumber?: number;
  episodeName?: string;
}

interface DayDetailProps {
  date: string;
  releases: Release[];
  onClose: () => void;
}

function getTvSubtitle(r: Release): string | null {
  if (r.type !== "tv") return null;
  const hasSeason = r.seasonNumber != null;
  const hasEpisode = r.episodeNumber != null;
  if (!hasSeason && !hasEpisode) return null;
  const parts: string[] = [];
  if (hasSeason) parts.push(`Season ${r.seasonNumber}`);
  if (hasEpisode) parts.push(`Episode ${r.episodeNumber}`);
  const epInfo = parts.join(", ");
  if (!r.releaseDate) return epInfo;
  const releaseDate = new Date(r.releaseDate + "T12:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  releaseDate.setHours(0, 0, 0, 0);
  const isPast = releaseDate < today;
  const dateStr = releaseDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  if (isPast) {
    return `${epInfo} · Released ${dateStr}`;
  }
  return `${epInfo} · ${dateStr}`;
}

export function DayDetail({ date, releases, onClose }: DayDetailProps) {
  const formatted = new Date(date + "T12:00:00").toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-white">{formatted}</h2>
        <button
          type="button"
          onClick={onClose}
          className="text-zinc-400 hover:text-white text-sm transition-colors cursor-pointer"
        >
          Close
        </button>
      </div>
      {releases.length === 0 ? (
        <p className="text-zinc-500 text-sm py-6">No releases on this day</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {releases.map((r) => {
            const tvSubtitle = getTvSubtitle(r);
            return (
              <Link
                key={`${r.type}-${r.id}`}
                href={`/media/${r.type}/${r.id}`}
                className="group block"
              >
                <div className="aspect-[2/3] rounded-xl overflow-hidden bg-zinc-800 mb-2">
                  {r.posterUrl ? (
                    <Image
                      src={r.posterUrl}
                      alt={r.title}
                      width={200}
                      height={300}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-zinc-500 text-sm">
                      No poster
                    </div>
                  )}
                </div>
                <p className="text-sm font-medium text-white line-clamp-2 group-hover:text-purple-400 transition-colors">
                  {r.title}
                </p>
                <p className="text-xs text-zinc-500 capitalize">{r.type}</p>
                {tvSubtitle && (
                  <p className="text-xs text-zinc-400 mt-0.5 line-clamp-1">
                    {tvSubtitle}
                  </p>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
