"use client";

import Image from "next/image";
import { useMemo } from "react";

interface CalendarRelease {
  id: string;
  type: string;
  title: string;
  posterUrl?: string | null;
  releaseDate?: string;
}

interface CalendarGridProps {
  year: number;
  month: number;
  byDate: Record<string, CalendarRelease[]>;
  selectedDate: string | null;
  onSelectDate: (date: string) => void;
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function CalendarGrid({
  year,
  month,
  byDate,
  selectedDate,
  onSelectDate,
}: CalendarGridProps) {
  const { days, startOffset } = useMemo(() => {
    const first = new Date(year, month - 1, 1);
    const last = new Date(year, month, 0);
    const startOffset = first.getDay();
    const totalDays = last.getDate();
    const days: { day: number; dateStr: string }[] = [];
    for (let d = 1; d <= totalDays; d++) {
      const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      days.push({ day: d, dateStr });
    }
    return { days, startOffset };
  }, [year, month]);

  return (
    <div className="bg-zinc-900/30 rounded-2xl border border-white/10 p-4">
      <div className="grid grid-cols-7 gap-1 mb-2">
        {DAYS.map((d) => (
          <div
            key={d}
            className="text-center text-xs font-medium text-zinc-400 py-2"
          >
            {d}
          </div>
        ))}
        {Array.from({ length: startOffset }).map((_, i) => (
          <div key={`empty-${i}`} className="aspect-square" />
        ))}
        {days.map(({ day, dateStr }) => {
          const dayReleases = byDate[dateStr] ?? [];
          const count = dayReleases.length;
          const isSelected = selectedDate === dateStr;
          const posterReleases = dayReleases
            .filter((r) => r.posterUrl)
            .slice(0, 3);
          return (
            <button
              key={dateStr}
              type="button"
              onClick={() => onSelectDate(dateStr)}
              className={`aspect-square rounded-xl flex flex-col items-center justify-center text-sm transition-colors cursor-pointer gap-0.5
                ${isSelected ? "bg-purple-500/30 text-purple-300 border border-purple-500/50" : "hover:bg-white/5 border border-transparent"}
                ${count > 0 ? "font-semibold" : "text-zinc-500"}`}
            >
              <span>{day}</span>
              {posterReleases.length > 0 && (
                <div className="flex -space-x-2 mt-0.5">
                  {posterReleases.map((r) => (
                    <div
                      key={`${dateStr}-${r.id}`}
                      className="relative w-6 h-6 rounded-full overflow-hidden border border-zinc-800 shrink-0"
                    >
                      <Image
                        src={r.posterUrl!}
                        alt=""
                        fill
                        className="object-cover"
                        sizes="24px"
                        unoptimized
                      />
                    </div>
                  ))}
                </div>
              )}
              {count > 0 && posterReleases.length === 0 && (
                <span className="text-[10px] text-purple-400 mt-0.5">
                  {count}
                </span>
              )}
              {count > 0 && posterReleases.length > 0 && (
                <span className="text-[10px] text-purple-400/80">
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
