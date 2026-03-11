"use client";

import { useState, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { CalendarGrid } from "@/components/calendar/CalendarGrid";
import { DayDetail } from "@/components/calendar/DayDetail";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default function CalendarPage() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [byDate, setByDate] = useState<
    Record<
      string,
      {
        id: string;
        type: string;
        title: string;
        posterUrl: string | null;
        releaseDate: string;
        seasonNumber?: number;
        episodeNumber?: number;
        episodeName?: string;
      }[]
    >
  >({});
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const dayDetailRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(
      `/api/calendar/releases?year=${year}&month=${month}`,
    )
      .then((r) => r.json())
      .then((data) => {
        setByDate(data.byDate ?? {});
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [year, month]);

  const goPrev = () => {
    if (month === 1) {
      setYear((y) => y - 1);
      setMonth(12);
    } else {
      setMonth((m) => m - 1);
    }
  };

  const goNext = () => {
    if (month === 12) {
      setYear((y) => y + 1);
      setMonth(1);
    } else {
      setMonth((m) => m + 1);
    }
  };

  const goToday = () => {
    const t = new Date();
    setYear(t.getFullYear());
    setMonth(t.getMonth() + 1);
  };

  const selectedReleases = selectedDate ? (byDate[selectedDate] ?? []) : [];

  useEffect(() => {
    if (!selectedDate) return;
    if ((byDate[selectedDate]?.length ?? 0) === 0) return;

    const timerId = window.setTimeout(() => {
      dayDetailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);

    return () => window.clearTimeout(timerId);
  }, [selectedDate, byDate]);

  const handleSelectDate = (date: string) => {
    setSelectedDate(date);
  };

  return (
    <main className="flex-1 flex flex-col pb-16">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Calendar</h1>
        <p className="text-zinc-400">
          Browse upcoming releases by date
        </p>
      </div>

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={goPrev}
            className="p-2 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
    >
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>
          <h2 className="text-xl font-bold text-white min-w-[200px] text-center">
            {MONTHS[month - 1]} {year}
          </h2>
          <button
            type="button"
            onClick={goNext}
            className="p-2 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
          >
            <ChevronRight className="w-5 h-5 text-white" />
          </button>
        </div>
        <button
          type="button"
          onClick={goToday}
          className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-sm font-medium transition-colors cursor-pointer"
        >
          Today
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
        </div>
      ) : (
        <>
          <CalendarGrid
            year={year}
            month={month}
            byDate={byDate}
            selectedDate={selectedDate}
            onSelectDate={handleSelectDate}
          />

          {selectedDate && (
            <div ref={dayDetailRef} className="mt-6">
              <DayDetail
                date={selectedDate}
                releases={selectedReleases}
                onClose={() => setSelectedDate(null)}
              />
            </div>
          )}
        </>
      )}
    </main>
  );
}
