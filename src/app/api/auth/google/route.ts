import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sanitizeRedirectPath } from "@/lib/auth-utils";

const AUTH_NEXT_COOKIE = "auth_next";
const AUTH_NEXT_MAX_AGE = 300; // 5 min

/**
 * GET /api/auth/google?next=...
 * Initiates Google OAuth. Sets auth_next cookie on the redirect response
 * so the callback can read it when OAuth providers drop query params.
 * Route Handler ensures the cookie is set on the response (unlike Server Action redirect).
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const next = sanitizeRedirectPath(searchParams.get("next"));
  const origin = request.nextUrl.origin;
  const supabase = await createClient();
  // Use /auth/callback only - no query params. Supabase redirect URL allow list
  // may not match URLs with query strings. Cookie provides the next path.
  const redirectTo = `${origin}/auth/callback`;

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo },
  });

  if (error) {
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error.message)}`);
  }

  if (!data.url) {
    return NextResponse.redirect(`${origin}/login?error=Failed+to+initiate+sign-in`);
  }

  const res = NextResponse.redirect(data.url, { status: 302 });
  res.cookies.set(AUTH_NEXT_COOKIE, next /* already sanitized */, {
    path: "/",
    maxAge: AUTH_NEXT_MAX_AGE,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  });
  return res;
}
