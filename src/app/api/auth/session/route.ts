import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient, User } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

/**
 * Minimal session user - only what the client needs for display.
 * Avoids exposing full Supabase User (identities, provider_id, etc.) to the client.
 */
export interface SessionUser {
  id: string;
  email: string | null;
  full_name?: string | null;
  avatar_url?: string | null;
}

/** Server-side helper to slim down User before passing to client components */
export function toSessionUser(user: User | null): SessionUser | null {
  if (!user) return null;
  return {
    id: user.id,
    email: user.email ?? null,
    full_name:
      (user.user_metadata?.full_name as string) ??
      (user.user_metadata?.name as string) ??
      null,
    avatar_url:
      (user.user_metadata?.avatar_url as string) ??
      (user.user_metadata?.picture as string) ??
      null,
  };
}

/**
 * Auth metadata alone is often stale (e.g. custom avatar saved to `profiles` only).
 * Prefer public.profiles for display name and avatar when present.
 */
export async function resolveSessionUser(
  supabase: SupabaseClient,
): Promise<SessionUser | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const base = toSessionUser(user);
  if (!base) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("avatar_url, full_name")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile) return base;
  return {
    id: base.id,
    email: base.email,
    avatar_url: profile.avatar_url ?? base.avatar_url ?? null,
    full_name: profile.full_name ?? base.full_name ?? null,
  };
}

export async function GET() {
  try {
    const supabase = await createClient();
    const user = await resolveSessionUser(supabase);
    return NextResponse.json({ user });
  } catch (error) {
    console.error("Session API error:", error);
    return NextResponse.json({ user: null });
  }
}
