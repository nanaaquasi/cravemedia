import { NextRequest, NextResponse } from "next/server";
import { getPosterUrl } from "@/lib/tmdb";

const TMDB_BASE = "https://api.themoviedb.org/3";

export interface CalendarRelease {
  id: string;
  type: "movie" | "tv";
  title: string;
  posterUrl: string | null;
  releaseDate: string;
  /** TV only: season number */
  seasonNumber?: number;
  /** TV only: episode number */
  episodeNumber?: number;
  /** TV only: episode title */
  episodeName?: string;
}

/** Format date as YYYY-MM-DD for TMDB discover API */
function toTmdbDate(year: number, month: number, day: number): string {
  const m = String(month).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  return `${year}-${m}-${d}`;
}

export async function GET(request: NextRequest) {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ releases: [], byDate: {} });
  }

  const { searchParams } = new URL(request.url);
  const year = searchParams.get("year");
  const month = searchParams.get("month");

  const targetYear = year ? Number.parseInt(year, 10) : new Date().getFullYear();
  const targetMonth =
    month ? Number.parseInt(month, 10) : new Date().getMonth() + 1;

  const releases: CalendarRelease[] = [];
  const byDate: Record<string, CalendarRelease[]> = {};

  const lastDay = new Date(targetYear, targetMonth, 0).getDate();
  const airDateGte = toTmdbDate(targetYear, targetMonth, 1);
  const airDateLte = toTmdbDate(targetYear, targetMonth, lastDay);

  try {
    const movieRes = await fetch(
      `${TMDB_BASE}/movie/upcoming?api_key=${apiKey}&language=en-US&page=1`,
    );
    if (movieRes.ok) {
      const movieData = (await movieRes.json()) as {
        results?: Array<{
          id: number;
          title: string;
          poster_path: string | null;
          release_date: string;
        }>;
      };
      for (const m of movieData.results ?? []) {
        if (!m.release_date) continue;
        const [y, mo] = m.release_date.split("-").map(Number);
        if (y === targetYear && mo === targetMonth) {
          const r: CalendarRelease = {
            id: String(m.id),
            type: "movie",
            title: m.title,
            posterUrl: getPosterUrl(m.poster_path, "w500"),
            releaseDate: m.release_date,
          };
          releases.push(r);
          const key = m.release_date;
          if (!byDate[key]) byDate[key] = [];
          byDate[key].push(r);
        }
      }
    }

    const tvDiscoverUrl = new URL(`${TMDB_BASE}/discover/tv`);
    tvDiscoverUrl.searchParams.set("api_key", apiKey);
    tvDiscoverUrl.searchParams.set("language", "en-US");
    tvDiscoverUrl.searchParams.set("air_date.gte", airDateGte);
    tvDiscoverUrl.searchParams.set("air_date.lte", airDateLte);
    tvDiscoverUrl.searchParams.set("page", "1");
    tvDiscoverUrl.searchParams.set("sort_by", "popularity.desc");

    const tvDiscoverRes = await fetch(tvDiscoverUrl.toString());
    if (tvDiscoverRes.ok) {
      const tvDiscoverData = (await tvDiscoverRes.json()) as {
        results?: Array<{
          id: number;
          name: string;
          poster_path: string | null;
          first_air_date?: string;
        }>;
      };
      const tvResults = (tvDiscoverData.results ?? []).slice(0, 20);

      const tvDetails = await Promise.all(
        tvResults.map((t) =>
          fetch(
            `${TMDB_BASE}/tv/${t.id}?api_key=${apiKey}&language=en-US`,
          ).then((r) => (r.ok ? r.json() : null)),
        ),
      );

      for (let i = 0; i < tvResults.length; i++) {
        const t = tvResults[i];
        const details = tvDetails[i] as {
          next_episode_to_air?: {
            air_date?: string;
            season_number?: number;
            episode_number?: number;
            name?: string;
          };
        } | null;

        const nextEp = details?.next_episode_to_air;
        let releaseDate: string;
        if (nextEp?.air_date) {
          const [y, mo] = nextEp.air_date.split("-").map(Number);
          if (y === targetYear && mo === targetMonth) {
            releaseDate = nextEp.air_date;
          } else {
            releaseDate = `${targetYear}-${String(targetMonth).padStart(2, "0")}-01`;
          }
        } else {
          releaseDate = `${targetYear}-${String(targetMonth).padStart(2, "0")}-01`;
        }

        const r: CalendarRelease = {
          id: String(t.id),
          type: "tv",
          title: t.name,
          posterUrl: getPosterUrl(t.poster_path, "w500"),
          releaseDate,
          seasonNumber: nextEp?.season_number,
          episodeNumber: nextEp?.episode_number,
          episodeName: nextEp?.name ?? undefined,
        };
        releases.push(r);
        if (!byDate[releaseDate]) byDate[releaseDate] = [];
        byDate[releaseDate].push(r);
      }
    }
  } catch (err) {
    console.error("Calendar releases error:", err);
  }

  return NextResponse.json({ releases, byDate });
}
