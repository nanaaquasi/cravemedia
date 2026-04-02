"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { getTVSeasons, type TVSeasonSummary } from "@/lib/tmdb";

export type EpisodeStatus = "watched" | "not_seen";

export type SeasonWatchHighlight = "watched" | "watching" | null;

const WATCH_STATUS_PRIORITY = [
  "watched",
  "watching",
  "on_hold",
  "dropped",
  "not_interested",
  "not_seen",
] as const;

type MergeableStatus = (typeof WATCH_STATUS_PRIORITY)[number];

async function getMergedTvWatchStatus(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  mediaId: string,
): Promise<MergeableStatus> {
  const [{ data: userCollections }, { data: standaloneRow }, { data: items }] =
    await Promise.all([
      supabase.from("collections").select("id").eq("user_id", userId),
      supabase
        .from("user_media_status")
        .select("status")
        .eq("user_id", userId)
        .eq("media_id", mediaId)
        .eq("media_type", "tv")
        .maybeSingle(),
      supabase
        .from("collection_items")
        .select("collection_id, status")
        .eq("media_id", mediaId)
        .eq("media_type", "tv"),
    ]);

  const collectionIds = new Set((userCollections ?? []).map((c) => c.id));
  const fromLists = (items ?? [])
    .filter((i) => collectionIds.has(i.collection_id))
    .map((i) => i.status as MergeableStatus)
    .filter(Boolean);
  const standalone = standaloneRow?.status as MergeableStatus | undefined;
  const merged = standalone ? [...fromLists, standalone] : fromLists;
  return (
    WATCH_STATUS_PRIORITY.find((s) => merged.includes(s)) ?? "not_seen"
  );
}

async function promoteTvShowToWatchingIfMergedNotWatched(
  mediaId: string,
): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const merged = await getMergedTvWatchStatus(supabase, user.id, mediaId);
  if (merged === "watched") return;

  const nowIso = new Date().toISOString();
  await supabase.from("user_media_status").upsert(
    {
      user_id: user.id,
      media_id: mediaId,
      media_type: "tv",
      status: "watching",
      finished_at: null,
      runtime_minutes: null,
      updated_at: nowIso,
    },
    { onConflict: "user_id,media_id,media_type" },
  );
}

/** Standalone row was "watched" but episode_progress no longer covers all TMDB seasons. */
async function downgradeStandaloneTvIfWatchedButProgressIncomplete(
  mediaId: string,
): Promise<void> {
  const seriesId = Number.parseInt(mediaId, 10);
  if (Number.isNaN(seriesId)) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { data: standaloneRow } = await supabase
    .from("user_media_status")
    .select("status")
    .eq("user_id", user.id)
    .eq("media_id", mediaId)
    .eq("media_type", "tv")
    .maybeSingle();

  if (standaloneRow?.status !== "watched") return;

  const seasons = await getTVSeasons(seriesId);
  const { data: progressRows } = await supabase
    .from("episode_progress")
    .select("season_number, episode_number, status")
    .eq("user_id", user.id)
    .eq("media_id", mediaId);

  const watchedBySeason = new Map<number, Set<number>>();
  for (const row of progressRows ?? []) {
    if (row.status !== "watched") continue;
    const sn = row.season_number as number;
    const en = row.episode_number as number;
    if (!watchedBySeason.has(sn)) watchedBySeason.set(sn, new Set());
    watchedBySeason.get(sn)!.add(en);
  }

  let complete = true;
  for (const s of seasons) {
    const n = s.episodeCount;
    if (n <= 0) continue;
    const set = watchedBySeason.get(s.seasonNumber);
    if (!set) {
      complete = false;
      break;
    }
    for (let ep = 1; ep <= n; ep++) {
      if (!set.has(ep)) {
        complete = false;
        break;
      }
    }
    if (!complete) break;
  }

  if (complete) return;

  const nowIso = new Date().toISOString();
  await supabase.from("user_media_status").upsert(
    {
      user_id: user.id,
      media_id: mediaId,
      media_type: "tv",
      status: "watching",
      finished_at: null,
      runtime_minutes: null,
      updated_at: nowIso,
    },
    { onConflict: "user_id,media_id,media_type" },
  );
}

export async function getSeasonWatchHighlights(
  mediaId: string,
  seasons: TVSeasonSummary[],
): Promise<Record<number, SeasonWatchHighlight>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return {};

  const { data } = await supabase
    .from("episode_progress")
    .select("season_number, episode_number, status")
    .eq("user_id", user.id)
    .eq("media_id", mediaId);

  const watchedBySeason = new Map<number, number>();
  for (const row of data ?? []) {
    if (row.status !== "watched") continue;
    const sn = row.season_number as number;
    watchedBySeason.set(sn, (watchedBySeason.get(sn) ?? 0) + 1);
  }

  const out: Record<number, SeasonWatchHighlight> = {};
  for (const s of seasons) {
    const ec = s.episodeCount;
    if (ec <= 0) {
      out[s.seasonNumber] = null;
      continue;
    }
    const watched = watchedBySeason.get(s.seasonNumber) ?? 0;
    if (watched === ec) out[s.seasonNumber] = "watched";
    else if (watched > 0) out[s.seasonNumber] = "watching";
    else out[s.seasonNumber] = null;
  }
  return out;
}

const EPISODE_UPSERT_CHUNK = 150;

export async function markAllTvEpisodesWatched(
  mediaId: string,
  runtimeMinutes?: number | null,
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be logged in." };

  const seriesId = Number.parseInt(mediaId, 10);
  if (Number.isNaN(seriesId)) return { error: "Invalid media id." };

  const seasons = await getTVSeasons(seriesId);
  const rows: Record<string, unknown>[] = [];
  const nowIso = new Date().toISOString();

  for (const s of seasons) {
    for (let ep = 1; ep <= s.episodeCount; ep++) {
      const row: Record<string, unknown> = {
        user_id: user.id,
        media_id: mediaId,
        season_number: s.seasonNumber,
        episode_number: ep,
        status: "watched" as const,
        updated_at: nowIso,
      };
      if (runtimeMinutes != null && runtimeMinutes > 0) {
        row.runtime_minutes = runtimeMinutes;
      }
      rows.push(row);
    }
  }

  for (let i = 0; i < rows.length; i += EPISODE_UPSERT_CHUNK) {
    const chunk = rows.slice(i, i + EPISODE_UPSERT_CHUNK);
    const { error } = await supabase.from("episode_progress").upsert(chunk, {
      onConflict: "user_id,media_id,season_number,episode_number",
    });
    if (error) return { error: error.message };
  }

  return {};
}

export async function clearAllTvEpisodeProgressForShow(
  mediaId: string,
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be logged in." };

  const { error } = await supabase
    .from("episode_progress")
    .delete()
    .eq("user_id", user.id)
    .eq("media_id", mediaId);

  if (error) return { error: error.message };
  return {};
}

export async function getEpisodeProgress(
  mediaId: string,
  seasonNumber: number,
): Promise<Record<number, EpisodeStatus>> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return {};

  const { data } = await supabase
    .from("episode_progress")
    .select("episode_number, status")
    .eq("user_id", user.id)
    .eq("media_id", mediaId)
    .eq("season_number", seasonNumber);

  const result: Record<number, EpisodeStatus> = {};
  for (const row of data ?? []) {
    const status = row.status as EpisodeStatus;
    if (status === "watched" || status === "not_seen") {
      result[row.episode_number] = status;
    }
  }
  return result;
}

export async function setEpisodeStatus(
  mediaId: string,
  seasonNumber: number,
  episodeNumber: number,
  status: EpisodeStatus,
  runtimeMinutes?: number | null,
): Promise<{ error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be logged in." };
  }

  if (status === "not_seen") {
    const { error } = await supabase
      .from("episode_progress")
      .delete()
      .eq("user_id", user.id)
      .eq("media_id", mediaId)
      .eq("season_number", seasonNumber)
      .eq("episode_number", episodeNumber);

    if (error) return { error: error.message };
  } else {
    const row: Record<string, unknown> = {
      user_id: user.id,
      media_id: mediaId,
      season_number: seasonNumber,
      episode_number: episodeNumber,
      status,
      updated_at: new Date().toISOString(),
    };
    if (runtimeMinutes != null && runtimeMinutes > 0) {
      row.runtime_minutes = runtimeMinutes;
    }
    const { error } = await supabase
      .from("episode_progress")
      .upsert(row, {
        onConflict: "user_id,media_id,season_number,episode_number",
      });

    if (error) return { error: error.message };
  }

  if (status === "watched") {
    await promoteTvShowToWatchingIfMergedNotWatched(mediaId);
  } else {
    await downgradeStandaloneTvIfWatchedButProgressIncomplete(mediaId);
  }

  revalidatePath(`/media/tv/${mediaId}`);
  revalidatePath(`/media/tv/${mediaId}/season/${seasonNumber}`);
  return {};
}

export async function markSeasonWatched(
  mediaId: string,
  seasonNumber: number,
  episodeCount: number,
  runtimeMinutes?: number | null,
): Promise<{ error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be logged in." };
  }

  const rows = Array.from({ length: episodeCount }, (_, i) => {
    const row: Record<string, unknown> = {
      user_id: user.id,
      media_id: mediaId,
      season_number: seasonNumber,
      episode_number: i + 1,
      status: "watched" as const,
      updated_at: new Date().toISOString(),
    };
    if (runtimeMinutes != null && runtimeMinutes > 0) {
      row.runtime_minutes = runtimeMinutes;
    }
    return row;
  });

  const { error } = await supabase
    .from("episode_progress")
    .upsert(rows, {
      onConflict: "user_id,media_id,season_number,episode_number",
    });

  if (error) return { error: error.message };

  await promoteTvShowToWatchingIfMergedNotWatched(mediaId);

  revalidatePath(`/media/tv/${mediaId}`);
  revalidatePath(`/media/tv/${mediaId}/season/${seasonNumber}`);
  return {};
}

export async function markSeasonUnwatched(
  mediaId: string,
  seasonNumber: number,
): Promise<{ error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be logged in." };
  }

  const { error } = await supabase
    .from("episode_progress")
    .delete()
    .eq("user_id", user.id)
    .eq("media_id", mediaId)
    .eq("season_number", seasonNumber);

  if (error) return { error: error.message };

  await downgradeStandaloneTvIfWatchedButProgressIncomplete(mediaId);

  revalidatePath(`/media/tv/${mediaId}`);
  revalidatePath(`/media/tv/${mediaId}/season/${seasonNumber}`);
  return {};
}
