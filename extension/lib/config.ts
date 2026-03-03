/**
 * Extension config. Set VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, and VITE_APP_URL
 * in extension/.env when building.
 * In production, missing Supabase values throw to avoid using placeholder secrets.
 * In development, fallbacks allow local testing without .env.
 */
const isDev = import.meta.env.DEV;
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!isDev && (!supabaseUrl || !supabaseKey)) {
  throw new Error(
    "VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are required for production extension builds",
  );
}

export const SUPABASE_URL = supabaseUrl || "https://your-project.supabase.co";
export const SUPABASE_ANON_KEY = supabaseKey || "your-anon-key";
export const DEFAULT_APP_URL =
  import.meta.env.VITE_APP_URL || "http://localhost:3000";
