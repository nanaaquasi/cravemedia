"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type EpisodeStatus = "watched" | "not_seen";

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

  revalidatePath(`/media/tv/${mediaId}`);
  revalidatePath(`/media/tv/${mediaId}/season/${seasonNumber}`);
  return {};
}
