import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { User } from "@supabase/supabase-js";

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

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ user: null });
    }

    return NextResponse.json({ user: toSessionUser(user) });
  } catch (error) {
    console.error("Session API error:", error);
    return NextResponse.json({ user: null });
  }
}
