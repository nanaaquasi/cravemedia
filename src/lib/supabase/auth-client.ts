import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/** Re-fetch JWT this many seconds before Supabase marks it expired */
const TOKEN_REFRESH_BUFFER_SEC = 120;

type TokenPayload = { access_token: string; expires_at: number };

let tokenCache: TokenPayload | null = null;
let inflightToken: Promise<TokenPayload | null> | null = null;

/**
 * Drop cached JWT (e.g. after sign-out). Next Realtime client will fetch again.
 */
export function clearAccessTokenCache(): void {
  tokenCache = null;
  inflightToken = null;
}

async function fetchAccessTokenPayload(): Promise<TokenPayload | null> {
  const nowSec = Date.now() / 1000;
  if (
    tokenCache &&
    tokenCache.expires_at > nowSec + TOKEN_REFRESH_BUFFER_SEC
  ) {
    return tokenCache;
  }

  if (inflightToken) return inflightToken;

  inflightToken = (async () => {
    try {
      const res = await fetch("/api/auth/access-token", {
        credentials: "include",
      });
      const data = (await res.json()) as {
        access_token?: string | null;
        expires_at?: number | null;
      };

      if (!data.access_token) {
        tokenCache = null;
        return null;
      }

      const expires_at =
        typeof data.expires_at === "number" && data.expires_at > 0
          ? data.expires_at
          : nowSec + 3600;

      tokenCache = { access_token: data.access_token, expires_at };
      return tokenCache;
    } finally {
      inflightToken = null;
    }
  })();

  return inflightToken;
}

/**
 * Creates a Supabase client that uses only an access token (no refresh token).
 * Use for client-side Realtime subscriptions. Token is fetched from our API
 * and refreshed server-side. Avoids exposing refresh tokens in the browser.
 *
 * HTTP access-token calls are deduped and briefly cached so UI churn (session
 * refetch, effect re-runs) does not spam `/api/auth/access-token`.
 */
export async function createAuthenticatedClient() {
  const payload = await fetchAccessTokenPayload();
  if (!payload) {
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
    access_token: payload.access_token,
    refresh_token: "x", // Placeholder; autoRefreshToken:false so it's never used
  });

  return supabase;
}
