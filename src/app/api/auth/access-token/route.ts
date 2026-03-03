import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Returns a short-lived access token for client-side operations that need
 * auth (e.g. Supabase Realtime). Tokens are refreshed server-side via
 * cookies. Avoids exposing refresh tokens to the browser.
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      return NextResponse.json({ access_token: null });
    }

    return NextResponse.json({
      access_token: session.access_token,
      expires_at: session.expires_at,
    });
  } catch (error) {
    console.error("Access token API error:", error);
    return NextResponse.json({ access_token: null });
  }
}
