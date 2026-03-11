import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { sanitizeRedirectPath } from "@/lib/auth-utils";

const AUTH_NEXT_COOKIE = "auth_next";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  // Prefer "next" from URL; fallback to cookie (OAuth redirects can drop query params)
  const cookieStore = await cookies();
  let next = searchParams.get("next");
  if (!next || next === "/") {
    const stored = cookieStore.get(AUTH_NEXT_COOKIE)?.value;
    if (stored) {
      next = stored;
    } else {
      next = "/profile";
    }
  }

  const safeNext = sanitizeRedirectPath(next);

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      revalidatePath("/", "layout");
      const forwardedHost = request.headers.get("x-forwarded-host");
      const isLocalEnv = process.env.NODE_ENV === "development";
      const base = isLocalEnv ? origin : forwardedHost ? `https://${forwardedHost}` : origin;
      const redirectUrl = `${base}${safeNext}`;
      const res = NextResponse.redirect(redirectUrl);
      res.cookies.delete(AUTH_NEXT_COOKIE);
      return res;
    }
  }

  return NextResponse.redirect(`${origin}/auth/auth-code-error`);
}
