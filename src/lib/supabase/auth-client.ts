import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Creates a Supabase client that uses only an access token (no refresh token).
 * Use for client-side Realtime subscriptions. Token is fetched from our API
 * and refreshed server-side. Avoids exposing refresh tokens in the browser.
 */
export async function createAuthenticatedClient() {
  const res = await fetch("/api/auth/access-token", {
    credentials: "include",
  });
  const { access_token } = await res.json();

  if (!access_token) {
    return null;
  }

  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
        storage: {
          getItem: () => null,
          setItem: () => {},
          removeItem: () => {},
        },
      },
    },
  );

  await supabase.auth.setSession({
    access_token,
    refresh_token: "x", // Placeholder; autoRefreshToken:false so it's never used
  });

  return supabase;
}
