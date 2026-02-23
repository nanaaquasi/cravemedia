/**
 * Extension config. Set VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, and VITE_APP_URL
 * in extension/.env when building (or they default to localhost for dev).
 */
export const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || "https://your-project.supabase.co";
export const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY || "your-anon-key";
export const DEFAULT_APP_URL =
  import.meta.env.VITE_APP_URL || "http://localhost:3000";
